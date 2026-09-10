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

  // Make the message more user-friendly
  let message = 'We encountered an issue processing your request. Please try again.';
  if (isServerWakingUp) {
    message = 'The server is starting up. Please wait a moment and try again.';
  } else if (error instanceof ApiClientError && error.message) {
    // If it's a known constraint or validation error, try to use a softer tone
    // Otherwise fallback to the provided message
    message = error.message;
  }

  return (
    <div role="alert" style={{ 
      padding: '0.75rem', 
      backgroundColor: '#fef2f2', 
      color: '#b91c1c', 
      borderRadius: '8px',
      fontSize: '0.875rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span style={{ fontWeight: 500 }}>{message}</span>
      </div>
      {onRetry && (
        <div style={{ paddingLeft: '1.5rem' }}>
          <button 
            onClick={onRetry} 
            aria-label="Retry"
            style={{
              background: 'none',
              border: 'none',
              color: '#b91c1c',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              fontSize: '0.8125rem',
              fontWeight: 500
            }}
          >
            Retry
          </button>
        </div>
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '1.75rem 2rem',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.05)',
        }}
      >
        <h2
          id="confirm-dialog-title"
          style={{
            margin: '0 0 0.75rem',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#0F172A',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
        <div style={{ margin: '0 0 1.5rem', color: '#475569', fontSize: '0.9375rem', lineHeight: 1.5 }}>
          {description}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
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
