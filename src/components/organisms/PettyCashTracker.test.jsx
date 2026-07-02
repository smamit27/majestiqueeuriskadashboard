import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PettyCashTracker from './PettyCashTracker.jsx';

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
  });

  it('renders July 2026 as the initial A building month context', () => {
    const html = renderToStaticMarkup(<PettyCashTracker isAdmin />);

    expect(html).toContain('Add Entry to July 2026');
    expect(html).toContain('July 2026 is ready to start for A Building');
    expect(html).toContain('FY 2026-27');
  });
});
