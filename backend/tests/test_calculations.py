from decimal import Decimal
import pytest
from app.services.order_service import calculate_line_item, round_curr
from app.services.ai.matcher import normalize_text, match_product
from app.models.product import Product


def test_round_curr():
    assert round_curr(Decimal("100.555")) == Decimal("100.56")
    assert round_curr(Decimal("100.554")) == Decimal("100.55")
    assert round_curr(Decimal("0.000")) == Decimal("0.00")


def test_calculate_line_item_math():
    # 10 units at 440.00 with 5% tax
    subtotal, tax, total = calculate_line_item(Decimal("10.00"), Decimal("440.00"), Decimal("5.00"))
    assert subtotal == Decimal("4400.00")
    assert tax == Decimal("220.00")
    assert total == Decimal("4620.00")


def test_calculate_line_item_zero_tax():
    subtotal, tax, total = calculate_line_item(Decimal("2.50"), Decimal("100.00"), Decimal("0.00"))
    assert subtotal == Decimal("250.00")
    assert tax == Decimal("0.00")
    assert total == Decimal("250.00")


def test_normalize_text():
    assert normalize_text("Aashirvaad Atta (10kg)!!") == "aashirvaad atta 10kg"
    assert normalize_text("  Tata  Tea   PREMIUM  ") == "tata tea premium"


def test_deterministic_matcher():
    p1 = Product(
        id=1,
        sku="FMCG-ATT-01",
        name="Aashirvaad Shudh Chakki Atta 10kg",
        category="Grains",
        unit="bag",
        selling_price=Decimal("440.00"),
        stock_quantity=Decimal("100.00"),
    )
    p1.aliases_list = ["aashirvaad atta 10kg", "chakki atta"]

    # Match exact alias
    matched, score, reason = match_product("chakki atta", [p1])
    assert matched is not None
    assert matched.id == 1
    assert score >= 0.9

    # Match exact SKU
    matched_sku, score_sku, _ = match_product("FMCG-ATT-01", [p1])
    assert matched_sku is not None
    assert score_sku == 1.0

    # Unmatched
    unmatched, score_un, reason_un = match_product("Unknown Gadget", [p1])
    assert unmatched is None
    assert score_un == 0.0
