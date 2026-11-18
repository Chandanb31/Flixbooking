"""Booking logic: hold seats, pay, cancel with refund.

The important part is hold_seats(): it locks the seat rows for the show
with SELECT ... FOR UPDATE inside one transaction. If two people click
the same seat at the same moment, the second request waits for the first
to finish, then sees the seat is taken and gets a 409 error. Nobody can
ever end up with the same seat.
"""
import secrets
import string
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.core.config import get_settings
from app.db import row_dict, rows_list, tx, read

CODE_ALPHABET = string.ascii_uppercase + string.digits


def _new_booking_code() -> str:
    return "FB" + "".join(secrets.choice(CODE_ALPHABET) for _ in range(8))


def _free_seats_of(conn: Connection, booking_ids: list[int]) -> None:
    """Put a booking's held seats back on sale."""
    if not booking_ids:
        return
    conn.execute(text("""
        UPDATE show_seats SET status = 'available', booking_id = NULL, held_until = NULL
        WHERE booking_id = ANY(:ids) AND status = 'held'
    """), {"ids": booking_ids})


# ---------------------------------------------------------------------
#  1. Hold seats (creates a 'pending' booking that expires in N minutes)
# ---------------------------------------------------------------------
def hold_seats(user_id: int, show_id: int, seat_ids: list[int]) -> str:
    s = get_settings()
    seat_ids = sorted(set(seat_ids))
    if len(seat_ids) > s.max_seats_per_booking:
        raise HTTPException(400, f"You can book at most {s.max_seats_per_booking} seats at a time.")

    with tx() as conn:
        show = row_dict(conn.execute(text("""
            SELECT id, starts_at, status, starts_at > now() AS is_upcoming
            FROM shows WHERE id = :id
        """), {"id": show_id}).first())
        if show is None:
            raise HTTPException(404, "Show not found.")
        if show["status"] != "scheduled" or not show["is_upcoming"]:
            raise HTTPException(400, "This show is no longer open for booking.")

        # If this user already had seats on hold for this show, let them go
        # (they're picking again).
        old_ids = conn.execute(text("""
            UPDATE bookings SET status = 'expired'
            WHERE user_id = :uid AND show_id = :sid AND status = 'pending'
            RETURNING id
        """), {"uid": user_id, "sid": show_id}).scalars().all()
        _free_seats_of(conn, old_ids)

        # Lock the requested seat rows. ORDER BY avoids deadlocks when two
        # people pick overlapping seats in a different order.
        locked = rows_list(conn.execute(text("""
            SELECT ss.id, ss.seat_id, ss.status, ss.booking_id,
                   (ss.status = 'held' AND ss.held_until < now()) AS hold_expired,
                   se.row_label, se.seat_number, se.seat_type
            FROM show_seats ss
            JOIN seats se ON se.id = ss.seat_id
            WHERE ss.show_id = :sid AND ss.seat_id = ANY(:seat_ids)
            ORDER BY ss.seat_id
            FOR UPDATE OF ss
        """), {"sid": show_id, "seat_ids": seat_ids}))

        if len(locked) != len(seat_ids):
            raise HTTPException(400, "Some of those seats don't exist for this show.")

        taken = [f'{r["row_label"]}{r["seat_number"]}' for r in locked
                 if r["status"] == "booked" or (r["status"] == "held" and not r["hold_expired"])]
        if taken:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Sorry, {', '.join(taken)} {'was' if len(taken) == 1 else 'were'} just taken. Please pick other seats.",
            )

        # Seats whose old hold ran out: mark those old bookings expired.
        stale = [r["booking_id"] for r in locked if r["hold_expired"] and r["booking_id"]]
        if stale:
            conn.execute(text("UPDATE bookings SET status = 'expired' WHERE id = ANY(:ids) AND status = 'pending'"),
                         {"ids": stale})

        prices = {r.seat_type: r.price for r in conn.execute(
            text("SELECT seat_type, price FROM show_prices WHERE show_id = :sid"), {"sid": show_id})}
        subtotal = sum((prices[r["seat_type"]] for r in locked), Decimal("0"))
        fee = Decimal(s.convenience_fee_per_seat) * len(locked)

        booking = row_dict(conn.execute(text("""
            INSERT INTO bookings (booking_code, user_id, show_id, seat_count, subtotal,
                                  convenience_fee, total_amount, hold_expires_at)
            VALUES (:code, :uid, :sid, :n, :subtotal, :fee, :total,
                    now() + make_interval(mins => :hold))
            RETURNING id, booking_code, hold_expires_at
        """), {"code": _new_booking_code(), "uid": user_id, "sid": show_id, "n": len(locked),
               "subtotal": subtotal, "fee": fee, "total": subtotal + fee,
               "hold": s.seat_hold_minutes}).first())

        conn.execute(text("""
            UPDATE show_seats SET status = 'held', booking_id = :bid, held_until = :until
            WHERE id = ANY(:ids)
        """), {"bid": booking["id"], "until": booking["hold_expires_at"], "ids": [r["id"] for r in locked]})

        conn.execute(text("""
            INSERT INTO booking_seats (booking_id, seat_id, price) VALUES (:bid, :seat_id, :price)
        """), [{"bid": booking["id"], "seat_id": r["seat_id"], "price": prices[r["seat_type"]]} for r in locked])

    return booking["booking_code"]


