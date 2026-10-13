import React, { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatINR, formatDate, formatDateTime, getStatusBadgeClass } from '../utils/formatters';
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react';

interface Props {
  orderId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<Props> = ({ orderId, isOpen, onClose }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['order-invoice', orderId],
    queryFn: () => (orderId ? api.getOrderInvoice(orderId) : null),
    enabled: isOpen && orderId !== null,
  });

  if (!isOpen || !orderId) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden print:m-0 print:border-none print:shadow-none print:w-full">
        {/* Modal Controls - hidden in print */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm">Tax Invoice Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        {isLoading || !data ? (
          <div className="p-12 text-center text-slate-500 animate-pulse">
            Loading invoice details...
          </div>
        ) : (
          <div className="p-8 font-sans bg-white text-slate-900" id="printable-invoice">
            {/* Header: Business & Invoice Info */}
            <div className="flex justify-between items-start pb-6 border-b border-slate-200">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {data.business.name}
                </h1>
                <p className="text-xs text-slate-600 mt-1 max-w-xs whitespace-pre-line">
                  {data.business.address}
                </p>
                <p className="text-xs text-slate-600 mt-1">Phone: {data.business.phone}</p>
                {data.business.gstin && (
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">
                    GSTIN: {data.business.gstin}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase bg-slate-100 text-slate-800 rounded">
                  TAX INVOICE
                </span>
                <p className="text-base font-bold text-slate-900 mt-2">
                  #{data.order.order_number}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Date: {formatDate(data.order.approved_at || data.order.created_at)}
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase ${getStatusBadgeClass(
                      data.order.status
                    )}`}
                  >
                    {data.order.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Bill To Customer Section */}
            <div className="py-5 border-b border-slate-200 flex justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Billed To
                </p>
                <h2 className="text-sm font-bold text-slate-900 mt-1">
                  {data.order.customer_name || 'Walk-in / Cash Customer'}
                </h2>
                {data.order.customer_business_name && (
                  <p className="text-xs text-slate-600">{data.order.customer_business_name}</p>
                )}
                {data.order.customer_phone && (
                  <p className="text-xs text-slate-600">Phone: {data.order.customer_phone}</p>
                )}
              </div>
              {data.customer_balance !== null && data.customer_balance !== undefined && (
                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Customer Outstanding
                  </p>
                  <p
                    className={`text-sm font-bold mt-1 ${
                      parseFloat(data.customer_balance) > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatINR(data.customer_balance)}
                  </p>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="py-6">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 pr-2">#</th>
                    <th className="py-2.5 px-2">Item Description</th>
                    <th className="py-2.5 px-2 text-right">Qty</th>
                    <th className="py-2.5 px-2 text-right">Unit Rate</th>
                    <th className="py-2.5 px-2 text-right">GST %</th>
                    <th className="py-2.5 pl-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.order.items.map((item, idx) => (
                    <tr key={item.id} className="text-slate-800">
                      <td className="py-3 pr-2 text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-2">
                        <div className="font-semibold text-slate-900">
                          {item.product_name_snapshot}
                        </div>
                        {item.sku_snapshot && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            SKU: {item.sku_snapshot}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right font-medium">
                        {parseFloat(item.quantity).toFixed(2)} {item.unit_snapshot}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {formatINR(item.unit_price)}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-500">
                        {parseFloat(item.tax_rate).toFixed(0)}%
                      </td>
                      <td className="py-3 pl-2 text-right font-bold text-slate-900">
                        {formatINR(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculation Totals */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-medium text-slate-900">{formatINR(data.order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST / Tax Total:</span>
                  <span className="font-medium text-slate-900">{formatINR(data.order.tax_total)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-emerald-700">{formatINR(data.order.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* Terms and Sign-off */}
            <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end text-[11px] text-slate-500">
              <div>
                <p className="font-medium text-slate-700">Thank you for your business!</p>
                <p className="mt-0.5">Goods once sold will not be taken back without receipt.</p>
                <p className="text-[10px] text-slate-400 mt-2">Generated by BahiPilot AI Back Office</p>
              </div>
              <div className="text-right">
                <div className="w-36 border-b border-slate-300 pb-8 text-center text-slate-400">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
