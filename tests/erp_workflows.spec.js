// @ts-check
import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Wait for the intro animation overlay to leave the DOM. */
async function waitForIntro(page) {
  await page.waitForSelector('[data-testid="intro-overlay"]', {
    state: 'detached',
    timeout: 35_000,
  }).catch(() => {});
}

/** Click a sidebar tab by partial text/id. */
async function clickTab(page, name) {
  const tab = page.getByRole('tab', { name: new RegExp(name, 'i') }).first();
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
}

// ─────────────────────────────────────────────────────────────
// TEST GROUP 1 — AUTHENTICATION
// ─────────────────────────────────────────────────────────────
test.describe('Test Group 1 — Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIntro(page);
  });

  test('admin login modal opens and validates inputs', async ({ page }) => {
    const loginBtn = page.getByRole('button', { name: /admin login/i });
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      const authModal = page.getByTestId('auth-modal');
      await expect(authModal).toBeVisible();

      // Scoped submit inside the modal
      const submitBtn = authModal.getByRole('button', { name: /sign in|login/i }).first();
      await submitBtn.click();
      // Verify modal remains visible
      await expect(authModal).toBeVisible();

      // Close modal
      const closeBtn = authModal.getByRole('button', { name: /×/i });
      await closeBtn.click();
      await expect(authModal).toBeHidden();
    }
  });

  test('password recovery flow is accessible and navigable', async ({ page }) => {
    const loginBtn = page.getByRole('button', { name: /admin login/i });
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      const authModal = page.getByTestId('auth-modal');
      await authModal.getByRole('button', { name: /forgot password/i }).click();
      await expect(authModal.getByRole('heading', { name: /reset password/i })).toBeVisible();

      await authModal.getByRole('button', { name: /back to login/i }).click();
      await expect(authModal.getByRole('heading', { name: /admin login/i })).toBeVisible();
    }
  });

  test('unauthorized route access displays RBAC Access Denied screen', async ({ page }) => {
    await page.goto('/?role=RESIDENT');
    await waitForIntro(page);

    // Resident trying to access audit trail via URL or direct tab selection
    const auditTab = page.getByRole('tab', { name: /audit trail/i });
    if (await auditTab.isVisible()) {
      await auditTab.click();
      await expect(page.locator('.rbac-denied-container')).toBeVisible();
      await expect(page.getByText(/Access Denied/i)).toBeVisible();
    } else {
      // Menu item is correctly hidden by RBAC
      expect(await auditTab.count()).toBe(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// TEST GROUP 2 — ROLE BASED ACCESS CONTROL (RBAC)
// ─────────────────────────────────────────────────────────────
test.describe('Test Group 2 — RBAC Permissions', () => {
  test('Admin can access all modules including Audit Trail and Overview', async ({ page }) => {
    await page.goto('/?role=ADMIN&admin=true');
    await waitForIntro(page);

    // Can access Overview
    await clickTab(page, 'Society Overview');
    await expect(page.getByRole('heading', { name: /Society Overview/i }).first()).toBeVisible();

    // Can access Audit Trail
    await clickTab(page, 'Audit Trail');
    await expect(page.getByText(/Society Security & Audit Trail/i)).toBeVisible();
  });

  test('Treasurer can access Finance and Maintenance', async ({ page }) => {
    await page.goto('/?role=TREASURER');
    await waitForIntro(page);

    // Can access Income & Expenses
    await clickTab(page, 'Income & Expenses');
    await expect(page.getByText(/monthly cashflow tracker/i)).toBeVisible();

    // Can access Cheque Tracker
    await clickTab(page, 'Cheque Tracker');
    await expect(page.getByText(/cheque/i).first()).toBeVisible();
  });

  test('Manager can access Operations and AMC Tracker', async ({ page }) => {
    await page.goto('/?role=MANAGER');
    await waitForIntro(page);

    // Can access AMC Tracker
    await clickTab(page, 'AMC Tracker');
    await expect(page.getByText(/AMC Management/i)).toBeVisible();

    // Can access Security
    await clickTab(page, 'Security');
    await expect(page.getByRole('button', { name: /guard deployment/i })).toBeVisible();
  });

  test('Security role can access Security and Emergency, but Finance is hidden/blocked', async ({ page }) => {
    await page.goto('/?role=SECURITY');
    await waitForIntro(page);

    // Can access Security
    await clickTab(page, 'Security');
    await expect(page.getByRole('button', { name: /guard deployment/i })).toBeVisible();

    // Finance modules are hidden for security role
    const financeTab = page.getByRole('tab', { name: /Income & Expenses/i });
    expect(await financeTab.count()).toBe(0);
  });

  test('Resident role can access Resident Portal but is blocked from Fixed Deposits', async ({ page }) => {
    await page.goto('/?role=RESIDENT');
    await waitForIntro(page);

    // Can access Resident Portal
    await clickTab(page, 'Resident Portal');
    await expect(page.getByText(/RESIDENT SELF-SERVICE PORTAL|Welcome, Flat/i).first()).toBeVisible();

    // Fixed Deposits is hidden from sidebar
    const fdTab = page.getByRole('tab', { name: /Fixed Deposits/i });
    expect(await fdTab.count()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// TEST GROUP 3 — MAINTENANCE
// ─────────────────────────────────────────────────────────────
test.describe('Test Group 3 — Maintenance Tracker', () => {
  test('Maintenance displays flats, rate slabs, and payment breakdowns', async ({ page }) => {
    await page.goto('/?admin=true');
    await waitForIntro(page);

    await clickTab(page, 'Maintenance');
    // Verify maintenance component renders
    await expect(page.getByText(/A-302|A-904|A-1002/i).first()).toBeVisible();

    // Click on A-302 flat
    const flatBtn = page.getByRole('button', { name: 'A-302' }).first();
    if (await flatBtn.isVisible()) {
      await flatBtn.click();
      await expect(page.getByText(/FY 2021-22|FY 2025-26/i).first()).toBeVisible();
    }
  });
});

// ─────────────────────────────────────────────────────────────
// TEST GROUP 4 — EXPENSE & REPORTING
// ─────────────────────────────────────────────────────────────
test.describe('Test Group 4 — Expenses and Monthly Society Report', () => {
  test('Treasurer can review expenses cashflow and open Monthly Society Report', async ({ page }) => {
    await page.goto('/?role=TREASURER');
    await waitForIntro(page);

    // Check Income & Expenses
    await clickTab(page, 'Income & Expenses');
    await expect(page.getByText('Total Income').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /export excel/i })).toBeVisible();

    // Check Monthly Society Report
    await clickTab(page, 'Monthly Society Report');
    await expect(page.getByRole('heading', { name: /Monthly Society Report/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Print \/ PDF/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// TEST GROUP 5 — TENANT TRACKER
// ─────────────────────────────────────────────────────────────
test.describe('Test Group 5 — Tenant Tracker', () => {
  test('Manager can access Tenant Tracker with stats and verification list', async ({ page }) => {
    await page.goto('/?role=MANAGER');
    await waitForIntro(page);

    await clickTab(page, 'Tenant Tracker');
    await expect(page.getByText(/Total Flats Tracked/i).first()).toBeVisible();
    await expect(page.getByText(/Tenant\/Other Occupied/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /print pdf/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// TEST GROUP 6 — AMC MANAGEMENT
// ─────────────────────────────────────────────────────────────
test.describe('Test Group 6 — AMC Contracts & Expiry Tracking', () => {
  test('AMC tracker displays contracts, operational counts and status pills', async ({ page }) => {
    await page.goto('/?admin=true');
    await waitForIntro(page);

    await clickTab(page, 'AMC Tracker');
    await expect(page.getByRole('heading', { name: /AMC Management/i })).toBeVisible();
    await expect(page.getByText(/Active AMCs/i).first()).toBeVisible();
    await expect(page.getByText(/Renewals Pending|Total Commitment/i).first()).toBeVisible();

    // Verify Add AMC Contract button is present for Admin
    await expect(page.getByRole('button', { name: /Add AMC Contract/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// TEST GROUP 7 — MOBILE RESPONSIVENESS & TOUCH TARGETS
// ─────────────────────────────────────────────────────────────
test.describe('Test Group 7 — Mobile & Viewport Responsiveness', () => {
  test('iPhone viewport (390x844) renders drawer toggle with zero horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?admin=true');
    await waitForIntro(page);

    // Verify drawer toggle
    const menuToggle = page.locator('.mobile-menu-toggle');
    await expect(menuToggle).toBeVisible();
    await menuToggle.click();
    await expect(page.locator('.sidebar--open')).toBeVisible();

    // Verify zero horizontal scroll
    const hasOverflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(hasOverflow).toBe(false);
  });

  test('Tablet viewport (768x1024) functions without layout distortion', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/?admin=true');
    await waitForIntro(page);

    // Verify main content is visible
    await expect(page.getByRole('heading', { name: /Society Overview/i }).first()).toBeVisible();

    // Verify zero horizontal scroll
    const hasOverflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(hasOverflow).toBe(false);
  });

  test('Desktop viewport (1280x800) displays full ERP layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/?admin=true');
    await waitForIntro(page);

    await expect(page.locator('aside.sidebar')).toBeVisible();
    await expect(page.locator('main.main-panel')).toBeVisible();
  });
});
