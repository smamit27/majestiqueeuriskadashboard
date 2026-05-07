// @ts-check
import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Wait for the intro animation overlay to leave the DOM. */
async function waitForIntro(page) {
  await page.waitForSelector('[data-testid="intro-overlay"]', {
    state: 'detached',
    timeout: 25_000,
  }).catch(() => {});
}

/** Open the Admin Login modal from the sidebar. */
async function openAuthModal(page) {
  await page.getByRole('button', { name: /admin login/i }).click();
  await expect(page.getByTestId('auth-modal')).toBeVisible();
}

/** Click a sidebar tab. */
async function clickTab(page, name) {
  await page.getByRole('tab', { name: new RegExp(name, 'i') }).click();
}

// ─────────────────────────────────────────────────────────────
// 1. Intro Animation
// ─────────────────────────────────────────────────────────────
test.describe('Intro Animation', () => {
  test('shows heading during intro', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome to/i })).toBeVisible({ timeout: 15_000 });
  });

  test('intro finishes and dashboard loads', async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
    await expect(page.locator('[data-testid="intro-overlay"]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /society management dashboard/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 2. Sidebar Navigation
// ─────────────────────────────────────────────────────────────
test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
  });

  test('navigating all tabs', async ({ page }) => {
    // Security
    await clickTab(page, 'security');
    await expect(page.getByRole('button', { name: /guard deployment/i })).toBeVisible();

    // Housekeeping
    await clickTab(page, 'housekeeping');
    await expect(page.getByRole('button', { name: /attendance tracking/i })).toBeVisible();

    // Solar
    await clickTab(page, 'solar');
    await expect(page.getByRole('button', { name: /overview/i }).first()).toBeVisible();

    // Finance
    await clickTab(page, 'income');
    await expect(page.getByText(/monthly cashflow tracker/i)).toBeVisible();

    // Cheque
    await clickTab(page, 'cheque');
    await expect(page.getByText(/cheques/i).first()).toBeVisible();

    // Members
    await clickTab(page, 'members');
    await expect(page.getByRole('columnheader', { name: /resident/i }).first()).toBeVisible();

    // Dues
    await clickTab(page, 'dues');
    await expect(page.getByRole('columnheader', { name: /outstanding/i }).first()).toBeVisible();

    // Events
    await clickTab(page, 'events');
    await expect(page.getByRole('heading', { name: /announcements/i })).toBeVisible();

    // Complaints
    await clickTab(page, 'complaints');
    await expect(page.getByRole('heading', { name: /complaints/i })).toBeVisible();

    // Visitors
    await clickTab(page, 'visitors');
    await expect(page.getByRole('columnheader', { name: /visitor/i }).first()).toBeVisible();
  });

  test('sidebar collapse and expand', async ({ page }) => {
    const toggle = page.locator('button.sidebar-collapse-toggle');
    await toggle.click();
    await expect(page.locator('.dashboard-shell--collapsed')).toBeVisible();
    await toggle.click();
    await expect(page.locator('.dashboard-shell--collapsed')).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Authentication
// ─────────────────────────────────────────────────────────────
test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
  });

  test('auth modal interactions', async ({ page }) => {
    await openAuthModal(page);
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    
    // Forgot password link
    await page.getByRole('button', { name: /forgot password/i }).click();
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
    
    // Back to login button
    await page.getByRole('button', { name: /back to login/i }).click();
    await expect(page.getByRole('heading', { name: /admin login/i })).toBeVisible();
    
    // Close modal
    await page.getByTestId('auth-modal').getByRole('button', { name: /×/i }).click();
    await expect(page.getByTestId('auth-modal')).toBeHidden();
  });
});

// ─────────────────────────────────────────────────────────────
// 4. Module Specific Features
// ─────────────────────────────────────────────────────────────
test.describe('Module Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
  });

  test('Housekeeping tab features', async ({ page }) => {
    await clickTab(page, 'housekeeping');
    await page.getByRole('button', { name: /bill calculator/i }).click();
    await expect(page.getByText(/bill/i).first()).toBeVisible();
  });

  test('Finance Tracker layout', async ({ page }) => {
    await clickTab(page, 'income');
    await expect(page.locator('.attendance-month-tab')).toHaveCount(12);
    await expect(page.getByText('Total Income')).toBeVisible();
    await expect(page.getByRole('button', { name: /export excel/i })).toBeVisible();
  });

  test('Members search and filter', async ({ page }) => {
    await clickTab(page, 'members');
    const search = page.getByPlaceholder(/search by resident/i);
    await search.fill('XYZ_NONE_EXISTENT_NAME');
    await expect(page.getByText(/no matching households/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 5. Layout & Responsiveness
// ─────────────────────────────────────────────────────────────
test.describe('Layout & Mobile', () => {
  test('mobile navigation menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await waitForIntro(page);
    
    const menuToggle = page.locator('.mobile-menu-toggle');
    await expect(menuToggle).toBeVisible();
    await menuToggle.click();
    await expect(page.locator('.sidebar--open')).toBeVisible();
  });

  test('no horizontal scroll overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const hasOverflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(hasOverflow).toBe(false);
  });
});
