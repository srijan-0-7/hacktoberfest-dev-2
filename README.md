# BahiPilot (बही पायलट)
### Local-First AI Back Office for Small Indian Wholesalers & Distributors

> **BahiPilot** streamlines wholesale and distribution operations across Bharat: ingest messy handwritten chits, WhatsApp order screenshots, and PDF invoices; convert them into structured line items using local open-weight AI (Ollama) or Gemini API; reconcile against catalogue and available stock; and execute transactional inventory deduction, customer ledger posting, and GST-ready invoice printing.

---

## 🌟 Key Features

1. **Dual AI Order Ingestion (Flagship 4-Stage Guided Workflow)**:
   - **Stage 1 (Input)**: Upload invoices/receipts (PNG, JPEG, PDF) or paste informal order text (Hinglish/English chits, e.g., *"10 bori Basmati Rice 25kg, 5 carton Fortune Oil 1L, 20 packet Tata Salt"*).
   - **Stage 2 (Extraction)**: Extracts text via PyMuPDF or Tesseract OCR, prompts local LLMs (Ollama `qwen2.5:7b` / `llama3.2`) or Google Gemini (`gemini-2.5-flash`), strictly adhering to structured JSON schemas.
   - **Stage 3 (Review & Reconcile)**: Interactive review table matching extracted aliases to the live product catalogue with fuzzy matching, confidence scores, editable quantities, unit prices, and ambiguity resolution flags.
   - **Stage 4 (Save)**: Persists orders as `PENDING_REVIEW` or `DRAFT` without premature stock deduction or ledger mutations.
   - **Offline / Graceful Fallback**: If AI services are offline, users can directly use manual entry without app failure or fabricated data.

2. **Strict Financial & Inventory Integrity**:
   - **Zero LLM Math**: All subtotals, GST (CGST/SGST/IGST), discount deductions, and grand totals are calculated server-side in Python `Decimal` (paise precision).
   - **Atomic State Transitions**: Stock deduction and customer ledger posting happen **only** upon explicit user `APPROVE` action in a database transaction.
   - **Stock & Ledger Reversals**: Order cancellation reverses stock movements exactly once and posts an adjusting debit entry in the customer ledger.

3. **Customer Directory & Running Ledger**:
   - Maintains customer profile, credit limits, GSTIN, billing address, and phone numbers.
   - Running ledger with full audit trail: opening balance, order invoice charges, and recorded payments (Cash, UPI, NEFT/RTGS, Cheque).

4. **Product Catalogue & Low-Stock Alerts**:
   - SKU, HSN codes, categories, cost and selling prices, units (Bori, Carton, Packet, Kg, Bag, Tin, Litre).
   - Searchable aliases (e.g., *"Chawal"*, *"Arhar Dal"*, *"Namak"*) for high-accuracy AI matching.
   - Real-time stock tracking with low-stock badges and manual stock adjustment modal with audit reason codes.

5. **GST-Ready Printable Invoices**:
   - Standard Indian tax invoice layout with store details, buyer details, HSN codes, CGST/SGST breakdown, reverse charge flag, and signature block.
   - Clean `@media print` CSS for one-click browser printing (`Ctrl+P` / Print button).

