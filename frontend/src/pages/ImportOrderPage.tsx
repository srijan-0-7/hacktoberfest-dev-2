import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatINR } from '../utils/formatters';
import {
  Upload,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Cpu,
  Cloud,
  FileCode,
  RotateCcw,
} from 'lucide-react';
import { ExtractedItem, ExtractionResult } from '../types';

export const ImportOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Wizard Stages: 1 = Input, 2 = Extracting, 3 = Review & Correct, 4 = Success
  const [stage, setStage] = useState<1 | 2 | 3>(1);

  // Stage 1 State
  const [inputMode, setInputMode] = useState<'FILE' | 'TEXT'>('FILE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [extractError, setExtractError] = useState<string | null>(null);

  // Stage 3 Review State
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [reviewItems, setReviewItems] = useState<ExtractedItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [orderNotes, setOrderNotes] = useState('');

  // Queries
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => api.getAIStatus(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.getCustomers(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
  });

  const sampleChitText = `Ramesh Gupta Store Order:
- 10 bags aashirvaad chakki atta 10kg
- 20 bottles mustard oil 1L
- 5 packets toor dal 1kg
- 15 bags sugar 5kg
- 4 jars nescafe coffee 200g
Please deliver by tomorrow morning`;

  const handleLoadSample = () => {
    setInputMode('TEXT');
    setRawText(sampleChitText);
  };

  // Stage 2: Extract Mutation
  const extractMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (inputMode === 'FILE' && selectedFile) {
        formData.append('file', selectedFile);
      } else if (rawText.trim()) {
        formData.append('raw_text', rawText.trim());
      } else {
        throw new Error('Please select an order document or paste order text.');
      }

      return await api.extractOrder(formData);
    },
    onMutate: () => {
      setExtractError(null);
      setStage(2);
    },
    onSuccess: (data) => {
      setExtractionResult(data);
      setReviewItems(data.items);
      if (data.matched_customer_id) {
        setSelectedCustomerId(data.matched_customer_id);
      }
      setStage(3);
    },
    onError: (err: any) => {
      setExtractError(err.message || 'AI extraction failed.');
      setStage(1);
    },
  });

  // Review item modifiers
  const handleItemProductSelect = (index: number, productId: number) => {
    const p = products.find((prod) => prod.id === productId);
    if (!p) return;

    setReviewItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        matched_product_id: p.id,
        matched_product_name: p.name,
        matched_sku: p.sku,
        unit: p.unit,
        unit_price: p.selling_price,
        needs_clarification: false,
        clarification_reason: null,
      };
      return copy;
    });
  };

  const handleItemFieldChange = (index: number, field: keyof ExtractedItem, val: any) => {
    setReviewItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const addReviewItem = () => {
    setReviewItems((prev) => [
      ...prev,
      {
        raw_product_name: '',
        quantity: 1,
        unit: 'piece',
        unit_price: 0,
        tax_rate: 5,
        confidence: 1.0,
        needs_clarification: false,
      },
    ]);
  };

  const removeReviewItem = (index: number) => {
    if (reviewItems.length <= 1) return;
    setReviewItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Recalculate review totals
  let reviewSubtotal = 0;
  let reviewTax = 0;
  reviewItems.forEach((it) => {
    const q = parseFloat(String(it.quantity || 0)) || 0;
    const p = parseFloat(String(it.unit_price || 0)) || 0;
    const t = parseFloat(String(it.tax_rate || 5)) || 5;
    const lineSub = q * p;
    reviewSubtotal += lineSub;
    reviewTax += lineSub * (t / 100);
  });
  const reviewGrandTotal = reviewSubtotal + reviewTax;

  // Save reviewed order mutation
  const saveOrderMutation = useMutation({
    mutationFn: async ({ shouldApprove }: { shouldApprove: boolean }) => {
      if (reviewItems.length === 0) throw new Error('Order must contain at least one line item');

      // Check if critical items remain unresolved
      const unresolved = reviewItems.filter((it) => !it.matched_product_id);
      if (shouldApprove && unresolved.length > 0) {
        throw new Error(
          `Cannot approve order with unmatched catalogue items ('${unresolved[0].raw_product_name}'). Please resolve or match all items first.`
        );
      }

      const orderPayload = {
        customer_id: selectedCustomerId === '' ? null : Number(selectedCustomerId),
        source_type: 'AI_EXTRACTED',
        source_filename: selectedFile?.name || 'text_import.txt',
        status: shouldApprove ? 'PENDING_REVIEW' : 'PENDING_REVIEW',
        notes: orderNotes.trim() || undefined,
        items: reviewItems.map((it) => ({
          product_id: it.matched_product_id || null,
          product_name: it.matched_product_name || it.raw_product_name,
          sku: it.matched_sku || undefined,
          quantity: parseFloat(String(it.quantity || 1)),
          unit: it.unit || 'piece',
          unit_price: parseFloat(String(it.unit_price || 0)),
          tax_rate: parseFloat(String(it.tax_rate || 5)),
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
      setExtractError(err.message || 'Failed to save order.');
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Flagship Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              Flagship Feature
            </span>
            <span className="text-xs text-slate-400 font-medium">• 4-Stage Guided Pipeline</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            AI-Assisted Order Import
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Extract structured orders from handwritten notes, WhatsApp photos, or wholesale chits
          </p>
        </div>

        {/* AI Provider Transparency Badge */}
        <div className="px-3 py-2 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5">
          {aiStatus?.active_provider === 'gemini' ? (
            <Cloud className="w-4 h-4 text-emerald-600" />
          ) : (
            <Cpu className="w-4 h-4 text-emerald-600" />
          )}
          <div className="text-left">
            <p className="text-[11px] font-bold text-slate-800 leading-tight">
              {aiStatus?.active_provider === 'gemini' ? 'Gemini Cloud Provider' : 'Local Ollama Provider'}
            </p>
            <p className="text-[10px] text-slate-400">
              {aiStatus?.active_provider === 'gemini' ? 'Configured via API key' : 'Private offline inference'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Step Indicator */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { num: 1, label: '1. Input Document / Text' },
          { num: 2, label: '2. AI Extraction & Matching' },
          { num: 3, label: '3. Line-Item Review & Save' },
        ].map((s) => (
          <div
            key={s.num}
            className={`py-2 px-3 rounded-xl border text-center transition-all ${
              stage === s.num
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-bold'
                : stage > s.num
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                : 'bg-white text-slate-400 border-slate-200 text-xs font-medium'
            }`}
          >
            <span className="text-xs">{s.label}</span>
          </div>
        ))}
      </div>

      {extractError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{extractError}</span>
          </div>
          <button
            onClick={() => {
              // Graceful fallback: switch to review stage with manual line item
              setReviewItems([
                {
                  raw_product_name: 'Manual Item',
                  quantity: 1,
                  unit: 'piece',
                  unit_price: 0,
                  tax_rate: 5,
                  confidence: 1.0,
                  needs_clarification: false,
                },
              ]);
              setStage(3);
            }}
            className="text-xs underline font-semibold text-rose-800 hover:text-rose-900"
          >
            Continue with Manual Entry &rarr;
          </button>
        </div>
      )}

      {/* ================= STAGE 1: INPUT ================= */}
      {stage === 1 && (
        <div className="space-y-6">
          {/* Mode Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setInputMode('FILE')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  inputMode === 'FILE'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Upload File (PDF / Image)
              </button>
              <button
                type="button"
                onClick={() => setInputMode('TEXT')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  inputMode === 'TEXT'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paste Order Text / Chit
              </button>
            </div>

            <button
              type="button"
              onClick={handleLoadSample}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Load Sample Chit Note</span>
            </button>
          </div>

          {inputMode === 'FILE' ? (
            <div className="bg-white rounded-2xl p-8 border-2 border-dashed border-slate-200 text-center hover:border-emerald-500 transition-all">
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                onChange={(e) => {
                  if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                }}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {selectedFile ? selectedFile.name : 'Click to select or drag order document'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports PDF documents, PNG/JPG photos, and TXT files (Max 10MB)
                </p>
                {selectedFile && (
                  <p className="text-xs text-emerald-600 font-semibold mt-2">
                    File selected: {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </label>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Order Text / Informal Chit
              </label>
              <textarea
                rows={6}
                placeholder="Paste customer WhatsApp message, transcribed chit, or items list..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                // Skip directly to manual entry
                setReviewItems([
                  {
                    raw_product_name: '',
                    quantity: 1,
                    unit: 'piece',
                    unit_price: 0,
                    tax_rate: 5,
                    confidence: 1.0,
                    needs_clarification: false,
                  },
                ]);
                setStage(3);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Skip AI & Enter Manually &rarr;
            </button>

            <button
              type="button"
              onClick={() => extractMutation.mutate()}
              disabled={
                extractMutation.isPending || (inputMode === 'FILE' ? !selectedFile : !rawText.trim())
              }
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Extraction</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STAGE 2: EXTRACTING PROGRESS ================= */}
      {stage === 2 && (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Processing Document with AI Interpreter...
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Extracting text, interpreting quantities and units, and running deterministic catalogue
            matching against your inventory.
          </p>
        </div>
      )}

      {/* ================= STAGE 3: REVIEW & RESOLVE ================= */}
      {stage === 3 && (
        <div className="space-y-6">
          {/* Review Banner */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-bold text-emerald-900">
                Extraction Complete — Please Review & Correct Below
              </p>
              <p className="text-emerald-700 mt-0.5">
                Verify quantities, prices, and match unresolved items to catalogue products before approval.
              </p>
            </div>
            {extractionResult?.model_used && (
              <span className="text-[11px] font-mono text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                Model: {extractionResult.model_used}
              </span>
            )}
          </div>

          {/* Customer Match Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Assigned Customer
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedCustomerId}
                onChange={(e) =>
                  setSelectedCustomerId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">— Unassigned Customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.business_name ? `(${c.business_name})` : ''} — Bal: {formatINR(c.current_balance)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Optional order notes..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Line Items Review Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-slate-900">
                Extracted Line Items ({reviewItems.length})
              </h2>
              <button
                type="button"
                onClick={addReviewItem}
                className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="p-4 space-y-3">
              {reviewItems.map((item, idx) => {
                const lineTotal =
                  (parseFloat(String(item.quantity || 0)) || 0) *
                  (parseFloat(String(item.unit_price || 0)) || 0) *
                  (1 + (parseFloat(String(item.tax_rate || 5)) || 5) / 100);

                const isAmbiguous = item.needs_clarification || !item.matched_product_id;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all ${
                      isAmbiguous
                        ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/40'
                        : 'bg-slate-50 border-slate-200/60'
                    }`}
                  >
                    {/* Ambiguity Flag Banner if present */}
                    {isAmbiguous && (
                      <div className="mb-2 text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>
                          {item.clarification_reason ||
                            'Unmatched product or missing quantity — Please verify product & rate.'}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-12 gap-2 items-center">
                      {/* Product Selector */}
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Matched Product {item.raw_product_name && `("${item.raw_product_name}")`}
                        </label>
                        <select
                          value={item.matched_product_id || ''}
                          onChange={(e) => handleItemProductSelect(idx, Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        >
                          <option value="">— Select catalogue product —</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — ₹{p.selling_price} (Stock: {p.stock_quantity})
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
                          value={item.quantity ?? ''}
                          onChange={(e) =>
                            handleItemFieldChange(idx, 'quantity', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>

                      {/* Rate */}
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Unit Rate (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price ?? ''}
                          onChange={(e) =>
                            handleItemFieldChange(idx, 'unit_price', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                          value={item.tax_rate ?? '5'}
                          onChange={(e) =>
                            handleItemFieldChange(idx, 'tax_rate', e.target.value)
                          }
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

                      {/* Delete */}
                      <div className="col-span-2 sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeReviewItem(idx)}
                          disabled={reviewItems.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors disabled:opacity-30"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calculations Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStage(1)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Start Over</span>
              </button>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-6">
                <div className="text-right space-y-1 text-xs">
                  <div className="text-slate-500">
                    Subtotal: <span className="font-semibold text-slate-800">{formatINR(reviewSubtotal)}</span>
                  </div>
                  <div className="text-slate-500">
                    Tax: <span className="font-semibold text-slate-800">{formatINR(reviewTax)}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Grand Total: <span className="text-emerald-700">{formatINR(reviewGrandTotal)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => saveOrderMutation.mutate({ shouldApprove: false })}
                    disabled={saveOrderMutation.isPending}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    Save as Pending Review
                  </button>
                  <button
                    type="button"
                    onClick={() => saveOrderMutation.mutate({ shouldApprove: true })}
                    disabled={saveOrderMutation.isPending}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Post to Ledger</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
