# BahiPilot — Build Status & Progress Log

## Project Summary
**BahiPilot** is a local-first AI back office for small Indian wholesalers and distributors.
It streamlines product catalogue management, inventory tracking, customer directories with running ledgers, flagship 4-stage guided AI order extraction (Ollama local inference + Gemini API), line-item reconciliation, atomic order approval, printable GST-ready tax invoices, and business reporting.

---

## Final Status: COMPLETE & VERIFIED ✅

All functional, non-functional, and verification requirements from the Master Build Prompt have been implemented, tested, and verified end-to-end.

---

### Implementation Milestones Completed

- [x] **Workspace & Environment Setup**
  - Python 3.12.1 venv configured at `backend/.venv`.
  - Node.js v24.18.0 with Vite + React 19 + TypeScript + Tailwind CSS configured in `frontend/`.
  - Git repository initialized and connected to origin (`https://github.com/srijan-0-7/hacktoberfest-dev-2.git`).
  - Strict `.gitignore` protecting secrets (`.env`), database files (`*.db`), uploads, and caches.

- [x] **Backend Architecture (`backend/app`)**
  - **Database & Transactions**: SQLite configured with `PRAGMA foreign_keys = ON` and SessionLocal transaction boundaries.
  - **Models**: `Product`, `Customer`, `Order`, `OrderItem`, `Payment`, `StockMovement`, `BusinessSettings` with all relational constraints.
  - **Schemas**: Pydantic v2 schemas with `ConfigDict(from_attributes=True)` and strict validation.
  - **Service Layer**:
    - `ledger_service.py`: Computes authoritative customer balances and chronological account statements (`opening_balance + total_invoiced - total_paid`).
    - `order_service.py`: Strict server-side Decimal computations, atomic transactional approval (`APPROVED` status, stock deduction, and ledger debit), and atomic order cancellation with stock reversal.
    - `ai/`: Extensible provider interface (`BaseAIProvider`), `OllamaProvider` (local open-weight), `GeminiProvider` (cloud fallback via direct REST), `Matcher` (fuzzy catalogue matching & alias resolution), and `DocumentProcessor` (PDF text extraction & OCR fallback).
  - **API Endpoints**:
    - `GET /api/health`
    - `GET /api/dashboard/summary`, `GET /api/dashboard/sales-trend`
    - `GET, POST /api/products/`, `GET, PUT /api/products/{id}`, `POST /api/products/{id}/adjust-stock`
    - `GET, POST /api/customers/`, `GET, PUT /api/customers/{id}`, `GET /api/customers/{id}/ledger`
    - `GET, POST /api/orders/`, `GET /api/orders/{id}`, `POST /api/orders/{id}/approve`, `POST /api/orders/{id}/reject`, `POST /api/orders/{id}/cancel`
    - `GET, POST /api/payments/`
    - `POST /api/ai/extract`, `GET /api/ai/status`
    - `GET /api/reports/sales`, `GET /api/reports/export/products.csv`, `GET /api/reports/export/customers.csv`, `GET /api/reports/export/sales.csv`
    - `GET, PUT /api/settings/`

- [x] **Realistic Demo Seeding (`backend/seeds/demo_data.py`)**
  - 15 Indian wholesale products (Basmati Rice, Sharbati Atta, Fortune Sunflower Oil, Tata Salt, Toor Dal, Maggi 24-packs, Haldiram Bhujia, Parle-G, Amul Ghee, Dettol Soap, Surf Excel, Tata Tea Gold, MDH Garam Masala, Cadbury Dairy Milk, Britannia Good Day).
  - 8 realistic wholesale customers (Gupta Kirana Store, Sharma General Store, New Bharat Traders, Apna Bazaar, Laxmi Provisions, Ramesh Supermarket, Balaji Mart, Agarwal Wholesalers).
  - 9 realistic orders across states (`DRAFT`, `PENDING_REVIEW`, `APPROVED`, `CANCELLED`).
  - 5 customer payments and initial stock movements.

- [x] **Frontend Architecture (`frontend/src`)**
  - **Design System**: Midnight Navy (`#0f172a`), Emerald Green (`#059669`), warm off-white slate background, accessible contrast, Lucide icons, responsive navigation.
  - **Pages**:
    - **Dashboard (`/`)**: Real-time sales, outstanding ledger balance, pending reviews, low-stock count, Recharts 30-day sales trend, and quick actions.
    - **Orders (`/orders`)**: Searchable, status-filtered tabs, inline approval triggers, and invoice previews.
    - **Order Detail (`/orders/:id`)**: Comprehensive breakdown with line items, tax details, status badges, and transactional action buttons.
    - **New Order (`/orders/new`)**: Interactive manual order entry with live catalogue auto-completion and server-side calculations.
    - **Import Order (`/orders/import`)**: Guided 4-stage pipeline (Input -> Extract -> Review & Reconcile -> Save) with demo chit buttons and graceful offline fallback.
    - **Products (`/products`)**: Filterable inventory table, low-stock alert badges, Add Product modal, and Stock Adjustment modal with movement audit trail.
    - **Customers (`/customers`)**: Directory with phone, GSTIN, credit limits, current balances, Record Payment modal, and CSV export.
    - **Customer Detail (`/customers/:id`)**: Running chronological account statement with credit/debit movements.
    - **Reports (`/reports`)**: Sales summary, Top products by volume and revenue, Inventory valuation, and one-click CSV download.
    - **Settings (`/settings`)**: Business profile (Store Name, GSTIN, Address, Bank details, Default Tax rate) and AI Provider selector with live connectivity test.
  - **Components**:
    - `AIStatusBadge`: Real-time pill showing active provider (Ollama / Gemini) and live health.
    - `InvoiceModal`: Clean, standard Indian tax invoice with `@media print` print styling.
    - `RecordPaymentModal`, `AddProductModal`, `StockAdjustmentModal`, `AddCustomerModal`.

- [x] **Test Verification**
  - **Backend**: 12/12 pytest tests passing.
    - Line item calculations & GST accuracy.
    - Order approval atomic stock deduction & duplicate approval prevention.
    - Ledger balance updates & cancellation reversals.
    - AI fallback and error handling.
    - Live Gemini API HTTP request test.
  - **Frontend**: 6/6 Vitest unit tests passing.
    - Currency formatters (`₹1,23,456.00`).
    - Date formatters.
    - Order line item subtotals and discounts.

---

### Running Processes
- **Backend**: `http://127.0.0.1:8000` (FastAPI daemon)
- **Frontend**: `http://127.0.0.1:5173` (Vite dev server)