# ---------------------------------------------------------------------
#  Booking details (used by checkout, ticket and "My bookings")
# ---------------------------------------------------------------------
BOOKING_SQL = """
    SELECT b.id, b.booking_code, b.status, b.seat_count, b.subtotal, b.convenience_fee,
           b.total_amount, b.hold_expires_at, b.refund_amount, b.refund_status,
           b.created_at, b.confirmed_at, b.cancelled_at,
           b.hold_expires_at < now() AS hold_over,
           sh.id AS show_id, sh.starts_at, sh.format, sh.language,
           sc.name AS screen_name, th.name AS theatre_name, th.area AS theatre_area,
           th.address AS theatre_address, c.name AS city,
           m.slug AS movie_slug, m.title AS movie_title, m.poster_url, m.certificate, m.duration_min
    FROM bookings b
    JOIN shows sh    ON sh.id = b.show_id
    JOIN screens sc  ON sc.id = sh.screen_id
    JOIN theatres th ON th.id = sc.theatre_id
    JOIN cities c    ON c.id = th.city_id
    JOIN movies m    ON m.id = sh.movie_id
"""


def _attach_seats(conn: Connection, bookings: list[dict]) -> list[dict]:
    if not bookings:
        return bookings
    seats = rows_list(conn.execute(text("""
        SELECT bs.booking_id, se.id AS seat_id, se.row_label, se.seat_number, se.seat_type, bs.price
        FROM booking_seats bs JOIN seats se ON se.id = bs.seat_id
        WHERE bs.booking_id = ANY(:ids)
        ORDER BY se.row_label, se.seat_number
    """), {"ids": [b["id"] for b in bookings]}))
    by_booking: dict[int, list] = {}
    for st in seats:
        by_booking.setdefault(st.pop("booking_id"), []).append(st)
    for b in bookings:
        b["seats"] = by_booking.get(b["id"], [])
        # Show a pending booking whose timer ran out as expired right away.
        hold_over = b.pop("hold_over", False)
        if b["status"] == "pending" and hold_over:
            b["status"] = "expired"
    return bookings


def get_booking(code: str, user_id: int) -> dict:
    with read() as conn:
        b = row_dict(conn.execute(text(BOOKING_SQL + """
            WHERE b.booking_code = :code AND b.user_id = :uid
        """), {"code": code, "uid": user_id}).first())
        if b is None:
            raise HTTPException(404, "Booking not found.")
        return _attach_seats(conn, [b])[0]


def list_user_bookings(user_id: int) -> list[dict]:
    with read() as conn:
        rows = rows_list(conn.execute(text(BOOKING_SQL + """
            WHERE b.user_id = :uid AND b.status IN ('confirmed', 'cancelled')
            ORDER BY sh.starts_at DESC
        """), {"uid": user_id}))
        return _attach_seats(conn, rows)


def _lock_booking(conn: Connection, code: str, user_id: int) -> dict:
    b = row_dict(conn.execute(text("""
        SELECT b.*, sh.starts_at, b.hold_expires_at < now() AS hold_over,
               extract(epoch FROM (sh.starts_at - now())) / 3600.0 AS hours_left
        FROM bookings b JOIN shows sh ON sh.id = b.show_id
        WHERE b.booking_code = :code AND b.user_id = :uid
        FOR UPDATE OF b
    """), {"code": code, "uid": user_id}).first())
    if b is None:
        raise HTTPException(404, "Booking not found.")
    return b


