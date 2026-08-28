import { useState } from 'react';
import type { CriterionProvenance } from '../domain/template-models';

interface ProvenancePopoverProps {
  provenance?: CriterionProvenance;
  criterionName: string;
  configuredWeight: number;
}

export function ProvenancePopover({
  provenance,
  configuredWeight,
}: ProvenancePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  const mockProvenance: CriterionProvenance = provenance || {
    effectiveWeight: configuredWeight,
    effectiveSource: 'TEMPLATE',
    effectiveSourceLabel: 'Template Override',
    tiers: [
      { scope: 'GLOBAL', scopeLabel: 'Global Default', weight: 10, isApplied: false },
      { scope: 'ROLE', scopeLabel: 'Role · Software Engineer', weight: 12, isApplied: false },
      { scope: 'TEAM', scopeLabel: 'Team · Core Platform', weight: 15, isApplied: false },
      { scope: 'TEMPLATE', scopeLabel: 'Template Override', weight: configuredWeight, isApplied: true },
    ],
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: 4,
          padding: '0.2rem 0.5rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#374151',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
        title="View Configuration Provenance"
      >
        <span>Source: {mockProvenance.effectiveSourceLabel}</span>
        <span style={{ fontSize: '0.625rem' }}>ℹ</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            width: 280,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #f3f4f6',
              paddingBottom: '0.5rem',
              marginBottom: '0.75rem',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#111827' }}>
              Weight Provenance
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.75rem' }}>
            Precedence resolution order (top-down, highest precedence overrides lower tiers):
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {mockProvenance.tiers.map((tier, idx) => (
              <div
                key={tier.scope + idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.375rem 0.625rem',
                  borderRadius: 6,
                  background: tier.isApplied ? '#eff6ff' : '#f9fafb',
                  border: tier.isApplied ? '1px solid #93c5fd' : '1px solid #f3f4f6',
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: tier.isApplied ? 700 : 500,
                      color: tier.isApplied ? '#1d4ed8' : '#374151',
                      fontSize: '0.75rem',
                    }}
                  >
                    {tier.scopeLabel}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                    {tier.scope} Level
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      color: tier.isApplied ? '#1d4ed8' : '#6b7280',
                    }}
                  >
                    {tier.weight}%
                  </span>
                  {tier.isApplied && (
                    <span
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        fontSize: '0.625rem',
                        padding: '0.1rem 0.35rem',
                        borderRadius: 4,
                        fontWeight: 700,
                      }}
                    >
                      Applied
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: '1px dashed #e5e7eb',
              marginTop: '0.75rem',
              paddingTop: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
              Effective Resolved Weight:
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1d4ed8' }}>
              {mockProvenance.effectiveWeight}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
