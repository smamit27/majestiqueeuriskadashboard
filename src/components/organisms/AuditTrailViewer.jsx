import React, { useState, useEffect, useMemo } from 'react';
import { fetchAuditLogs, AUDIT_ACTIONS } from '../../services/auditService.js';
import { ROLES } from '../../services/rbacService.js';

export default function AuditTrailViewer({ user, userRole = ROLES.ADMIN }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const records = await fetchAuditLogs(150);
      setLogs(records);
    } catch (err) {
      console.warn('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const modulesList = useMemo(() => {
    const set = new Set(logs.map(l => l.module).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (selectedAction !== 'ALL' && log.action !== selectedAction) return false;
      if (selectedModule !== 'ALL' && log.module !== selectedModule) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (
          (log.userEmail || '').toLowerCase().includes(q) ||
          (log.module || '').toLowerCase().includes(q) ||
          (log.recordId || '').toLowerCase().includes(q) ||
          (log.notes || '').toLowerCase().includes(q)
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [logs, selectedAction, selectedModule, searchQuery]);

  const getActionBadgeColor = (action) => {
    switch (action) {
      case AUDIT_ACTIONS.CREATE:
        return { bg: '#dcfce7', text: '#15803d' };
      case AUDIT_ACTIONS.UPDATE:
        return { bg: '#e0f2fe', text: '#0369a1' };
      case AUDIT_ACTIONS.DELETE:
        return { bg: '#fee2e2', text: '#b91c1c' };
      case AUDIT_ACTIONS.PAYMENT:
        return { bg: '#fef3c7', text: '#b45309' };
      case AUDIT_ACTIONS.APPROVE:
        return { bg: '#f3e8ff', text: '#7e22ce' };
      default:
        return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  return (
    <div className="section-card" style={{ padding: '24px', borderRadius: '16px', background: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>🛡️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0b2b26' }}>Society Security & Audit Trail</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#5f665f' }}>
                Immutable ledger of all society actions, modifications, financial transactions, and user logins
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadLogs}
          disabled={isLoading}
          className="button-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px' }}
        >
          <span>🔄</span> {isLoading ? 'Refreshing...' : 'Refresh Logs'}
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
        <div style={{ flex: '1 1 200px' }}>
          <input
            type="text"
            className="attendance-register-input"
            style={{ width: '100%', textAlign: 'left', padding: '8px 12px' }}
            placeholder="Search by user, module, or record ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ flex: '0 1 180px' }}>
          <select
            className="attendance-register-input"
            style={{ width: '100%', padding: '8px 12px' }}
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
          >
            <option value="ALL">All Actions</option>
            {Object.values(AUDIT_ACTIONS).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '0 1 180px' }}>
          <select
            className="attendance-register-input"
            style={{ width: '100%', padding: '8px 12px' }}
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
          >
            {modulesList.map(m => (
              <option key={m} value={m}>{m === 'ALL' ? 'All Modules' : m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Querying audit entries...</div>
      ) : filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: '#f1f5f9', borderRadius: '12px', color: '#64748b' }}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>📜</span>
          <strong>No audit records found matching your filters.</strong>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid rgba(0,0,0,0.06)' }}>
                <th style={{ padding: '12px 14px' }}>Timestamp</th>
                <th style={{ padding: '12px 14px' }}>User / Role</th>
                <th style={{ padding: '12px 14px' }}>Module</th>
                <th style={{ padding: '12px 14px' }}>Action</th>
                <th style={{ padding: '12px 14px' }}>Record ID</th>
                <th style={{ padding: '12px 14px' }}>Notes / Changes</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const badge = getActionBadgeColor(log.action);
                const isExpanded = expandedLogId === log.id;
                const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : 'N/A';

                return (
                  <React.Fragment key={log.id}>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: isExpanded ? '#f8fafc' : 'transparent' }}>
                      <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{dateStr}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                        <div style={{ color: '#0f172a' }}>{log.userEmail || 'System'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 700 }}>{log.userRole}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{log.module}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.text
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#475569' }}>{log.recordId || '-'}</td>
                      <td style={{ padding: '12px 14px', color: '#334155' }}>{log.notes || '-'}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        {(log.previousValue || log.newValue) ? (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            style={{
                              background: 'none',
                              border: '1px solid #cbd5e1',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isExpanded ? 'Hide Diff' : 'View Diff'}
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>
                    </tr>

                    {/* Diff viewer row */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <td colSpan={7} style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', marginBottom: '6px' }}>PREVIOUS STATE</div>
                              <pre style={{ margin: 0, fontSize: '0.75rem', overflowX: 'auto', color: '#7f1d1d' }}>
                                {JSON.stringify(log.previousValue, null, 2) || 'None'}
                              </pre>
                            </div>
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>NEW STATE</div>
                              <pre style={{ margin: 0, fontSize: '0.75rem', overflowX: 'auto', color: '#14532d' }}>
                                {JSON.stringify(log.newValue, null, 2) || 'None'}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
