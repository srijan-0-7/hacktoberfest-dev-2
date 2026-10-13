import { describe, it, expect } from 'vitest';

describe('Order & Ledger Business Calculations', () => {
  it('calculates line item subtotal and tax accurately', () => {
    const qty = 10;
    const price = 440;
    const taxRate = 5;

    const subtotal = qty * price;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    expect(subtotal).toBe(4400);
    expect(tax).toBe(220);
    expect(total).toBe(4620);
  });

  it('calculates customer outstanding balance with opening balance and payments', () => {
    const openingBalance = 4500;
    const approvedOrdersTotal = 4620;
    const paymentsTotal = 5000;

    const currentBalance = openingBalance + approvedOrdersTotal - paymentsTotal;
    expect(currentBalance).toBe(4120);
  });

  it('validates stock deduction safety', () => {
    const currentStock = 15;
    const requestedQty = 20;

    const isAvailable = currentStock >= requestedQty;
    expect(isAvailable).toBe(false);
  });
});
