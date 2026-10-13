import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatINR } from '../utils/formatters';
import {
  BarChart3,
  Download,
  TrendingUp,
  Package,
  AlertTriangle,
  Users,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'top_products' | 'inventory' | 'outstanding'>('sales');

  const { data: salesReport = [], isLoading: isSalesLoading } = useQuery({
    queryKey: ['report-sales'],
    queryFn: () => api.getReportsSales(),
  });

  const { data: topProducts = [], isLoading: isTopLoading } = useQuery({
    queryKey: ['report-top-products'],
    queryFn: () => api.getReportsTopProducts(),
  });

  const { data: inventoryReport = [], isLoading: isInvLoading } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => api.getReportsInventory(),
  });

  const { data: outstandingReport = [], isLoading: isOutLoading } = useQuery({
    queryKey: ['report-outstanding'],
    queryFn: () => api.getReportsOutstanding(),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated analytics derived strictly from stored database records
          </p>
        </div>
        <a
          href="http://localhost:8000/api/reports/export/csv"
          download="bahipilot_sales_report.csv"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Sales CSV</span>
        </a>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs gap-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'sales', label: 'Sales Over Time', icon: TrendingUp },
          { id: 'top_products', label: 'Top Products', icon: Package },
          { id: 'inventory', label: 'Inventory & Stock Status', icon: AlertTriangle },
          { id: 'outstanding', label: 'Outstanding Customer Balances', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                active
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Areas */}
      {/* TAB 1: Sales Over Time */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900">Approved Orders Revenue by Month</h2>
          </div>

          <div className="h-64 w-full">
            {salesReport.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No approved orders found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesReport} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    formatter={(val: any) => [formatINR(val), 'Sales']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="total_sales" fill="#059669" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead>
              <tr className="text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-2">Period</th>
                <th className="pb-2 text-center">Approved Orders</th>
                <th className="pb-2 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesReport.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2.5 font-semibold text-slate-900">{row.period}</td>
                  <td className="py-2.5 text-center text-slate-600">{row.orders_count} orders</td>
                  <td className="py-2.5 text-right font-bold text-emerald-600">{formatINR(row.total_sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: Top Products */}
      {activeTab === 'top_products' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="text-sm font-bold text-slate-900">Top-Selling Products by Revenue</h2>

          <div className="h-64 w-full">
            {topProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No sales data recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `₹${v}`} />
                  <YAxis type="category" dataKey="product_name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={120} />
                  <Tooltip
                    formatter={(val: any) => [formatINR(val), 'Revenue']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="revenue" fill="#0f172a" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead>
              <tr className="text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-2">Product</th>
                <th className="pb-2 text-center">Total Quantity Sold</th>
                <th className="pb-2 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProducts.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2.5 font-semibold text-slate-900">{p.product_name}</td>
                  <td className="py-2.5 text-center text-slate-600">{p.quantity_sold} units</td>
                  <td className="py-2.5 text-right font-bold text-slate-900">{formatINR(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Inventory Status */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Full Inventory Stock Levels</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead>
                <tr className="text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">Product Name</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2 text-right">Current Stock</th>
                  <th className="pb-2 text-right">Threshold</th>
                  <th className="pb-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryReport.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-mono text-slate-500">{p.sku}</td>
                    <td className="py-2.5 font-semibold text-slate-900">{p.name}</td>
                    <td className="py-2.5 text-slate-600">{p.category}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      {p.stock_quantity.toFixed(2)} {p.unit}s
                    </td>
                    <td className="py-2.5 text-right text-slate-500">
                      {p.reorder_threshold.toFixed(2)} {p.unit}s
                    </td>
                    <td className="py-2.5 text-center">
                      {p.is_low_stock ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Optimal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Customer Outstanding */}
      {activeTab === 'outstanding' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Customer Outstanding Ledger Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead>
                <tr className="text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Store / Business</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2 text-right">Opening Bal</th>
                  <th className="pb-2 text-right">Invoiced</th>
                  <th className="pb-2 text-right">Payments</th>
                  <th className="pb-2 text-right">Owed Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outstandingReport.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-semibold text-slate-900">{c.name}</td>
                    <td className="py-2.5 text-slate-600">{c.business_name || '—'}</td>
                    <td className="py-2.5 text-slate-500">{c.phone || '—'}</td>
                    <td className="py-2.5 text-right text-slate-500">{formatINR(c.opening_balance)}</td>
                    <td className="py-2.5 text-right text-slate-800">{formatINR(c.total_sales)}</td>
                    <td className="py-2.5 text-right text-emerald-600">{formatINR(c.total_payments)}</td>
                    <td className="py-2.5 text-right font-bold text-amber-600">
                      {formatINR(c.outstanding_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
