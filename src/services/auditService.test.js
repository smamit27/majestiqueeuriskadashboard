import { describe, it, expect } from 'vitest';
import { logAuditEvent, fetchAuditLogs, AUDIT_ACTIONS } from './auditService';
import { ROLES } from './rbacService';

describe('Audit Trail Service', () => {
  it('records an audit event and retrieves it', async () => {
    const event = await logAuditEvent({
      action: AUDIT_ACTIONS.PAYMENT,
      module: 'Maintenance',
      recordId: 'A-302_Bill_1',
      previousValue: { status: 'Pending' },
      newValue: { status: 'Paid', amount: 13200 },
      role: ROLES.TREASURER,
      notes: 'Recorded cheque payment'
    });

    expect(event.action).toBe(AUDIT_ACTIONS.PAYMENT);
    expect(event.module).toBe('Maintenance');
    expect(event.userRole).toBe(ROLES.TREASURER);

    const logs = await fetchAuditLogs(10);
    expect(logs.length).toBeGreaterThan(0);
    const found = logs.find(l => l.recordId === 'A-302_Bill_1');
    expect(found).toBeDefined();
    expect(found.newValue.amount).toBe(13200);
  });
});
