import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatINR, formatDate, formatDateTime, getStatusBadgeClass } from '../utils/formatters';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Printer,
  Sparkles,
  AlertCircle,
  FileText,
  User,
  Clock,
  Layers,
} from 'lucide-react';
import { InvoiceModal } from '../components/InvoiceModal';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const orderId = Number(id);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId),
    enabled: !isNaN(orderId),
  });

  const approveMutation = useMutation({
    mutationFn: () => api.approveOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Approval failed');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Rejection failed');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Cancellation failed');
    },
  });

  if (isLoading || !order) {
    return (
      <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
        Loading order details...
      </div>
    );
  }

  const isPendingOrDraft = order.status === 'PENDING_REVIEW' || order.status === 'DRAFT';
  const isApproved = order.status === 'APPROVED';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Back button and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Order #{order.order_number}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${getStatusBadgeClass(
                  order.status
                )}`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Created on {formatDateTime(order.created_at)}
              {order.approved_at && ` • Approved on ${formatDateTime(order.approved_at)}`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setInvoiceOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Invoice</span>
          </button>

          {isPendingOrDraft && (
            <>
              <button
                onClick={() => {
                  if (confirm('Approve this order? Stock will be deducted and the ledger will be posted.')) {
                    approveMutation.mutate();
                  }
                }}
                disabled={approveMutation.isPending}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{approveMutation.isPending ? 'Approving...' : 'Approve Order'}</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reject this order?')) {
                    rejectMutation.mutate();
                  }
                }}
                disabled={rejectMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </>
          )}

          {isApproved && (
            <button
              onClick={() => {
                if (
                  confirm(
                    'Cancel this approved order? Stock will be restored to inventory and the sale will be reversed.'
                  )
                ) {
                  cancelMutation.mutate();
                }
              }}
              disabled={cancelMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{cancelMutation.isPending ? 'Cancelling...' : 'Cancel & Revert Stock'}</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Customer & Source Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Box */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <User className="w-3.5 h-3.5 text-slate-400" />
            Customer Information
          </h2>
          {order.customer_id ? (
            <div className="space-y-1">
              <Link
                to={`/customers/${order.customer_id}`}
                className="text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors"
              >
                {order.customer_name}
              </Link>
              {order.customer_business_name && (
                <p className="text-xs text-slate-600">{order.customer_business_name}</p>
              )}
              {order.customer_phone && (
                <p className="text-xs text-slate-500">Phone: {order.customer_phone}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No customer assigned to this order.</p>
          )}
        </div>

        {/* Source & Notes Box */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Order Metadata
          </h2>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-500">Source:</span>
              <span className="font-semibold text-slate-800">
                {order.source_type === 'AI_EXTRACTED' ? 'AI Extracted' : 'Manual Entry'}
              </span>
            </div>
            {order.source_filename && (
              <div className="flex justify-between">
                <span className="text-slate-500">Source Document:</span>
                <span className="font-mono text-[11px] text-slate-700 truncate max-w-[200px]">
                  {order.source_filename}
                </span>
              </div>
            )}
            {order.notes && (
              <div className="pt-1 border-t border-slate-100">
                <span className="text-slate-500">Notes:</span>
                <p className="text-slate-800 mt-0.5">{order.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-semibold text-sm text-slate-900">
          Order Line Items ({order.items.length})
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4">#</th>
              <th className="py-2.5 px-3">Item Description</th>
              <th className="py-2.5 px-3 text-right">Quantity</th>
              <th className="py-2.5 px-3 text-right">Unit Price</th>
              <th className="py-2.5 px-3 text-right">Tax Rate</th>
              <th className="py-2.5 px-4 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-slate-50/50">
                <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                <td className="py-3 px-3">
                  <div className="font-semibold text-slate-900">
                    {item.product_name_snapshot}
                  </div>
                  {item.sku_snapshot && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      SKU: {item.sku_snapshot}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 text-right font-medium text-slate-800">
                  {parseFloat(item.quantity).toFixed(2)} {item.unit_snapshot}
                </td>
                <td className="py-3 px-3 text-right text-slate-700">
                  {formatINR(item.unit_price)}
                </td>
                <td className="py-3 px-3 text-right text-slate-500">
                  {parseFloat(item.tax_rate).toFixed(0)}%
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {formatINR(item.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Calculation Summary Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-900">{formatINR(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST / Tax Total:</span>
              <span className="font-medium text-slate-900">{formatINR(order.tax_total)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="text-emerald-700">{formatINR(order.grand_total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Print Modal */}
      <InvoiceModal
        orderId={order.id}
        isOpen={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
      />
    </div>
  );
};
