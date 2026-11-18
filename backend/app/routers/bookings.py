from fastapi import APIRouter, Depends, status

from app.deps import get_current_user
from app.services import booking_service

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.get("/me")
def my_bookings(user: dict = Depends(get_current_user)):
    return booking_service.list_user_bookings(user["id"])


@router.get("/{code}")
def get_booking(code: str, user: dict = Depends(get_current_user)):
    return booking_service.get_booking(code, user["id"])


@router.post("/{code}/pay")
def pay(code: str, user: dict = Depends(get_current_user)):
    """Mock payment: confirms the booking. Replace with Razorpay in Phase 2."""
    booking_service.confirm_booking(code, user["id"])
    return booking_service.get_booking(code, user["id"])


@router.post("/{code}/release", status_code=status.HTTP_204_NO_CONTENT)
def release(code: str, user: dict = Depends(get_current_user)):
    """User backed out of checkout: free the held seats immediately."""
    booking_service.release_booking(code, user["id"])


@router.get("/{code}/refund-quote")
def refund_quote(code: str, user: dict = Depends(get_current_user)):
    return booking_service.refund_quote(code, user["id"])


@router.post("/{code}/cancel")
def cancel(code: str, user: dict = Depends(get_current_user)):
    quote = booking_service.cancel_booking(code, user["id"])
    return {"booking": booking_service.get_booking(code, user["id"]), "refund": quote}
