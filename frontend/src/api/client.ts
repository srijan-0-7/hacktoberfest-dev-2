import {
  Product,
  Customer,
  Order,
  OrderListItem,
  Payment,
  BusinessSettings,
  AIStatus,
  ExtractionResult,
} from '../types';

const API_BASE = 'http://localhost:8000/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      errorDetail = res.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Dashboard
  async getDashboardSummary() {
    const res = await fetch(`${API_BASE}/dashboard/summary`);
    return handleResponse<{
      today_sales: string;
      total_outstanding: string;
      orders_pending_review: number;
      low_stock_count: number;
      recent_orders: Array<{
        id: number;
        order_number: string;
        customer_name: string;
        status: string;
        source_type: string;
        grand_total: string;
        created_at: string;
      }>;
      recent_payments: Array<{
        id: number;
        payment_reference: string;
        customer_name: string;
        amount: string;
        payment_method: string;
        payment_date: string;
      }>;
    }>(res);
  },

  async getSalesTrend(days = 7) {
    const res = await fetch(`${API_BASE}/dashboard/sales-trend?days=${days}`);
    return handleResponse<Array<{ date: string; full_date: string; sales: number }>>(res);
  },

  // Products
  async getProducts(params?: { search?: string; category?: string; low_stock_only?: boolean }) {
    const url = new URL(`${API_BASE}/products`);
    if (params?.search) url.searchParams.append('search', params.search);
    if (params?.category) url.searchParams.append('category', params.category);
    if (params?.low_stock_only) url.searchParams.append('low_stock_only', 'true');
    const res = await fetch(url.toString());
    return handleResponse<Product[]>(res);
  },

  async createProduct(data: {
    sku: string;
    name: string;
    category?: string;
    unit?: string;
    selling_price: number | string;
    stock_quantity?: number | string;
    reorder_threshold?: number | string;
    aliases?: string[];
  }) {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Product>(res);
  },

  async updateProduct(id: number, data: Partial<Product>) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Product>(res);
  },

  async archiveProduct(id: number) {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    return handleResponse<{ message: string }>(res);
  },

  async adjustStock(id: number, data: { quantity_change: number | string; reason: string }) {
    const res = await fetch(`${API_BASE}/products/${id}/stock-adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Product>(res);
  },

  // Customers
  async getCustomers(search?: string) {
    const url = new URL(`${API_BASE}/customers`);
    if (search) url.searchParams.append('search', search);
    const res = await fetch(url.toString());
    return handleResponse<Customer[]>(res);
  },

  async getCustomer(id: number) {
    const res = await fetch(`${API_BASE}/customers/${id}`);
    return handleResponse<Customer>(res);
  },

  async createCustomer(data: {
    name: string;
    business_name?: string;
    phone?: string;
    notes?: string;
    opening_balance?: number | string;
  }) {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Customer>(res);
  },

  async updateCustomer(id: number, data: Partial<Customer>) {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Customer>(res);
  },

  async getCustomerLedger(id: number) {
    const res = await fetch(`${API_BASE}/customers/${id}/ledger`);
    return handleResponse<{
      customer: { id: number; name: string; business_name?: string; phone?: string };
      summary: {
        opening_balance: string;
        total_sales: string;
        total_payments: string;
        current_balance: string;
      };
      entries: Array<{
        id: string;
        date: string;
        type: string;
        reference: string;
        description: string;
        debit: string;
        credit: string;
        amount: string;
        running_balance: string;
      }>;
    }>(res);
  },

  // Orders
  async getOrders(params?: { status?: string; search?: string; date_from?: string; date_to?: string }) {
    const url = new URL(`${API_BASE}/orders`);
    if (params?.status) url.searchParams.append('status', params.status);
    if (params?.search) url.searchParams.append('search', params.search);
    if (params?.date_from) url.searchParams.append('date_from', params.date_from);
    if (params?.date_to) url.searchParams.append('date_to', params.date_to);
    const res = await fetch(url.toString());
    return handleResponse<OrderListItem[]>(res);
  },

  async getOrder(id: number) {
    const res = await fetch(`${API_BASE}/orders/${id}`);
    return handleResponse<Order>(res);
  },

  async createOrder(data: {
    customer_id?: number | null;
    source_type?: string;
    source_filename?: string;
    status?: string;
    notes?: string;
    items: Array<{
      product_id?: number | null;
      product_name: string;
      sku?: string;
      quantity: number | string;
      unit: string;
      unit_price: number | string;
      tax_rate?: number | string;
    }>;
  }) {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Order>(res);
  },

  async updateOrder(id: number, data: any) {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Order>(res);
  },

  async approveOrder(id: number) {
    const res = await fetch(`${API_BASE}/orders/${id}/approve`, { method: 'POST' });
    return handleResponse<Order>(res);
  },

  async rejectOrder(id: number) {
    const res = await fetch(`${API_BASE}/orders/${id}/reject`, { method: 'POST' });
    return handleResponse<Order>(res);
  },

  async cancelOrder(id: number) {
    const res = await fetch(`${API_BASE}/orders/${id}/cancel`, { method: 'POST' });
    return handleResponse<Order>(res);
  },

  async getOrderInvoice(id: number) {
    const res = await fetch(`${API_BASE}/orders/${id}/invoice`);
    return handleResponse<{
      business: { name: string; address: string; phone: string; gstin?: string; currency: string };
      order: Order;
      customer_balance?: string | null;
    }>(res);
  },

  // Payments
  async getPayments(customerId?: number) {
    const url = new URL(`${API_BASE}/payments`);
    if (customerId) url.searchParams.append('customer_id', customerId.toString());
    const res = await fetch(url.toString());
    return handleResponse<Payment[]>(res);
  },

  async recordPayment(data: {
    customer_id: number;
    amount: number | string;
    payment_method: string;
    notes?: string;
    payment_date?: string;
  }) {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Payment>(res);
  },

  // AI Extraction
  async extractOrder(formData: FormData) {
    const res = await fetch(`${API_BASE}/orders/extract`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<ExtractionResult>(res);
  },

  async getAIStatus() {
    const res = await fetch(`${API_BASE}/ai/status`);
    return handleResponse<AIStatus>(res);
  },

  async testAIConnection(provider?: string) {
    const url = new URL(`${API_BASE}/ai/test-connection`);
    if (provider) url.searchParams.append('provider', provider);
    const res = await fetch(url.toString(), { method: 'POST' });
    return handleResponse<{ provider: string; connected: boolean; message: string }>(res);
  },

  // Reports
  async getReportsSales() {
    const res = await fetch(`${API_BASE}/reports/sales`);
    return handleResponse<Array<{ period: string; orders_count: number; total_sales: number }>>(res);
  },

  async getReportsTopProducts() {
    const res = await fetch(`${API_BASE}/reports/top-products`);
    return handleResponse<Array<{ product_name: string; quantity_sold: number; revenue: number }>>(res);
  },

  async getReportsInventory() {
    const res = await fetch(`${API_BASE}/reports/inventory`);
    return handleResponse<any[]>(res);
  },

  async getReportsOutstanding() {
    const res = await fetch(`${API_BASE}/reports/outstanding`);
    return handleResponse<any[]>(res);
  },

  // Settings
  async getSettings() {
    const res = await fetch(`${API_BASE}/settings`);
    return handleResponse<BusinessSettings>(res);
  },

  async updateSettings(data: Partial<BusinessSettings>) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<BusinessSettings>(res);
  },
};
