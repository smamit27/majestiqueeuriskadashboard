/**
 * Majestique Euriska Society Management Portal
 * Centralized Audit Trail Service
 */

import { addDoc, collection, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, isFirebaseConfigured, ensureFirebaseSession } from '../firebase';
import { resolveUserRole } from './rbacService';

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  APPROVE: 'APPROVE',
  PAYMENT: 'PAYMENT',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  ROLE_CHANGE: 'ROLE_CHANGE',
};

// In-memory fallback log cache for offline or non-firebase testing
const localAuditLogs = [];

/**
 * Record an audit log entry.
 * @param {object} param
 * @param {string} param.action e.g. CREATE, UPDATE, DELETE, APPROVE, PAYMENT
 * @param {string} param.module e.g. Maintenance, Finance, Tenant, AMC
 * @param {string} param.recordId ID of the affected record
 * @param {any} param.previousValue Old state/value before modification
 * @param {any} param.newValue New state/value after modification
 * @param {object|null} param.user Current user object
 * @param {string|null} param.role User role string
 * @param {string|null} param.notes Additional context or comments
 */
export async function logAuditEvent({
  action,
  module,
  recordId = '',
  previousValue = null,
  newValue = null,
  user = null,
  role = null,
  notes = '',
}) {
  const currentRole = role || resolveUserRole(user);
  const userIdentifier = user?.email || user?.uid || 'Anonymous / System';

  const entry = {
    action: action || AUDIT_ACTIONS.UPDATE,
    module: module || 'General',
    recordId: String(recordId),
    previousValue: previousValue !== undefined ? previousValue : null,
    newValue: newValue !== undefined ? newValue : null,
    userId: user?.uid || 'anonymous',
    userEmail: userIdentifier,
    userRole: currentRole,
    notes: String(notes || ''),
    createdAt: new Date().toISOString(),
  };

  // Add to local memory
  localAuditLogs.unshift({ ...entry, id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` });
  if (localAuditLogs.length > 500) localAuditLogs.pop();

  if (!isFirebaseConfigured || !db) {
    return entry;
  }

  try {
    await ensureFirebaseSession();
    await addDoc(collection(db, 'auditLogs'), {
      ...entry,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Failed to write audit log to Firestore (saved locally):', err);
  }

  return entry;
}

/**
 * Fetch recent audit logs.
 * @param {number} maxEntries 
 * @returns {Promise<Array>}
 */
export async function fetchAuditLogs(maxEntries = 100) {
  if (!isFirebaseConfigured || !db) {
    return localAuditLogs.slice(0, maxEntries);
  }

  try {
    await ensureFirebaseSession();
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(maxEntries));
    const snap = await getDocs(q);
    if (snap.empty) {
      return localAuditLogs.slice(0, maxEntries);
    }
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.createdAt || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('Failed to fetch audit logs from Firestore, returning local entries:', err);
    return localAuditLogs.slice(0, maxEntries);
  }
}
