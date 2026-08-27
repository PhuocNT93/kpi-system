import React, { useState } from 'react';
import type { EvaluationTemplate } from '../domain/template-models';
import { StatusBadge, LoadingSpinner, ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';

interface TemplateListScreenProps {
  templates: EvaluationTemplate[];
  isLoading: boolean;
  error: unknown;
  onSelectTemplate: (templateId: string, versionId?: string, isEditMode?: boolean) => void;
  onCreateNewTemplate: () => void;
  onCreateNewVersion: (templateId: string) => void;
}

export function TemplateListScreen({
  templates,
  isLoading,
  error,
  onSelectTemplate,
  onCreateNewTemplate,
  onCreateNewVersion,
}: TemplateListScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <LoadingSpinner label="Loading evaluation templates..." />;
  if (error) return <ErrorAlert error={error} />;

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>
            Evaluation Templates
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Configuration authority for corporate performance evaluation frameworks & weight rules.
          </p>
        </div>

        <Button onClick={onCreateNewTemplate}>+ Create Template</Button>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Filter templates by name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: 320,
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
          }}
        />
      </div>

      {/* Templates Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Template Name</th>
              <th style={{ padding: '0.75rem 1rem' }}>Version</th>
              <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem' }}>Criteria Count</th>
              <th style={{ padding: '0.75rem 1rem' }}>Last Updated</th>
              <th style={{ padding: '0.75rem 1rem' }}>Updated By</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTemplates.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No evaluation templates found. Create a template to begin.
                </td>
              </tr>
            ) : (
              filteredTemplates.map((t) => {
                const isPublished = t.status === 'PUBLISHED';
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{t.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Code: <code>{t.code}</code>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                      v{t.currentVersion?.versionNo || 1}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <StatusBadge status={t.status} />
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {t.criteriaCount || t.currentVersion?.criteria?.length || 0} criteria
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#4b5563' }}>
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#4b5563' }}>
                      {t.updatedByName || 'HR Admin'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                        {isPublished ? (
                          <>
                            <Button
                              size="sm"
                              variant="outlined"
                              onClick={() => onSelectTemplate(t.id, t.currentVersionId, false)}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => onCreateNewVersion(t.id)}
                            >
                              Create New Version
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => onSelectTemplate(t.id, t.currentVersionId, true)}
                          >
                            Edit Draft
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
