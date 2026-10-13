import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Product } from '../types';
import { X, SlidersHorizontal, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const StockAdjustmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  product,
}) => {
  const queryClient = useQueryClient();
  const [adjustmentType, setAdjustmentType] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const adjustMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { quantity_change: number; reason: string } }) =>
      api.adjustStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      onClose();
      setQuantity('');
      setReason('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to adjust stock');
    },
  });

  if (!isOpen || !product) return null;

  const currentStock = parseFloat(product.stock_quantity) || 0;
  const numQty = parseFloat(quantity) || 0;
  const projectedChange = adjustmentType === 'ADD' ? numQty : -numQty;
  const projectedStock = currentStock + projectedChange;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || numQty <= 0) {
      setError('Please enter a quantity greater than zero');
      return;
    }
    if (!reason.trim()) {
      setError('A reason is strictly required for inventory audit auditability');
      return;
    }
    if (projectedStock < 0) {
      setError(`Cannot deduct ${numQty}. Current stock is only ${currentStock}`);
      return;
    }

    adjustMutation.mutate({
      id: product.id,
      data: {
        quantity_change: projectedChange,
        reason: reason.trim(),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-base">Adjust Stock</h2>
              <p className="text-xs text-slate-500 truncate max-w-[260px]">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Stock Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-600">Current In-Stock:</span>
            <span className="font-bold text-slate-900 text-sm">
              {currentStock} {product.unit}s
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Action Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('ADD')}
                className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                  adjustmentType === 'ADD'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                + Add Stock (Restock)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('DEDUCT')}
                className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                  adjustmentType === 'DEDUCT'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                - Deduct Stock (Damage/Loss)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity to {adjustmentType === 'ADD' ? 'Add' : 'Deduct'} ({product.unit}s) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              required
            />
            {numQty > 0 && (
              <p className={`text-xs mt-1.5 font-medium ${projectedStock < 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                Resulting stock: {projectedStock.toFixed(2)} {product.unit}s
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Adjustment *
            </label>
            <input
              type="text"
              placeholder="e.g. Stock count audit, Received supplier shipment, Damaged pack"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adjustMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {adjustMutation.isPending ? 'Updating...' : 'Commit Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
