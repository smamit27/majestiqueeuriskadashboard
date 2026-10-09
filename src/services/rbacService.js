/**
 * Majestique Euriska Society Management Portal
 * Role-Based Access Control (RBAC) Architecture
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  CHAIRMAN: 'CHAIRMAN',
  SECRETARY: 'SECRETARY',
  TREASURER: 'TREASURER',
  MANAGER: 'MANAGER',
  SECURITY: 'SECURITY',
  RESIDENT: 'RESIDENT',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'System Administrator',
  [ROLES.CHAIRMAN]: 'Society Chairman',
  [ROLES.SECRETARY]: 'Society Secretary',
  [ROLES.TREASURER]: 'Society Treasurer',
  [ROLES.MANAGER]: 'Estate Manager',
  [ROLES.SECURITY]: 'Security Gate / Guard',
  [ROLES.RESIDENT]: 'Society Resident (Wing A)',
};

// Module IDs corresponding to application tabs
export const MODULES = {
  // Main
  DASHBOARD: 'society_overview',
  
  // Society
  SOCIETY_OVERVIEW: 'society_overview',
  ANNOUNCEMENTS: 'announcements',
  SOCIETY_RULES: 'society_rules',
  AGM_MEETINGS: 'agm_records',
  EMERGENCY: 'emergency',
  
  // Finance
  FINANCE_INCOME_EXPENSE: 'finance',
  MAINTENANCE: 'maintenance',
  COMMON_INVOICES: 'common_invoices',
  SHOP_MAINTENANCE: 'shop_maintenance',
  CHEQUE_TRACKER: 'cheques',
  FIXED_DEPOSITS: 'fixed_deposits',
  PETTY_CASH: 'petty_cash',
  STATEMENT_AUDITOR: 'statement_auditor',
  ELECTRICITY: 'tata_electricity',
  TIMES_OF_INDIA: 'times_of_india',
  SOLAR: 'solar',
  
  // Operations
  MANAGER_TASKS: 'manager_tasks',
  AMC_TRACKER: 'amc',
  SECURITY: 'security',
  HOUSEKEEPING: 'housekeeping',
  WATER_MANAGEMENT: 'water_tanks',
  WATER_TANKER: 'tanker',
  
  // Residents
  TENANT_TRACKER: 'tenant_tracking',
  PARKING: 'parking_allotment',
  PARK_PLUS: 'park_plus',
  
  // Projects
  VISUALIZATION_WORK: 'water_management',
  BUILDER_DISCUSS: 'builder_discuss',
  
  // Governance & Core ERP
  DOCUMENTS: 'documents',
  AUDIT_LOGS: 'audit_logs',
  MONTHLY_REPORT: 'monthly_report',
  RESIDENT_PORTAL: 'resident_portal',
};

/**
 * Access Matrix: maps each module to the list of roles permitted to view/access it.
 */
export const MODULE_PERMISSIONS = {
  [MODULES.DASHBOARD]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER
  ],
  [MODULES.SOCIETY_OVERVIEW]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER
  ],
  [MODULES.ANNOUNCEMENTS]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER, ROLES.SECURITY, ROLES.RESIDENT
  ],
  [MODULES.SOCIETY_RULES]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER, ROLES.SECURITY, ROLES.RESIDENT
  ],
  [MODULES.AGM_MEETINGS]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER, ROLES.RESIDENT
  ],
  [MODULES.EMERGENCY]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER, ROLES.SECURITY, ROLES.RESIDENT
  ],

  // Finance modules (Strictly restricted to Admin, Chairman, Secretary, Treasurer)
  [MODULES.FINANCE_INCOME_EXPENSE]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER
  ],
  [MODULES.MAINTENANCE]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER
  ],
  [MODULES.COMMON_INVOICES]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER
  ],
  [MODULES.SHOP_MAINTENANCE]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER
  ],
  [MODULES.CHEQUE_TRACKER]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER
  ],
  [MODULES.FIXED_DEPOSITS]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER
  ],
  [MODULES.PETTY_CASH]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER
  ],
  [MODULES.STATEMENT_AUDITOR]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER
  ],
  [MODULES.ELECTRICITY]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER
  ],
  [MODULES.TIMES_OF_INDIA]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER, ROLES.RESIDENT
  ],
  [MODULES.SOLAR]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER
  ],

  // Operations modules
  [MODULES.MANAGER_TASKS]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER
  ],
  [MODULES.AMC_TRACKER]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER
  ],
  [MODULES.SECURITY]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.MANAGER, ROLES.SECURITY
  ],
  [MODULES.HOUSEKEEPING]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.MANAGER
  ],
  [MODULES.WATER_MANAGEMENT]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.MANAGER, ROLES.RESIDENT
  ],
  [MODULES.WATER_TANKER]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.MANAGER
  ],

  // Residents modules
  [MODULES.TENANT_TRACKER]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.MANAGER
  ],
  [MODULES.PARKING]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.MANAGER, ROLES.RESIDENT
  ],
  [MODULES.PARK_PLUS]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER
  ],

  // Projects
  [MODULES.VISUALIZATION_WORK]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER, ROLES.RESIDENT
  ],
  [MODULES.BUILDER_DISCUSS]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER
  ],

  // Documents & Audit
  [MODULES.DOCUMENTS]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER, ROLES.RESIDENT
  ],
  [MODULES.AUDIT_LOGS]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER
  ],
  [MODULES.MONTHLY_REPORT]: [
    ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER
  ],
  [MODULES.RESIDENT_PORTAL]: [
    ROLES.RESIDENT, ROLES.ADMIN
  ],
};

