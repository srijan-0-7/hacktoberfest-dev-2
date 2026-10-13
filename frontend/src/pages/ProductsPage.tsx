import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatINR } from '../utils/formatters';
import {
  Package,
  Search,
  Plus,
  SlidersHorizontal,
  Download,
  AlertTriangle,
  Archive,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { Product } from '../types';
import { AddProductModal } from '../components/AddProductModal';
import { StockAdjustmentModal } from '../components/StockAdjustmentModal';

export const ProductsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedAdjustProduct, setSelectedAdjustProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', search, categoryFilter, lowStockFilter],
    queryFn: () =>
      api.getProducts({
        search: search || undefined,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        low_stock_only: lowStockFilter,
      }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => api.archiveProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products & Inventory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Maintain wholesale catalogue, stock levels, reorder thresholds, and AI alias keywords
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="http://localhost:8000/api/products/export/csv"
            download="bahipilot_products.csv"
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
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setCategoryFilter('all');
                setLowStockFilter(false);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                categoryFilter === 'all' && !lowStockFilter
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Products
            </button>
            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                lowStockFilter
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Low Stock Alerts</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategoryFilter(cat);
                  setLowStockFilter(false);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  categoryFilter === cat && !lowStockFilter
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search product, SKU, or alias..."
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
              Loading catalogue products...
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No products found</p>
              <p className="text-xs text-slate-400 mt-1">
                Try adjusting your search query or add a new wholesale product.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3">Product Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Selling Price</th>
                  <th className="py-3 px-3 text-right">Stock</th>
                  <th className="py-3 px-3">AI Aliases</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const stockNum = parseFloat(p.stock_quantity);
                  const threshNum = parseFloat(p.reorder_threshold);
                  const isLow = stockNum <= threshNum;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 text-[11px]">
                        {p.sku}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatINR(p.selling_price)}
                        <span className="text-[10px] text-slate-400 font-normal"> / {p.unit}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span
                            className={`font-bold ${
                              isLow ? 'text-rose-600' : 'text-slate-800'
                            }`}
                          >
                            {stockNum.toFixed(2)} {p.unit}s
                          </span>
                          {isLow && (
                            <span
                              className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"
                              title={`Low stock alert! Reorder threshold: ${threshNum}`}
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p.aliases.slice(0, 2).map((alias, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium"
                            >
                              <Tag className="w-2.5 h-2.5 text-slate-400" />
                              {alias}
                            </span>
                          ))}
                          {p.aliases.length > 2 && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              +{p.aliases.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedAdjustProduct(p)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold rounded-lg transition-colors"
                            title="Adjust inventory with reason"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Adjust</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Archive product '${p.name}'?`)) {
                                archiveMutation.mutate(p.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Archive product"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
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
      <AddProductModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <StockAdjustmentModal
        isOpen={selectedAdjustProduct !== null}
        onClose={() => setSelectedAdjustProduct(null)}
        product={selectedAdjustProduct}
      />
    </div>
  );
};
