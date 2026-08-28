import { useState } from 'react';
import {
  TemplateListScreen,
  TemplateBuilderWorkspace,
  useTemplatesQuery,
  useTemplateVersionQuery,
  useCriterionLibraryQuery,
  useSaveCriteriaDraftMutation,
  usePublishVersionMutation,
  useCreateVersionMutation,
  useTemplateDetailQuery,
  useCreateTemplateMutation,
} from '../index';
import type {
  EvaluationTemplate,
  TemplateCriterion,
} from '../index';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';

// ── Create Template Modal ─────────────────────────────────────────────────────
interface CreateTemplateModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (data: { code: string; name: string; description?: string }) => void;
}

function CreateTemplateModal({ isOpen, isLoading, onClose, onSubmit }: CreateTemplateModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!code.trim()) newErrors.code = 'Code is required.';
    if (!name.trim()) newErrors.name = 'Name is required.';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    setErrors({});
    onSubmit({ code: code.trim().toUpperCase(), name: name.trim(), description: description.trim() || undefined });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: RADII.md,
    border: `1px solid ${COLORS.neutral[300]}`, fontSize: '0.875rem',
    fontFamily: TYPOGRAPHY.fontFamily.body, boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.8125rem', fontWeight: 500,
    color: COLORS.neutral.textSecondary, marginBottom: '4px',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: COLORS.neutral.white, borderRadius: RADII['2xl'],
        padding: '32px', width: '480px', maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <h2 style={{ margin: '0 0 24px', fontSize: '1.125rem', fontWeight: 700, color: COLORS.neutral.textPrimary }}>
          Create New Template
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Code <span style={{ color: COLORS.error?.DEFAULT ?? '#ef4444' }}>*</span></label>
            <input
              id="template-code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ENG_EVAL_2027"
              style={{ ...inputStyle, borderColor: errors.code ? '#ef4444' : COLORS.neutral[300] }}
            />
            {errors.code && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#ef4444' }}>{errors.code}</p>}
          </div>
          <div>
            <label style={labelStyle}>Name <span style={{ color: COLORS.error?.DEFAULT ?? '#ef4444' }}>*</span></label>
            <input
              id="template-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Engineering Evaluation 2027"
              style={{ ...inputStyle, borderColor: errors.name ? '#ef4444' : COLORS.neutral[300] }}
            />
            {errors.name && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#ef4444' }}>{errors.name}</p>}
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              id="template-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '8px 20px', borderRadius: RADII.md, border: `1px solid ${COLORS.neutral[300]}`,
                background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                color: COLORS.neutral.textPrimary,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '8px 20px', borderRadius: RADII.md, border: 'none',
                backgroundColor: COLORS.primary.DEFAULT, color: COLORS.neutral.white,
                cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function EvaluationTemplatesPage() {
  const [activeView, setActiveView] = useState<'list' | 'builder'>('list');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const templatesQuery = useTemplatesQuery();
  const templateDetailQuery = useTemplateDetailQuery(selectedTemplateId);
  const templateVersionQuery = useTemplateVersionQuery(selectedTemplateId, selectedVersionId);
  const libraryQuery = useCriterionLibraryQuery();

  const saveDraftMutation = useSaveCriteriaDraftMutation();
  const publishMutation = usePublishVersionMutation();
  const createVersionMutation = useCreateVersionMutation();
  const createTemplateMutation = useCreateTemplateMutation();

  const handleSelectTemplate = (templateId: string, versionId?: string) => {
    const template = templatesQuery.data?.find(t => t.id === templateId);
    setSelectedTemplateId(templateId);
    setSelectedVersionId(versionId || template?.currentVersionId);
    setActiveView('builder');
  };

  const handleCreateTemplate = async (data: { code: string; name: string; description?: string }) => {
    const created = await createTemplateMutation.mutateAsync(data);
    setShowCreateModal(false);
    // Navigate into the builder with the newly created template's first version
    setSelectedTemplateId(created.id);
    setSelectedVersionId(created.currentVersionId);
    setActiveView('builder');
  };

  const handleCreateNewVersion = async (templateId: string) => {
    try {
      const newVersion = await createVersionMutation.mutateAsync({ templateId });
      setSelectedTemplateId(templateId);
      setSelectedVersionId(newVersion.id);
      setActiveView('builder');
    } catch {
      // stay on list
    }
  };

  const handleSaveDraft = async (updatedCriteria: TemplateCriterion[], expectedVersion: number) => {
    if (selectedTemplateId && selectedVersionId) {
      await saveDraftMutation.mutateAsync({
        templateId: selectedTemplateId,
        versionId: selectedVersionId,
        criteria: updatedCriteria,
        expectedVersion,
      });
    }
  };

  const handlePublishVersion = async (expectedVersion: number) => {
    if (selectedTemplateId && selectedVersionId) {
      await publishMutation.mutateAsync({
        templateId: selectedTemplateId,
        versionId: selectedVersionId,
        expectedVersion,
      });
    }
  };

  if (activeView === 'builder' && templateDetailQuery.data && (templateVersionQuery.data || templateVersionQuery.isLoading)) {
    const currentVersion = templateVersionQuery.data;
    if (!currentVersion && templateVersionQuery.isLoading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: COLORS.neutral.textSecondary }}>
          Loading template version...
        </div>
      );
    }
    if (!currentVersion) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: COLORS.neutral.textSecondary }}>
          <div>
            <p>Could not load template version.</p>
            <button onClick={() => setActiveView('list')} style={{ cursor: 'pointer' }}>← Back to list</button>
          </div>
        </div>
      );
    }
    return (
      <TemplateBuilderWorkspace
        template={templateDetailQuery.data}
        version={currentVersion}
        libraryCriteria={libraryQuery.data ?? []}
        isLoading={libraryQuery.isLoading}
        error={libraryQuery.error}
        onSaveDraft={handleSaveDraft}
        onPublishVersion={handlePublishVersion}
        onBackToList={() => setActiveView('list')}
        isSavePending={saveDraftMutation.isPending}
        isPublishPending={publishMutation.isPending}
        saveError={saveDraftMutation.error}
      />
    );
  }

  return (
    <>
      <TemplateListScreen
        templates={templatesQuery.data ?? []}
        isLoading={templatesQuery.isLoading}
        error={templatesQuery.error}
        onSelectTemplate={handleSelectTemplate}
        onCreateNewTemplate={() => setShowCreateModal(true)}
        onCreateNewVersion={handleCreateNewVersion}
      />
      <CreateTemplateModal
        isOpen={showCreateModal}
        isLoading={createTemplateMutation.isPending}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTemplate}
      />
    </>
  );
}