# ---------------------------------------------------------------------
#  2. Pay (mock payment; swap for Razorpay/Stripe later)
# ---------------------------------------------------------------------
def confirm_booking(code: str, user_id: int) -> None:
    expired = False
    with tx() as conn:
        b = _lock_booking(conn, code, user_id)
        if b["status"] == "confirmed":
            return  # paying twice is harmless (idempotent)
        if b["status"] != "pending":
            raise HTTPException(400, f"This booking is {b['status']} and can't be paid for.")
        if b["hold_over"]:
            conn.execute(text("UPDATE bookings SET status = 'expired' WHERE id = :id"), {"id": b["id"]})
            _free_seats_of(conn, [b["id"]])
            expired = True
        else:
            updated = conn.execute(text("""
                UPDATE show_seats SET status = 'booked', held_until = NULL
                WHERE booking_id = :bid AND status = 'held'
            """), {"bid": b["id"]}).rowcount
            if updated != b["seat_count"]:
                raise HTTPException(409, "Your seats are no longer held. Please select them again.")
            conn.execute(text("""
                INSERT INTO payments (booking_id, provider, provider_ref, amount, status)
                VALUES (:bid, 'mock', :ref, :amount, 'success')
            """), {"bid": b["id"], "ref": "MOCK-" + secrets.token_hex(6).upper(), "amount": b["total_amount"]})
            conn.execute(text("""
                UPDATE bookings SET status = 'confirmed', confirmed_at = now() WHERE id = :id
            """), {"id": b["id"]})
    if expired:
        # Raised after the transaction committed, so the seats really are released.
        raise HTTPException(status.HTTP_410_GONE, "Your 10-minute seat hold has expired. Please select seats again.")


def release_booking(code: str, user_id: int) -> None:
    """User left checkout without paying: free the seats now."""
    with tx() as conn:
        b = _lock_booking(conn, code, user_id)
        if b["status"] == "pending":
            conn.execute(text("UPDATE bookings SET status = 'expired' WHERE id = :id"), {"id": b["id"]})
            _free_seats_of(conn, [b["id"]])


# ---------------------------------------------------------------------
#  3. Cancel + refund
# ---------------------------------------------------------------------
def _refund_quote(conn: Connection, b: dict) -> dict:
    hours_left = float(b["hours_left"])
    rule = row_dict(conn.execute(text("""
        SELECT refund_percent, label FROM refund_rules
        WHERE min_hours_before <= :h ORDER BY min_hours_before DESC LIMIT 1
    """), {"h": max(hours_left, 0)}).first()) or {"refund_percent": 0, "label": "No refund"}
    percent = rule["refund_percent"]
    refund = (Decimal(b["subtotal"]) * percent / 100).quantize(Decimal("0.01"))
    can_cancel = b["status"] == "confirmed" and hours_left > 0 and percent > 0
    reason = None
    if b["status"] != "confirmed":
        reason = f"Only confirmed bookings can be cancelled (this one is {b['status']})."
    elif hours_left <= 0:
        reason = "This show has already started."
    elif percent == 0:
        reason = "Cancellation closes 4 hours before the show."
    return {
        "can_cancel": can_cancel, "reason": reason, "hours_left": round(hours_left, 1),
        "refund_percent": percent, "policy": rule["label"], "refund_amount": refund,
        "non_refundable_fee": b["convenience_fee"],
    }


def refund_quote(code: str, user_id: int) -> dict:
    with tx() as conn:
        return _refund_quote(conn, _lock_booking(conn, code, user_id))


def cancel_booking(code: str, user_id: int) -> dict:
    with tx() as conn:
        b = _lock_booking(conn, code, user_id)
        quote = _refund_quote(conn, b)
        if not quote["can_cancel"]:
            raise HTTPException(400, quote["reason"])
        conn.execute(text("""
            UPDATE bookings
            SET status = 'cancelled', cancelled_at = now(),
                refund_amount = :refund, refund_status = 'refunded'
            WHERE id = :id
        """), {"refund": quote["refund_amount"], "id": b["id"]})
        conn.execute(text("""
            UPDATE show_seats SET status = 'available', booking_id = NULL, held_until = NULL
            WHERE booking_id = :id
        """), {"id": b["id"]})
        conn.execute(text("""
            INSERT INTO payments (booking_id, provider, provider_ref, amount, status)
            VALUES (:bid, 'mock', :ref, :amount, 'refunded')
        """), {"bid": b["id"], "ref": "MOCKRF-" + secrets.token_hex(6).upper(), "amount": quote["refund_amount"]})
    return quote
