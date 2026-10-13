import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatINR, formatDate, getStatusBadgeClass } from '../utils/formatters';
import {
  Search,
  PlusCircle,
  Sparkles,
  Receipt,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  ArrowRight,
  Clock,
  Layers,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { InvoiceModal } from '../components/InvoiceModal';

export const OrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const statusParam = searchParams.get('status') || 'ALL';
  const [search, setSearch] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', statusParam, search],
    queryFn: () => api.getOrders({ status: statusParam === 'ALL' ? undefined : statusParam, search: search || undefined }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.approveOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const statuses = [
    { id: 'ALL', label: 'All Orders' },
    { id: 'PENDING_REVIEW', label: 'Pending Review', highlight: true },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'DRAFT', label: 'Drafts' },
    { id: 'CANCELLED', label: 'Cancelled' },
    { id: 'REJECTED', label: 'Rejected' },
  ];

  const handleStatusChange = (st: string) => {
    if (st === 'ALL') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', st);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Orders Registry</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track customer orders, review AI extractions, and issue GST-compliant invoices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/orders/new"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Create Manual Order</span>
          </Link>
          <Link
            to="/orders/import"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Import Document / Chit</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {statuses.map((tab) => {
              const active = statusParam.toUpperCase() === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleStatusChange(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : tab.highlight
                      ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search order # or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No orders found</p>
              <p className="text-xs text-slate-400 mt-1">
                {statusParam !== 'ALL'
                  ? `No orders matching status '${statusParam}'. Try switching to 'All Orders'.`
                  : 'Get started by creating a manual order or scanning a wholesale order sheet.'}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Link
                  to="/orders/new"
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-xl"
                >
                  + Manual Order
                </Link>
                <Link
                  to="/orders/import"
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-xl"
                >
                  AI Import
                </Link>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Order #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3 text-center">Source</th>
                  <th className="py-3 px-3 text-center">Items</th>
                  <th className="py-3 px-3 text-right">Grand Total</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <Link
                        to={`/orders/${ord.id}`}
                        className="hover:text-emerald-600 transition-colors flex items-center gap-1"
                      >
                        {ord.order_number}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {formatDate(ord.created_at)}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {ord.customer_name || (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          ord.source_type === 'AI_EXTRACTED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {ord.source_type === 'AI_EXTRACTED' && (
                          <Sparkles className="w-2.5 h-2.5" />
                        )}
                        {ord.source_type === 'AI_EXTRACTED' ? 'AI Extracted' : 'Manual'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 font-medium">
                      {ord.item_count} items
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatINR(ord.grand_total)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadgeClass(
                          ord.status
                        )}`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/orders/${ord.id}`}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setSelectedInvoiceId(ord.id)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Print Tax Invoice"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        {ord.status === 'PENDING_REVIEW' && (
                          <button
                            onClick={() => approveMutation.mutate(ord.id)}
                            disabled={approveMutation.isPending}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                            title="Approve Order & Deduct Stock"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      <InvoiceModal
        orderId={selectedInvoiceId}
        isOpen={selectedInvoiceId !== null}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </div>
  );
};
