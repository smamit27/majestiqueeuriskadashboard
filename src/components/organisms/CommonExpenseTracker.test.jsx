import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CommonExpenseTracker from './CommonExpenseTracker.jsx';

vi.mock('../../firebase', () => ({
  db: null,
  ensureFirebaseSession: vi.fn().mockResolvedValue(null),
  isFirebaseConfigured: false
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn()
}));

describe('CommonExpenseTracker', () => {
  it('renders the common expense heading and summary totals', () => {
    const html = renderToStaticMarkup(<CommonExpenseTracker />);

    expect(html).toContain('Common Expense Tracker');
    expect(html).toContain('₹30,000.00');
    expect(html).toContain('₹26,481.00');
    expect(html).toContain('₹2,546.00');
  });

  it('renders the focus month selector and export action', () => {
    const html = renderToStaticMarkup(<CommonExpenseTracker isAdmin />);

    expect(html).toContain('Focus month');
    expect(html).toContain('June 2026');
    expect(html).toContain('Export Excel');
  });
});
