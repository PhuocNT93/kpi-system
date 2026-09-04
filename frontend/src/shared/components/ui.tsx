import React from 'react';
import { ApiClientError } from '../api/api-client';
import { Button } from '../ui/Button/Button';

// ── LoadingSpinner ─────────────────────────────────────────────────────────────
export function LoadingSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} style={{ padding: '2rem', textAlign: 'center' }}>
      <span>{label}</span>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────────
export function EmptyState({ message }: { message: string }) {
  return (
    <div role="status" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
      <p>{message}</p>
    </div>
  );
}

// ── ErrorAlert ─────────────────────────────────────────────────────────────────
interface ErrorAlertProps {
  error: unknown;
  /** Called when user clicks Retry */
  onRetry?: () => void;
}

export function ErrorAlert({ error, onRetry }: ErrorAlertProps) {
  const isServerWakingUp = error instanceof ApiClientError && error.code === 'SERVER_WAKING_UP';

  const message = isServerWakingUp
    ? 'The server is starting up after a period of inactivity. Please wait a moment and try again.'
    : error instanceof ApiClientError
      ? error.message  // safe display text from backend envelope
      : 'An unexpected error occurred. Please try again.';

  const requestId =
    error instanceof ApiClientError ? error.requestId : undefined;

  return (
    <div role="alert" style={{ padding: '1rem', border: '1px solid #f55', borderRadius: 4 }}>
      <p style={{ margin: 0 }}>{message}</p>
      {requestId && (
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#888' }}>
          Request ID: {requestId}
        </p>
      )}
      {onRetry && (
        <Button onClick={onRetry} size="sm" variant="outlined" style={{ marginTop: '0.5rem' }}>
          Retry
        </Button>
      )}
    </div>
  );
}

// ── ConfirmDialog ──────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isPending = false,
  disabled = false,
}: ConfirmDialogProps & { disabled?: boolean }) {
  if (!isOpen) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', maxWidth: 400, width: '90%' }}>
        <h2 id="confirm-dialog-title" style={{ margin: '0 0 0.5rem' }}>{title}</h2>
        <div style={{ margin: '0 0 1rem', color: '#374151' }}>{description}</div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>{cancelLabel}</Button>
          <Button onClick={onConfirm} disabled={isPending || disabled}>
            {isPending ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── StatusBadge ────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { background: string; color: string; label: string }> = {
  ACTIVE:   { background: '#d1fae5', color: '#065f46', label: 'Active' },
  INACTIVE: { background: '#fee2e2', color: '#991b1b', label: 'Inactive' },
  DRAFT:    { background: '#fef9c3', color: '#78350f', label: 'Draft' },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { background: '#e5e7eb', color: '#374151', label: status };
  return (
    <span
      aria-label={`Status: ${style.label}`}
      style={{
        display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: 12,
        background: style.background, color: style.color, fontSize: '0.75rem', fontWeight: 600,
      }}
    >
      {style.label}
    </span>
  );
}

// ── PageHeader ─────────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{title}</h1>
        {description && <p style={{ margin: '0.25rem 0 0', color: '#6b7280' }}>{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
