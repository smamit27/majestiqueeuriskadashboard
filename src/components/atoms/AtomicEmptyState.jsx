import React from 'react';
import { Inbox } from 'lucide-react';
import './AtomicEmptyState.css';


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
      <div className="atomic-empty-state-s1">
        <Icon size={38} />
      </div>
      <div className="atomic-empty-state-s2">
        {title}
      </div>
      {description && (
        <div className="atomic-empty-state-s3">
          {description}
        </div>
      )}
      {action && (
        <div className="atomic-empty-state-s4">
          {action}
        </div>
      )}
    </div>
  );
}
