import { useState } from 'react';
import type { TemplateCriterion, VersionDiffItem } from '../domain/template-models';
import { compareTemplateVersions } from '../domain/template-mappers';
import { Button } from '../../../shared/ui/Button/Button';

interface VersionHistoryDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  v1Criteria: TemplateCriterion[];
  v2Criteria: TemplateCriterion[];
}

export function VersionHistoryDiffModal({
  isOpen,
  onClose,
  v1Criteria,
  v2Criteria,
}: VersionHistoryDiffModalProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'diff'>('diff');

  if (!isOpen) return null;

  const diffs: VersionDiffItem[] = compareTemplateVersions(v1Criteria, v2Criteria);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-modal-title"
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
          maxWidth: 640,
          width: '90%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 id="version-modal-title" style={{ margin: 0, fontSize: '1.125rem', color: '#111827' }}>
            Version Governance & Diff Comparison
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('diff')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'diff' ? '2px solid #2563eb' : '2px solid transparent',
              fontWeight: activeTab === 'diff' ? 700 : 500,
              color: activeTab === 'diff' ? '#2563eb' : '#4b5563',
              cursor: 'pointer',
            }}
          >
            Compare V1 (Published) vs V2 (Draft)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'history' ? '2px solid #2563eb' : '2px solid transparent',
              fontWeight: activeTab === 'history' ? 700 : 500,
              color: activeTab === 'history' ? '#2563eb' : '#4b5563',
              cursor: 'pointer',
            }}
          >
            Version Audit History
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'diff' ? (
            <div>
              <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Criterion</th>
                    <th style={{ padding: '0.5rem' }}>V1 Weight</th>
                    <th style={{ padding: '0.5rem' }}>V2 Weight</th>
                    <th style={{ padding: '0.5rem' }}>Change Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map((d, idx) => {
                    let badgeBg = '#f3f4f6';
                    let badgeColor = '#374151';
                    if (d.changeType === 'ADDED') {
                      badgeBg = '#d1fae5';
                      badgeColor = '#065f46';
                    } else if (d.changeType === 'REMOVED') {
                      badgeBg = '#fee2e2';
                      badgeColor = '#991b1b';
                    } else if (d.changeType === 'WEIGHT_CHANGED') {
                      badgeBg = '#fef3c7';
                      badgeColor = '#92400e';
                    }

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{d.criterionName}</td>
                        <td style={{ padding: '0.5rem' }}>{d.v1Weight !== null ? `${d.v1Weight}%` : '—'}</td>
                        <td style={{ padding: '0.5rem' }}>{d.v2Weight !== null ? `${d.v2Weight}%` : '—'}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <span
                            style={{
                              background: badgeBg,
                              color: badgeColor,
                              padding: '0.125rem 0.375rem',
                              borderRadius: 4,
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          >
                            {d.detailMessage}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: '0.75rem',
                  background: '#f9fafb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Version 2 (Draft)</span>
                  <span style={{ color: '#d97706' }}>In Progress</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Created Aug 27, 2026 by Minh Nguyen
                </div>
              </div>

              <div
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: '0.75rem',
                  background: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Version 1 (Published)</span>
                  <span style={{ color: '#059669' }}>Published · Immutable</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Published Aug 20, 2026 by Minh Nguyen · 5 criteria · 100% weight
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
