import sys
from pathlib import Path
from decimal import Decimal
from datetime import datetime, timedelta, timezone

# Ensure backend root is in sys.path
backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database import SessionLocal, engine, Base
from app.models.product import Product
from app.models.customer import Customer
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.inventory import StockMovement
from app.models.settings import BusinessSettings
from app.models.enums import OrderStatus, OrderSourceType, StockMovementType, PaymentMethod
from app.services.order_service import calculate_line_item, round_curr


def seed_demo_data(reset: bool = False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if reset:
            print("Resetting database tables...")
            db.query(OrderItem).delete()
            db.query(StockMovement).delete()
            db.query(Payment).delete()
            db.query(Order).delete()
            db.query(Product).delete()
            db.query(Customer).delete()
            db.commit()
            print("Database cleared.")

        # 1. Check or Seed Business Settings
        settings = db.query(BusinessSettings).first()
        if not settings:
            settings = BusinessSettings(
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
            )
            db.add(settings)
            db.commit()

        # 2. Seed Products (15 realistic Indian wholesale items)
        demo_products = [
            {
                "sku": "FMCG-ATT-01",
                "name": "Aashirvaad Shudh Chakki Atta 10kg",
                "category": "Grains & Flours",
                "unit": "bag",
                "selling_price": Decimal("440.00"),
                "stock_quantity": Decimal("85.00"),
                "reorder_threshold": Decimal("20.00"),
                "aliases": ["aashirvaad atta 10kg", "atta 10kg bag", "chakki atta", "ashirvad atta"],
            },
            {
                "sku": "FMCG-RIC-02",
                "name": "India Gate Basmati Rice Classic 5kg",
                "category": "Grains & Flours",
                "unit": "bag",
                "selling_price": Decimal("520.00"),
                "stock_quantity": Decimal("6.00"),  # LOW STOCK
                "reorder_threshold": Decimal("15.00"),
                "aliases": ["basmati rice 5kg", "india gate classic", "rice bag 5kg", "chawal 5kg"],
            },
            {
                "sku": "PUL-DAL-03",
                "name": "Tata Sampann Unpolished Toor Dal 1kg",
                "category": "Pulses & Dals",
                "unit": "packet",
                "selling_price": Decimal("165.00"),
                "stock_quantity": Decimal("120.00"),
                "reorder_threshold": Decimal("30.00"),
                "aliases": ["toor dal", "tuvar dal 1kg", "arhar dal", "tata toor dal"],
            },
            {
                "sku": "PUL-MOO-04",
                "name": "Fortune Moong Dal Dhuli 1kg",
                "category": "Pulses & Dals",
                "unit": "packet",
                "selling_price": Decimal("135.00"),
                "stock_quantity": Decimal("5.00"),  # LOW STOCK
                "reorder_threshold": Decimal("20.00"),
                "aliases": ["moong dal dhuli", "mung dal 1kg", "yellow moong dal"],
            },
            {
                "sku": "OIL-MUS-05",
                "name": "Fortune Kachi Ghani Mustard Oil 1L",
                "category": "Edible Oils",
                "unit": "bottle",
                "selling_price": Decimal("148.00"),
                "stock_quantity": Decimal("210.00"),
                "reorder_threshold": Decimal("40.00"),
                "aliases": ["mustard oil 1l", "sarson tel 1 litre", "fortune sarso tel", "kachi ghani oil"],
            },
            {
                "sku": "OIL-SUN-06",
                "name": "Saffola Gold Pro Healthy Oil 5L Jar",
                "category": "Edible Oils",
                "unit": "jar",
                "selling_price": Decimal("780.00"),
                "stock_quantity": Decimal("40.00"),
                "reorder_threshold": Decimal("10.00"),
                "aliases": ["saffola gold 5l", "refined oil 5l jar", "saffola 5 litre"],
            },
            {
                "sku": "BEV-TEA-07",
                "name": "Tata Tea Premium 1kg Pack",
                "category": "Beverages",
                "unit": "packet",
                "selling_price": Decimal("420.00"),
                "stock_quantity": Decimal("90.00"),
                "reorder_threshold": Decimal("25.00"),
                "aliases": ["tata tea 1kg", "chai patti 1kg", "tata premium chai"],
            },
            {
                "sku": "BEV-COF-08",
                "name": "Nescafe Classic Coffee Jar 200g",
                "category": "Beverages",
                "unit": "jar",
                "selling_price": Decimal("380.00"),
                "stock_quantity": Decimal("4.00"),  # LOW STOCK
                "reorder_threshold": Decimal("15.00"),
                "aliases": ["nescafe 200g", "coffee jar 200g", "nescafe classic"],
            },
            {
                "sku": "SPC-HLD-09",
                "name": "Everest Turmeric Powder Haldi 500g",
                "category": "Spices & Condiments",
                "unit": "box",
                "selling_price": Decimal("125.00"),
                "stock_quantity": Decimal("150.00"),
                "reorder_threshold": Decimal("30.00"),
                "aliases": ["everest haldi 500g", "turmeric powder 500g", "haldi packet"],
            },
            {
                "sku": "SPC-MIR-10",
                "name": "MDH Deggi Mirch Powder 500g",
                "category": "Spices & Condiments",
                "unit": "box",
                "selling_price": Decimal("195.00"),
                "stock_quantity": Decimal("80.00"),
                "reorder_threshold": Decimal("20.00"),
                "aliases": ["deggi mirch 500g", "mdh mirch", "red chilli powder 500g"],
            },
            {
                "sku": "SPC-GAR-11",
                "name": "Catch Super Garam Masala 200g",
                "category": "Spices & Condiments",
                "unit": "box",
                "selling_price": Decimal("110.00"),
                "stock_quantity": Decimal("65.00"),
                "reorder_threshold": Decimal("20.00"),
                "aliases": ["garam masala 200g", "catch garam masala"],
            },
            {
                "sku": "DRY-SUG-12",
                "name": "Madhur Pure & Hygienic Sugar 5kg",
                "category": "Staples",
                "unit": "bag",
                "selling_price": Decimal("230.00"),
                "stock_quantity": Decimal("180.00"),
                "reorder_threshold": Decimal("35.00"),
                "aliases": ["madhur sugar 5kg", "cheeni 5kg bag", "sugar 5kg packet"],
            },
            {
                "sku": "DRY-SLT-13",
                "name": "Tata Salt Vacuum Evaporated 1kg",
                "category": "Staples",
                "unit": "packet",
                "selling_price": Decimal("28.00"),
                "stock_quantity": Decimal("350.00"),
                "reorder_threshold": Decimal("50.00"),
                "aliases": ["tata salt 1kg", "namak 1kg", "tata namak"],
            },
            {
                "sku": "SNK-BIS-14",
                "name": "Parle-G Gold Biscuits Carton (48 packs)",
                "category": "Packaged Snacks",
                "unit": "carton",
                "selling_price": Decimal("480.00"),
                "stock_quantity": Decimal("45.00"),
                "reorder_threshold": Decimal("15.00"),
                "aliases": ["parle g carton", "parle-g box", "biscuit carton"],
            },
            {
                "sku": "SNK-MAG-15",
                "name": "Maggi 2-Minute Masala Noodles Carton (24 packs)",
                "category": "Packaged Snacks",
                "unit": "carton",
                "selling_price": Decimal("336.00"),
                "stock_quantity": Decimal("3.00"),  # LOW STOCK
                "reorder_threshold": Decimal("12.00"),
                "aliases": ["maggi carton", "maggi noodles 24 pack box", "maggi packet box"],
            },
        ]

        products_map = {}
        for pdata in demo_products:
            p = db.query(Product).filter(Product.sku == pdata["sku"]).first()
            if not p:
                p = Product(
                    sku=pdata["sku"],
                    name=pdata["name"],
                    category=pdata["category"],
                    unit=pdata["unit"],
                    selling_price=pdata["selling_price"],
                    stock_quantity=pdata["stock_quantity"],
                    reorder_threshold=pdata["reorder_threshold"],
                )
                p.aliases_list = pdata["aliases"]
                db.add(p)
                db.flush()
                # Record opening stock movement
                mov = StockMovement(
                    product_id=p.id,
                    movement_type=StockMovementType.OPENING,
                    quantity_change=p.stock_quantity,
                    reason="Demo data seed opening inventory",
                )
                db.add(mov)
            products_map[p.sku] = p

        db.commit()

        # 3. Seed Customers (8 realistic wholesale buyers)
        demo_customers = [
            {
                "name": "Ramesh Gupta",
                "business_name": "Gupta Kirana General Stores",
                "phone": "+91 98234 56789",
                "opening_balance": Decimal("4500.00"),
                "notes": "Weekly buyer, delivers to Shivaji Nagar",
            },
            {
                "name": "Sunil Patwardhan",
                "business_name": "Patwardhan Supermarket",
                "phone": "+91 97654 32100",
                "opening_balance": Decimal("12000.00"),
                "notes": "Large retail outlet, 15-day credit cycle",
            },
            {
                "name": "Mohammed Ansari",
                "business_name": "Barkat Wholesale Provision",
                "phone": "+91 98901 23456",
                "opening_balance": Decimal("0.00"),
                "notes": "Prompt UPI payer upon delivery",
            },
            {
                "name": "Deepak Sharma",
                "business_name": "Annapurna Dhaba & Family Restaurant",
                "phone": "+91 94220 11223",
                "opening_balance": Decimal("3200.00"),
                "notes": "Buys staples, edible oil, and spices every Monday",
            },
            {
                "name": "Pooja Deshmukh",
                "business_name": "Mauli Mini Market",
                "phone": "+91 95455 66778",
                "opening_balance": Decimal("1800.00"),
                "notes": "Kothrud area retailer",
            },
            {
                "name": "Vikram Singh",
                "business_name": "Singh Sweets & Caterers",
                "phone": "+91 98600 77889",
                "opening_balance": Decimal("6500.00"),
                "notes": "Bulk buyer for sugar, flour, oil during festive season",
            },
            {
                "name": "Kishore Kumar",
                "business_name": "Kishore Daily Needs",
                "phone": "+91 99223 34455",
                "opening_balance": Decimal("0.00"),
                "notes": "New customer registered this month",
            },
            {
                "name": "Anand Kulkarni",
                "business_name": "Kulkarni Traders",
                "phone": "+91 98811 22334",
                "opening_balance": Decimal("850.00"),
                "notes": "Old trusted client",
            },
        ]

        customers_list = []
        for cdata in demo_customers:
            c = db.query(Customer).filter(Customer.name == cdata["name"]).first()
            if not c:
                c = Customer(
                    name=cdata["name"],
                    business_name=cdata["business_name"],
                    phone=cdata["phone"],
                    opening_balance=cdata["opening_balance"],
                    notes=cdata["notes"],
                )
                db.add(c)
                db.flush()
            customers_list.append(c)

        db.commit()

        # 4. Seed Orders (Historical approved orders + recent pending review orders)
        now = datetime.now(timezone.utc)
        order_specs = [
            # Past approved orders across previous 6 days
            {
                "customer": customers_list[0],  # Gupta Kirana
                "days_ago": 6,
                "status": OrderStatus.APPROVED,
                "items": [
                    ("FMCG-ATT-01", Decimal("10.00")),
                    ("OIL-MUS-05", Decimal("20.00")),
                    ("DRY-SUG-12", Decimal("10.00")),
                ],
            },
            {
                "customer": customers_list[1],  # Patwardhan
                "days_ago": 5,
                "status": OrderStatus.APPROVED,
                "items": [
                    ("FMCG-RIC-02", Decimal("8.00")),
                    ("PUL-DAL-03", Decimal("25.00")),
                    ("OIL-SUN-06", Decimal("6.00")),
                    ("BEV-TEA-07", Decimal("12.00")),
                ],
            },
            {
                "customer": customers_list[2],  # Ansari Barkat
                "days_ago": 4,
                "status": OrderStatus.APPROVED,
                "items": [
                    ("SPC-HLD-09", Decimal("20.00")),
                    ("SPC-MIR-10", Decimal("15.00")),
                    ("DRY-SLT-13", Decimal("50.00")),
                ],
            },
            {
                "customer": customers_list[3],  # Deepak Sharma Dhaba
                "days_ago": 3,
                "status": OrderStatus.APPROVED,
                "items": [
                    ("FMCG-ATT-01", Decimal("15.00")),
                    ("OIL-MUS-05", Decimal("30.00")),
                    ("DRY-SUG-12", Decimal("15.00")),
                    ("SPC-GAR-11", Decimal("10.00")),
                ],
            },
            {
                "customer": customers_list[4],  # Pooja Deshmukh
                "days_ago": 2,
                "status": OrderStatus.APPROVED,
                "items": [
                    ("SNK-BIS-14", Decimal("8.00")),
                    ("SNK-MAG-15", Decimal("6.00")),
                    ("BEV-TEA-07", Decimal("10.00")),
                ],
            },
            {
                "customer": customers_list[5],  # Vikram Singh
                "days_ago": 1,
                "status": OrderStatus.APPROVED,
                "items": [
                    ("DRY-SUG-12", Decimal("30.00")),
                    ("FMCG-ATT-01", Decimal("20.00")),
                    ("OIL-SUN-06", Decimal("10.00")),
                ],
            },
            # Today's approved orders
            {
                "customer": customers_list[0],  # Gupta Kirana
                "days_ago": 0,
                "status": OrderStatus.APPROVED,
                "items": [
                    ("PUL-DAL-03", Decimal("15.00")),
                    ("PUL-MOO-04", Decimal("10.00")),
                    ("DRY-SLT-13", Decimal("40.00")),
                ],
            },
            # Pending Review Orders (Flagship workflow showcase)
            {
                "customer": customers_list[6],  # Kishore Kumar
                "days_ago": 0,
                "status": OrderStatus.PENDING_REVIEW,
                "source_type": OrderSourceType.AI_EXTRACTED,
                "source_filename": "order_sheet_kishore_kirana.pdf",
                "notes": "Extracted from wholesale order sheet. Needs verification of tea packets.",
                "items": [
                    ("BEV-TEA-07", Decimal("15.00")),
                    ("BEV-COF-08", Decimal("5.00")),
                    ("SNK-MAG-15", Decimal("4.00")),
                ],
            },
            {
                "customer": customers_list[7],  # Anand Kulkarni
                "days_ago": 0,
                "status": OrderStatus.PENDING_REVIEW,
                "source_type": OrderSourceType.AI_EXTRACTED,
                "source_filename": "whatsapp_order_kulkarni.png",
                "notes": "Parsed from WhatsApp message screenshot.",
                "items": [
                    ("FMCG-ATT-01", Decimal("5.00")),
                    ("OIL-MUS-05", Decimal("10.00")),
                ],
            },
        ]

        order_count = db.query(Order).count()
        year = now.year

        for idx, spec in enumerate(order_specs):
            order_num = f"ORD-{year}-{(order_count + idx + 1):04d}"
            existing_ord = db.query(Order).filter(Order.order_number == order_num).first()
            if existing_ord:
                continue

            order_date = now - timedelta(days=spec["days_ago"], hours=idx * 2)

            order = Order(
                order_number=order_num,
                customer_id=spec["customer"].id,
                status=spec["status"],
                source_type=spec.get("source_type", OrderSourceType.MANUAL),
                source_filename=spec.get("source_filename"),
                notes=spec.get("notes"),
                created_at=order_date,
                updated_at=order_date,
                approved_at=order_date if spec["status"] == OrderStatus.APPROVED else None,
                subtotal=Decimal("0.00"),
                tax_total=Decimal("0.00"),
                grand_total=Decimal("0.00"),
            )
            db.add(order)
            db.flush()

            subtotal = Decimal("0.00")
            tax_total = Decimal("0.00")

            for sku, qty in spec["items"]:
                prod = products_map[sku]
                tax_rate = Decimal("5.00")
                line_sub, line_tx, line_tot = calculate_line_item(qty, prod.selling_price, tax_rate)

                item = OrderItem(
                    order_id=order.id,
                    product_id=prod.id,
                    product_name_snapshot=prod.name,
                    sku_snapshot=prod.sku,
                    quantity=qty,
                    unit_snapshot=prod.unit,
                    unit_price=prod.selling_price,
                    tax_rate=tax_rate,
                    line_total=line_tot,
                )
                db.add(item)
                subtotal += line_sub
                tax_total += line_tx

                if spec["status"] == OrderStatus.APPROVED:
                    # Record stock sale movement
                    mov = StockMovement(
                        product_id=prod.id,
                        movement_type=StockMovementType.SALE,
                        quantity_change=-qty,
                        reason=f"Approved Order #{order.order_number}",
                        order_id=order.id,
                        created_at=order_date,
                    )
                    db.add(mov)

            order.subtotal = round_curr(subtotal)
            order.tax_total = round_curr(tax_total)
            order.grand_total = round_curr(subtotal + tax_total)

        db.commit()

        # 5. Seed Payments
        payment_specs = [
            {
                "customer": customers_list[0],  # Gupta
                "amount": Decimal("8000.00"),
                "method": PaymentMethod.UPI,
                "days_ago": 3,
                "notes": "GPay ref 41239841",
            },
            {
                "customer": customers_list[1],  # Patwardhan
                "amount": Decimal("15000.00"),
                "method": PaymentMethod.BANK_TRANSFER,
                "days_ago": 2,
                "notes": "NEFT HDFC0001234",
            },
            {
                "customer": customers_list[2],  # Ansari Barkat
                "amount": Decimal("6500.00"),
                "method": PaymentMethod.UPI,
                "days_ago": 3,
                "notes": "PhonePe transfer",
            },
            {
                "customer": customers_list[3],  # Dhaba
                "amount": Decimal("10000.00"),
                "method": PaymentMethod.CASH,
                "days_ago": 1,
                "notes": "Cash collected by delivery driver",
            },
            {
                "customer": customers_list[5],  # Vikram Singh
                "amount": Decimal("20000.00"),
                "method": PaymentMethod.CHEQUE,
                "days_ago": 1,
                "notes": "Cheque #881234 cleared",
            },
        ]

        pay_count = db.query(Payment).count()
        for idx, ps in enumerate(payment_specs):
            pay_ref = f"PAY-{year}-{(pay_count + idx + 1):04d}"
            existing_pay = db.query(Payment).filter(Payment.payment_reference == pay_ref).first()
            if existing_pay:
                continue

            pay_date = now - timedelta(days=ps["days_ago"], hours=4)
            p = Payment(
                payment_reference=pay_ref,
                customer_id=ps["customer"].id,
                amount=ps["amount"],
                payment_method=ps["method"],
                notes=ps["notes"],
                payment_date=pay_date,
                created_at=pay_date,
            )
            db.add(p)

        db.commit()
        print("Demo data seeded successfully:")
        print(f"  Products: {db.query(Product).count()}")
        print(f"  Customers: {db.query(Customer).count()}")
        print(f"  Orders: {db.query(Order).count()}")
        print(f"  Payments: {db.query(Payment).count()}")

    finally:
        db.close()


if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv
    seed_demo_data(reset=reset_flag)
