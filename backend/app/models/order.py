from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import OrderStatus, OrderSourceType


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(SQLEnum(OrderStatus), nullable=False, default=OrderStatus.DRAFT, index=True)
    source_type = Column(SQLEnum(OrderSourceType), nullable=False, default=OrderSourceType.MANUAL)
    source_filename = Column(String(255), nullable=True)
    subtotal = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    tax_total = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    grand_total = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    approved_at = Column(DateTime, nullable=True)

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    stock_movements = relationship("StockMovement", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    product_name_snapshot = Column(String(200), nullable=False)
    sku_snapshot = Column(String(50), nullable=True)
    quantity = Column(Numeric(12, 2), nullable=False, default=Decimal("1.00"))
    unit_snapshot = Column(String(30), nullable=False, default="piece")
    unit_price = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    tax_rate = Column(Numeric(5, 2), nullable=False, default=Decimal("0.00"))
    line_total = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
