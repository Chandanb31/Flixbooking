from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text

from app.db import read, row_dict, rows_list
from app.deps import get_current_user
from app.schemas.requests import HoldSeatsIn
from app.services import booking_service

router = APIRouter(prefix="/shows", tags=["Shows & seats"])


@router.get("/{show_id}")
def get_show(show_id: int):
    """Everything the seat-selection page needs: show info, prices and the seat map."""
    with read() as conn:
        show = row_dict(conn.execute(text("""
            SELECT sh.id, sh.starts_at, sh.ends_at, sh.format, sh.language, sh.status,
                   sh.starts_at > now() AS is_bookable,
                   sc.name AS screen_name, sc.screen_type,
                   th.id AS theatre_id, th.name AS theatre_name, th.area AS theatre_area, c.name AS city,
                   m.slug AS movie_slug, m.title AS movie_title, m.poster_url, m.certificate, m.duration_min
            FROM shows sh
            JOIN screens sc  ON sc.id = sh.screen_id
            JOIN theatres th ON th.id = sc.theatre_id
            JOIN cities c    ON c.id = th.city_id
            JOIN movies m    ON m.id = sh.movie_id
            WHERE sh.id = :id
        """), {"id": show_id}).first())
        if show is None:
            raise HTTPException(404, "Show not found.")

        show["prices"] = rows_list(conn.execute(text("""
            SELECT seat_type, price FROM show_prices WHERE show_id = :id
            ORDER BY price DESC
        """), {"id": show_id}))

        show["seats"] = rows_list(conn.execute(text("""
            SELECT se.id, se.row_label, se.seat_number, se.col_index, se.seat_type, se.is_accessible,
                   CASE
                     WHEN ss.status = 'booked' THEN 'booked'
                     WHEN ss.status = 'held' AND ss.held_until > now() THEN 'held'
                     ELSE 'available'
                   END AS status
            FROM show_seats ss
            JOIN seats se ON se.id = ss.seat_id
            WHERE ss.show_id = :id
            ORDER BY se.row_label DESC, se.col_index
        """), {"id": show_id}))
    return show


@router.post("/{show_id}/hold", status_code=status.HTTP_201_CREATED)
def hold_seats(show_id: int, body: HoldSeatsIn, user: dict = Depends(get_current_user)):
    """Reserve seats for a few minutes while the user pays."""
    code = booking_service.hold_seats(user["id"], show_id, body.seat_ids)
    return booking_service.get_booking(code, user["id"])
