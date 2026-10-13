import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatINR } from '../utils/formatters';
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShoppingCart,
  User,
  Package,
} from 'lucide-react';

interface LineItemForm {
  product_id?: number;
  product_name: string;
  sku?: string;
  quantity: string;
  unit: string;
  unit_price: string;
  tax_rate: string;
}

export const NewOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<LineItemForm[]>([
    {
      product_name: '',
      quantity: '1',
      unit: 'piece',
      unit_price: '0',
      tax_rate: '5',
    },
  ]);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.getCustomers(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
  });

  const handleProductSelect = (index: number, productId: number) => {
    const selectedProd = products.find((p) => p.id === productId);
    if (!selectedProd) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        product_id: selectedProd.id,
        product_name: selectedProd.name,
        sku: selectedProd.sku,
        unit: selectedProd.unit,
        unit_price: selectedProd.selling_price,
      };
      return copy;
    });
  };

  const handleItemChange = (index: number, field: keyof LineItemForm, val: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        product_name: '',
        quantity: '1',
        unit: 'piece',
        unit_price: '0',
        tax_rate: '5',
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Live client totals preview
  let subtotal = 0;
  let taxTotal = 0;
  items.forEach((item) => {
    const q = parseFloat(item.quantity) || 0;
    const p = parseFloat(item.unit_price) || 0;
    const t = parseFloat(item.tax_rate) || 0;
    const lineSub = q * p;
    const lineTx = lineSub * (t / 100);
    subtotal += lineSub;
    taxTotal += lineTx;
  });
  const grandTotal = subtotal + taxTotal;

  const createOrderMutation = useMutation({
    mutationFn: async ({ shouldApprove }: { shouldApprove: boolean }) => {
      if (items.length === 0) throw new Error('Order must have at least one line item');
      for (const it of items) {
        if (!it.product_name.trim()) throw new Error('Each item must have a product selected');
        if (parseFloat(it.quantity) <= 0) throw new Error(`Invalid quantity for ${it.product_name}`);
      }

      const orderPayload = {
        customer_id: customerId === '' ? null : Number(customerId),
        status: shouldApprove ? 'PENDING_REVIEW' : 'DRAFT',
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          product_id: it.product_id || null,
          product_name: it.product_name,
          sku: it.sku || undefined,
          quantity: parseFloat(it.quantity),
          unit: it.unit || 'piece',
          unit_price: parseFloat(it.unit_price) || 0,
          tax_rate: parseFloat(it.tax_rate) || 0,
        })),
      };

      const createdOrder = await api.createOrder(orderPayload);
      if (shouldApprove) {
        return await api.approveOrder(createdOrder.id);
      }
      return createdOrder;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate(`/orders/${order.id}`);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create order');
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create Manual Order</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Build an order line by line and immediately persist to database
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customer & Notes Selection */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">— Walk-in / Unassigned Customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.business_name ? `(${c.business_name})` : ''} — Outstanding: {formatINR(c.current_balance)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Order Notes / Delivery Instructions
            </label>
            <input
              type="text"
              placeholder="e.g. Deliver via APMC Gate #2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Line Items Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            Order Line Items
          </h2>
          <button
            type="button"
            onClick={addItemRow}
            className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {items.map((item, idx) => {
            const lineTotal =
              (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) * (1 + (parseFloat(item.tax_rate) || 0) / 100);

            return (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl bg-slate-50 border border-slate-200/60"
              >
                {/* Product Dropdown / Input */}
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Product
                  </label>
                  <select
                    value={item.product_id || ''}
                    onChange={(e) => handleProductSelect(idx, Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">— Choose catalogue product —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.stock_quantity}) — ₹{p.selling_price}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Qty ({item.unit || 'unit'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Price */}
                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Tax % */}
                <div className="col-span-4 sm:col-span-1">
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    GST %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.tax_rate}
                    onChange={(e) => handleItemChange(idx, 'tax_rate', e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Line Total */}
                <div className="col-span-10 sm:col-span-2 text-right">
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Line Total
                  </label>
                  <p className="text-xs font-bold text-slate-900 py-1.5">
                    {formatINR(lineTotal)}
                  </p>
                </div>

                {/* Delete Button */}
                <div className="col-span-2 sm:col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors disabled:opacity-30"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals & Submit Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-auto text-left text-xs text-slate-500">
            <span>{items.length} product(s) configured</span>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-6">
            <div className="text-right space-y-1 text-xs">
              <div className="text-slate-500">
                Subtotal: <span className="font-semibold text-slate-800">{formatINR(subtotal)}</span>
              </div>
              <div className="text-slate-500">
                Tax: <span className="font-semibold text-slate-800">{formatINR(taxTotal)}</span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                Grand Total: <span className="text-emerald-700">{formatINR(grandTotal)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => createOrderMutation.mutate({ shouldApprove: false })}
                disabled={createOrderMutation.isPending}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => createOrderMutation.mutate({ shouldApprove: true })}
                disabled={createOrderMutation.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Approve</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
