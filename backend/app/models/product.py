from datetime import datetime, timezone
import json
from decimal import Decimal
from typing import List
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), index=True, nullable=False)
    category = Column(String(100), index=True, nullable=False, default="General")
    unit = Column(String(30), nullable=False, default="piece")
    selling_price = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    stock_quantity = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    reorder_threshold = Column(Numeric(12, 2), nullable=False, default=Decimal("10.00"))
    _aliases = Column("aliases", Text, nullable=False, default="[]")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    stock_movements = relationship("StockMovement", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")

    @property
    def aliases_list(self) -> List[str]:
        try:
            return json.loads(self._aliases) if self._aliases else []
        except Exception:
            return []

    @aliases_list.setter
    def aliases_list(self, values: List[str]):
        clean = [v.strip().lower() for v in values if v and v.strip()]
        self._aliases = json.dumps(list(dict.fromkeys(clean)))
