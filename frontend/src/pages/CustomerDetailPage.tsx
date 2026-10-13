import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatINR, formatDate, formatDateTime } from '../utils/formatters';
import {
  ArrowLeft,
  CreditCard,
  Phone,
  Store,
  BookOpen,
  Calendar,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { RecordPaymentModal } from '../components/RecordPaymentModal';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = Number(id);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customer-ledger', customerId],
    queryFn: () => api.getCustomerLedger(customerId),
    enabled: !isNaN(customerId),
  });

  if (isLoading || !data) {
    return (
      <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
        Loading customer ledger...
      </div>
    );
  }

  const { customer, summary, entries } = data;
  const currentBal = parseFloat(summary.current_balance);
  const isOwing = currentBal > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{customer.name}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              {customer.business_name && (
                <span className="flex items-center gap-1">
                  <Store className="w-3 h-3 text-slate-400" />
                  {customer.business_name}
                </span>
              )}
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {customer.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setPaymentModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Account Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Opening Balance
          </span>
          <p className="text-base font-bold text-slate-900 mt-1">
            {formatINR(summary.opening_balance)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total Invoiced
          </span>
          <p className="text-base font-bold text-slate-900 mt-1">
            {formatINR(summary.total_sales)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total Payments
          </span>
          <p className="text-base font-bold text-emerald-600 mt-1">
            {formatINR(summary.total_payments)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Current Outstanding
          </span>
          <p
            className={`text-base font-bold mt-1 ${
              isOwing ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {formatINR(summary.current_balance)}
          </p>
        </div>
      </div>

      {/* Chronological Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            Chronological Statement of Account
          </h2>
          <span className="text-xs text-slate-500">{entries.length} recorded transaction(s)</span>
        </div>

        <div className="overflow-x-auto">
          {entries.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No transactions recorded for this customer yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Debit (Charges)</th>
                  <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                  <th className="py-2.5 px-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((item) => {
                  const runBal = parseFloat(item.running_balance);
                  const isDebit = parseFloat(item.debit) > 0;
                  const isCredit = parseFloat(item.credit) > 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {formatDate(item.date)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            item.type === 'ORDER'
                              ? 'bg-blue-50 text-blue-700'
                              : item.type === 'PAYMENT'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 text-[11px]">
                        {item.reference}
                      </td>
                      <td className="py-3 px-3 text-slate-600 truncate max-w-xs">
                        {item.description}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-900">
                        {isDebit ? formatINR(item.debit) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600">
                        {isCredit ? `-${formatINR(item.credit)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-xs">
                        <span className={runBal > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                          {formatINR(item.running_balance)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <RecordPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        defaultCustomerId={customerId}
      />
    </div>
  );
};
