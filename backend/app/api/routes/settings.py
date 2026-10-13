from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.settings import BusinessSettings
from app.schemas.settings import BusinessSettingsOut, BusinessSettingsUpdate

router = APIRouter()


def get_or_create_settings(db: Session) -> BusinessSettings:
    settings = db.query(BusinessSettings).first()
    if not settings:
        settings = BusinessSettings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/settings", response_model=BusinessSettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)


@router.patch("/settings", response_model=BusinessSettingsOut)
def update_settings(settings_update: BusinessSettingsUpdate, db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)

    if settings_update.business_name is not None:
        settings.business_name = settings_update.business_name
    if settings_update.address is not None:
        settings.address = settings_update.address
    if settings_update.phone is not None:
        settings.phone = settings_update.phone
    if settings_update.gstin is not None:
        settings.gstin = settings_update.gstin
    if settings_update.currency is not None:
        settings.currency = settings_update.currency
    if settings_update.tax_rate_default is not None:
        settings.tax_rate_default = settings_update.tax_rate_default
    if settings_update.tax_inclusive is not None:
        settings.tax_inclusive = settings_update.tax_inclusive
    if settings_update.invoice_prefix is not None:
        settings.invoice_prefix = settings_update.invoice_prefix
    if settings_update.next_invoice_number is not None:
        settings.next_invoice_number = settings_update.next_invoice_number
    if settings_update.ai_provider is not None:
        if settings_update.ai_provider.lower() in ["ollama", "gemini"]:
            settings.ai_provider = settings_update.ai_provider.lower()
    if settings_update.gemini_model is not None:
        settings.gemini_model = settings_update.gemini_model
    if settings_update.ollama_base_url is not None:
        settings.ollama_base_url = settings_update.ollama_base_url
    if settings_update.ollama_model is not None:
        settings.ollama_model = settings_update.ollama_model

    db.commit()
    db.refresh(settings)
    return settings
