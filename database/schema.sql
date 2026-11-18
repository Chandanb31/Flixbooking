-- =====================================================================
--  FlixBooking — PostgreSQL schema
--  Run this first (psql, pgAdmin, or the Neon SQL Editor).
--  Safe to re-run on an empty database. To start over: run reset.sql.
-- =====================================================================

-- Needed for the "no two shows overlap on one screen" rule below.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------
--  Users & auth
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id             BIGSERIAL PRIMARY KEY,
    full_name      TEXT        NOT NULL,
    email          TEXT        NOT NULL,
    phone          TEXT,
    password_hash  TEXT        NOT NULL,
    role           TEXT        NOT NULL DEFAULT 'customer'
                   CHECK (role IN ('customer', 'organizer', 'admin')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Emails are unique regardless of letter case.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq ON users (lower(email));

-- ---------------------------------------------------------------------
--  Catalogue: cities, movies
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cities (
    id     SERIAL PRIMARY KEY,
    name   TEXT NOT NULL UNIQUE,
    slug   TEXT NOT NULL UNIQUE,
    state  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movies (
    id             SERIAL PRIMARY KEY,
    slug           TEXT        NOT NULL UNIQUE,
    title          TEXT        NOT NULL,
    tagline        TEXT,
    synopsis       TEXT,
    genres         TEXT[]      NOT NULL DEFAULT '{}',
    language       TEXT        NOT NULL,
    certificate    TEXT        NOT NULL CHECK (certificate IN ('U', 'UA', 'A')),
    duration_min   INT         NOT NULL CHECK (duration_min > 0),
    release_date   DATE        NOT NULL,
    rating         NUMERIC(3,1) CHECK (rating BETWEEN 0 AND 10),
    director       TEXT,
    cast_members   TEXT[]      NOT NULL DEFAULT '{}',
    formats        TEXT[]      NOT NULL DEFAULT '{2D}',
    status         TEXT        NOT NULL DEFAULT 'now_showing'
                   CHECK (status IN ('now_showing', 'coming_soon', 'ended')),
    poster_url     TEXT        NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS movies_status_idx ON movies (status);

-- ---------------------------------------------------------------------
--  Venues: theatres → screens → seats
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS theatres (
    id         SERIAL PRIMARY KEY,
    city_id    INT  NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    area       TEXT NOT NULL,
    address    TEXT NOT NULL,
    amenities  TEXT[] NOT NULL DEFAULT '{}',
    UNIQUE (city_id, name, area)
);

CREATE TABLE IF NOT EXISTS screens (
    id           SERIAL PRIMARY KEY,
    theatre_id   INT  NOT NULL REFERENCES theatres(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    screen_type  TEXT NOT NULL DEFAULT 'STANDARD'
                 CHECK (screen_type IN ('STANDARD', 'IMAX', '4DX')),
    UNIQUE (theatre_id, name)
);

-- One row per physical seat. col_index is the seat's column on the seat
-- map (gaps in col_index = aisles), so the UI can draw the real layout.
CREATE TABLE IF NOT EXISTS seats (
    id             SERIAL PRIMARY KEY,
    screen_id      INT     NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    row_label      TEXT    NOT NULL,
    seat_number    INT     NOT NULL,
    col_index      INT     NOT NULL,
    seat_type      TEXT    NOT NULL CHECK (seat_type IN ('CLASSIC', 'PRIME', 'RECLINER')),
    is_accessible  BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (screen_id, row_label, seat_number)
);

-- ---------------------------------------------------------------------
--  Shows (a movie playing on a screen at a time)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shows (
    id              SERIAL PRIMARY KEY,
    movie_id        INT         NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    screen_id       INT         NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,          -- when the movie ends
    screen_free_at  TIMESTAMPTZ NOT NULL,          -- ends_at + cleaning buffer
    format          TEXT        NOT NULL DEFAULT '2D',
    language        TEXT        NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    CHECK (ends_at > starts_at AND screen_free_at >= ends_at),
    UNIQUE (screen_id, starts_at),
    -- The database itself refuses two overlapping shows on one screen.
    CONSTRAINT shows_no_overlap EXCLUDE USING gist (
        screen_id WITH =,
        tstzrange(starts_at, screen_free_at) WITH &&
    ) WHERE (status <> 'cancelled')
);
CREATE INDEX IF NOT EXISTS shows_movie_time_idx ON shows (movie_id, starts_at);

-- Price per seat category, per show (so evenings/weekends/IMAX can differ).
CREATE TABLE IF NOT EXISTS show_prices (
    show_id    INT           NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    seat_type  TEXT          NOT NULL CHECK (seat_type IN ('CLASSIC', 'PRIME', 'RECLINER')),
    price      NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    PRIMARY KEY (show_id, seat_type)
);

-- ---------------------------------------------------------------------
--  Bookings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id               BIGSERIAL PRIMARY KEY,
    booking_code     TEXT          NOT NULL UNIQUE,
    user_id          BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    show_id          INT           NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    status           TEXT          NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
    seat_count       INT           NOT NULL CHECK (seat_count > 0),
    subtotal         NUMERIC(10,2) NOT NULL,
    convenience_fee  NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount     NUMERIC(10,2) NOT NULL,
    hold_expires_at  TIMESTAMPTZ   NOT NULL,
    refund_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
    refund_status    TEXT          NOT NULL DEFAULT 'none'
                     CHECK (refund_status IN ('none', 'processing', 'refunded')),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    confirmed_at     TIMESTAMPTZ,
    cancelled_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings (user_id, created_at DESC);

-- Permanent record of which seats a booking had (kept after cancellation).
CREATE TABLE IF NOT EXISTS booking_seats (
    booking_id  BIGINT        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_id     INT           NOT NULL REFERENCES seats(id),
    price       NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (booking_id, seat_id)
);

-- Live state of every seat for every show. This is the table that gets
-- row-locked (SELECT ... FOR UPDATE) during booking, so two people can
-- never get the same seat.
CREATE TABLE IF NOT EXISTS show_seats (
    id          BIGSERIAL PRIMARY KEY,
    show_id     INT    NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    seat_id     INT    NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    status      TEXT   NOT NULL DEFAULT 'available'
                CHECK (status IN ('available', 'held', 'booked')),
    booking_id  BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
    held_until  TIMESTAMPTZ,
    UNIQUE (show_id, seat_id),
    CHECK (status = 'available' OR booking_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS show_seats_booking_idx ON show_seats (booking_id);

CREATE TABLE IF NOT EXISTS payments (
    id            BIGSERIAL PRIMARY KEY,
    booking_id    BIGINT        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    provider      TEXT          NOT NULL DEFAULT 'mock',
    provider_ref  TEXT,
    amount        NUMERIC(10,2) NOT NULL,
    status        TEXT          NOT NULL CHECK (status IN ('success', 'failed', 'refunded')),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
--  Refund policy (edit rows to change the policy — no code change)
--  The rule with the highest min_hours_before that is <= hours left wins.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refund_rules (
    id                SERIAL PRIMARY KEY,
    min_hours_before  INT NOT NULL UNIQUE CHECK (min_hours_before >= 0),
    refund_percent    INT NOT NULL CHECK (refund_percent BETWEEN 0 AND 100),
    label             TEXT NOT NULL
);
