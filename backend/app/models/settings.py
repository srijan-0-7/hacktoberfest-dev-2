from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, Text
from app.database import Base


class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id = Column(Integer, primary_key=True, default=1)
    business_name = Column(String(200), nullable=False, default="BahiPilot Wholesalers & Distributors")
    address = Column(Text, nullable=False, default="Shop No. 12, APMC Market Yard, Pune, Maharashtra - 411037")
    phone = Column(String(50), nullable=False, default="+91 98765 43210")
    gstin = Column(String(30), nullable=True, default="27AABCU9603R1ZM")
    currency = Column(String(10), nullable=False, default="INR")
    tax_rate_default = Column(Numeric(5, 2), nullable=False, default=Decimal("5.00"))
    tax_inclusive = Column(Boolean, nullable=False, default=False)
    invoice_prefix = Column(String(20), nullable=False, default="INV")
    next_invoice_number = Column(Integer, nullable=False, default=1001)
    ai_provider = Column(String(30), nullable=False, default="ollama")
    gemini_model = Column(String(50), nullable=False, default="gemini-2.5-flash")
    ollama_base_url = Column(String(150), nullable=False, default="http://localhost:11434")
    ollama_model = Column(String(50), nullable=False, default="qwen2.5:7b")
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
