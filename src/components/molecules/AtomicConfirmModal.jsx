import React from 'react';
import AtomicModal from './AtomicModal.jsx';
import AtomicButton from '../atoms/AtomicButton.jsx';
import { AlertTriangle } from 'lucide-react';
import './AtomicConfirmModal.css';


/**
 * AtomicConfirmModal Molecule
 * Standard confirmation dialog for dangerous or irreversible actions like deletion.
 */
export default function AtomicConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmLabel = 'Delete',
  confirmVariant = 'danger',
  confirmIcon,
  onConfirm,
  onCancel,
  isProcessing = false
}) {
  return (
    <AtomicModal
      isOpen={isOpen}
      title={title}
      onClose={onCancel}
      maxWidth="460px"
      footer={
        <>
          <AtomicButton
            variant="secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </AtomicButton>
          <AtomicButton
            variant={confirmVariant}
            icon={confirmIcon}
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing…' : confirmLabel}
          </AtomicButton>
        </>
      }
    >
      <div className="atomic-confirm-modal-s1">
        <div className="atomic-confirm-modal-s2" style={{ background: confirmVariant === 'danger' ? '#fee2e2' : '#fef3c7', color: confirmVariant === 'danger' ? '#dc2626' : '#d97706' }}>
          <AlertTriangle size={24} />
        </div>
        <div className="atomic-confirm-modal-s3">
          {message}
        </div>
      </div>
    </AtomicModal>
  );
}
