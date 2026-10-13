from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.enums import OrderStatus, OrderSourceType


class OrderItemCreate(BaseModel):
    product_id: Optional[int] = None
    product_name: str = Field(..., min_length=1, max_length=200)
    sku: Optional[str] = None
    quantity: Decimal = Field(..., gt=0)
    unit: str = Field("piece", max_length=30)
    unit_price: Decimal = Field(..., ge=0)
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=0)


class OrderItemOut(BaseModel):
    id: int
    order_id: int
    product_id: Optional[int] = None
    product_name_snapshot: str
    sku_snapshot: Optional[str] = None
    quantity: Decimal
    unit_snapshot: str
    unit_price: Decimal
    tax_rate: Decimal
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    customer_id: Optional[int] = None
    source_type: OrderSourceType = OrderSourceType.MANUAL
    source_filename: Optional[str] = None
    status: OrderStatus = OrderStatus.DRAFT
    notes: Optional[str] = None
    items: List[OrderItemCreate] = Field(..., min_length=1)


class OrderUpdate(BaseModel):
    customer_id: Optional[int] = None
    status: Optional[OrderStatus] = None
    notes: Optional[str] = None
    items: Optional[List[OrderItemCreate]] = None


class OrderOut(BaseModel):
    id: int
    order_number: str
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_business_name: Optional[str] = None
    status: OrderStatus
    source_type: OrderSourceType
    source_filename: Optional[str] = None
    subtotal: Decimal
    tax_total: Decimal
    grand_total: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    approved_at: Optional[datetime] = None
    items: List[OrderItemOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class OrderListOut(BaseModel):
    id: int
    order_number: str
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    status: OrderStatus
    source_type: OrderSourceType
    grand_total: Decimal
    item_count: int
    created_at: datetime
    approved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
