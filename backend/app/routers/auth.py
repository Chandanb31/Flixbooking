from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.security import create_access_token, hash_password, verify_password
from app.db import read, row_dict, tx
from app.deps import get_current_user
from app.schemas.requests import LoginIn, RegisterIn

router = APIRouter(prefix="/auth", tags=["Auth"])

PUBLIC_USER_COLS = "id, full_name, email, phone, role, created_at"


def _auth_response(user: dict) -> dict:
    return {"access_token": create_access_token(user["id"], user["role"]),
            "token_type": "bearer", "user": user}


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn):
    try:
        with tx() as conn:
            user = row_dict(conn.execute(text(f"""
                INSERT INTO users (full_name, email, phone, password_hash)
                VALUES (:full_name, lower(:email), :phone, :password_hash)
                RETURNING {PUBLIC_USER_COLS}
            """), {
                "full_name": body.full_name.strip(),
                "email": body.email,
                "phone": body.phone,
                "password_hash": hash_password(body.password),
            }).first())
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")
    return _auth_response(user)


@router.post("/login")
def login(body: LoginIn):
    with read() as conn:
        row = row_dict(conn.execute(
            text(f"SELECT {PUBLIC_USER_COLS}, password_hash FROM users WHERE lower(email) = lower(:email)"),
            {"email": body.email},
        ).first())
    if row is None or not verify_password(body.password, row.pop("password_hash")):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    return _auth_response(row)


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return user
