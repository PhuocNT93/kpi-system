import React from 'react';
import { Check, Zap, Ban, X, Loader2 } from 'lucide-react';
import { COLORS, RADII, TYPOGRAPHY } from '@/shared/theme';

interface BulkActionBarProps {
  selectedCount: number;
  entityName: string;
  onActivate: () => void;
  onDeactivate: () => void;
  onClearSelection: () => void;
  isPending?: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  entityName,
  onActivate,
  onDeactivate,
  onClearSelection,
  isPending = false,
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk action bar"
      style={{
        position: 'fixed',
        bottom: '88px', // Positioned nicely above the 64px footer bar
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
        backgroundColor: COLORS.neutral.white,
        color: COLORS.neutral.textPrimary,
        borderRadius: RADII.xl,
        border: `1.5px solid ${COLORS.primary[200]}`,
        boxShadow: '0 20px 35px -5px rgba(124, 58, 237, 0.16), 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(124, 58, 237, 0.06)',
        padding: '0.875rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        animation: 'bulkBarSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: TYPOGRAPHY.fontFamily.body,
      }}
    >
      <style>{`
        @keyframes bulkBarSlideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
      `}</style>

      {/* Selected count pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span
          style={{
            backgroundColor: COLORS.primary[100],
            color: COLORS.primary[700],
            border: `1px solid ${COLORS.primary[300]}`,
            borderRadius: RADII.full,
            padding: '4px 12px',
            fontSize: TYPOGRAPHY.fontSize.sm,
            fontWeight: TYPOGRAPHY.fontWeight.bold,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Check size={14} strokeWidth={3} />
          {selectedCount}
        </span>
        <span
          style={{
            fontSize: TYPOGRAPHY.fontSize.base,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: COLORS.neutral.textPrimary,
            letterSpacing: '-0.01em',
          }}
        >
          {selectedCount} {entityName} selected
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: '28px', width: '1px', backgroundColor: COLORS.neutral.border }} />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Activate Button */}
        <button
          onClick={onActivate}
          disabled={isPending}
          style={{
            backgroundColor: COLORS.semantic.success[600],
            color: '#FFFFFF',
            border: 'none',
            borderRadius: RADII.lg,
            padding: '0.625rem 1.25rem',
            fontSize: TYPOGRAPHY.fontSize.sm,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            cursor: isPending ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
            transition: 'all 0.15s ease-in-out',
          }}
          onMouseEnter={(e) => !isPending && (e.currentTarget.style.backgroundColor = COLORS.semantic.success[700])}
          onMouseLeave={(e) => !isPending && (e.currentTarget.style.backgroundColor = COLORS.semantic.success[600])}
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          Activate ({selectedCount})
        </button>

        {/* Deactivate Button */}
        <button
          onClick={onDeactivate}
          disabled={isPending}
          style={{
            backgroundColor: COLORS.semantic.danger[600],
            color: '#FFFFFF',
            border: 'none',
            borderRadius: RADII.lg,
            padding: '0.625rem 1.25rem',
            fontSize: TYPOGRAPHY.fontSize.sm,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            cursor: isPending ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
            transition: 'all 0.15s ease-in-out',
          }}
          onMouseEnter={(e) => !isPending && (e.currentTarget.style.backgroundColor = COLORS.semantic.danger[700])}
          onMouseLeave={(e) => !isPending && (e.currentTarget.style.backgroundColor = COLORS.semantic.danger[600])}
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
          Deactivate ({selectedCount})
        </button>

        {/* Clear Selection Button */}
        <button
          onClick={onClearSelection}
          disabled={isPending}
          title="Clear selection"
          aria-label="Clear selection"
          style={{
            backgroundColor: COLORS.neutral[100],
            border: `1px solid ${COLORS.neutral.border}`,
            color: COLORS.neutral.textSecondary,
            cursor: isPending ? 'not-allowed' : 'pointer',
            width: '38px',
            height: '38px',
            borderRadius: RADII.full,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease-in-out',
            marginLeft: '0.25rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = COLORS.neutral.textPrimary;
            e.currentTarget.style.backgroundColor = COLORS.neutral[200];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = COLORS.neutral.textSecondary;
            e.currentTarget.style.backgroundColor = COLORS.neutral[100];
          }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

