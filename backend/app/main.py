from contextlib import asynccontextmanager
from decimal import Decimal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models.settings import BusinessSettings
from app.api.routes import (
    health,
    dashboard,
    products,
    customers,
    orders,
    payments,
    reports,
    settings as settings_route,
    ai,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all tables exist on startup
    Base.metadata.create_all(bind=engine)

    # Initialize default business settings if empty
    db = SessionLocal()
    try:
        existing = db.query(BusinessSettings).first()
        if not existing:
            default_biz = BusinessSettings(
                id=1,
                business_name="BahiPilot Wholesalers & Distributors",
                address="Shop No. 12, APMC Market Yard, Pune, Maharashtra - 411037",
                phone="+91 98765 43210",
                gstin="27AABCU9603R1ZM",
                currency="INR",
                tax_rate_default=Decimal("5.00"),
                tax_inclusive=False,
                invoice_prefix="INV",
                next_invoice_number=1001,
                ai_provider=settings.AI_PROVIDER,
                gemini_model=settings.GEMINI_MODEL,
                ollama_base_url=settings.OLLAMA_BASE_URL,
                ollama_model=settings.OLLAMA_MODEL,
            )
            db.add(default_biz)
            db.commit()
    finally:
        db.close()

    yield


app = FastAPI(
    title="BahiPilot API",
    description="Local-First AI Back Office for Wholesalers and Distributors",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(products.router, prefix="/api", tags=["Products"])
app.include_router(customers.router, prefix="/api", tags=["Customers"])
app.include_router(orders.router, prefix="/api", tags=["Orders"])
app.include_router(payments.router, prefix="/api", tags=["Payments"])
app.include_router(reports.router, prefix="/api", tags=["Reports"])
app.include_router(settings_route.router, prefix="/api", tags=["Settings"])
app.include_router(ai.router, prefix="/api", tags=["AI"])
