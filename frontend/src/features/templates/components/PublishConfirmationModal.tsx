import React from 'react';
import type { EvaluationTemplateVersion } from '../domain/template-models';
import { Button } from '../../../shared/ui/Button/Button';

interface PublishConfirmationModalProps {
  isOpen: boolean;
  version: EvaluationTemplateVersion | null;
  templateName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function PublishConfirmationModal({
  isOpen,
  version,
  templateName,
  onConfirm,
  onCancel,
  isPending = false,
}: PublishConfirmationModalProps) {
  if (!isOpen || !version) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 8,
          padding: '1.5rem',
          maxWidth: 480,
          width: '90%',
        }}
      >
        <h2 id="publish-modal-title" style={{ margin: '0 0 0.5rem', color: '#111827', fontSize: '1.25rem' }}>
          Publish Template Version?
        </h2>

        <div style={{ fontSize: '0.875rem', color: '#374151', margin: '0 0 1rem' }}>
          You are about to publish <strong>{templateName}</strong> (Version {version.versionNo}).
        </div>

        <div
          style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: '0.875rem',
            fontSize: '0.8125rem',
            color: '#4b5563',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ fontWeight: 700, color: '#111827' }}>Publish Commit Rules:</div>
          <div>• This version becomes <strong>permanently immutable</strong>.</div>
          <div>• Criteria configuration, rules, and weights will be frozen and snapshot-locked.</div>
          <div>• Future adjustments require creating a new draft version (Version {version.versionNo + 1}).</div>
          <div>• Active evaluation cycles can reference this published version safely.</div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Publishing...' : 'Publish Version'}
          </Button>
        </div>
      </div>
    </div>
  );
}
