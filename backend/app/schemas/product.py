from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


class ProductBase(BaseModel):
    sku: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    category: str = Field("General", max_length=100)
    unit: str = Field("piece", max_length=30)
    selling_price: Decimal = Field(..., ge=0)
    stock_quantity: Decimal = Field(default=Decimal("0.00"), ge=0)
    reorder_threshold: Decimal = Field(default=Decimal("10.00"), ge=0)
    aliases: List[str] = Field(default_factory=list)

    @field_validator("sku", "name", "category", "unit")
    @classmethod
    def strip_strings(cls, v: str) -> str:
        return v.strip()


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    sku: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    unit: Optional[str] = Field(None, max_length=30)
    selling_price: Optional[Decimal] = Field(None, ge=0)
    reorder_threshold: Optional[Decimal] = Field(None, ge=0)
    aliases: Optional[List[str]] = None
    is_active: Optional[bool] = None


class StockAdjustmentCreate(BaseModel):
    quantity_change: Decimal = Field(..., description="Positive for addition, negative for deduction")
    reason: str = Field(..., min_length=3, max_length=255)


class ProductOut(BaseModel):
    id: int
    sku: str
    name: str
    category: str
    unit: str
    selling_price: Decimal
    stock_quantity: Decimal
    reorder_threshold: Decimal
    aliases: List[str]
    is_active: bool
    is_low_stock: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
