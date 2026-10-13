# BahiPilot — Build Status & Progress Log

## Project Summary
**BahiPilot** is a local-first AI back office for small Indian wholesalers and distributors.
It streamlines product catalogue management, inventory tracking, customer directories with running ledgers, flagship 4-stage guided AI order extraction (Ollama local inference + Gemini API), line-item reconciliation, atomic order approval, printable GST-ready tax invoices, and business reporting.

---

## Current Status: VERIFIED & EXPANDED ✅

All core functional, non-functional, and verification requirements from the Master Build Prompt have been implemented and verified. In the latest iteration, the following priority enhancements were completed:
1. **Order Date Filtering (API & UI)**: Added `date_from` and `date_to` filtering to `GET /api/orders`, added date presets (All Time, Today, Last 7 Days, Last 30 Days) and custom range pickers to the Orders Registry UI, and added unit test coverage in `test_order_workflow.py`.
2. **Product Editing Workflow**: Added `EditProductModal` allowing distributors to modify SKU, Name, Category, Unit, Selling Price, Thresholds, and AI Aliases directly from the catalogue.
3. **Customer Editing Workflow**: Added `EditCustomerModal` allowing updates to Customer Name, Store Name, Phone Number, Opening Balance, and Notes directly from the customer directory.

---

### Implementation Milestones Completed

- [x] **Workspace & Environment Setup**
  - Python 3.12.1 venv configured at `backend/.venv`.
  - Node.js v24.18.0 with Vite + React 19 + TypeScript + Tailwind CSS configured in `frontend/`.
  - Git repository connected to origin (`https://github.com/srijan-0-7/hacktoberfest-dev-2.git`).
  - Strict `.gitignore` protecting secrets (`.env`), database files (`*.db`), uploads, and caches.

- [x] **Backend Architecture (`backend/app`)**
  - **Database & Transactions**: SQLite configured with `PRAGMA foreign_keys = ON` and SessionLocal transaction boundaries.
  - **Models**: `Product`, `Customer`, `Order`, `OrderItem`, `Payment`, `StockMovement`, `BusinessSettings` with relational constraints.
  - **Schemas**: Pydantic v2 schemas with `ConfigDict(from_attributes=True)` and strict validation.
  - **Service Layer**:
    - `ledger_service.py`: Computes authoritative customer balances and chronological account statements (`opening_balance + total_invoiced - total_paid`).
    - `order_service.py`: Strict server-side Decimal computations, atomic transactional approval (`APPROVED` status, stock deduction, and ledger debit), and atomic order cancellation with stock reversal.
    - `ai/`: Extensible provider interface (`BaseAIProvider`), `OllamaProvider` (local open-weight), `GeminiProvider` (cloud fallback via direct REST with `gemini-3.8-flash`), `Matcher` (fuzzy catalogue matching & alias resolution), and `DocumentProcessor` (PDF text extraction & OCR fallback).
  - **API Endpoints**:
    - `GET /api/health`
    - `GET /api/dashboard/summary`, `GET /api/dashboard/sales-trend`
    - `GET, POST /api/products/`, `GET, PATCH /api/products/{id}`, `DELETE /api/products/{id}`, `POST /api/products/{id}/adjust-stock`
    - `GET, POST /api/customers/`, `GET, PATCH /api/customers/{id}`, `GET /api/customers/{id}/ledger`
    - `GET /api/orders` (with status, search, and date range filters `date_from`/`date_to`), `GET, POST /api/orders/`, `GET /api/orders/{id}`, `POST /api/orders/{id}/approve`, `POST /api/orders/{id}/reject`, `POST /api/orders/{id}/cancel`
    - `GET, POST /api/payments/`
    - `POST /api/orders/extract`, `GET /api/ai/status`, `POST /api/ai/test-connection`
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
    - **Orders (`/orders`)**: Searchable, status-filtered tabs, date range filters (All Time, Today, Last 7 Days, Last 30 Days, Custom), inline approval triggers, and invoice previews.
    - **Order Detail (`/orders/:id`)**: Comprehensive breakdown with line items, tax details, status badges, and transactional action buttons.
    - **New Order (`/orders/new`)**: Interactive manual order entry with live catalogue auto-completion and server-side calculations.
    - **Import Order (`/orders/import`)**: Guided 4-stage pipeline (Input -> Extract -> Review & Reconcile -> Save) with demo chit buttons and graceful offline fallback.
    - **Products (`/products`)**: Filterable inventory table, low-stock alert badges, Add Product modal, Edit Product modal, and Stock Adjustment modal with movement audit trail.
    - **Customers (`/customers`)**: Directory with phone, GSTIN, credit limits, current balances, Add Customer modal, Edit Customer modal, Record Payment modal, and CSV export.
    - **Customer Detail (`/customers/:id`)**: Running chronological account statement with credit/debit movements.
    - **Reports (`/reports`)**: Sales summary, Top products by volume and revenue, Inventory valuation, and one-click CSV download.
    - **Settings (`/settings`)**: Business profile (Store Name, GSTIN, Address, Bank details, Default Tax rate) and AI Provider selector with live connectivity test.
  - **Components**:
    - `AIStatusBadge`: Real-time pill showing active provider (Ollama / Gemini) and live health.
    - `InvoiceModal`: Clean, standard Indian tax invoice with `@media print` print styling.
    - `RecordPaymentModal`, `AddProductModal`, `EditProductModal`, `StockAdjustmentModal`, `AddCustomerModal`, `EditCustomerModal`.

