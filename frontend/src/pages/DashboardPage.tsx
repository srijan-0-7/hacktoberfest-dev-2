import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatINR, formatDate, formatDateTime, getStatusBadgeClass } from '../utils/formatters';
import {
  IndianRupee,
  Users,
  Clock,
  AlertTriangle,
  PlusCircle,
  Sparkles,
  PackagePlus,
  CreditCard,
  ArrowRight,
  TrendingUp,
  Receipt,
  CheckCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { AddProductModal } from '../components/AddProductModal';
import { InvoiceModal } from '../components/InvoiceModal';

export const DashboardPage: React.FC = () => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.getDashboardSummary(),
  });

  const { data: salesTrend = [], isLoading: isTrendLoading } = useQuery({
    queryKey: ['sales-trend'],
    queryFn: () => api.getSalesTrend(7),
  });

  if (isSummaryLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-48 mb-2"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 p-5"></div>
          ))}
        </div>
        <div className="h-80 bg-white rounded-2xl border border-slate-200 p-6"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Title & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Overview</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time operations, inventory ledger, and pending order review queue
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/orders/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Order</span>
          </Link>
          <Link
            to="/orders/import"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Import</span>
          </Link>
          <button
            onClick={() => setPaymentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition-all shadow-xs"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={() => setProductModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition-all shadow-xs"
          >
            <PackagePlus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's Approved Sales */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Today's Sales
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">
            {formatINR(summary?.today_sales || '0.00')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Excludes cancelled & draft orders</p>
        </div>

        {/* Metric 2: Total Outstanding Balances */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Outstanding
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">
            {formatINR(summary?.total_outstanding || '0.00')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Positive balance owed by customers</p>
        </div>

        {/* Metric 3: Orders Awaiting Review */}
        <Link
          to="/orders?status=PENDING_REVIEW"
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Review
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-2xl font-bold text-slate-900 tracking-tight">
              {summary?.orders_pending_review || 0}
            </p>
            {(summary?.orders_pending_review || 0) > 0 && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
                Review <ArrowRight className="w-3 h-3" />
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Orders waiting human verification</p>
        </Link>

        {/* Metric 4: Low-Stock Products */}
        <Link
          to="/products?low_stock_only=true"
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-rose-300 transition-all block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Low Stock Alerts
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                (summary?.low_stock_count || 0) > 0
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p
              className={`text-2xl font-bold tracking-tight ${
                (summary?.low_stock_count || 0) > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {summary?.low_stock_count || 0}
            </p>
            {(summary?.low_stock_count || 0) > 0 && (
              <span className="text-xs text-rose-600 font-semibold flex items-center gap-0.5">
                Restock <ArrowRight className="w-3 h-3" />
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">At or below reorder threshold</p>
        </Link>
      </div>

      {/* Sales Trend Chart Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Sales Trend (Past 7 Days)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily revenue derived strictly from approved orders in database
            </p>
          </div>
          <Link
            to="/reports"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            Detailed Reports <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="h-64 w-full">
          {salesTrend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No sales records available yet. Approve orders to generate charts.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip
                  formatter={(value: any) => [formatINR(value), 'Sales']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#34d399' }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Dual Recent Activity Tables: Recent Orders & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-600" />
              Recent Orders
            </h2>
            <Link
              to="/orders"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {summary?.recent_orders.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No orders recorded yet. Create an order or import an invoice.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Order #</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 text-center">Status</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary?.recent_orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 font-bold text-slate-900">
                        <Link to={`/orders/${o.id}`} className="hover:text-emerald-600 transition-colors">
                          {o.order_number}
                        </Link>
                      </td>
                      <td className="py-2.5 text-slate-700 truncate max-w-[130px]">
                        {o.customer_name}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-slate-900">
                        {formatINR(o.grand_total)}
                      </td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadgeClass(
                            o.status
                          )}`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => setSelectedInvoiceId(o.id)}
                          className="text-slate-500 hover:text-slate-900 p-1"
                          title="View Invoice"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Payments Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Recent Payments Received
            </h2>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              + Record Payment
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            {summary?.recent_payments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No payments recorded yet. Click '+ Record Payment' above.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Receipt #</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Mode</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary?.recent_payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 font-mono text-[11px] text-slate-500">
                        {p.payment_reference}
                      </td>
                      <td className="py-2.5 font-medium text-slate-800 truncate max-w-[140px]">
                        {p.customer_name}
                      </td>
                      <td className="py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">
                        +{formatINR(p.amount)}
                      </td>
                      <td className="py-2.5 text-right text-slate-400 text-[11px]">
                        {formatDate(p.payment_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <RecordPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
      />
      <AddProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
      />
      <InvoiceModal
        orderId={selectedInvoiceId}
        isOpen={selectedInvoiceId !== null}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </div>
  );
};
