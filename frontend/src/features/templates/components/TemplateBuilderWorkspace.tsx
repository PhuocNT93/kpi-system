import React, { useState, useEffect } from 'react';
import type {
  EvaluationTemplate,
  EvaluationTemplateVersion,
  TemplateCriterion,
  Criterion,
  TemplateValidationResult,
} from '../domain/template-models';
import {
  calculateConfiguredWeightTotal,
  validateTemplateClientSide,
} from '../domain/template-mappers';
import { CriterionLibraryPanel } from './CriterionLibraryPanel';
import { SelectedCriteriaCanvas } from './SelectedCriteriaCanvas';
import { WeightStatusBar } from './WeightStatusBar';
import { CriterionConfigDrawer } from './CriterionConfigDrawer';
import { ValidationResultsModal } from './ValidationResultsModal';
import { PublishConfirmationModal } from './PublishConfirmationModal';
import { VersionHistoryDiffModal } from './VersionHistoryDiffModal';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { StatusBadge, LoadingSpinner, ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';

interface TemplateBuilderWorkspaceProps {
  template: EvaluationTemplate;
  version: EvaluationTemplateVersion;
  libraryCriteria: Criterion[];
  isLoading?: boolean;
  error?: unknown;
  onSaveDraft: (updatedCriteria: TemplateCriterion[], expectedVersion: number) => Promise<void>;
  onPublishVersion: (expectedVersion: number) => Promise<void>;
  onBackToList: () => void;
  isSavePending?: boolean;
  isPublishPending?: boolean;
  saveError?: unknown;
}

export function TemplateBuilderWorkspace({
  template,
  version,
  libraryCriteria,
  isLoading = false,
  error = null,
  onSaveDraft,
  onPublishVersion,
  onBackToList,
  isSavePending = false,
  isPublishPending = false,
  saveError = null,
}: TemplateBuilderWorkspaceProps) {
  const isPublished = version.status === 'PUBLISHED' || template.status === 'PUBLISHED';
  const isReadOnly = isPublished;

  const [criteria, setCriteria] = useState<TemplateCriterion[]>(version.criteria || []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const [validationResult, setValidationResult] = useState<TemplateValidationResult | null>(null);

  // Active drawer & modals state
  const [selectedConfigCriterion, setSelectedConfigCriterion] = useState<TemplateCriterion | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // Sync criteria state when version prop updates
  useEffect(() => {
    setCriteria(version.criteria || []);
    setHasUnsavedChanges(false);
  }, [version]);

  // Handle Optimistic Concurrency Lock error (409)
  useEffect(() => {
    if (saveError && (saveError as any).status === 409) {
      setIsConflictModalOpen(true);
    }
  }, [saveError]);

  const configuredTotalWeight = calculateConfiguredWeightTotal(criteria);

  // Handlers
  const handleWeightChange = (id: string, newWeight: number) => {
    if (isReadOnly) return;
    setCriteria((prev) =>
      prev.map((item) => (item.id === id ? { ...item, effectiveWeight: newWeight } : item))
    );
    setHasUnsavedChanges(true);
  };

  const handleRemoveCriterion = (id: string) => {
    if (isReadOnly) return;
    setCriteria((prev) => prev.filter((item) => item.id !== id));
    setHasUnsavedChanges(true);
  };

  const handleAddCriterionFromLibrary = (criterion: Criterion) => {
    if (isReadOnly) return;
    const newCriterionItem: TemplateCriterion = {
      id: `tc-${Date.now()}`,
      templateVersionId: version.id,
      criterionVersionId: criterion.currentVersion?.id || `cv-${criterion.id}`,
      criterion,
      effectiveWeight: 10,
      applicableRoleIds: [],
      applicableTeamIds: [],
      isDisabled: false,
      isOptional: false,
      displayOrder: criteria.length + 1,
    };
    setCriteria((prev) => [...prev, newCriterionItem]);
    setHasUnsavedChanges(true);
  };

  const handleSaveDrawerCriterion = (updatedItem: TemplateCriterion) => {
    if (isReadOnly) return;
    setCriteria((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
    setHasUnsavedChanges(true);
  };

  const handleRunValidation = () => {
    const res = validateTemplateClientSide(criteria);
    setValidationResult(res);
    setIsValidationModalOpen(true);
  };

  const handleSaveDraft = async () => {
    if (isReadOnly) return;
    await onSaveDraft(criteria, version.version);
    setHasUnsavedChanges(false);
    setLastSavedTime(new Date().toLocaleTimeString());
  };

  const handlePublishClick = () => {
    const res = validateTemplateClientSide(criteria);
    setValidationResult(res);
    if (!res.isValid) {
      setIsValidationModalOpen(true);
    } else {
      setIsPublishModalOpen(true);
    }
  };

  const handleConfirmPublish = async () => {
    await onPublishVersion(version.version);
    setIsPublishModalOpen(false);
  };

  const existingCriterionIds = new Set(criteria.map((c) => c.criterion.id));

  if (isLoading) return <LoadingSpinner label="Loading Template Workspace..." />;
  if (error) return <ErrorAlert error={error} onRetry={onBackToList} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f3f4f6' }}>
      {/* ── Top Workspace Header ───────────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0.875rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#6b7280' }}>
            <button
              type="button"
              onClick={onBackToList}
              style={{ border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', padding: 0 }}
            >
              ← Evaluation Templates
            </button>
            <span>/</span>
            <span>{template.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>
              {template.name}
            </h1>
            <StatusBadge status={version.status} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>
              Version {version.versionNo}
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
            {hasUnsavedChanges ? (
              <span style={{ color: '#d97706', fontWeight: 600 }}>● Unsaved changes</span>
            ) : (
              <span>● All changes saved · Last saved {lastSavedTime}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Button variant="outlined" size="sm" onClick={() => setIsDiffModalOpen(true)}>
            Version Diff
          </Button>

          <Button variant="outlined" size="sm" onClick={handleRunValidation}>
            Validate Template
          </Button>

          {!isReadOnly && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSavePending || !hasUnsavedChanges}
              >
                {isSavePending ? 'Saving...' : 'Save Draft'}
              </Button>

              <Button size="sm" onClick={handlePublishClick} disabled={isPublishPending}>
                Publish Version
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Immutable Published Version Warning Banner ─────────────────────── */}
      {isReadOnly && (
        <div
          style={{
            background: '#eff6ff',
            borderBottom: '1px solid #bfdbfe',
            padding: '0.625rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8125rem',
            color: '#1e40af',
          }}
        >
          <span>
            🔒 <strong>Published Version is Immutable.</strong> This configuration is locked and cannot be modified.
          </span>
          <Button size="sm" onClick={() => onPublishVersion(version.version)}>
            Create New Draft Version
          </Button>
        </div>
      )}

      {/* ── Main Dual-Pane Workspace Body ───────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left-Side Criterion Library */}
        <CriterionLibraryPanel
          criteria={libraryCriteria}
          existingCriterionIds={existingCriterionIds}
          onAddCriterion={handleAddCriterionFromLibrary}
          isReadOnly={isReadOnly}
        />

        {/* Right-Side Canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.5rem' }}>
          {/* Weight Real-Time Validation Bar */}
          <div style={{ marginBottom: '1.25rem' }}>
            <WeightStatusBar
              totalWeight={configuredTotalWeight}
              hasConditionalApplicability={criteria.some(
                (c) => c.applicableRoleIds?.length || c.applicableTeamIds?.length
              )}
            />
          </div>

          {/* Canvas Title Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
              SELECTED CRITERIA ({criteria.length})
            </h3>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>
              Total Configured Weight: {configuredTotalWeight}%
            </span>
          </div>

          {/* Selected Criteria Draggable List */}
          <SelectedCriteriaCanvas
            criteria={criteria}
            onWeightChange={handleWeightChange}
            onRemoveCriterion={handleRemoveCriterion}
            onConfigureClick={(item) => {
              setSelectedConfigCriterion(item);
              setIsDrawerOpen(true);
            }}
            onReorder={(drag, drop) => {
              const updated = [...criteria];
              const [moved] = updated.splice(drag, 1);
              updated.splice(drop, 0, moved);
              setCriteria(updated);
              setHasUnsavedChanges(true);
            }}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>

      {/* ── Slide-over Criterion Configuration Drawer ────────────────────────── */}
      <CriterionConfigDrawer
        criterionItem={selectedConfigCriterion}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSave={handleSaveDrawerCriterion}
        isReadOnly={isReadOnly}
      />

      {/* ── Modals & Dialogs ─────────────────────────────────────────────────── */}
      <ValidationResultsModal
        isOpen={isValidationModalOpen}
        result={validationResult}
        onClose={() => setIsValidationModalOpen(false)}
      />

      <PublishConfirmationModal
        isOpen={isPublishModalOpen}
        version={version}
        templateName={template.name}
        onConfirm={handleConfirmPublish}
        onCancel={() => setIsPublishModalOpen(false)}
        isPending={isPublishPending}
      />

      <VersionHistoryDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        v1Criteria={version.criteria}
        v2Criteria={criteria}
      />

      <ConflictResolutionModal
        isOpen={isConflictModalOpen}
        onReloadLatest={() => {
          setIsConflictModalOpen(false);
          window.location.reload();
        }}
        onCancel={() => setIsConflictModalOpen(false)}
      />
    </div>
  );
}