---

### Actual Test Results

1. **Backend Test Suite (`pytest -v`)**:
   - `tests/test_ai_providers.py::test_gemini_missing_api_key`: **PASSED**
   - `tests/test_ai_providers.py::test_ollama_connection_failure`: **PASSED**
   - `tests/test_ai_providers.py::test_mocked_gemini_successful_extraction`: **PASSED**
   - `tests/test_ai_providers.py::test_mocked_ollama_successful_extraction`: **PASSED**
   - `tests/test_ai_providers.py::test_prompt_injection_safety`: **PASSED**
   - `tests/test_calculations.py::test_round_curr`: **PASSED**
   - `tests/test_calculations.py::test_calculate_line_item_math`: **PASSED**
   - `tests/test_calculations.py::test_calculate_line_item_zero_tax`: **PASSED**
   - `tests/test_calculations.py::test_normalize_text`: **PASSED**
   - `tests/test_calculations.py::test_deterministic_matcher`: **PASSED**
   - `tests/test_order_workflow.py::test_full_order_lifecycle_and_accounting`: **PASSED**
   - `tests/test_order_workflow.py::test_insufficient_stock_rejection`: **PASSED**
   - `tests/test_order_workflow.py::test_order_date_filtering`: **PASSED**
   - Total: **13 passed, 1 deselected (live), 0 failed** in 3.10s.

2. **Live Gemini Integration Test (`pytest -m live_gemini -v`)**:
   - `tests/test_gemini_live.py::test_live_gemini_api_connection`: **PASSED** (HTTP 200 response from Google Generative Language API)

3. **Frontend Test Suite (`vitest run`)**:
   - `src/tests/order_calculations.test.ts`: **3/3 PASSED**
   - `src/tests/formatters.test.ts`: **3/3 PASSED**
   - Total: **6 passed, 0 failed** in 1.26s.

4. **Production Build (`tsc -b && vite build`)**:
   - Output: `dist/index.html` (0.74 kB), `dist/assets/index.css` (25.3 kB), `dist/assets/index.js` (842.1 kB).
   - Exit code: 0, **0 type errors**.

---

### Remaining Issues & Mitigations
- **Ollama Local Daemon**: Local inference via Ollama requires running `ollama run qwen2.5:7b` on `http://localhost:11434`. When Ollama is offline, the app automatically switches to Gemini API or provides safe manual entry fallback without crashing.
- **Tesseract OCR Binary**: Tesseract is an optional OS-level binary. PyMuPDF directly extracts readable text from digital PDF invoices; when images lack native text and Tesseract is uninstalled, the app surfaces a polite message and allows immediate manual line-item entry.

---

### Next Concrete Action
- Push latest updates (`Orders` date filtering, `EditProductModal`, `EditCustomerModal`) to `origin/main`.
