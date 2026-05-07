// @ts-check
import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Wait for the intro animation overlay to leave the DOM (max 20s for safety). */
async function waitForIntro(page) {
  // Overlay is removed from the DOM once the animation finishes
  await page.waitForSelector('[data-testid="intro-overlay"]', {
    state: 'detached',
    timeout: 20_000,
  }).catch(() => {
    // If it never mounted or already detached, that's fine
  });
}

/** Open the Admin Login modal from the sidebar. */
async function openAuthModal(page) {
  const adminBtn = page.getByRole('button', { name: /admin login/i });
  await adminBtn.click();
  await expect(page.getByTestId('auth-modal')).toBeVisible();
}

/** Click a sidebar tab and wait for its content to be visible. */
async function clickTab(page, name, expectedText) {
  await page.getByRole('tab', { name: new RegExp(name, 'i') }).click();
  if (expectedText) {
    await expect(page.getByText(expectedText).first()).toBeVisible();
  }
}

// ─────────────────────────────────────────────────────────────
// 1. Intro Animation
// ─────────────────────────────────────────────────────────────
test.describe('Intro Animation', () => {
  test('shows the "Welcome to" heading during the intro', async ({ page }) => {
    await page.goto('/');
    const heading = page.getByRole('heading', { name: /welcome to/i });
    await expect(heading).toBeVisible({ timeout: 15_000 });
  });

  test('intro overlay is removed from DOM after it finishes', async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
    await expect(page.locator('[data-testid="intro-overlay"]')).toHaveCount(0);
  });

  test('dashboard is accessible after intro', async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
    await expect(page.getByRole('heading', { name: /society management dashboard/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 2. Page metadata
// ─────────────────────────────────────────────────────────────
test.describe('Page Metadata', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
  });

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/majestique euriska/i);
  });

  test('has meta description', async ({ page }) => {
    const meta = page.locator('meta[name="description"]');
    await expect(meta).toHaveAttribute('content', /.+/);
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Sidebar Navigation
// ─────────────────────────────────────────────────────────────
test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
  });

  test('sidebar is visible', async ({ page }) => {
    await expect(page.locator('aside.sidebar')).toBeVisible();
  });

  test('Overview tab is active by default', async ({ page }) => {
    const overviewTab = page.getByRole('tab', { name: /overview/i });
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');
  });

  test('clicking Security tab', async ({ page }) => {
    await clickTab(page, 'security', 'Guard Deployment');
  });

  test('clicking Housekeeping tab', async ({ page }) => {
    await clickTab(page, 'housekeeping', 'Attendance Tracking');
  });

  test('clicking Solar Management tab', async ({ page }) => {
    await clickTab(page, 'solar', 'Solar Dashboard');
  });

  test('clicking Income & Expenses tab', async ({ page }) => {
    await clickTab(page, 'income', 'Monthly Cashflow Tracker');
  });

  test('clicking Cheque Tracker tab', async ({ page }) => {
    await clickTab(page, 'cheque', 'Cheque Tracker');
  });

  test('clicking Members tab', async ({ page }) => {
    await clickTab(page, 'members', 'Resident Name');
  });

  test('clicking Dues tab', async ({ page }) => {
    await clickTab(page, 'dues', 'Outstanding Dues');
  });

  test('clicking Events tab', async ({ page }) => {
    await clickTab(page, 'events', 'Announcements');
  });

  test('clicking Complaints tab', async ({ page }) => {
    await clickTab(page, 'complaints', 'Complaints');
  });

  test('clicking Visitors tab', async ({ page }) => {
    await clickTab(page, 'visitors', 'Visitor Log');
  });

  test('sidebar collapses and expands', async ({ page }) => {
    const toggle = page.locator('button.sidebar-collapse-toggle');
    await toggle.click();
    await expect(page.locator('.dashboard-shell--collapsed')).toBeVisible();
    await toggle.click();
    await expect(page.locator('.dashboard-shell--collapsed')).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 4. Authentication Modal
// ─────────────────────────────────────────────────────────────
test.describe('Authentication Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
  });

  test('opens and closes auth modal', async ({ page }) => {
    await openAuthModal(page);
    const modal = page.getByTestId('auth-modal');
    await expect(modal).toBeVisible();
    
    // Close with X button
    await modal.getByRole('button', { name: /×/i }).click();
    await expect(modal).toBeHidden();
  });

  test('auth modal contents', async ({ page }) => {
    await openAuthModal(page);
    await expect(page.getByRole('heading', { name: /admin login/i })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
  });

  test('forgot password flow UI', async ({ page }) => {
    await openAuthModal(page);
    await page.getByRole('button', { name: /forgot password/i }).click();
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeHidden();
    
    await page.getByRole('button', { name: /back to login/i }).click();
    await expect(page.getByRole('heading', { name: /admin login/i })).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 5. Dashboard Overview
// ─────────────────────────────────────────────────────────────
test.describe('Dashboard Overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
  });

  test('core heading and eyebrow', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /society management dashboard/i })).toBeVisible();
    await expect(page.getByText(/welcome back, admin/i)).toBeVisible();
  });

  test('metric cards are visible', async ({ page }) => {
    const metrics = ['Collection Rate', 'Outstanding Dues', 'Staff on Duty', 'Open Complaints'];
    for (const metric of metrics) {
      await expect(page.getByText(metric).first()).toBeVisible();
    }
  });

  test('main sections are rendered', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /financial snapshot/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /operations & community/i })).toBeVisible();
  });

  test('quick action button works', async ({ page }) => {
    await page.getByRole('button', { name: /cheque tracker/i }).click();
    await expect(page.getByRole('heading', { name: /cheque tracker/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 6. Module Navigation (Sub-tabs)
// ─────────────────────────────────────────────────────────────
test.describe('Sub-tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
  });

  test('Housekeeping sub-tabs', async ({ page }) => {
    await clickTab(page, 'housekeeping', 'Attendance Tracking');
    await page.getByRole('button', { name: /bill calculator/i }).click();
    await expect(page.getByText(/total housekeeping bill/i)).toBeVisible();
  });

  test('Security sub-tabs', async ({ page }) => {
    await clickTab(page, 'security', 'Guard Deployment');
    await page.getByRole('button', { name: /bill calculator/i }).click();
    await expect(page.getByText(/total security bill/i)).toBeVisible();
  });

  test('Solar sub-tabs', async ({ page }) => {
    await clickTab(page, 'solar', 'Solar Dashboard');
    await page.getByRole('button', { name: /evaluation checklist/i }).click();
    await expect(page.getByText(/technical score/i).first()).toBeVisible();
    await page.getByRole('button', { name: /comparison matrix/i }).click();
    await expect(page.getByText(/vendor comparison/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 7. Finance Tracker
// ─────────────────────────────────────────────────────────────
test.describe('Finance Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
    await clickTab(page, 'income');
  });

  test('month tabs exist', async ({ page }) => {
    await expect(page.locator('.attendance-month-tab')).toHaveCount(12);
  });

  test('summary cards exist', async ({ page }) => {
    await expect(page.getByText('Total Income')).toBeVisible();
    await expect(page.getByText('Total Expenses')).toBeVisible();
    await expect(page.getByText('Closing Balance')).toBeVisible();
  });

  test('export button exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export excel/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 8. Search & Filters
// ─────────────────────────────────────────────────────────────
test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
  });

  test('Members search', async ({ page }) => {
    await clickTab(page, 'members', 'Resident Name');
    const search = page.getByPlaceholder(/search by resident/i);
    await search.fill('NonExistentName');
    await expect(page.getByText(/no matching households/i)).toBeVisible();
    await search.clear();
    await expect(page.getByRole('row').nth(1)).toBeVisible();
  });

  test('Complaints search', async ({ page }) => {
    await clickTab(page, 'complaints', 'Complaints');
    const search = page.getByPlaceholder(/search by resident/i);
    await search.fill('NonExistentComplaint');
    await expect(page.getByText(/no complaint records/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 9. Mobile Responsiveness
// ─────────────────────────────────────────────────────────────
test.describe('Mobile Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
    await page.goto('/');
    await waitForIntro(page);
  });

  test('mobile menu functionality', async ({ page }) => {
    const menuToggle = page.locator('.mobile-menu-toggle');
    await expect(menuToggle).toBeVisible();
    await menuToggle.click();
    await expect(page.locator('.sidebar--open')).toBeVisible();
    
    // Clicking an item should close the menu (usually) or we just verify it's open
    await page.getByRole('tab', { name: /security/i }).click();
    // In mobile, we expect it to transition to the content
    await expect(page.getByRole('heading', { name: /security/i }).first()).toBeVisible();
  });

  test('no horizontal overflow', async ({ page }) => {
    const overflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(overflow).toBe(false);
  });
});
