from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.enums import PaymentMethod


class PaymentCreate(BaseModel):
    customer_id: int
    amount: Decimal = Field(..., gt=0, description="Payment amount must be greater than zero")
    payment_method: PaymentMethod = PaymentMethod.CASH
    notes: Optional[str] = None
    payment_date: Optional[datetime] = None


class PaymentOut(BaseModel):
    id: int
    payment_reference: str
    customer_id: int
    customer_name: Optional[str] = None
    amount: Decimal
    payment_method: PaymentMethod
    notes: Optional[str] = None
    payment_date: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