6. **Live Business Dashboard & Reports**:
   - Real-time KPI summary (Today's approved sales, outstanding balance, orders awaiting review, low stock count).
   - Sales trend AreaChart using real stored database records.
   - Tabbed business reports with CSV export capabilities for Products, Customers, and Sales.

---

## 🏗️ Architecture & Technology Stack

```
                          ┌─────────────────────────────────────┐
                          │         BahiPilot Frontend          │
                          │   React 19 + TypeScript + Vite      │
                          │   Tailwind CSS (Midnight & Emerald) │
                          │   TanStack Query + Lucide Icons     │
                          └──────────────────┬──────────────────┘
                                             │ HTTP REST / JSON
                                             ▼
                          ┌─────────────────────────────────────┐
                          │         FastAPI Backend             │
                          │   Pydantic v2 + SQLAlchemy ORM      │
                          │   Atomic Service Layer (Decimal)    │
                          └──────┬───────────┬────────────┬─────┘
                                 │           │            │
            ┌────────────────────┘           │            └───────────────────┐
            ▼                                ▼                                ▼
┌───────────────────────┐        ┌───────────────────────┐        ┌───────────────────────┐
│   SQLite Database     │        │ Local AI: Ollama      │        │ Cloud AI: Gemini      │
│   (WAL Mode + FKs)    │        │ (qwen2.5:7b / local)  │        │ (gemini-2.5-flash)    │
│   Ledger & Inventory  │        │ Zero Marginal Cost    │        │ Fast Structured JSON  │
└───────────────────────┘        └───────────────────────┘        └───────────────────────┘
```

- **Frontend**: Vite 6, React 19, TypeScript 5.8, Tailwind CSS 3.4, React Router 7, TanStack Query 5, Recharts 2, Lucide React.
- **Backend**: Python 3.11+, FastAPI 0.115+, Pydantic 2.10+, SQLAlchemy 2.0+, SQLite (with `PRAGMA foreign_keys = ON`).
- **AI & Document Processing**:
  - Local: Ollama REST client (`http://localhost:11434`), default model `qwen2.5:7b`.
  - Cloud: Google Gemini API REST client (`https://generativelanguage.googleapis.com/v1beta`), default model `gemini-2.5-flash`.
  - Documents: PyMuPDF (`fitz`), Pillow (`PIL`), optional Tesseract OCR (`pytesseract`).
- **Testing**: `pytest` + `httpx` (Backend), `Vitest` (Frontend).

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python**: 3.11 or higher
- **Node.js**: 18+ (tested on Node v24)
- **Ollama** (Optional for local inference): Download from [ollama.ai](https://ollama.ai) and run `ollama run qwen2.5:7b`
- **Google Gemini API Key** (Optional for cloud AI inference): Get a free key from [Google AI Studio](https://aistudio.google.com/)

---

### 1. Backend Setup

```powershell
# Navigate to the backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # On Windows
# source .venv/bin/activate    # On Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy template and edit if needed
cp .env.example .env

# Seed realistic wholesale demo data (15 products, 8 customers, 9 orders, 5 payments)
python -m seeds.demo_data

# Start FastAPI backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be live at: **`http://127.0.0.1:8000`**
Interactive Swagger API docs at: **`http://127.0.0.1:8000/docs`**

---

### 2. Frontend Setup

```powershell
# Open a new terminal and navigate to frontend
cd frontend

# Install dependencies
npm.cmd install

# Start Vite development server
npm.cmd run dev
```

Frontend will be live at: **`http://127.0.0.1:5173`**

---

## ⚙️ Environment Variables

Create `backend/.env` (modeled after `backend/.env.example`):

| Variable | Default | Description |
|---|---|---|
| `AI_PROVIDER` | `ollama` | Active provider: `ollama` or `gemini` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama local endpoint |
| `OLLAMA_MODEL` | `qwen2.5:7b` | Model name for Ollama inference |
| `GEMINI_API_KEY` | *(empty)* | Google AI Studio API Key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `DATABASE_URL` | `sqlite:///./bahipilot.db`| SQLite database file path |
| `PORT` | `8000` | Backend API port |
| `HOST` | `127.0.0.1` | Backend API host |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed CORS origins |
| `UPLOAD_DIR` | `./uploads` | Storage directory for temporary documents |
| `MAX_UPLOAD_SIZE_MB` | `10` | Maximum uploaded document size in MB |

---

## 🧪 Running Tests

### Backend Test Suite (Pytest)
```powershell
cd backend
.\.venv\Scripts\python -m pytest tests -v
```
**Tests Passing (12/12 unit & workflow tests):**
- `tests/test_calculations.py`: Verifies item line totals, GST calculations, and roundings.
- `tests/test_order_workflow.py`: Verifies order creation, approval stock deduction, duplicate approval prevention, customer balance ledger posting, and cancellation stock reversals.
- `tests/test_ai_providers.py`: Mocked validation of Ollama and Gemini fallback handling and extraction parsing.
- `tests/test_gemini_live.py`: Live integration test verifying live HTTP communication with Gemini API.

### Frontend Test Suite (Vitest)
```powershell
cd frontend
npx.cmd vitest run
```
**Tests Passing (6/6 unit tests):**
- `src/tests/formatters.test.ts`: Verifies Indian Rupee currency formatting (`₹1,23,456.00`), date formats, and status badge color styling.
- `src/tests/order_calculations.test.ts`: Verifies frontend line item subtotal, tax computation, and discount precision matching the backend.

---

## 📂 Project Directory Structure

```
hacktober2/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # FastAPI modular endpoints (orders, products, customers, ai, etc.)
│   │   ├── models/              # SQLAlchemy models (Order, Customer, Product, Payment, StockMovement)
│   │   ├── schemas/             # Pydantic v2 schemas with ConfigDict
│   │   ├── services/
│   │   │   ├── ai/              # OllamaProvider, GeminiProvider, Matcher, DocumentProcessor
│   │   │   ├── order_service.py # Transactional approval & cancellation logic
│   │   │   └── ledger_service.py# Customer running balances & ledger entries
│   │   ├── config.py            # Pydantic BaseSettings
│   │   ├── database.py          # SessionLocal, SQLite engine with PRAGMA foreign_keys
│   │   └── main.py              # App entrypoint, CORS, routers
│   ├── seeds/
│   │   └── demo_data.py         # Realistic Indian wholesale seeder
│   ├── tests/                   # Pytest test suite
│   ├── requirements.txt         # Pinned backend dependencies
│   └── .env.example             # Environment template
├── frontend/
│   ├── src/
│   │   ├── api/client.ts        # Typed API client with custom error handling
│   │   ├── components/          # Layout, AIStatusBadge, InvoiceModal, PaymentModal, Add modals
│   │   ├── pages/               # Dashboard, Orders, OrderDetail, ImportOrder, Products, Customers, Reports, Settings
│   │   ├── types/index.ts       # TypeScript interfaces matching backend schemas
│   │   ├── utils/formatters.ts  # Indian Rupee & date formatters
│   │   └── tests/               # Vitest test suite
│   ├── tailwind.config.js       # Midnight Navy & Emerald theme
│   ├── vite.config.ts           # Vite bundler configuration
│   └── package.json             # Frontend dependencies
├── BUILD_STATUS.md              # Detailed implementation log
└── README.md                    # Project documentation
```

---

## 🛡️ License & Compliance

Built for Hacktoberfest and Indian SME distributors. Free to use and customize under the MIT License.
