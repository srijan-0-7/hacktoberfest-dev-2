import csv
import io
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.product import Product
from app.models.inventory import StockMovement
from app.models.enums import StockMovementType
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, StockAdjustmentCreate

router = APIRouter()


def product_to_out(p: Product) -> ProductOut:
    return ProductOut(
        id=p.id,
        sku=p.sku,
        name=p.name,
        category=p.category,
        unit=p.unit,
        selling_price=p.selling_price,
        stock_quantity=p.stock_quantity,
        reorder_threshold=p.reorder_threshold,
        aliases=p.aliases_list,
        is_active=p.is_active,
        is_low_stock=p.stock_quantity <= p.reorder_threshold,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.get("/products", response_model=List[ProductOut])
def list_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock_only: bool = False,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if not include_inactive:
        query = query.filter(Product.is_active == True)

    if category and category != "all":
        query = query.filter(Product.category == category)

    if low_stock_only:
        query = query.filter(Product.stock_quantity <= Product.reorder_threshold)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.name.ilike(term),
                Product.sku.ilike(term),
                Product._aliases.ilike(term),
                Product.category.ilike(term),
            )
        )

    products = query.order_by(Product.name.asc()).all()
    return [product_to_out(p) for p in products]


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(product_in: ProductCreate, db: Session = Depends(get_db)):
    existing = db.query(Product).filter(Product.sku.ilike(product_in.sku)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{product_in.sku}' already exists",
        )

    product = Product(
        sku=product_in.sku,
        name=product_in.name,
        category=product_in.category,
        unit=product_in.unit,
        selling_price=product_in.selling_price,
        stock_quantity=product_in.stock_quantity,
        reorder_threshold=product_in.reorder_threshold,
    )
    product.aliases_list = product_in.aliases
    db.add(product)
    db.flush()

    # If opening stock > 0, create audit movement
    if product.stock_quantity > Decimal("0.00"):
        movement = StockMovement(
            product_id=product.id,
            movement_type=StockMovementType.OPENING,
            quantity_change=product.stock_quantity,
            reason="Initial opening inventory",
        )
        db.add(movement)

    db.commit()
    db.refresh(product)
    return product_to_out(product)


@router.get("/products/export/csv")
def export_products_csv(db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.is_active == True).order_by(Product.name.asc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["SKU", "Name", "Category", "Unit", "Selling Price", "Stock Quantity", "Reorder Threshold", "Aliases"])

    for p in products:
        writer.writerow([
            p.sku,
            p.name,
            p.category,
            p.unit,
            f"{p.selling_price:.2f}",
            f"{p.stock_quantity:.2f}",
            f"{p.reorder_threshold:.2f}",
            "; ".join(p.aliases_list),
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bahipilot_products.csv"},
    )


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product_to_out(product)


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, product_update: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if product_update.sku and product_update.sku.lower() != product.sku.lower():
        existing = db.query(Product).filter(Product.sku.ilike(product_update.sku), Product.id != product_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU already in use")
        product.sku = product_update.sku

    if product_update.name is not None:
        product.name = product_update.name
    if product_update.category is not None:
        product.category = product_update.category
    if product_update.unit is not None:
        product.unit = product_update.unit
    if product_update.selling_price is not None:
        product.selling_price = product_update.selling_price
    if product_update.reorder_threshold is not None:
        product.reorder_threshold = product_update.reorder_threshold
    if product_update.aliases is not None:
        product.aliases_list = product_update.aliases
    if product_update.is_active is not None:
        product.is_active = product_update.is_active

    db.commit()
    db.refresh(product)
    return product_to_out(product)


@router.delete("/products/{product_id}")
def archive_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product.is_active = False
    db.commit()
    return {"message": f"Product '{product.name}' archived successfully"}


@router.post("/products/{product_id}/stock-adjustments", response_model=ProductOut)
def adjust_stock(product_id: int, adj: StockAdjustmentCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).with_for_update().first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    new_stock = product.stock_quantity + adj.quantity_change
    if new_stock < Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Adjustment would result in negative stock ({new_stock}). Current: {product.stock_quantity}",
        )

    product.stock_quantity = new_stock
    movement = StockMovement(
        product_id=product.id,
        movement_type=StockMovementType.ADJUSTMENT,
        quantity_change=adj.quantity_change,
        reason=adj.reason,
    )
    db.add(movement)
    db.commit()
    db.refresh(product)
    return product_to_out(product)
