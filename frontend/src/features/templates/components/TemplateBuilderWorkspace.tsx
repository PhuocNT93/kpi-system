import { useState, useEffect } from 'react';
import type {
  EvaluationTemplate,
  EvaluationTemplateVersion,
  TemplateKpi,
  TemplateKpiCriterion,
  Criterion,
  TemplateValidationResult,
} from '../domain/template-models';
import {
  calculateConfiguredWeightTotal,
  validateTemplateClientSide,
} from '../domain/template-mappers';
import { CriterionLibraryPanel } from './CriterionLibraryPanel';
import { SelectedKpiCanvas } from './SelectedKpiCanvas';
import { WeightStatusBar } from './WeightStatusBar';
import { CriterionConfigDrawer } from './CriterionConfigDrawer';
import { ValidationResultsModal } from './ValidationResultsModal';
import { PublishConfirmationModal } from './PublishConfirmationModal';
import { VersionHistoryDiffModal } from './VersionHistoryDiffModal';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { StatusBadge, LoadingSpinner, ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import { useKpis } from '../../kpi/api/kpi-api';

interface TemplateBuilderWorkspaceProps {
  template: EvaluationTemplate;
  version: EvaluationTemplateVersion;
  libraryCriteria: Criterion[];
  isLoading?: boolean;
  error?: unknown;
  onSaveDraft: (updatedKpis: TemplateKpi[], expectedVersion: number) => Promise<void>;
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

  const [kpis, setKpis] = useState<TemplateKpi[]>(version.kpis || []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const [validationResult, setValidationResult] = useState<TemplateValidationResult | null>(null);

  // Active drawer & modals state
  const [selectedConfigCriterion, setSelectedConfigCriterion] = useState<{ kpiId: string; criterion: TemplateKpiCriterion } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // KPI Dropdown State
  const [isKpiDropdownOpen, setIsKpiDropdownOpen] = useState(false);

  const { data: availableKpis = [] } = useKpis();

  // Sync kpis state when version prop updates
  useEffect(() => {
    setKpis(version.kpis || []);
    setHasUnsavedChanges(false);
  }, [version]);

  // Handle Optimistic Concurrency Lock error (409)
  useEffect(() => {
    if (saveError && (saveError as any).status === 409) {
      setIsConflictModalOpen(true);
    }
  }, [saveError]);

  const configuredTotalWeight = calculateConfiguredWeightTotal(kpis);

  // ── KPI Handlers ──────────────────────────────────────────────────────────

  const handleAddKpi = (kpiData: any) => {
    if (isReadOnly) return;
    const newKpi: TemplateKpi = {
      id: `tkpi-${Date.now()}`,
      templateVersionId: version.id,
      kpiId: kpiData.kpiId,
      kpiName: kpiData.name,
      weight: 10,
      displayOrder: kpis.length + 1,
      criteria: [],
    };
    setKpis((prev) => [...prev, newKpi]);
    setHasUnsavedChanges(true);
    setIsKpiDropdownOpen(false);
  };

  const handleRemoveKpi = (id: string) => {
    if (isReadOnly) return;
    setKpis((prev) => prev.filter((item) => item.id !== id));
    setHasUnsavedChanges(true);
  };

  const handleKpiWeightChange = (id: string, newWeight: number) => {
    if (isReadOnly) return;
    setKpis((prev) =>
      prev.map((item) => (item.id === id ? { ...item, weight: newWeight } : item))
    );
    setHasUnsavedChanges(true);
  };

  // ── Criterion Handlers ────────────────────────────────────────────────────

  const handleCriterionWeightChange = (kpiId: string, criterionId: string, newWeight: number) => {
    if (isReadOnly) return;
    setKpis((prev) =>
      prev.map((kpi) => {
        if (kpi.id === kpiId) {
          return {
            ...kpi,
            criteria: kpi.criteria.map((c) => (c.id === criterionId ? { ...c, effectiveWeight: newWeight } : c)),
          };
        }
        return kpi;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleRemoveCriterion = (kpiId: string, criterionId: string) => {
    if (isReadOnly) return;
    setKpis((prev) =>
      prev.map((kpi) => {
        if (kpi.id === kpiId) {
          return {
            ...kpi,
            criteria: kpi.criteria.filter((c) => c.id !== criterionId),
          };
        }
        return kpi;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleAddCriterionFromLibrary = (criterion: Criterion, targetKpiId: string) => {
    if (isReadOnly || kpis.length === 0) {
      alert("Please add a KPI group first.");
      return;
    }
    const targetKpiIndex = kpis.findIndex(k => k.id === targetKpiId);
    if (targetKpiIndex === -1) return;
    const targetKpi = kpis[targetKpiIndex];

    const newCriterionItem: TemplateKpiCriterion = {
      id: `tc-${Date.now()}`,
      templateKpiId: targetKpi.id,
      criterionVersionId: criterion.currentVersion?.id || `cv-${criterion.id}`,
      criterion,
      effectiveWeight: 10,
      applicableRoleIds: [],
      applicableTeamIds: [],
      isDisabled: false,
      isOptional: false,
      displayOrder: targetKpi.criteria.length + 1,
    };
    
    setKpis((prev) => {
      const next = [...prev];
      next[targetKpiIndex] = {
        ...next[targetKpiIndex],
        criteria: [...next[targetKpiIndex].criteria, newCriterionItem],
      };
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveDrawerCriterion = (updatedItem: any) => {
    if (isReadOnly || !selectedConfigCriterion) return;
    setKpis((prev) =>
      prev.map((kpi) => {
        if (kpi.id === selectedConfigCriterion.kpiId) {
          return {
            ...kpi,
            criteria: kpi.criteria.map((c) => (c.id === updatedItem.id ? updatedItem : c)),
          };
        }
        return kpi;
      })
    );
    setHasUnsavedChanges(true);
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleRunValidation = () => {
    const res = validateTemplateClientSide(kpis);
    setValidationResult(res);
    setIsValidationModalOpen(true);
  };

  const handleSaveDraft = async () => {
    if (isReadOnly) return;
    await onSaveDraft(kpis, version.version);
    setHasUnsavedChanges(false);
    setLastSavedTime(new Date().toLocaleTimeString());
  };

  const handlePublishClick = () => {
    const res = validateTemplateClientSide(kpis);
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

  const existingCriterionIds = new Set(kpis.flatMap((k) => k.criteria.map((c) => c.criterion.id)));

  if (isLoading) return <LoadingSpinner label="Loading Template Workspace..." />;
  if (error) return <ErrorAlert error={error} onRetry={onBackToList} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f3f4f6' }}>
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
          isReadOnly={isReadOnly}
        />

        {/* Right-Side Canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.5rem' }}>
          {/* Weight Real-Time Validation Bar */}
          <div style={{ marginBottom: '1.25rem' }}>
            <WeightStatusBar
              totalWeight={configuredTotalWeight}
              hasConditionalApplicability={kpis.some(
                (k) => k.criteria.some((c) => c.applicableRoleIds?.length || c.applicableTeamIds?.length)
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
              SELECTED KPI GROUPS ({kpis.length})
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>
                Total Configured Weight: {configuredTotalWeight}%
              </span>
              
              {!isReadOnly && (
                <div style={{ position: 'relative' }}>
                  <Button size="sm" onClick={() => setIsKpiDropdownOpen(!isKpiDropdownOpen)}>
                    + Add KPI
                  </Button>
                  
                  {isKpiDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      width: 240,
                      zIndex: 10,
                      maxHeight: 200,
                      overflowY: 'auto',
                    }}>
                      {availableKpis.map(kpi => (
                        <div
                          key={kpi.kpiId}
                          onClick={() => handleAddKpi(kpi)}
                          style={{
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          {kpi.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Selected KPI Draggable List */}
          <SelectedKpiCanvas
            kpis={kpis}
            onKpiWeightChange={handleKpiWeightChange}
            onRemoveKpi={handleRemoveKpi}
            onCriterionWeightChange={handleCriterionWeightChange}
            onRemoveCriterion={handleRemoveCriterion}
            onConfigureCriterionClick={(kpiId, item) => {
              setSelectedConfigCriterion({ kpiId, criterion: item as any });
              setIsDrawerOpen(true);
            }}
            onCriterionDrop={(kpiId, criterion) => handleAddCriterionFromLibrary(criterion, kpiId)}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>

      {/* ── Slide-over Criterion Configuration Drawer ────────────────────────── */}
      <CriterionConfigDrawer
        criterionItem={selectedConfigCriterion?.criterion as any}
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
        version={version as any}
        templateName={template.name}
        onConfirm={handleConfirmPublish}
        onCancel={() => setIsPublishModalOpen(false)}
        isPending={isPublishPending}
      />

      <VersionHistoryDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        v1Kpis={version.kpis as any}
        v2Kpis={kpis as any}
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
