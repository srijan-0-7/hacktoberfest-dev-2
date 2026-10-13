import csv
import io
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.customer import Customer
from app.models.settings import BusinessSettings
from app.models.enums import OrderStatus, OrderSourceType
from app.schemas.order import OrderCreate, OrderUpdate, OrderOut, OrderListOut, OrderItemOut
from app.services.order_service import (
    create_order,
    approve_order,
    reject_order,
    cancel_order,
    calculate_line_item,
    round_curr,
)
from app.services.ledger_service import calculate_customer_balance

router = APIRouter()


def order_to_out(o: Order) -> OrderOut:
    items_out = []
    for item in o.items:
        items_out.append(
            OrderItemOut(
                id=item.id,
                order_id=item.order_id,
                product_id=item.product_id,
                product_name_snapshot=item.product_name_snapshot,
                sku_snapshot=item.sku_snapshot,
                quantity=item.quantity,
                unit_snapshot=item.unit_snapshot,
                unit_price=item.unit_price,
                tax_rate=item.tax_rate,
                line_total=item.line_total,
            )
        )

    return OrderOut(
        id=o.id,
        order_number=o.order_number,
        customer_id=o.customer_id,
        customer_name=o.customer.name if o.customer else None,
        customer_phone=o.customer.phone if o.customer else None,
        customer_business_name=o.customer.business_name if o.customer else None,
        status=o.status,
        source_type=o.source_type,
        source_filename=o.source_filename,
        subtotal=o.subtotal,
        tax_total=o.tax_total,
        grand_total=o.grand_total,
        notes=o.notes,
        created_at=o.created_at,
        updated_at=o.updated_at,
        approved_at=o.approved_at,
        items=items_out,
    )


@router.get("/orders", response_model=List[OrderListOut])
def list_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Order)

    if status_filter and status_filter.upper() != "ALL":
        try:
            target_status = OrderStatus(status_filter.upper())
            query = query.filter(Order.status == target_status)
        except ValueError:
            pass

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.outerjoin(Customer).filter(
            or_(
                Order.order_number.ilike(term),
                Customer.name.ilike(term),
                Customer.business_name.ilike(term),
            )
        )

    orders = query.order_by(Order.created_at.desc()).all()

    result = []
    for o in orders:
        result.append(
            OrderListOut(
                id=o.id,
                order_number=o.order_number,
                customer_id=o.customer_id,
                customer_name=o.customer.name if o.customer else "Unassigned",
                status=o.status,
                source_type=o.source_type,
                grand_total=o.grand_total,
                item_count=len(o.items),
                created_at=o.created_at,
                approved_at=o.approved_at,
            )
        )
    return result


@router.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_new_order(order_in: OrderCreate, db: Session = Depends(get_db)):
    order = create_order(db, order_in)
    return order_to_out(order)


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order_detail(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order_to_out(order)


@router.patch("/orders/{order_id}", response_model=OrderOut)
def update_order(order_id: int, order_update: OrderUpdate, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status not in [OrderStatus.DRAFT, OrderStatus.PENDING_REVIEW]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit order in {order.status.value} status. Only DRAFT or PENDING_REVIEW orders can be edited.",
        )

    if order_update.customer_id is not None:
        if order_update.customer_id > 0:
            customer = db.query(Customer).filter(Customer.id == order_update.customer_id).first()
            if not customer:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Customer not found")
            order.customer_id = customer.id
        else:
            order.customer_id = None

    if order_update.notes is not None:
        order.notes = order_update.notes

    if order_update.status is not None:
        if order_update.status in [OrderStatus.DRAFT, OrderStatus.PENDING_REVIEW]:
            order.status = order_update.status

    if order_update.items is not None:
        # Replace line items and recalculate
        db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()

        settings = db.query(BusinessSettings).first()
        default_tax_rate = settings.tax_rate_default if settings else Decimal("5.00")

        total_subtotal = Decimal("0.00")
        total_tax = Decimal("0.00")

        for item_in in order_update.items:
            tax_rate = item_in.tax_rate if item_in.tax_rate is not None else default_tax_rate
            line_sub, line_tx, line_tot = calculate_line_item(item_in.quantity, item_in.unit_price, tax_rate)

            sku_val = item_in.sku
            if item_in.product_id:
                prod = db.query(Product).filter(Product.id == item_in.product_id).first()
                if prod:
                    sku_val = prod.sku

            order_item = OrderItem(
                order_id=order.id,
                product_id=item_in.product_id,
                product_name_snapshot=item_in.product_name,
                sku_snapshot=sku_val,
                quantity=item_in.quantity,
                unit_snapshot=item_in.unit,
                unit_price=item_in.unit_price,
                tax_rate=tax_rate,
                line_total=line_tot,
            )
            db.add(order_item)
            total_subtotal += line_sub
            total_tax += line_tx

        order.subtotal = round_curr(total_subtotal)
        order.tax_total = round_curr(total_tax)
        order.grand_total = round_curr(total_subtotal + total_tax)

    db.commit()
    db.refresh(order)
    return order_to_out(order)


@router.post("/orders/{order_id}/approve", response_model=OrderOut)
def approve_existing_order(order_id: int, db: Session = Depends(get_db)):
    order = approve_order(db, order_id)
    return order_to_out(order)


@router.post("/orders/{order_id}/reject", response_model=OrderOut)
def reject_existing_order(order_id: int, db: Session = Depends(get_db)):
    order = reject_order(db, order_id)
    return order_to_out(order)


@router.post("/orders/{order_id}/cancel", response_model=OrderOut)
def cancel_existing_order(order_id: int, db: Session = Depends(get_db)):
    order = cancel_order(db, order_id)
    return order_to_out(order)


@router.get("/orders/{order_id}/invoice")
def get_order_invoice(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    settings = db.query(BusinessSettings).first()
    customer_balance = None
    if order.customer_id:
        bal = calculate_customer_balance(db, order.customer_id)
        customer_balance = bal["current_balance"]

    return {
        "business": {
            "name": settings.business_name if settings else "BahiPilot Wholesalers",
            "address": settings.address if settings else "",
            "phone": settings.phone if settings else "",
            "gstin": settings.gstin if settings else None,
            "currency": settings.currency if settings else "INR",
        },
        "order": order_to_out(order),
        "customer_balance": customer_balance,
    }
