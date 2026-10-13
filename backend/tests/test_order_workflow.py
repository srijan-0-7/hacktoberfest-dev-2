from decimal import Decimal
import pytest
from app.models.enums import OrderStatus
from app.models.product import Product
from app.models.customer import Customer
from app.models.inventory import StockMovement


def test_full_order_lifecycle_and_accounting(client, db_session):
    # 1. Create product and customer
    prod_resp = client.post(
        "/api/products",
        json={
            "sku": "FMCG-ATT-01",
            "name": "Aashirvaad Atta 10kg",
            "category": "Grains",
            "unit": "bag",
            "selling_price": 440.00,
            "stock_quantity": 50.00,
            "reorder_threshold": 10.00,
        },
    )
    assert prod_resp.status_code == 201
    prod_id = prod_resp.json()["id"]

    cust_resp = client.post(
        "/api/customers",
        json={
            "name": "Gupta Kirana",
            "business_name": "Gupta General Stores",
            "phone": "+91 9823456789",
            "opening_balance": 1000.00,
        },
    )
    assert cust_resp.status_code == 201
    cust_id = cust_resp.json()["id"]

    # Initial customer balance check
    cust_detail = client.get(f"/api/customers/{cust_id}").json()
    assert Decimal(str(cust_detail["current_balance"])) == Decimal("1000.00")

    # 2. Create order as DRAFT
    order_resp = client.post(
        "/api/orders",
        json={
            "customer_id": cust_id,
            "status": "DRAFT",
            "items": [
                {
                    "product_id": prod_id,
                    "product_name": "Aashirvaad Atta 10kg",
                    "quantity": 10.00,
                    "unit": "bag",
                    "unit_price": 440.00,
                    "tax_rate": 5.00,
                }
            ],
        },
    )
    assert order_resp.status_code == 201
    order_data = order_resp.json()
    order_id = order_data["id"]
    assert order_data["status"] == "DRAFT"
    # Subtotal = 4400, Tax (5%) = 220, Grand Total = 4620
    assert Decimal(str(order_data["grand_total"])) == Decimal("4620.00")

    # 3. Confirm that DRAFT does NOT deduct stock or alter customer balance
    p_check = client.get(f"/api/products/{prod_id}").json()
    assert Decimal(str(p_check["stock_quantity"])) == Decimal("50.00")

    c_check = client.get(f"/api/customers/{cust_id}").json()
    assert Decimal(str(c_check["current_balance"])) == Decimal("1000.00")

    # 4. Approve the order
    appr_resp = client.post(f"/api/orders/{order_id}/approve")
    assert appr_resp.status_code == 200
    assert appr_resp.json()["status"] == "APPROVED"

    # 5. Verify stock decreased exactly once (50 - 10 = 40)
    p_appr = client.get(f"/api/products/{prod_id}").json()
    assert Decimal(str(p_appr["stock_quantity"])) == Decimal("40.00")

    # 6. Verify customer balance increased correctly (1000 + 4620 = 5620)
    c_appr = client.get(f"/api/customers/{cust_id}").json()
    assert Decimal(str(c_appr["current_balance"])) == Decimal("5620.00")

    # 7. Record partial payment
    pay_resp = client.post(
        "/api/payments",
        json={
            "customer_id": cust_id,
            "amount": 2000.00,
            "payment_method": "UPI",
            "notes": "Partial payment",
        },
    )
    assert pay_resp.status_code == 201

    # 8. Verify customer balance decreased correctly (5620 - 2000 = 3620)
    c_pay = client.get(f"/api/customers/{cust_id}").json()
    assert Decimal(str(c_pay["current_balance"])) == Decimal("3620.00")

    # 9. Attempt duplicate approval and verify 400 rejection and NO second deduction
    dup_appr = client.post(f"/api/orders/{order_id}/approve")
    assert dup_appr.status_code == 400
    p_dup = client.get(f"/api/products/{prod_id}").json()
    assert Decimal(str(p_dup["stock_quantity"])) == Decimal("40.00")

    # 10. Cancel the order and verify stock reversal
    cancel_resp = client.post(f"/api/orders/{order_id}/cancel")
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"

    # Stock restored back to 50
    p_restored = client.get(f"/api/products/{prod_id}").json()
    assert Decimal(str(p_restored["stock_quantity"])) == Decimal("50.00")

    # 11. Verify cancelled order is excluded from customer balance
    # Balance should be opening (1000) - payment (2000) = -1000
    c_cancelled = client.get(f"/api/customers/{cust_id}").json()
    assert Decimal(str(c_cancelled["current_balance"])) == Decimal("-1000.00")


def test_insufficient_stock_rejection(client, db_session):
    # Product with 5 in stock
    prod_resp = client.post(
        "/api/products",
        json={
            "sku": "FMCG-TEA-01",
            "name": "Tata Tea 1kg",
            "selling_price": 400.00,
            "stock_quantity": 5.00,
        },
    )
    prod_id = prod_resp.json()["id"]

    cust_resp = client.post(
        "/api/customers",
        json={"name": "Tea Stall", "phone": "9999999999"},
    )
    cust_id = cust_resp.json()["id"]

    # Order requesting 10 units (more than 5 available)
    order_resp = client.post(
        "/api/orders",
        json={
            "customer_id": cust_id,
            "status": "DRAFT",
            "items": [
                {
                    "product_id": prod_id,
                    "product_name": "Tata Tea 1kg",
                    "quantity": 10.00,
                    "unit": "packet",
                    "unit_price": 400.00,
                }
            ],
        },
    )
    order_id = order_resp.json()["id"]

    # Approving must fail with 400 Insufficient Stock
    appr_resp = client.post(f"/api/orders/{order_id}/approve")
    assert appr_resp.status_code == 400
    assert "Insufficient stock" in appr_resp.json()["detail"]

    # Stock must remain unchanged at 5
    p_check = client.get(f"/api/products/{prod_id}").json()
    assert Decimal(str(p_check["stock_quantity"])) == Decimal("5.00")


def test_order_date_filtering(client):
    from datetime import datetime, timezone

    # Create customer and product
    prod = client.post("/api/products", json={"sku": "FILTER-01", "name": "Filter Item", "selling_price": 100, "stock_quantity": 20}).json()
    cust = client.post("/api/customers", json={"name": "Filter Customer"}).json()

    # Create order
    order = client.post("/api/orders", json={
        "customer_id": cust["id"],
        "status": "APPROVED",
        "items": [{"product_id": prod["id"], "product_name": "Filter Item", "quantity": 1, "unit_price": 100}]
    }).json()

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Match today
    res_today = client.get(f"/api/orders?date_from={today_str}&date_to={today_str}").json()
    assert any(o["id"] == order["id"] for o in res_today)

    # Future date filter should return 0 matches for this order
    res_future = client.get("/api/orders?date_from=2030-01-01").json()
    assert not any(o["id"] == order["id"] for o in res_future)

    # Past date filter should return 0 matches for this order
    res_past = client.get("/api/orders?date_to=2020-01-01").json()
    assert not any(o["id"] == order["id"] for o in res_past)

