import React, { useState, useEffect, useMemo } from 'react';
import { fetchAuditLogs, AUDIT_ACTIONS } from '../../services/auditService.js';
import { ROLES } from '../../services/rbacService.js';
import './AuditTrailViewer.css';


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
    <div className="section-card audit-trail-viewer-s1">
      <div className="audit-trail-viewer-s2">
        <div>
          <div className="audit-trail-viewer-s3">
            <span className="audit-trail-viewer-s4">🛡️</span>
            <div>
              <h2 className="audit-trail-viewer-s5">Society Security & Audit Trail</h2>
              <p className="audit-trail-viewer-s6">
                Immutable ledger of all society actions, modifications, financial transactions, and user logins
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadLogs}
          disabled={isLoading}
          className="button-secondary audit-trail-viewer-s7"
        >
          <span>🔄</span> {isLoading ? 'Refreshing...' : 'Refresh Logs'}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="audit-trail-viewer-s8">
        <div className="audit-trail-viewer-s9">
          <input
            type="text"
            className="attendance-register-input audit-trail-viewer-s10"
            placeholder="Search by user, module, or record ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="audit-trail-viewer-s11">
          <select
            className="attendance-register-input audit-trail-viewer-s12"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
          >
            <option value="ALL">All Actions</option>
            {Object.values(AUDIT_ACTIONS).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="audit-trail-viewer-s11">
          <select
            className="attendance-register-input audit-trail-viewer-s12"
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
        <div className="audit-trail-viewer-s13">Querying audit entries...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="audit-trail-viewer-s14">
          <span className="audit-trail-viewer-s15">📜</span>
          <strong>No audit records found matching your filters.</strong>
        </div>
      ) : (
        <div className="audit-trail-viewer-s16">
          <table className="audit-trail-viewer-s17">
            <thead>
              <tr className="audit-trail-viewer-s18">
                <th className="audit-trail-viewer-s19">Timestamp</th>
                <th className="audit-trail-viewer-s19">User / Role</th>
                <th className="audit-trail-viewer-s19">Module</th>
                <th className="audit-trail-viewer-s19">Action</th>
                <th className="audit-trail-viewer-s19">Record ID</th>
                <th className="audit-trail-viewer-s19">Notes / Changes</th>
                <th className="audit-trail-viewer-s20">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const badge = getActionBadgeColor(log.action);
                const isExpanded = expandedLogId === log.id;
                const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : 'N/A';

                return (
                  <React.Fragment key={log.id}>
                    <tr className={`audit-trail-viewer-s21 ${(isExpanded ? 'audit-trail-viewer-cond-1-true' : 'audit-trail-viewer-cond-2-false')}`}>
                      <td className="audit-trail-viewer-s22">{dateStr}</td>
                      <td className="audit-trail-viewer-s23">
                        <div className="audit-trail-viewer-s24">{log.userEmail || 'System'}</div>
                        <div className="audit-trail-viewer-s25">{log.userRole}</div>
                      </td>
                      <td className="audit-trail-viewer-s23">{log.module}</td>
                      <td className="audit-trail-viewer-s19">
                        <span className="audit-trail-viewer-s26" style={{ background: badge.bg, color: badge.text }}>
                          {log.action}
                        </span>
                      </td>
                      <td className="audit-trail-viewer-s27">{log.recordId || '-'}</td>
                      <td className="audit-trail-viewer-s28">{log.notes || '-'}</td>
                      <td className="audit-trail-viewer-s20">
                        {(log.previousValue || log.newValue) ? (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="audit-trail-viewer-s29"
                          >
                            {isExpanded ? 'Hide Diff' : 'View Diff'}
                          </button>
                        ) : (
                          <span className="audit-trail-viewer-s30">-</span>
                        )}
                      </td>
                    </tr>

                    {/* Diff viewer row */}
                    {isExpanded && (
                      <tr className="audit-trail-viewer-s31">
                        <td colSpan={7} className="audit-trail-viewer-s32">
                          <div className="audit-trail-viewer-s33">
                            <div className="audit-trail-viewer-s34">
                              <div className="audit-trail-viewer-s35">PREVIOUS STATE</div>
                              <pre className="audit-trail-viewer-s36">
                                {JSON.stringify(log.previousValue, null, 2) || 'None'}
                              </pre>
                            </div>
                            <div className="audit-trail-viewer-s37">
                              <div className="audit-trail-viewer-s38">NEW STATE</div>
                              <pre className="audit-trail-viewer-s39">
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
