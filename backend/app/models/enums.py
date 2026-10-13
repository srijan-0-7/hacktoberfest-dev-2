from enum import Enum


class OrderStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class OrderSourceType(str, Enum):
    MANUAL = "MANUAL"
    AI_EXTRACTED = "AI_EXTRACTED"


class StockMovementType(str, Enum):
    SALE = "SALE"
    SALE_CANCELLED = "SALE_CANCELLED"
    ADJUSTMENT = "ADJUSTMENT"
    RESTOCK = "RESTOCK"
    OPENING = "OPENING"


class PaymentMethod(str, Enum):
    CASH = "CASH"
    UPI = "UPI"
    BANK_TRANSFER = "BANK_TRANSFER"
    CHEQUE = "CHEQUE"
