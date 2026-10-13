export type OrderStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type OrderSourceType = 'MANUAL' | 'AI_EXTRACTED';
export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit: string;
  selling_price: string;
  stock_quantity: string;
  reorder_threshold: string;
  aliases: string[];
  is_active: boolean;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  name: string;
  business_name?: string | null;
  phone?: string | null;
  notes?: string | null;
  opening_balance: string;
  current_balance: string;
  total_sales: string;
  total_payments: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id?: number | null;
  product_name_snapshot: string;
  sku_snapshot?: string | null;
  quantity: string;
  unit_snapshot: string;
  unit_price: string;
  tax_rate: string;
  line_total: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_business_name?: string | null;
  status: OrderStatus;
  source_type: OrderSourceType;
  source_filename?: string | null;
  subtotal: string;
  tax_total: string;
  grand_total: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
  items: OrderItem[];
}

export interface OrderListItem {
  id: number;
  order_number: string;
  customer_id?: number | null;
  customer_name?: string | null;
  status: OrderStatus;
  source_type: OrderSourceType;
  grand_total: string;
  item_count: number;
  created_at: string;
  approved_at?: string | null;
}

export interface Payment {
  id: number;
  payment_reference: string;
  customer_id: number;
  customer_name?: string | null;
  amount: string;
  payment_method: PaymentMethod;
  notes?: string | null;
  payment_date: string;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'OPENING_BALANCE' | 'ORDER' | 'PAYMENT';
  reference: string;
  description: string;
  debit: string;
  credit: string;
  amount: string;
  running_balance: string;
}

export interface BusinessSettings {
  id: number;
  business_name: string;
  address: string;
  phone: string;
  gstin?: string | null;
  currency: string;
  tax_rate_default: string;
  tax_inclusive: boolean;
  invoice_prefix: string;
  next_invoice_number: number;
  ai_provider: 'ollama' | 'gemini';
  gemini_model: string;
  ollama_base_url: string;
  ollama_model: string;
  updated_at: string;
}

export interface AIStatus {
  configured_provider: string;
  active_provider: string;
  ollama_available: boolean;
  ollama_endpoint: string;
  ollama_model: string;
  gemini_configured: boolean;
  gemini_model: string;
  error?: string | null;
}

export interface ExtractedItem {
  raw_product_name: string;
  matched_product_id?: number | null;
  matched_product_name?: string | null;
  matched_sku?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  unit_price?: number | string | null;
  tax_rate?: number | string | null;
  line_total?: number | string | null;
  confidence: number;
  needs_clarification: boolean;
  clarification_reason?: string | null;
}

export interface ExtractionResult {
  customer_name?: string | null;
  matched_customer_id?: number | null;
  items: ExtractedItem[];
  notes: string[];
  overall_needs_review: boolean;
  raw_extracted_text?: string | null;
  provider_used?: string | null;
  model_used?: string | null;
}
