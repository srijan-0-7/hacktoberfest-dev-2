import csv
import io
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.customer import Customer
from app.models.enums import OrderStatus
from app.services.ledger_service import calculate_customer_balance, round_curr

router = APIRouter()


@router.get("/reports/sales")
def get_sales_report(db: Session = Depends(get_db)):
    # Group approved sales by month/day
    approved_orders = (
        db.query(Order)
        .filter(Order.status == OrderStatus.APPROVED)
        .order_by(Order.approved_at.asc())
        .all()
    )

    monthly_map: Dict[str, Dict[str, Any]] = {}
    for o in approved_orders:
        date_key = (o.approved_at or o.created_at).strftime("%Y-%m")
        label = (o.approved_at or o.created_at).strftime("%B %Y")
        if date_key not in monthly_map:
            monthly_map[date_key] = {"period": label, "orders_count": 0, "total_sales": Decimal("0.00")}
        monthly_map[date_key]["orders_count"] += 1
        monthly_map[date_key]["total_sales"] += round_curr(o.grand_total)

    result = list(monthly_map.values())
    for r in result:
        r["total_sales"] = float(round_curr(r["total_sales"]))
    return result


@router.get("/reports/top-products")
def get_top_products_report(limit: int = 10, db: Session = Depends(get_db)):
    # Group by product from APPROVED orders
    top_items = (
        db.query(
            OrderItem.product_name_snapshot,
            func.sum(OrderItem.quantity).label("total_quantity"),
            func.sum(OrderItem.line_total).label("total_revenue"),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Order.status == OrderStatus.APPROVED)
        .group_by(OrderItem.product_name_snapshot)
        .order_by(desc("total_revenue"))
        .limit(limit)
        .all()
    )

    result = []
    for item in top_items:
        result.append({
            "product_name": item.product_name_snapshot,
            "quantity_sold": float(item.total_quantity or 0),
            "revenue": float(round_curr(Decimal(str(item.total_revenue or "0.00")))),
        })
    return result


@router.get("/reports/inventory")
def get_inventory_report(db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.is_active == True).order_by(Product.stock_quantity.asc()).all()
    result = []
    for p in products:
        result.append({
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "category": p.category,
            "unit": p.unit,
            "stock_quantity": float(p.stock_quantity),
            "reorder_threshold": float(p.reorder_threshold),
            "selling_price": float(p.selling_price),
            "is_low_stock": p.stock_quantity <= p.reorder_threshold,
        })
    return result


@router.get("/reports/outstanding")
def get_outstanding_balances_report(db: Session = Depends(get_db)):
    customers = db.query(Customer).filter(Customer.is_active == True).order_by(Customer.name.asc()).all()
    result = []
    for c in customers:
        bal = calculate_customer_balance(db, c.id)
        if bal["current_balance"] > Decimal("0.00"):
            result.append({
                "id": c.id,
                "name": c.name,
                "business_name": c.business_name,
                "phone": c.phone,
                "opening_balance": float(bal["opening_balance"]),
                "total_sales": float(bal["total_sales"]),
                "total_payments": float(bal["total_payments"]),
                "outstanding_balance": float(bal["current_balance"]),
            })
    return result


@router.get("/reports/export/csv")
def export_sales_csv(db: Session = Depends(get_db)):
    approved_orders = (
        db.query(Order)
        .filter(Order.status == OrderStatus.APPROVED)
        .order_by(Order.approved_at.desc())
        .all()
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Order Number", "Date", "Customer", "Subtotal (INR)", "Tax Total (INR)", "Grand Total (INR)"])

    for o in approved_orders:
        writer.writerow([
            o.order_number,
            (o.approved_at or o.created_at).strftime("%Y-%m-%d %H:%M"),
            o.customer.name if o.customer else "Unassigned",
            f"{o.subtotal:.2f}",
            f"{o.tax_total:.2f}",
            f"{o.grand_total:.2f}",
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bahipilot_sales_report.csv"},
    )
