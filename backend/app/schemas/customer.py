from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    business_name: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=30)
    notes: Optional[str] = None
    opening_balance: Decimal = Field(default=Decimal("0.00"))

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    business_name: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=30)
    notes: Optional[str] = None
    opening_balance: Optional[Decimal] = None
    is_active: Optional[bool] = None


class CustomerOut(BaseModel):
    id: int
    name: str
    business_name: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    opening_balance: Decimal
    current_balance: Decimal
    total_sales: Decimal = Decimal("0.00")
    total_payments: Decimal = Decimal("0.00")
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
