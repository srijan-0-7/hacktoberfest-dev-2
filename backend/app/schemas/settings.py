from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class BusinessSettingsOut(BaseModel):
    id: int
    business_name: str
    address: str
    phone: str
    gstin: Optional[str] = None
    currency: str
    tax_rate_default: Decimal
    tax_inclusive: bool
    invoice_prefix: str
    next_invoice_number: int
    ai_provider: str
    gemini_model: str
    ollama_base_url: str
    ollama_model: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BusinessSettingsUpdate(BaseModel):
    business_name: Optional[str] = Field(None, min_length=1, max_length=200)
    address: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    currency: Optional[str] = None
    tax_rate_default: Optional[Decimal] = Field(None, ge=0)
    tax_inclusive: Optional[bool] = None
    invoice_prefix: Optional[str] = None
    next_invoice_number: Optional[int] = Field(None, ge=1)
    ai_provider: Optional[str] = None
    gemini_model: Optional[str] = None
    ollama_base_url: Optional[str] = None
    ollama_model: Optional[str] = None