/**
 * Checks whether a given role is authorized to view/access a module.
 * @param {string} role 
 * @param {string} moduleId 
 * @returns {boolean}
 */
export function hasModuleAccess(role, moduleId) {
  if (!role) return false;
  const normalizedRole = role.toUpperCase();
  if (normalizedRole === ROLES.ADMIN) return true;
  
  const allowedRoles = MODULE_PERMISSIONS[moduleId] || [];
  return allowedRoles.includes(normalizedRole);
}

/**
 * Checks whether a given role has write / administrative privileges in a module.
 * @param {string} role 
 * @param {string} moduleId 
 * @returns {boolean}
 */
export function canEditModule(role, moduleId) {
  if (!role) return false;
  const normalizedRole = role.toUpperCase();
  if (normalizedRole === ROLES.ADMIN) return true;
  
  switch (moduleId) {
    case MODULES.FINANCE_INCOME_EXPENSE:
    case MODULES.MAINTENANCE:
    case MODULES.SHOP_MAINTENANCE:
    case MODULES.CHEQUE_TRACKER:
    case MODULES.FIXED_DEPOSITS:
    case MODULES.PETTY_CASH:
    case MODULES.STATEMENT_AUDITOR:
      return [ROLES.CHAIRMAN, ROLES.TREASURER].includes(normalizedRole);
    
    case MODULES.MANAGER_TASKS:
    case MODULES.AMC_TRACKER:
    case MODULES.HOUSEKEEPING:
    case MODULES.WATER_TANKER:
      return [ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.MANAGER].includes(normalizedRole);
      
    case MODULES.SECURITY:
      return [ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.MANAGER, ROLES.SECURITY].includes(normalizedRole);
      
    case MODULES.TENANT_TRACKER:
      return [ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.MANAGER].includes(normalizedRole);
      
    case MODULES.ANNOUNCEMENTS:
    case MODULES.SOCIETY_RULES:
    case MODULES.AGM_MEETINGS:
    case MODULES.DOCUMENTS:
      return [ROLES.CHAIRMAN, ROLES.SECRETARY].includes(normalizedRole);

    default:
      return [ROLES.CHAIRMAN, ROLES.SECRETARY].includes(normalizedRole);
  }
}

/**
 * Resolves default user role from authenticated Firebase user email or stored profile.
 * Default admin emails are mapped to ADMIN.
 * Fallback is RESIDENT for verified residents, or guest.
 * @param {object|null} user 
 * @param {string|null} overrideRole Optional role for testing/switching
 * @returns {string} Role enum
 */
export function resolveUserRole(user, overrideRole = null) {
  if (overrideRole && Object.values(ROLES).includes(overrideRole.toUpperCase())) {
    return overrideRole.toUpperCase();
  }

  if (typeof window !== 'undefined') {
    const storedRole = localStorage.getItem('euriska_active_role');
    if (storedRole && Object.values(ROLES).includes(storedRole.toUpperCase())) {
      return storedRole.toUpperCase();
    }
  }

  if (!user || !user.email) {
    return ROLES.RESIDENT;
  }

  const email = user.email.toLowerCase();
  const adminEmails = ['majestiqueeuriska.a@gmail.com', 'smamit27@gmail.com'];
  if (adminEmails.includes(email)) {
    return ROLES.ADMIN;
  }

  // Check email domains or local role mappings
  if (email.includes('treasurer')) return ROLES.TREASURER;
  if (email.includes('secretary')) return ROLES.SECRETARY;
  if (email.includes('chairman')) return ROLES.CHAIRMAN;
  if (email.includes('manager')) return ROLES.MANAGER;
  if (email.includes('security')) return ROLES.SECURITY;

  return ROLES.RESIDENT;
}
