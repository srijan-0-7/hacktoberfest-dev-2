from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.customer import Customer
from app.models.order import Order
from app.models.payment import Payment
from app.models.enums import OrderStatus, PaymentMethod


def round_curr(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_customer_balance(db: Session, customer_id: int) -> Dict[str, Decimal]:
    """
    Single source of truth for customer ledger calculation.
    Current balance = opening balance + approved order charges - recorded payments.
    Positive balance means the customer owes money.
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        return {
            "opening_balance": Decimal("0.00"),
            "total_sales": Decimal("0.00"),
            "total_payments": Decimal("0.00"),
            "current_balance": Decimal("0.00"),
        }

    # Sum approved orders only (exclude DRAFT, PENDING_REVIEW, REJECTED, CANCELLED)
    total_sales_res = (
        db.query(func.coalesce(func.sum(Order.grand_total), Decimal("0.00")))
        .filter(Order.customer_id == customer_id, Order.status == OrderStatus.APPROVED)
        .scalar()
    )
    total_sales = round_curr(Decimal(str(total_sales_res or "0.00")))

    # Sum all payments
    total_payments_res = (
        db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .filter(Payment.customer_id == customer_id)
        .scalar()
    )
    total_payments = round_curr(Decimal(str(total_payments_res or "0.00")))

    opening_balance = round_curr(Decimal(str(customer.opening_balance or "0.00")))
    current_balance = round_curr(opening_balance + total_sales - total_payments)

    return {
        "opening_balance": opening_balance,
        "total_sales": total_sales,
        "total_payments": total_payments,
        "current_balance": current_balance,
    }


def get_customer_ledger(db: Session, customer_id: int) -> List[Dict[str, Any]]:
    """
    Returns unified chronological ledger transactions with a running balance.
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        return []

    opening_balance = round_curr(Decimal(str(customer.opening_balance or "0.00")))

    # Fetch approved orders
    orders = (
        db.query(Order)
        .filter(Order.customer_id == customer_id, Order.status == OrderStatus.APPROVED)
        .all()
    )

    # Fetch payments
    payments = db.query(Payment).filter(Payment.customer_id == customer_id).all()

    entries = []

    # Opening balance entry if non-zero
    if opening_balance != Decimal("0.00"):
        entries.append({
            "id": f"opening-{customer.id}",
            "date": customer.created_at,
            "type": "OPENING_BALANCE",
            "reference": "Opening Balance",
            "description": "Initial account opening balance",
            "debit": opening_balance if opening_balance > 0 else Decimal("0.00"),
            "credit": abs(opening_balance) if opening_balance < 0 else Decimal("0.00"),
            "amount": opening_balance,
        })

    for o in orders:
        entry_date = o.approved_at or o.created_at
        grand_total = round_curr(Decimal(str(o.grand_total)))
        entries.append({
            "id": f"order-{o.id}",
            "date": entry_date,
            "type": "ORDER",
            "reference": o.order_number,
            "description": f"Invoice for order {o.order_number}",
            "debit": grand_total,
            "credit": Decimal("0.00"),
            "amount": grand_total,
        })

    for p in payments:
        amount = round_curr(Decimal(str(p.amount)))
        entries.append({
            "id": f"payment-{p.id}",
            "date": p.payment_date or p.created_at,
            "type": "PAYMENT",
            "reference": p.payment_reference,
            "description": f"Payment received via {p.payment_method.value}" + (f": {p.notes}" if p.notes else ""),
            "debit": Decimal("0.00"),
            "credit": amount,
            "amount": amount,
        })

    # Sort chronologically
    entries.sort(key=lambda x: x["date"])

    # Calculate running balance
    running_balance = Decimal("0.00")
    for item in entries:
        running_balance += item["debit"] - item["credit"]
        item["running_balance"] = round_curr(running_balance)

    return entries
