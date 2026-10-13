from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.payment import Payment
from app.models.customer import Customer
from app.schemas.payment import PaymentCreate, PaymentOut
from app.services.ledger_service import round_curr

router = APIRouter()


def payment_to_out(p: Payment) -> PaymentOut:
    return PaymentOut(
        id=p.id,
        payment_reference=p.payment_reference,
        customer_id=p.customer_id,
        customer_name=p.customer.name if p.customer else None,
        amount=round_curr(p.amount),
        payment_method=p.payment_method,
        notes=p.notes,
        payment_date=p.payment_date,
        created_at=p.created_at,
    )


@router.get("/payments", response_model=List[PaymentOut])
def list_payments(
    customer_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(Payment)
    if customer_id:
        query = query.filter(Payment.customer_id == customer_id)

    payments = query.order_by(Payment.payment_date.desc(), Payment.created_at.desc()).limit(limit).all()
    return [payment_to_out(p) for p in payments]


@router.post("/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def record_payment(payment_in: PaymentCreate, db: Session = Depends(get_db)):
    if payment_in.amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than zero",
        )

    customer = db.query(Customer).filter(Customer.id == payment_in.customer_id, Customer.is_active == True).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found or inactive",
        )

    current_year = datetime.now().year
    count = db.query(func.count(Payment.id)).scalar() or 0
    ref = f"PAY-{current_year}-{(count + 1):04d}"

    payment = Payment(
        payment_reference=ref,
        customer_id=payment_in.customer_id,
        amount=round_curr(payment_in.amount),
        payment_method=payment_in.payment_method,
        notes=payment_in.notes,
        payment_date=payment_in.payment_date or datetime.now(timezone.utc),
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment_to_out(payment)
