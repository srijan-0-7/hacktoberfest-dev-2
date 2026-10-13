from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.enums import OrderStatus


class RawExtractedItem(BaseModel):
    raw_product_name: str
    matched_product_id: Optional[int] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    unit_price: Optional[Decimal] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    needs_clarification: bool = True
    clarification_reason: Optional[str] = None


class ExtractedItem(BaseModel):
    raw_product_name: str
    matched_product_id: Optional[int] = None
    matched_product_name: Optional[str] = None
    matched_sku: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    unit_price: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    line_total: Optional[Decimal] = None
    confidence: float = 0.0
    needs_clarification: bool = False
    clarification_reason: Optional[str] = None


class ExtractionResult(BaseModel):
    customer_name: Optional[str] = None
    matched_customer_id: Optional[int] = None
    items: List[ExtractedItem] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)
    overall_needs_review: bool = True
    raw_extracted_text: Optional[str] = None
    provider_used: Optional[str] = None
    model_used: Optional[str] = None


class ExtractionRawLLMOutput(BaseModel):
    customer_name: Optional[str] = None
    items: List[RawExtractedItem] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)
    overall_needs_review: bool = True


class AIStatusResponse(BaseModel):
    configured_provider: str
    active_provider: str
    ollama_available: bool
    ollama_endpoint: str
    ollama_model: str
    gemini_configured: bool
    gemini_model: str
    error: Optional[str] = None
