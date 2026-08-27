import React from 'react';
import type { TemplateValidationResult, ValidationErrorItem } from '../domain/template-models';
import { Button } from '../../../shared/ui/Button/Button';

interface ValidationResultsModalProps {
  isOpen: boolean;
  result: TemplateValidationResult | null;
  onClose: () => void;
  onSelectErrorTarget?: (criterionCode?: string) => void;
}

export function ValidationResultsModal({
  isOpen,
  result,
  onClose,
  onSelectErrorTarget,
}: ValidationResultsModalProps) {
  if (!isOpen || !result) return null;

  const errors = result.errors || [];
  const warnings = result.warnings || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="validation-modal-title"
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
          maxWidth: 560,
          width: '90%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 id="validation-modal-title" style={{ margin: 0, fontSize: '1.125rem', color: '#111827' }}>
            {result.isValid ? '✓ Template Validation Passed' : '⚠ Template Validation Diagnostics'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {result.isValid ? (
            <div
              style={{
                background: '#d1fae5',
                border: '1px solid #10b981',
                borderRadius: 6,
                padding: '1rem',
                color: '#065f46',
                fontWeight: 600,
              }}
            >
              All configuration rules satisfied! Total weight equals 100% and scoring rules are complete.
              This template version is ready to be published.
            </div>
          ) : (
            <>
              {/* Errors Block */}
              {errors.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem', color: '#dc2626', fontSize: '0.875rem', fontWeight: 700 }}>
                    ✕ {errors.length} Blocking Error{errors.length > 1 ? 's' : ''} (Must fix to Publish)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {errors.map((err, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#fee2e2',
                          border: '1px solid #fca5a5',
                          borderRadius: 6,
                          padding: '0.625rem 0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#991b1b' }}>
                            [{err.category}] {err.criterionName ? `· ${err.criterionName}` : ''}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: '#7f1d1d', marginTop: '0.125rem' }}>
                            {err.message}
                          </div>
                        </div>

                        {err.criterionCode && onSelectErrorTarget && (
                          <Button
                            size="sm"
                            variant="outlined"
                            onClick={() => {
                              onSelectErrorTarget(err.criterionCode);
                              onClose();
                            }}
                          >
                            Jump to Field
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings Block */}
              {warnings.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem', color: '#b45309', fontSize: '0.875rem', fontWeight: 700 }}>
                    ⚠ {warnings.length} Advisory Warning{warnings.length > 1 ? 's' : ''}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {warnings.map((warn, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#fef3c7',
                          border: '1px solid #fcd34d',
                          borderRadius: 6,
                          padding: '0.625rem 0.75rem',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#92400e' }}>
                          {warn.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
