from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Tuple, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.customer import Customer
from app.models.inventory import StockMovement
from app.models.settings import BusinessSettings
from app.models.enums import OrderStatus, OrderSourceType, StockMovementType
from app.schemas.order import OrderCreate, OrderUpdate, OrderItemCreate


def round_curr(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_line_item(quantity: Decimal, unit_price: Decimal, tax_rate: Decimal) -> Tuple[Decimal, Decimal, Decimal]:
    """
    Returns (line_subtotal, line_tax, line_total) calculated deterministically with Decimal.
    """
    line_subtotal = round_curr(quantity * unit_price)
    line_tax = round_curr(line_subtotal * (tax_rate / Decimal("100.00")))
    line_total = round_curr(line_subtotal + line_tax)
    return line_subtotal, line_tax, line_total


def generate_order_number(db: Session) -> str:
    current_year = datetime.now().year
    count = db.query(func.count(Order.id)).scalar() or 0
    return f"ORD-{current_year}-{(count + 1):04d}"


def create_order(db: Session, order_in: OrderCreate) -> Order:
    # Validate customer if provided
    if order_in.customer_id is not None:
        customer = db.query(Customer).filter(Customer.id == order_in.customer_id, Customer.is_active == True).first()
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found or inactive")

    # Get default settings
    settings = db.query(BusinessSettings).first()
    default_tax_rate = settings.tax_rate_default if settings else Decimal("5.00")

    order_number = generate_order_number(db)

    order = Order(
        order_number=order_number,
        customer_id=order_in.customer_id,
        status=order_in.status if order_in.status in [OrderStatus.DRAFT, OrderStatus.PENDING_REVIEW] else OrderStatus.DRAFT,
        source_type=order_in.source_type,
        source_filename=order_in.source_filename,
        notes=order_in.notes,
        subtotal=Decimal("0.00"),
        tax_total=Decimal("0.00"),
        grand_total=Decimal("0.00"),
    )
    db.add(order)
    db.flush()

    total_subtotal = Decimal("0.00")
    total_tax = Decimal("0.00")

    for item_in in order_in.items:
        if item_in.quantity <= Decimal("0.00"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Quantity for {item_in.product_name} must be greater than zero")
        if item_in.unit_price < Decimal("0.00"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unit price for {item_in.product_name} cannot be negative")

        tax_rate = item_in.tax_rate if item_in.tax_rate is not None else default_tax_rate
        line_sub, line_tx, line_tot = calculate_line_item(item_in.quantity, item_in.unit_price, tax_rate)

        sku_val = item_in.sku
        # If product_id supplied, verify and grab snapshot
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
    return order


def approve_order(db: Session, order_id: int) -> Order:
    """
    Approves an order transactionally:
    - Validates status (must be DRAFT or PENDING_REVIEW)
    - Validates customer exists
    - Validates all products exist and are active
    - Validates stock availability for each product
    - Decrements stock and creates StockMovement audit records
    - Recalculates totals on server
    - Sets status to APPROVED and records approved_at
    - Rolls back entirely on any error
    """
    order = db.query(Order).filter(Order.id == order_id).with_for_update().first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status == OrderStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order is already approved. Cannot approve duplicate.")

    if order.status not in [OrderStatus.DRAFT, OrderStatus.PENDING_REVIEW]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot approve order in {order.status.value} status")

    if not order.customer_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot approve order without an assigned customer")

    customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
    if not customer or not customer.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned customer does not exist or is inactive")

    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    if not items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order has no line items")

    # Step 1: Pre-validation of products & stock check
    products_to_deduct = []
    for item in items:
        if not item.product_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item '{item.product_name_snapshot}' is not matched to a catalogue product. Resolve all items before approval.",
            )

        product = db.query(Product).filter(Product.id == item.product_id).with_for_update().first()
        if not product or not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{item.product_name_snapshot}' does not exist or is inactive",
            )

        if product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for '{product.name}'. Required: {item.quantity} {item.unit_snapshot}, Available: {product.stock_quantity}",
            )

        products_to_deduct.append((product, item.quantity))

    # Step 2: Execute stock deduction and audit creation
    total_subtotal = Decimal("0.00")
    total_tax = Decimal("0.00")

    for item in items:
        line_sub, line_tx, line_tot = calculate_line_item(item.quantity, item.unit_price, item.tax_rate)
        item.line_total = line_tot
        total_subtotal += line_sub
        total_tax += line_tx

    for product, qty in products_to_deduct:
        product.stock_quantity -= qty
        movement = StockMovement(
            product_id=product.id,
            movement_type=StockMovementType.SALE,
            quantity_change=-qty,
            reason=f"Approved Order #{order.order_number}",
            order_id=order.id,
        )
        db.add(movement)

    # Step 3: Finalize order record
    order.subtotal = round_curr(total_subtotal)
    order.tax_total = round_curr(total_tax)
    order.grand_total = round_curr(total_subtotal + total_tax)
    order.status = OrderStatus.APPROVED
    order.approved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(order)
    return order


def reject_order(db: Session, order_id: int) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status == OrderStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot reject an already approved order. Use cancel instead.")

    if order.status in [OrderStatus.REJECTED, OrderStatus.CANCELLED]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Order is already {order.status.value}")

    order.status = OrderStatus.REJECTED
    db.commit()
    db.refresh(order)
    return order


def cancel_order(db: Session, order_id: int) -> Order:
    """
    Cancels an approved order:
    - Reverses stock movements exactly once
    - Marks order as CANCELLED
    - Excludes order from sales metrics and ledger charges
    """
    order = db.query(Order).filter(Order.id == order_id).with_for_update().first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status != OrderStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only approved orders can be cancelled")

    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    for item in items:
        if item.product_id:
            product = db.query(Product).filter(Product.id == item.product_id).with_for_update().first()
            if product:
                product.stock_quantity += item.quantity
                movement = StockMovement(
                    product_id=product.id,
                    movement_type=StockMovementType.SALE_CANCELLED,
                    quantity_change=item.quantity,
                    reason=f"Cancelled Order #{order.order_number} Reversal",
                    order_id=order.id,
                )
                db.add(movement)

    order.status = OrderStatus.CANCELLED
    db.commit()
    db.refresh(order)
    return order
