import { describe, it, expect } from 'vitest';
import { formatINR, formatDate, getStatusBadgeClass } from '../utils/formatters';

describe('Formatters Utility', () => {
  it('formats Indian Rupee numbers accurately with paise', () => {
    expect(formatINR(100)).toContain('100.00');
    expect(formatINR('4500.50')).toContain('4,500.50');
    expect(formatINR(125000)).toContain('1,25,000.00');
    expect(formatINR(0)).toContain('0.00');
    expect(formatINR(null)).toBe('₹0.00');
    expect(formatINR(undefined)).toBe('₹0.00');
  });

  it('formats dates into readable Indian business format', () => {
    const formatted = formatDate('2026-10-13T10:00:00Z');
    expect(formatted).toContain('2026');
    expect(formatDate(null)).toBe('—');
  });

  it('returns distinct badge styles for order statuses', () => {
    expect(getStatusBadgeClass('APPROVED')).toContain('bg-emerald-50');
    expect(getStatusBadgeClass('PENDING_REVIEW')).toContain('bg-amber-50');
    expect(getStatusBadgeClass('DRAFT')).toContain('bg-slate-100');
    expect(getStatusBadgeClass('REJECTED')).toContain('bg-rose-50');
    expect(getStatusBadgeClass('CANCELLED')).toContain('bg-gray-100');
  });
});
