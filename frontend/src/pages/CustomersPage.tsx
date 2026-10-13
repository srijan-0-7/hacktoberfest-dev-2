import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatINR } from '../utils/formatters';
import {
  Users,
  Search,
  Plus,
  CreditCard,
  Download,
  BookOpen,
  ArrowRight,
  Phone,
  Store,
  Edit3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Customer } from '../types';
import { AddCustomerModal } from '../components/AddCustomerModal';
import { EditCustomerModal } from '../components/EditCustomerModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';

export const CustomersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedPaymentCustId, setSelectedPaymentCustId] = useState<number | undefined>(undefined);
  const [selectedEditCustomer, setSelectedEditCustomer] = useState<Customer | null>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => api.getCustomers(search || undefined),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers & Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track customer accounts, running balances, payment histories, and credit terms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="http://localhost:8000/api/customers/export/csv"
            download="bahipilot_customers.csv"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </a>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search & Stats Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{customers.length}</span> active customer account(s)
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search customer, store, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
              Loading customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No customers found</p>
              <p className="text-xs text-slate-400 mt-1">
                Add a wholesale buyer or kirana store to begin tracking ledger balances.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Customer & Business</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3 text-right">Opening Bal</th>
                  <th className="py-3 px-3 text-right">Total Invoiced</th>
                  <th className="py-3 px-3 text-right">Total Paid</th>
                  <th className="py-3 px-3 text-right">Outstanding Bal</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const bal = parseFloat(c.current_balance);
                  const isOwing = bal > 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <Link
                          to={`/customers/${c.id}`}
                          className="font-bold text-slate-900 hover:text-emerald-600 transition-colors block text-xs"
                        >
                          {c.name}
                        </Link>
                        {c.business_name && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Store className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{c.business_name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">
                        {c.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{c.phone}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {formatINR(c.opening_balance)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700 font-medium">
                        {formatINR(c.total_sales)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-600 font-medium">
                        {formatINR(c.total_payments)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-bold text-xs ${
                            isOwing ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatINR(c.current_balance)}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {isOwing ? 'Owes Store' : 'Settled / Credit'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedEditCustomer(c)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit Customer Profile"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedPaymentCustId(c.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold rounded-lg transition-colors"
                            title="Record Payment"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                          <Link
                            to={`/customers/${c.id}`}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition-colors"
                            title="View Complete Ledger"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Ledger</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddCustomerModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <EditCustomerModal
        isOpen={selectedEditCustomer !== null}
        onClose={() => setSelectedEditCustomer(null)}
        customer={selectedEditCustomer}
      />
      <RecordPaymentModal
        isOpen={selectedPaymentCustId !== undefined}
        onClose={() => setSelectedPaymentCustId(undefined)}
        defaultCustomerId={selectedPaymentCustId}
      />
    </div>
  );
};
