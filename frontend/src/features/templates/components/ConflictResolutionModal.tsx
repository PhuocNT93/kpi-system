import React from 'react';
import { Button } from '../../../shared/ui/Button/Button';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onReloadLatest: () => void;
  onCancel: () => void;
}

export function ConflictResolutionModal({
  isOpen,
  onReloadLatest,
  onCancel,
}: ConflictResolutionModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 8,
          padding: '1.5rem',
          maxWidth: 440,
          width: '90%',
          borderLeft: '6px solid #ef4444',
        }}
      >
        <h3 id="conflict-modal-title" style={{ margin: '0 0 0.5rem', color: '#991b1b', fontSize: '1.125rem' }}>
          ⚠ Optimistic Lock Conflict (409)
        </h3>

        <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0 0 1rem', lineHeight: 1.4 }}>
          This evaluation template draft was updated by another user while you were editing.
          Your local draft version is out of date and cannot overwrite server state directly.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <Button variant="secondary" onClick={onCancel}>
            Keep Unsaved Draft
          </Button>
          <Button onClick={onReloadLatest}>
            Reload Latest Version
          </Button>
        </div>
      </div>
    </div>
  );
}
