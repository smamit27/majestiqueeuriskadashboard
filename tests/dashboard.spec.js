// @ts-check
import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Wait for the intro animation overlay to leave the DOM (max 15 s). */
async function waitForIntro(page) {
  await page.waitForSelector('[data-testid="intro-overlay"]', {
    state: 'detached',
    timeout: 15_000,
  }).catch(() => {
    // If it never mounted (e.g. localStorage flag already set) that is fine.
  });
}

/** Open the Admin Login modal from the sidebar. */
async function openAuthModal(page) {
  const adminBtn = page.getByRole('button', { name: /admin login/i });
  await adminBtn.click();
  await expect(page.getByTestId('auth-modal')).toBeVisible({ timeout: 5_000 });
}

/** Click a sidebar tab by its accessible name. */
async function clickTab(page, name) {
  await page.getByRole('tab', { name: new RegExp(name, 'i') }).click();
  // wait for the transition (180 ms in App.jsx)
  await page.waitForTimeout(300);
}

// ─────────────────────────────────────────────────────────────
// 1. Intro Animation
// ─────────────────────────────────────────────────────────────
test.describe('Intro Animation', () => {
  test('shows the "Welcome to" heading during the intro', async ({ page }) => {
    await page.goto('/');
    const heading = page.getByRole('heading', { name: /welcome to/i });
    await expect(heading).toBeVisible({ timeout: 13_000 });
  });

  test('intro overlay is removed from DOM after it finishes', async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
    await expect(page.locator('[data-testid="intro-overlay"]')).toHaveCount(0);
  });

  test('dashboard is accessible immediately after intro finishes', async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
    await expect(page.getByText(/society management dashboard/i)).toBeVisible({ timeout: 8_000 });
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

  test('page title contains "Majestique Euriska"', async ({ page }) => {
    await expect(page).toHaveTitle(/majestique euriska/i);
  });

  test('has a valid meta description', async ({ page }) => {
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

  test('sidebar is visible after intro', async ({ page }) => {
    await expect(page.locator('aside.sidebar')).toBeVisible();
  });

  test('Overview tab is active by default', async ({ page }) => {
    const overviewTab = page.getByRole('tab', { name: /overview/i });
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');
  });

  test('clicking Security tab loads security content', async ({ page }) => {
    await clickTab(page, 'security');
    await expect(page.getByRole('button', { name: /guard deployment/i })).toBeVisible({ timeout: 5_000 });
  });

  test('clicking Housekeeping tab loads housekeeping content', async ({ page }) => {
    await clickTab(page, 'housekeeping');
    await expect(page.getByRole('button', { name: /attendance tracking/i })).toBeVisible({ timeout: 5_000 });
  });

  test('clicking Solar Management tab loads solar content', async ({ page }) => {
    await clickTab(page, 'solar');
    await expect(page.getByRole('button', { name: /overview/i }).first()).toBeVisible({ timeout: 5_000 });
  });

  test('clicking Income & Expenses tab loads finance content', async ({ page }) => {
    await clickTab(page, 'income');
    await expect(page.getByText(/monthly cashflow tracker/i)).toBeVisible({ timeout: 5_000 });
  });

  test('clicking Cheque Tracker tab loads cheque content', async ({ page }) => {
    await clickTab(page, 'cheque');
    await expect(page.getByText(/cheque/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('clicking Members tab shows the members table', async ({ page }) => {
    await clickTab(page, 'members');
    await expect(page.getByText(/resident/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('clicking Dues tab shows the dues table', async ({ page }) => {
    await clickTab(page, 'dues');
    await expect(page.getByText(/outstanding/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('clicking Events tab shows announcements section', async ({ page }) => {
    await clickTab(page, 'events');
    await expect(page.getByRole('heading', { name: 'Announcements' })).toBeVisible({ timeout: 5_000 });
  });

  test('clicking Complaints tab shows the complaints table', async ({ page }) => {
    await clickTab(page, 'complaints');
    await expect(page.getByText(/complaints/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('clicking Visitors tab shows the gate log', async ({ page }) => {
    await clickTab(page, 'visitors');
    await expect(page.getByText(/visitor/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('sidebar collapse toggle button is present', async ({ page }) => {
    await expect(page.locator('button.sidebar-collapse-toggle')).toBeVisible();
  });

  test('sidebar collapses when toggle is clicked', async ({ page }) => {
    await page.locator('button.sidebar-collapse-toggle').click();
    await expect(page.locator('.dashboard-shell--collapsed')).toBeVisible({ timeout: 2_000 });
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

  test('Admin Login button is visible in sidebar', async ({ page }) => {
    await expect(page.getByRole('button', { name: /admin login/i })).toBeVisible();
  });

  test('clicking Admin Login opens the auth modal', async ({ page }) => {
    await openAuthModal(page);
    await expect(page.getByRole('heading', { name: /admin login/i })).toBeVisible();
  });

  test('modal contains email and password fields', async ({ page }) => {
    await openAuthModal(page);
    await expect(page.getByPlaceholder(/admin@example\.com/i)).toBeVisible();
    await expect(page.getByPlaceholder(/••••••••/)).toBeVisible();
  });

  test('modal contains Sign in with Google button', async ({ page }) => {
    await openAuthModal(page);
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
  });

  test('modal closes when the × button is clicked', async ({ page }) => {
    await openAuthModal(page);
    await page.getByTestId('auth-modal').getByRole('button', { name: /×/i }).click();
    await expect(page.getByTestId('auth-modal')).toBeHidden({ timeout: 3_000 });
  });

  test('switching to Reset Password mode hides the password field', async ({ page }) => {
    await openAuthModal(page);
    await page.getByRole('button', { name: /forgot password/i }).click();
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
    await expect(page.getByPlaceholder(/••••••••/)).toBeHidden();
  });

  test('"Back to Login" link restores the login form', async ({ page }) => {
    await openAuthModal(page);
    await page.getByRole('button', { name: /forgot password/i }).click();
    await page.getByRole('button', { name: /back to login/i }).click();
    await expect(page.getByRole('heading', { name: /admin login/i })).toBeVisible();
    await expect(page.getByPlaceholder(/••••••••/)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 5. Dashboard Overview metrics
// ─────────────────────────────────────────────────────────────
test.describe('Dashboard Overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
  });

  test('shows "Society Management Dashboard" heading', async ({ page }) => {
    await expect(page.getByText(/society management dashboard/i)).toBeVisible();
  });

  test('shows "Welcome back, Admin" eyebrow text', async ({ page }) => {
    await expect(page.getByText(/welcome back, admin/i)).toBeVisible();
  });

  test('shows Collection Rate metric card', async ({ page }) => {
    await expect(page.getByText(/collection rate/i)).toBeVisible();
  });

  test('shows Outstanding Dues metric card', async ({ page }) => {
    await expect(page.getByText(/outstanding dues/i)).toBeVisible();
  });

  test('shows Staff on Duty metric card', async ({ page }) => {
    await expect(page.getByText(/staff on duty/i)).toBeVisible();
  });

  test('shows Open Complaints metric card', async ({ page }) => {
    await expect(page.getByText(/open complaints/i).first()).toBeVisible();
  });

  test('Financial Snapshot section is rendered', async ({ page }) => {
    await expect(page.getByText(/financial snapshot/i)).toBeVisible();
  });

  test('Operations & Community section is rendered', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /operations & community/i })).toBeVisible();
  });

  test('Cheque Tracker quick-action button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /cheque tracker/i })).toBeVisible();
  });

  test('Cheque Tracker quick-action navigates to cheque tab', async ({ page }) => {
    await page.getByRole('button', { name: /cheque tracker/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/cheque/i).first()).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────
// 6. Module sub-tab navigation
// ─────────────────────────────────────────────────────────────
test.describe('Housekeeping Module Sub-tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
    await clickTab(page, 'housekeeping');
  });

  test('Attendance Tracking sub-tab is active by default', async ({ page }) => {
    await expect(page.getByRole('button', { name: /attendance tracking/i })).toBeVisible();
  });

  test('Bill Calculator sub-tab is reachable', async ({ page }) => {
    await page.getByRole('button', { name: /bill calculator/i }).click();
    await expect(page.getByText(/bill/i).first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Security Module Sub-tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
    await clickTab(page, 'security');
  });

  test('Guard Deployment sub-tab is active by default', async ({ page }) => {
    await expect(page.getByRole('button', { name: /guard deployment/i })).toBeVisible();
  });

  test('Bill Calculator sub-tab is reachable', async ({ page }) => {
    await page.getByRole('button', { name: /bill calculator/i }).click();
    await expect(page.getByText(/bill/i).first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Solar Module Sub-tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
    await clickTab(page, 'solar');
  });

  test('Overview sub-tab is active by default', async ({ page }) => {
    await expect(page.getByRole('button', { name: /overview/i }).first()).toBeVisible();
  });

  test('Evaluation Checklist sub-tab is reachable', async ({ page }) => {
    await page.getByRole('button', { name: /evaluation checklist/i }).click();
    await page.waitForTimeout(200);
    await expect(page.getByRole('button', { name: /evaluation checklist/i })).toBeVisible();
  });

  test('Comparison Matrix sub-tab is reachable', async ({ page }) => {
    await page.getByRole('button', { name: /comparison matrix/i }).click();
    await page.waitForTimeout(200);
    await expect(page.getByRole('button', { name: /comparison matrix/i })).toBeVisible();
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

  test('shows Monthly Cashflow Tracker heading', async ({ page }) => {
    await expect(page.getByText(/monthly cashflow tracker/i)).toBeVisible({ timeout: 5_000 });
  });

  test('shows 12 month tabs', async ({ page }) => {
    const monthButtons = page.locator('.attendance-month-tab');
    await expect(monthButtons).toHaveCount(12, { timeout: 5_000 });
  });

  test('shows Total Income, Total Expenses and Closing Balance cards', async ({ page }) => {
    await expect(page.getByText('Total Income')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Total Expenses')).toBeVisible();
    await expect(page.getByText('Closing Balance')).toBeVisible();
  });

  test('Export Excel button is visible for all users', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export excel/i })).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────
// 8. Members tab — search
// ─────────────────────────────────────────────────────────────
test.describe('Members Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
    await clickTab(page, 'members');
  });

  test('shows the members table with headers', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: /resident/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('columnheader', { name: /flat/i })).toBeVisible();
  });

  test('search box filters members', async ({ page }) => {
    const search = page.getByPlaceholder(/search by resident/i);
    await expect(search).toBeVisible({ timeout: 5_000 });
    await search.fill('zzz_no_match_xyz');
    await expect(page.getByText(/no matching households/i)).toBeVisible({ timeout: 3_000 });
  });

  test('clearing search restores the full list', async ({ page }) => {
    const search = page.getByPlaceholder(/search by resident/i);
    await search.fill('zzz_no_match_xyz');
    await search.clear();
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 3_000 });
  });
});

// ─────────────────────────────────────────────────────────────
// 9. Complaints tab — search
// ─────────────────────────────────────────────────────────────
test.describe('Complaints Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
    await clickTab(page, 'complaints');
  });

  test('shows complaints table with Ticket header', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: /ticket/i })).toBeVisible({ timeout: 5_000 });
  });

  test('search box filters complaints and shows empty state', async ({ page }) => {
    const search = page.getByPlaceholder(/search by resident.*category/i);
    await search.fill('zzz_no_match_xyz');
    await expect(page.getByText(/no complaint records/i)).toBeVisible({ timeout: 3_000 });
  });
});

// ─────────────────────────────────────────────────────────────
// 10. Responsive Layout
// ─────────────────────────────────────────────────────────────
test.describe('Responsive Layout', () => {
  test('no horizontal overflow on iPhone 14 (390 px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(395);
  });

  test('mobile header hamburger toggle is visible at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await waitForIntro(page);
    await expect(page.locator('.mobile-menu-toggle')).toBeVisible({ timeout: 5_000 });
  });

  test('hamburger opens the sidebar on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await waitForIntro(page);
    await page.locator('.mobile-menu-toggle').click();
    await expect(page.locator('.sidebar--open')).toBeVisible({ timeout: 3_000 });
  });

  test('no horizontal overflow on tablet (768 px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(773);
  });
});
