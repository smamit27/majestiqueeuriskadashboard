import { describe, it, expect } from 'vitest';
import { ROLES, MODULES, hasModuleAccess, canEditModule, resolveUserRole } from './rbacService';

describe('RBAC Service', () => {
  it('Admin has access to all modules', () => {
    Object.values(MODULES).forEach((mod) => {
      expect(hasModuleAccess(ROLES.ADMIN, mod)).toBe(true);
    });
  });

  it('Resident cannot access Fixed Deposits, Statement Auditor, Financial records or Audit Logs', () => {
    expect(hasModuleAccess(ROLES.RESIDENT, MODULES.FIXED_DEPOSITS)).toBe(false);
    expect(hasModuleAccess(ROLES.RESIDENT, MODULES.STATEMENT_AUDITOR)).toBe(false);
    expect(hasModuleAccess(ROLES.RESIDENT, MODULES.FINANCE_INCOME_EXPENSE)).toBe(false);
    expect(hasModuleAccess(ROLES.RESIDENT, MODULES.AUDIT_LOGS)).toBe(false);
    expect(hasModuleAccess(ROLES.RESIDENT, MODULES.PETTY_CASH)).toBe(false);
    expect(hasModuleAccess(ROLES.RESIDENT, MODULES.CHEQUE_TRACKER)).toBe(false);
  });

  it('Resident can access Announcements, Emergency, Documents, Water Tanks, Society Rules', () => {
    expect(hasModuleAccess(ROLES.RESIDENT, MODULES.ANNOUNCEMENTS)).toBe(true);
    expect(hasModuleAccess(ROLES.RESIDENT, MODULES.SOCIETY_RULES)).toBe(true);
    expect(hasModuleAccess(ROLES.RESIDENT, MODULES.EMERGENCY)).toBe(true);
    expect(hasModuleAccess(ROLES.RESIDENT, MODULES.DOCUMENTS)).toBe(true);
    expect(hasModuleAccess(ROLES.RESIDENT, MODULES.WATER_MANAGEMENT)).toBe(true);
  });

  it('Security user can only access Security, Emergency, and Announcements', () => {
    expect(hasModuleAccess(ROLES.SECURITY, MODULES.SECURITY)).toBe(true);
    expect(hasModuleAccess(ROLES.SECURITY, MODULES.EMERGENCY)).toBe(true);
    expect(hasModuleAccess(ROLES.SECURITY, MODULES.ANNOUNCEMENTS)).toBe(true);

    expect(hasModuleAccess(ROLES.SECURITY, MODULES.FINANCE_INCOME_EXPENSE)).toBe(false);
    expect(hasModuleAccess(ROLES.SECURITY, MODULES.FIXED_DEPOSITS)).toBe(false);
    expect(hasModuleAccess(ROLES.SECURITY, MODULES.AMC_TRACKER)).toBe(false);
    expect(hasModuleAccess(ROLES.SECURITY, MODULES.TENANT_TRACKER)).toBe(false);
  });

  it('Treasurer has full access to Finance modules but not Security rosters', () => {
    expect(hasModuleAccess(ROLES.TREASURER, MODULES.FINANCE_INCOME_EXPENSE)).toBe(true);
    expect(hasModuleAccess(ROLES.TREASURER, MODULES.MAINTENANCE)).toBe(true);
    expect(hasModuleAccess(ROLES.TREASURER, MODULES.SHOP_MAINTENANCE)).toBe(true);
    expect(hasModuleAccess(ROLES.TREASURER, MODULES.CHEQUE_TRACKER)).toBe(true);
    expect(hasModuleAccess(ROLES.TREASURER, MODULES.FIXED_DEPOSITS)).toBe(true);
    expect(hasModuleAccess(ROLES.TREASURER, MODULES.PETTY_CASH)).toBe(true);
    expect(hasModuleAccess(ROLES.TREASURER, MODULES.STATEMENT_AUDITOR)).toBe(true);

    expect(hasModuleAccess(ROLES.TREASURER, MODULES.SECURITY)).toBe(false);
    expect(hasModuleAccess(ROLES.TREASURER, MODULES.HOUSEKEEPING)).toBe(false);
  });

  it('Manager has access to Operations and Tasks', () => {
    expect(hasModuleAccess(ROLES.MANAGER, MODULES.MANAGER_TASKS)).toBe(true);
    expect(hasModuleAccess(ROLES.MANAGER, MODULES.AMC_TRACKER)).toBe(true);
    expect(hasModuleAccess(ROLES.MANAGER, MODULES.SECURITY)).toBe(true);
    expect(hasModuleAccess(ROLES.MANAGER, MODULES.HOUSEKEEPING)).toBe(true);
    expect(hasModuleAccess(ROLES.MANAGER, MODULES.WATER_TANKER)).toBe(true);

    // Manager cannot access FD or Statement auditor
    expect(hasModuleAccess(ROLES.MANAGER, MODULES.FIXED_DEPOSITS)).toBe(false);
    expect(hasModuleAccess(ROLES.MANAGER, MODULES.STATEMENT_AUDITOR)).toBe(false);
  });

  it('Resolves known admin email to ADMIN role', () => {
    expect(resolveUserRole({ email: 'smamit27@gmail.com' })).toBe(ROLES.ADMIN);
    expect(resolveUserRole({ email: 'majestiqueeuriska.a@gmail.com' })).toBe(ROLES.ADMIN);
  });
});
