import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PettyCashTracker, { calculateCommonSettlementBalance } from './PettyCashTracker.jsx';

vi.mock('../../firebase.js', () => ({
  db: null,
  ensureFirebaseSession: vi.fn().mockResolvedValue(null),
  isFirebaseConfigured: false
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn()
}));

describe('PettyCashTracker', () => {
  it('renders the new sub tabs and fiscal month range', () => {
    const html = renderToStaticMarkup(<PettyCashTracker />);

    expect(html).toContain('A Building Expenses');
    expect(html).toContain('Common Expenses');
    expect(html).toContain('April 2026');
    expect(html).toContain('July 2026');
    expect(html).toContain('March 2027');
    expect(html).toContain('Export Excel');
    expect(html).toContain('Print PDF');
  });

  it('renders the current fiscal month as the initial A building month context', () => {
    const html = renderToStaticMarkup(<PettyCashTracker isAdmin />);

    expect(html).toContain('Add Entry to');
    expect(html).toContain('Select Category');
    expect(html).toContain('FY 2026-27');
  });

  it('calculates the A-building pending share after July common expenses and settlements', () => {
    const result = calculateCommonSettlementBalance({
      activeMonthId: '2026-07',
      monthSummariesByTab: {
        common: [
          { id: '2026-06', expenses: 1000 },
          { id: '2026-07', expenses: 2000 }
        ],
        buildingA: [
          { id: '2026-06', entries: [{ vendor: 'Common Settlement', payment: '500' }] },
          { id: '2026-07', entries: [{ vendor: 'Common Settlement', payment: '300' }] }
        ]
      }
    });

    expect(result.monthlyCommonExpenses).toBe(2000);
    expect(result.monthlyCommonShare).toBeCloseTo(2000 * (87 / 231), 2);
    expect(result.pendingCumulativeCommonShare).toBeCloseTo((1000 + 2000) * (87 / 231) - 800, 2);
  });

  it('renders the Vendor & Payee Analytics tab without breaking', () => {
    const html = renderToStaticMarkup(<PettyCashTracker />);
    expect(html).toContain('Vendor &amp; Payee Analytics');
    expect(html).toContain('A Building Expenses');
  });

  it('contains September 2026 entries including AGM expenses and Waterman salary in history', async () => {
    const { default: ALL_PETTY_CASH_HISTORY } = await import('../../data/pettyCashAllHistory.json');
    const html = renderToStaticMarkup(<PettyCashTracker />);
    expect(html).toContain('September 2026');

    const septEntries = ALL_PETTY_CASH_HISTORY.filter(e => e.date.startsWith('2026-09'));
    expect(septEntries.length).toBe(11);
    expect(septEntries.some(e => e.vendor === 'Uttareswar' && e.payment === '5650')).toBe(true);
    expect(septEntries.some(e => e.vendor === 'Aggarwals' && e.payment === '1500')).toBe(true);
    expect(septEntries.some(e => e.vendor === 'Jaslok Sweets' && e.payment === '520')).toBe(true);
    expect(septEntries.some(e => e.vendor === 'Fund Received' && e.receipt === '15000')).toBe(true);
  });
});

