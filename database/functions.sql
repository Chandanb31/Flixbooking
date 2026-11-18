-- =====================================================================
--  FlixBooking — database functions
--  Run after schema.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
--  refresh_shows(days)
--  Creates showtimes for every screen for today + the next (days-1) days,
--  with prices and a seat row for every seat. Skips anything that
--  already exists, so it is safe to run every day (e.g. from a cron job
--  or the backend's startup) to keep a rolling week of shows.
--
--  Schedule: 4 shows per screen per day (10:00, 13:30, 17:00, 20:30 IST).
--  Pricing:  CLASSIC 180 / PRIME 260 / RECLINER 480
--            +120 on IMAX/4DX screens, +40 from 5 PM, +30 on weekends.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_shows(p_days INT DEFAULT 7)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_created INT;
BEGIN
    WITH slots(slot_no, slot_time) AS (
        VALUES (0, TIME '10:00'), (1, TIME '13:30'), (2, TIME '17:00'), (3, TIME '20:30')
    ),
    days AS (
        SELECT d::date AS day, row_number() OVER (ORDER BY d) - 1 AS day_no
        FROM generate_series(
            (now() AT TIME ZONE 'Asia/Kolkata')::date,
            (now() AT TIME ZONE 'Asia/Kolkata')::date + (p_days - 1),
            INTERVAL '1 day') AS d
    ),
    -- Movies a given screen may play: premium screens only play movies
    -- released in that format.
    eligible AS (
        SELECT sc.id AS screen_id, m.id AS movie_id, m.duration_min, m.language,
               CASE WHEN sc.screen_type = 'STANDARD' THEN '2D' ELSE sc.screen_type END AS format,
               row_number() OVER (PARTITION BY sc.id ORDER BY m.id) - 1 AS idx,
               count(*)     OVER (PARTITION BY sc.id)                AS n
        FROM screens sc
        JOIN movies m ON m.status = 'now_showing'
         AND (sc.screen_type = 'STANDARD' OR sc.screen_type = ANY (m.formats))
    ),
    planned AS (
        SELECT e.*, d.day, s.slot_time,
               ((d.day + s.slot_time) AT TIME ZONE 'Asia/Kolkata') AS starts_at
        FROM screens sc
        CROSS JOIN days d
        CROSS JOIN slots s
        JOIN eligible e
          ON e.screen_id = sc.id
         -- rotate movies across screens, slots and days
         AND e.idx = (sc.id * 3 + s.slot_no + d.day_no * 2) % e.n
    ),
    inserted AS (
        INSERT INTO shows (movie_id, screen_id, starts_at, ends_at, screen_free_at, format, language)
        SELECT movie_id, screen_id, starts_at,
               starts_at + make_interval(mins => duration_min),
               starts_at + make_interval(mins => duration_min + 20),
               format, language
        FROM planned
        ON CONFLICT (screen_id, starts_at) DO NOTHING
        RETURNING id
    )
    SELECT count(*) INTO v_created FROM inserted;

    -- Prices for shows that don't have them yet.
    INSERT INTO show_prices (show_id, seat_type, price)
    SELECT sh.id, t.seat_type,
           t.base
           + CASE WHEN sc.screen_type <> 'STANDARD' THEN 120 ELSE 0 END
           + CASE WHEN (sh.starts_at AT TIME ZONE 'Asia/Kolkata')::time >= TIME '17:00' THEN 40 ELSE 0 END
           + CASE WHEN extract(isodow FROM sh.starts_at AT TIME ZONE 'Asia/Kolkata') IN (6, 7) THEN 30 ELSE 0 END
    FROM shows sh
    JOIN screens sc ON sc.id = sh.screen_id
    CROSS JOIN (VALUES ('CLASSIC', 180), ('PRIME', 260), ('RECLINER', 480)) AS t(seat_type, base)
    WHERE sh.starts_at > now()
    ON CONFLICT (show_id, seat_type) DO NOTHING;

    -- One live seat row per seat per show.
    INSERT INTO show_seats (show_id, seat_id)
    SELECT sh.id, se.id
    FROM shows sh
    JOIN seats se ON se.screen_id = sh.screen_id
    WHERE sh.starts_at > now()
    ON CONFLICT (show_id, seat_id) DO NOTHING;

    RETURN v_created;
END;
$$;

-- ---------------------------------------------------------------------
--  release_expired_holds()
--  Frees seats whose 10-minute hold ran out and marks those bookings
--  'expired'. The backend also treats expired holds as free on the fly,
--  so this is housekeeping (run it every minute from a background job).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION release_expired_holds()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT;
BEGIN
    UPDATE show_seats
       SET status = 'available', booking_id = NULL, held_until = NULL
     WHERE status = 'held' AND held_until < now();
    GET DIAGNOSTICS v_count = ROW_COUNT;

    UPDATE bookings
       SET status = 'expired'
     WHERE status = 'pending' AND hold_expires_at < now();

    RETURN v_count;
END;
$$;
