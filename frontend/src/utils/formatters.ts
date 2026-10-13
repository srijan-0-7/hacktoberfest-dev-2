export function formatINR(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '₹0.00';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '₹0.00';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'PENDING_REVIEW':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'DRAFT':
      return 'bg-slate-100 text-slate-700 border border-slate-200';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-500 border border-gray-200';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}
