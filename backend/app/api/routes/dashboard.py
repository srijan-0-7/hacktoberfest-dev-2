from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.product import Product
from app.models.customer import Customer
from app.models.order import Order
from app.models.payment import Payment
from app.models.enums import OrderStatus
from app.services.ledger_service import calculate_customer_balance, round_curr

router = APIRouter()


@router.get("/dashboard/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    # 1. Today's sales (approved orders only)
    today_sales_val = (
        db.query(func.coalesce(func.sum(Order.grand_total), Decimal("0.00")))
        .filter(Order.status == OrderStatus.APPROVED, Order.approved_at >= today_start)
        .scalar()
    )
    today_sales = round_curr(Decimal(str(today_sales_val or "0.00")))

    # 2. Total Outstanding Customer Balances across all active customers
    all_customers = db.query(Customer).filter(Customer.is_active == True).all()
    total_outstanding = Decimal("0.00")
    for c in all_customers:
        bal = calculate_customer_balance(db, c.id)
        if bal["current_balance"] > Decimal("0.00"):
            total_outstanding += bal["current_balance"]
    total_outstanding = round_curr(total_outstanding)

    # 3. Orders awaiting review
    orders_pending = (
        db.query(func.count(Order.id))
        .filter(Order.status == OrderStatus.PENDING_REVIEW)
        .scalar() or 0
    )

    # 4. Low stock product count
    low_stock_count = (
        db.query(func.count(Product.id))
        .filter(Product.is_active == True, Product.stock_quantity <= Product.reorder_threshold)
        .scalar() or 0
    )

    # 5. Recent orders
    recent_orders_db = (
        db.query(Order)
        .order_by(Order.created_at.desc())
        .limit(6)
        .all()
    )
    recent_orders = []
    for o in recent_orders_db:
        recent_orders.append({
            "id": o.id,
            "order_number": o.order_number,
            "customer_name": o.customer.name if o.customer else "Unassigned",
            "status": o.status.value,
            "source_type": o.source_type.value,
            "grand_total": round_curr(Decimal(str(o.grand_total))),
            "created_at": o.created_at,
        })

    # 6. Recent payments
    recent_payments_db = (
        db.query(Payment)
        .order_by(Payment.payment_date.desc(), Payment.created_at.desc())
        .limit(6)
        .all()
    )
    recent_payments = []
    for p in recent_payments_db:
        recent_payments.append({
            "id": p.id,
            "payment_reference": p.payment_reference,
            "customer_name": p.customer.name if p.customer else "Unknown",
            "amount": round_curr(Decimal(str(p.amount))),
            "payment_method": p.payment_method.value,
            "payment_date": p.payment_date,
        })

    return {
        "today_sales": today_sales,
        "total_outstanding": total_outstanding,
        "orders_pending_review": orders_pending,
        "low_stock_count": low_stock_count,
        "recent_orders": recent_orders,
        "recent_payments": recent_payments,
    }


@router.get("/dashboard/sales-trend")
def get_sales_trend(days: int = 7, db: Session = Depends(get_db)):
    """
    Returns daily sales aggregates for the past N days.
    Derived strictly from stored APPROVED orders.
    """
    now = datetime.now(timezone.utc)
    trend_data = []

    for i in range(days - 1, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        day_start = datetime(day_date.year, day_date.month, day_date.day, 0, 0, 0, tzinfo=timezone.utc)
        day_end = datetime(day_date.year, day_date.month, day_date.day, 23, 59, 59, tzinfo=timezone.utc)

        day_total = (
            db.query(func.coalesce(func.sum(Order.grand_total), Decimal("0.00")))
            .filter(
                Order.status == OrderStatus.APPROVED,
                Order.approved_at >= day_start,
                Order.approved_at <= day_end,
            )
            .scalar()
        )

        trend_data.append({
            "date": day_date.strftime("%d %b"),
            "full_date": day_date.isoformat(),
            "sales": float(round_curr(Decimal(str(day_total or "0.00")))),
        })

    return trend_data
