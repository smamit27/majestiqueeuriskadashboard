import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ShopMaintenanceTracker from './ShopMaintenanceTracker.jsx';

describe('ShopMaintenanceTracker', () => {
  it('renders tabs for all shops and the fed shop ledger data', () => {
    const html = renderToStaticMarkup(<ShopMaintenanceTracker />);

    expect(html).toContain('Shop 1');
    expect(html).toContain('Shop 8');
    expect(html).toContain('Mr. Gulshan Vasnani');
    expect(html).toContain('Monthly Ledger');
    expect(html).toContain('Apr 21 to Mar 22');
    expect(html).toContain('Oct-21');
    expect(html).toContain('Mar-26');
    expect(html).toContain('Jul-26');
  });
});
