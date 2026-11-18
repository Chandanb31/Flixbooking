"""Public browsing endpoints: cities, movies, showtimes."""
from datetime import date

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text

from app.db import read, row_dict, rows_list

router = APIRouter(tags=["Catalog"])

MOVIE_COLS = """m.id, m.slug, m.title, m.tagline, m.synopsis, m.genres, m.language,
    m.certificate, m.duration_min, m.release_date, m.rating, m.director,
    m.cast_members, m.formats, m.status, m.poster_url"""

# A seat counts as free if it's available, or its hold has run out.
SEAT_IS_FREE = "(ss.status = 'available' OR (ss.status = 'held' AND ss.held_until < now()))"


@router.get("/cities")
def list_cities():
    with read() as conn:
        return rows_list(conn.execute(text("SELECT id, name, slug, state FROM cities ORDER BY name")))


@router.get("/movies")
def list_movies(
    status: str | None = Query(None, pattern="^(now_showing|coming_soon)$"),
    language: str | None = None,
    genre: str | None = None,
    q: str | None = Query(None, max_length=60, description="Search by title"),
):
    sql = f"SELECT {MOVIE_COLS} FROM movies m WHERE m.status <> 'ended'"
    params: dict = {}
    if status:
        sql += " AND m.status = :status"
        params["status"] = status
    if language:
        sql += " AND m.language = :language"
        params["language"] = language
    if genre:
        sql += " AND :genre = ANY (m.genres)"
        params["genre"] = genre
    if q:
        sql += " AND m.title ILIKE :q"
        params["q"] = f"%{q}%"
    sql += " ORDER BY m.status, m.rating DESC NULLS LAST, m.release_date DESC"
    with read() as conn:
        return rows_list(conn.execute(text(sql), params))


@router.get("/movies/filters")
def movie_filters():
    """Languages and genres that exist, for the filter chips on the home page."""
    with read() as conn:
        languages = conn.execute(text(
            "SELECT DISTINCT language FROM movies WHERE status <> 'ended' ORDER BY 1")).scalars().all()
        genres = conn.execute(text(
            "SELECT DISTINCT unnest(genres) FROM movies WHERE status <> 'ended' ORDER BY 1")).scalars().all()
    return {"languages": languages, "genres": genres}


def _get_movie_id(conn, slug: str) -> int:
    movie_id = conn.execute(text("SELECT id FROM movies WHERE slug = :slug"), {"slug": slug}).scalar()
    if movie_id is None:
        raise HTTPException(404, "Movie not found.")
    return movie_id


@router.get("/movies/{slug}")
def get_movie(slug: str):
    with read() as conn:
        movie = row_dict(conn.execute(
            text(f"SELECT {MOVIE_COLS} FROM movies m WHERE m.slug = :slug"), {"slug": slug}).first())
    if movie is None:
        raise HTTPException(404, "Movie not found.")
    return movie


@router.get("/movies/{slug}/dates")
def movie_show_dates(slug: str, city: str = Query(..., description="City slug, e.g. mumbai")):
    """Dates (IST) on which this movie has upcoming shows in the city."""
    with read() as conn:
        movie_id = _get_movie_id(conn, slug)
        return conn.execute(text("""
            SELECT DISTINCT (sh.starts_at AT TIME ZONE 'Asia/Kolkata')::date AS show_date
            FROM shows sh
            JOIN screens sc  ON sc.id = sh.screen_id
            JOIN theatres th ON th.id = sc.theatre_id
            JOIN cities c    ON c.id = th.city_id
            WHERE sh.movie_id = :movie_id AND c.slug = :city
              AND sh.status = 'scheduled' AND sh.starts_at > now()
            ORDER BY 1
        """), {"movie_id": movie_id, "city": city}).scalars().all()


@router.get("/movies/{slug}/showtimes")
def movie_showtimes(slug: str, city: str, show_date: date = Query(..., alias="date")):
    """Theatres in the city with their showtimes for this movie on one date."""
    with read() as conn:
        movie_id = _get_movie_id(conn, slug)
        rows = rows_list(conn.execute(text(f"""
            SELECT th.id AS theatre_id, th.name AS theatre_name, th.area, th.address, th.amenities,
                   sh.id AS show_id, sh.starts_at, sh.format, sh.language, sc.name AS screen_name,
                   (SELECT min(price) FROM show_prices p WHERE p.show_id = sh.id) AS min_price,
                   count(ss.id) AS total_seats,
                   count(ss.id) FILTER (WHERE {SEAT_IS_FREE}) AS free_seats
            FROM shows sh
            JOIN screens sc   ON sc.id = sh.screen_id
            JOIN theatres th  ON th.id = sc.theatre_id
            JOIN cities c     ON c.id = th.city_id
            JOIN show_seats ss ON ss.show_id = sh.id
            WHERE sh.movie_id = :movie_id AND c.slug = :city
              AND sh.status = 'scheduled' AND sh.starts_at > now()
              AND (sh.starts_at AT TIME ZONE 'Asia/Kolkata')::date = :show_date
            GROUP BY th.id, sh.id, sc.name
            ORDER BY th.name, th.area, sh.starts_at
        """), {"movie_id": movie_id, "city": city, "show_date": show_date}))

    theatres: dict[int, dict] = {}
    for r in rows:
        t = theatres.setdefault(r["theatre_id"], {
            "id": r["theatre_id"], "name": r["theatre_name"], "area": r["area"],
            "address": r["address"], "amenities": r["amenities"], "shows": [],
        })
        t["shows"].append({
            "id": r["show_id"], "starts_at": r["starts_at"], "format": r["format"],
            "language": r["language"], "screen_name": r["screen_name"], "min_price": r["min_price"],
            "total_seats": r["total_seats"], "free_seats": r["free_seats"],
        })
    return list(theatres.values())


@router.get("/refund-policy")
def refund_policy():
    with read() as conn:
        return rows_list(conn.execute(text(
            "SELECT min_hours_before, refund_percent, label FROM refund_rules ORDER BY min_hours_before DESC")))
