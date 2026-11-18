"""Database connection.

We use SQLAlchemy Core with plain SQL (text()) so every query is visible
and matches what you'd run in psql. The tables themselves are created by
database/schema.sql, not by Python.

    with read() as conn:   # for SELECTs
    with tx() as conn:     # for writes: commits at the end, rolls back on error
"""
from contextlib import contextmanager
from typing import Any, Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Connection, Row

from app.core.config import get_settings

engine = create_engine(
    get_settings().database_url,
    pool_pre_ping=True,      # Neon suspends idle databases; re-check connections
    pool_size=5,
    max_overflow=5,
    pool_recycle=300,
)


@contextmanager
def read() -> Iterator[Connection]:
    with engine.connect() as conn:
        yield conn


@contextmanager
def tx() -> Iterator[Connection]:
    with engine.begin() as conn:
        yield conn


def row_dict(row: Row | None) -> dict[str, Any] | None:
    return dict(row._mapping) if row is not None else None


def rows_list(rows) -> list[dict[str, Any]]:
    return [dict(r._mapping) for r in rows]
