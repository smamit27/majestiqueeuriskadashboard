import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * AtomicEmptyState Atom
 * Clean, standard empty state component for tables and lists.
 */
export default function AtomicEmptyState({
  title = 'No records found',
  description = 'Try adjusting your search filters or add a new record.',
  icon: Icon = Inbox,
  action
}) {
  return (
    <div className="atomic-empty-state">
      <div style={{ color: '#94a3b8' }}>
        <Icon size={38} />
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#1e293b' }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '320px' }}>
          {description}
        </div>
      )}
      {action && (
        <div style={{ marginTop: '8px' }}>
          {action}
        </div>
      )}
    </div>
  );
}
