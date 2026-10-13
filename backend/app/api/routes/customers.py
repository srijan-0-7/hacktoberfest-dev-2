import csv
import io
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerOut
from app.services.ledger_service import calculate_customer_balance, get_customer_ledger

router = APIRouter()


def customer_to_out(c: Customer, db: Session) -> CustomerOut:
    bal = calculate_customer_balance(db, c.id)
    return CustomerOut(
        id=c.id,
        name=c.name,
        business_name=c.business_name,
        phone=c.phone,
        notes=c.notes,
        opening_balance=bal["opening_balance"],
        current_balance=bal["current_balance"],
        total_sales=bal["total_sales"],
        total_payments=bal["total_payments"],
        is_active=c.is_active,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


@router.get("/customers", response_model=List[CustomerOut])
def list_customers(
    search: Optional[str] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(Customer)
    if not include_inactive:
        query = query.filter(Customer.is_active == True)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Customer.name.ilike(term),
                Customer.business_name.ilike(term),
                Customer.phone.ilike(term),
            )
        )

    customers = query.order_by(Customer.name.asc()).all()
    return [customer_to_out(c, db) for c in customers]


@router.post("/customers", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(customer_in: CustomerCreate, db: Session = Depends(get_db)):
    customer = Customer(
        name=customer_in.name,
        business_name=customer_in.business_name,
        phone=customer_in.phone,
        notes=customer_in.notes,
        opening_balance=customer_in.opening_balance,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer_to_out(customer, db)


@router.get("/customers/export/csv")
def export_customers_csv(db: Session = Depends(get_db)):
    customers = db.query(Customer).filter(Customer.is_active == True).order_by(Customer.name.asc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Business Name", "Phone", "Opening Balance", "Total Sales", "Total Payments", "Outstanding Balance", "Notes"])

    for c in customers:
        bal = calculate_customer_balance(db, c.id)
        writer.writerow([
            c.id,
            c.name,
            c.business_name or "",
            c.phone or "",
            f"{bal['opening_balance']:.2f}",
            f"{bal['total_sales']:.2f}",
            f"{bal['total_payments']:.2f}",
            f"{bal['current_balance']:.2f}",
            c.notes or "",
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bahipilot_customers.csv"},
    )


@router.get("/customers/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer_to_out(customer, db)


@router.patch("/customers/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: int, customer_update: CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    if customer_update.name is not None:
        customer.name = customer_update.name
    if customer_update.business_name is not None:
        customer.business_name = customer_update.business_name
    if customer_update.phone is not None:
        customer.phone = customer_update.phone
    if customer_update.notes is not None:
        customer.notes = customer_update.notes
    if customer_update.opening_balance is not None:
        customer.opening_balance = customer_update.opening_balance
    if customer_update.is_active is not None:
        customer.is_active = customer_update.is_active

    db.commit()
    db.refresh(customer)
    return customer_to_out(customer, db)


@router.get("/customers/{customer_id}/ledger")
def get_ledger(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    entries = get_customer_ledger(db, customer_id)
    summary = calculate_customer_balance(db, customer_id)

    return {
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "business_name": customer.business_name,
            "phone": customer.phone,
        },
        "summary": summary,
        "entries": entries,
    }
