from typing import Optional, List
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.customer import Customer
from app.models.settings import BusinessSettings
from app.schemas.extraction import ExtractionResult, ExtractedItem
from app.services.ai.base import BaseAIProvider
from app.services.ai.gemini_provider import GeminiProvider
from app.services.ai.ollama_provider import OllamaProvider
from app.services.ai.matcher import match_product, match_customer
from app.services.order_service import calculate_line_item


def get_ai_provider(provider_name: str, settings: Optional[BusinessSettings] = None) -> BaseAIProvider:
    provider = provider_name.lower().strip()
    if provider == "gemini":
        gemini_model = settings.gemini_model if settings else None
        return GeminiProvider(model_name=gemini_model)
    else:
        ollama_url = settings.ollama_base_url if settings else None
        ollama_model = settings.ollama_model if settings else None
        return OllamaProvider(base_url=ollama_url, model_name=ollama_model)


async def run_order_extraction(
    text: str,
    db: Session,
    provider_override: Optional[str] = None,
) -> ExtractionResult:
    """
    Executes the full extraction & matching pipeline:
    1. Summarizes product catalogue and customers.
    2. Runs LLM interpretation via configured provider.
    3. Deterministically matches products & customers against the catalogue.
    4. Calculates line totals and flags items requiring human clarification.
    """
    # 1. Fetch settings and catalogue
    settings = db.query(BusinessSettings).first()
    active_provider_name = provider_override or (settings.ai_provider if settings else "ollama")

    products = db.query(Product).filter(Product.is_active == True).all()
    customers = db.query(Customer).filter(Customer.is_active == True).all()

    # Create compact catalogue summary for LLM prompt context
    catalogue_lines = []
    for p in products:
        aliases_str = f" [Aliases: {', '.join(p.aliases_list)}]" if p.aliases_list else ""
        catalogue_lines.append(f"- SKU: {p.sku} | Name: {p.name} | Unit: {p.unit} | Price: ₹{p.selling_price}{aliases_str}")
    catalogue_summary = "\n".join(catalogue_lines) if catalogue_lines else "No products registered yet."

    customers_lines = []
    for c in customers:
        biz = f" ({c.business_name})" if c.business_name else ""
        customers_lines.append(f"- Name: {c.name}{biz}")
    customers_summary = "\n".join(customers_lines) if customers_lines else "No customers registered yet."

    # 2. Invoke AI Provider
    provider = get_ai_provider(active_provider_name, settings)
    raw_output = await provider.extract_order(
        text=text,
        catalogue_summary=catalogue_summary,
        customers_summary=customers_summary,
    )

    # 3. Match customer
    matched_cust, cust_score = match_customer(raw_output.customer_name, customers)
    matched_customer_id = matched_cust.id if matched_cust else None

    # 4. Match and validate each line item
    final_items: List[ExtractedItem] = []
    default_tax_rate = settings.tax_rate_default if settings else Decimal("5.00")

    for raw_item in raw_output.items:
        # Catalogue product matching
        matched_prod, match_score, match_reason = match_product(raw_item.raw_product_name, products)

        needs_clarification = raw_item.needs_clarification
        clarification_reason = raw_item.clarification_reason

        # Price and unit resolution
        unit_price = raw_item.unit_price
        unit = raw_item.unit
        tax_rate = default_tax_rate

        if matched_prod:
            # Deterministic catalogue authority overrides LLM prices
            unit_price = matched_prod.selling_price
            if not unit:
                unit = matched_prod.unit

        if not matched_prod:
            needs_clarification = True
            clarification_reason = match_reason or "Product not found in catalogue"

        if raw_item.quantity is None or raw_item.quantity <= Decimal("0.00"):
            needs_clarification = True
            clarification_reason = "Quantity is missing or uncertain"

        # Calculate preliminary line total if quantity and price are available
        line_total = None
        if raw_item.quantity and raw_item.quantity > Decimal("0.00") and unit_price is not None:
            _, _, line_total = calculate_line_item(raw_item.quantity, unit_price, tax_rate)

        final_item = ExtractedItem(
            raw_product_name=raw_item.raw_product_name,
            matched_product_id=matched_prod.id if matched_prod else None,
            matched_product_name=matched_prod.name if matched_prod else None,
            matched_sku=matched_prod.sku if matched_prod else None,
            quantity=raw_item.quantity,
            unit=unit or "piece",
            unit_price=unit_price,
            tax_rate=tax_rate,
            line_total=line_total,
            confidence=max(raw_item.confidence, match_score) if matched_prod else raw_item.confidence,
            needs_clarification=needs_clarification,
            clarification_reason=clarification_reason,
        )
        final_items.append(final_item)

    model_used = settings.gemini_model if active_provider_name == "gemini" and settings else (settings.ollama_model if settings else "qwen2.5:7b")

    return ExtractionResult(
        customer_name=raw_output.customer_name or (matched_cust.name if matched_cust else None),
        matched_customer_id=matched_customer_id,
        items=final_items,
        notes=raw_output.notes,
        overall_needs_review=True,
        raw_extracted_text=text,
        provider_used=active_provider_name,
        model_used=model_used,
    )
