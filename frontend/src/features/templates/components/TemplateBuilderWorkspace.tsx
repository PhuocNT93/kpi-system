import { useState, useEffect } from 'react';
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
import { KpiLibraryPanel } from './KpiLibraryPanel';
import { WeightStatusBar } from './WeightStatusBar';
import { CriterionConfigDrawer } from './CriterionConfigDrawer';
import { ValidationResultsModal } from './ValidationResultsModal';
import { PublishConfirmationModal } from './PublishConfirmationModal';
import { VersionHistoryDiffModal } from './VersionHistoryDiffModal';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { StatusBadge, LoadingSpinner, ErrorAlert } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import { fetchKpiCriteria } from '../../kpi/api/kpi-api';
import { fetchCriterionById } from '../../criteria/api/criteria-api';
import type { Kpi } from '../../kpi/api/kpi-api';
import type { TemplateKpi } from '../domain/template-models';

interface TemplateBuilderWorkspaceProps {
  template: EvaluationTemplate;
  version: EvaluationTemplateVersion;
  libraryCriteria: Criterion[];
  isLoading?: boolean;
  error?: unknown;
  onSaveDraft: (updatedKpis: TemplateKpi[], updatedCriteria: TemplateCriterion[], expectedVersion: number) => Promise<void>;
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
  const [kpis, setKpis] = useState<TemplateKpi[]>(version.kpis || []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const [validationResult, setValidationResult] = useState<TemplateValidationResult | null>(null);

  const [activeTab, setActiveTab] = useState<'kpi' | 'criterion'>('criterion');
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(null);

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
    setKpis(version.kpis || []);
    setHasUnsavedChanges(false);
  }, [version]);

  // Handle Optimistic Concurrency Lock error (409)
  useEffect(() => {
    if (saveError && (saveError as { status?: number }).status === 409) {
      setIsConflictModalOpen(true);
    }
  }, [saveError]);

  const scoringLegend = [
    '≤80% → 0-5',
    '85% → 6',
    '90% → 7',
    '95% → 8',
    '100% → 9',
    '110%+ → 10',
  ];

  const resolveCriterionCategory = async (criterionId: string): Promise<string> => {
    const fromLibrary = libraryCriteria.find((criterion) => criterion.id === criterionId)?.category;
    if (fromLibrary) return fromLibrary;

    try {
      const criterion = await fetchCriterionById(criterionId);
      return criterion.category;
    } catch {
      return '';
    }
  };

  type AutoMappedTemplateCriterion = TemplateCriterion & {
    criterionVersionId: string;
  };

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
      templateKpiId: '',
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
    setSelectedCriterionId(newCriterionItem.id);
    setHasUnsavedChanges(true);
  };

  const handleAddKpiFromLibrary = async (kpi: Kpi) => {
    if (isReadOnly) return;
    if (!selectedCriterionId) return;
    const selectedCriterionKpiIds = new Set(
      kpis.filter((item) => item.parentCriterionId === selectedCriterionId).map((item) => item.kpiId)
    );
    if (selectedCriterionKpiIds.has(kpi.kpiId)) return;
    const kpiId = `tkpi-${Date.now()}`;
    const newKpiItem: TemplateKpi = {
      id: kpiId,
      templateVersionId: version.id,
      kpiId: kpi.kpiId,
      parentCriterionId: selectedCriterionId,
      weight: 10,
      displayOrder: kpis.length + 1,
      kpi,
    };
    setKpis((prev) => [...prev, newKpiItem]);
    
    try {
      // Auto-populate with mapped criteria from global KPI library
      const mappedCriteria = await fetchKpiCriteria(kpi.kpiId);
      if (mappedCriteria && mappedCriteria.length > 0) {
        const newTemplateCriteria = (await Promise.all(mappedCriteria.map(async (mapping, idx: number): Promise<AutoMappedTemplateCriterion> => {
          const libraryCriterion = libraryCriteria.find((criterion) => criterion.id === mapping.criterionId);
          const category = libraryCriterion?.category || await resolveCriterionCategory(mapping.criterionId);

          return {
            id: `tcrit-${Date.now()}-${idx}`,
            templateVersionId: version.id,
            templateKpiId: kpiId,
            criterionVersionId: libraryCriterion?.currentVersion?.id || '',
            effectiveWeight: mapping.weight,
            applicableRoleIds: [],
            applicableTeamIds: [],
            isDisabled: false,
            isOptional: false,
            displayOrder: criteria.length + idx + 1,
            criterion: {
              id: mapping.criterionId,
              code: (mapping as { criterionCode?: string }).criterionCode || '',
              name: (mapping as { criterionName?: string }).criterionName || 'Unknown Criterion',
              category,
              status: 'ACTIVE' as const,
              version: 1,
              currentVersion: libraryCriterion?.currentVersion,
            },
          };
        }))).filter((criterion): criterion is AutoMappedTemplateCriterion => Boolean(criterion.criterionVersionId));
        
        setCriteria((prev) => [...prev, ...newTemplateCriteria]);
      }
    } catch (error) {
      console.error('Failed to fetch KPI criteria:', error);
    }
    
    setHasUnsavedChanges(true);
  };

  const handleKpiWeightChange = (id: string, newWeight: number) => {
    if (isReadOnly) return;
    setKpis((prev) => prev.map((item) => (item.id === id ? { ...item, weight: newWeight } : item)));
    setHasUnsavedChanges(true);
  };

  const handleSaveDrawerCriterion = (updatedItem: TemplateCriterion) => {
    if (isReadOnly) return;
    setCriteria((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
    setHasUnsavedChanges(true);
  };

  const handleRunValidation = () => {
    const res = validateTemplateClientSide(kpis, criteria);
    setValidationResult(res);
    setIsValidationModalOpen(true);
  };

  const handleSaveDraft = async () => {
    if (isReadOnly) return;
    try {
      const normalizedCriteria = criteria.map((criterion) => ({
        ...criterion,
        criterion: {
          ...criterion.criterion,
          category: criterion.criterion.category,
        },
      }));
      const normalizedKpis = kpis.map((kpi) => ({
        ...kpi,
        parentCriterionId: kpi.parentCriterionId || selectedCriterionId || undefined,
      }));
      await onSaveDraft(normalizedKpis, normalizedCriteria, version.version);
      setHasUnsavedChanges(false);
      setLastSavedTime(new Date().toLocaleTimeString());
    } catch {
      // save failed – keep hasUnsavedChanges true so publish stays disabled
    }
  };

  const handlePublishClick = () => {
    const res = validateTemplateClientSide(kpis, criteria);
    if (hasUnsavedChanges) {
      res.isValid = false;
      res.errors.unshift({
        code: 'UNSAVED_CHANGES',
        category: 'STATE',
        message: 'You have unsaved changes. Please click "Save Draft" first before publishing.',
      });
    }
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

  // Check ALL criteria (across all KPIs) to prevent duplicating same criterion in multiple KPIs
  const existingCriterionIds = new Set(criteria.map((c) => c.criterion?.id).filter(Boolean));
  const existingKpiIds = new Set(
    kpis.filter((kpi) => kpi.parentCriterionId === selectedCriterionId).map((k) => (k.kpi as { id?: string })?.id || k.kpiId)
  );
  const selectedCriterion = criteria.find((criterion) => criterion.id === selectedCriterionId) || null;
  const getCriterionKpiCount = (criterionId: string) =>
    kpis.filter((kpi) => kpi.parentCriterionId === criterionId).length;
  const getCriterionKpiTotal = (criterionId: string) =>
    Math.round(
      kpis
        .filter((kpi) => kpi.parentCriterionId === criterionId)
        .reduce((sum, kpi) => sum + (Number(kpi.weight) || 0), 0) * 100
    ) / 100;
  const criteriaTotalWeight = calculateConfiguredWeightTotal(criteria);
  const criteriaKpiTotals = criteria.map((criterion) => ({
    criterionId: criterion.id,
    criterionName: criterion.criterion.name,
    totalWeight: getCriterionKpiTotal(criterion.id),
  }));

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
          <div
            style={{
              marginTop: '0.625rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.375rem',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#0f766e',
                background: '#ccfbf1',
                border: '1px solid #99f6e4',
                borderRadius: 999,
                padding: '0.25rem 0.625rem',
              }}
            >
              KPI score model: achievement % → 0..10
            </span>
            {scoringLegend.map((item) => (
              <span
                key={item}
                style={{
                  fontSize: '0.6875rem',
                  color: '#4b5563',
                  background: '#f3f4f6',
                  borderRadius: 999,
                  padding: '0.2rem 0.55rem',
                }}
              >
                {item}
              </span>
            ))}
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

              <Button size="sm" onClick={handlePublishClick} disabled={isPublishPending || hasUnsavedChanges}>
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
        {/* Left-Side Library */}
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', background: '#ffffff', borderRight: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            <button
              onClick={() => setActiveTab('criterion')}
              style={{
                flex: 1, padding: '0.75rem', border: 'none', background: activeTab === 'criterion' ? '#ffffff' : '#f9fafb',
                borderBottom: activeTab === 'criterion' ? '2px solid #2563eb' : '2px solid transparent',
                fontWeight: activeTab === 'criterion' ? 700 : 500, color: activeTab === 'criterion' ? '#2563eb' : '#6b7280',
                cursor: 'pointer'
              }}
            >
              Criterion Library
            </button>
            <button
              onClick={() => setActiveTab('kpi')}
              style={{
                flex: 1, padding: '0.75rem', border: 'none', background: activeTab === 'kpi' ? '#ffffff' : '#f9fafb',
                borderBottom: activeTab === 'kpi' ? '2px solid #2563eb' : '2px solid transparent',
                fontWeight: activeTab === 'kpi' ? 700 : 500, color: activeTab === 'kpi' ? '#2563eb' : '#6b7280',
                cursor: 'pointer'
              }}
            >
              KPI Library
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'kpi' ? (
              <KpiLibraryPanel
                existingKpiIds={existingKpiIds}
                onAddKpi={handleAddKpiFromLibrary}
                selectedCriterionName={selectedCriterion?.criterion.name || null}
                hasSelectedCriterion={Boolean(selectedCriterionId)}
                isReadOnly={isReadOnly}
              />
            ) : (
              <div>
                  <CriterionLibraryPanel
                  criteria={libraryCriteria}
                  existingCriterionIds={existingCriterionIds}
                    onAddCriterion={handleAddCriterionFromLibrary}
                  isReadOnly={isReadOnly}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right-Side Canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.5rem' }}>
          {/* Weight Real-Time Validation Bar */}
          <div style={{ marginBottom: '1.25rem' }}>
            <WeightStatusBar
              criteriaTotalWeight={criteriaTotalWeight}
              validationResult={validationResult}
              criteriaKpiTotals={criteriaKpiTotals}
              hasConditionalApplicability={criteria.some(
                (c) => c.applicableRoleIds?.length || c.applicableTeamIds?.length
              )}
              scoringNote="Each KPI is scored through the % achievement curve before KPI and template weighting are applied."
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                  CRITERIA GROUPS ({criteria.length})
                </h3>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>
                  Total Weight: {criteria.reduce((acc, item) => acc + (Number(item.effectiveWeight) || 0), 0)}%
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {criteria.map((item, criterionIndex) => (
                  <div
                    key={item.id || item.criterion.id + criterionIndex}
                    style={{
                      background: '#ffffff',
                      border: item.isDisabled ? '1px dashed #d1d5db' : '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: '1rem',
                      opacity: item.isDisabled ? 0.6 : 1,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.625rem',
                      outline: selectedCriterion?.id === item.id ? '2px solid #2563eb' : 'none',
                    }}
                    onClick={() => setSelectedCriterionId(item.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <span style={{ fontSize: '1rem', color: '#9ca3af', userSelect: 'none' }}>⋮⋮</span>
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: '#2563eb',
                            color: '#ffffff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {criterionIndex + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827' }}>
                            {item.criterion.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {item.criterion.category}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <input
                          type="number"
                          value={item.effectiveWeight}
                          disabled={isReadOnly}
                          onChange={(e) => handleWeightChange(item.id, parseFloat(e.target.value) || 0)}
                          style={{
                            width: 64,
                            padding: '0.35rem 0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: 6,
                            fontSize: '0.9375rem',
                            fontWeight: 700,
                            textAlign: 'right',
                          }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#374151' }}>%</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          background: item.isOptional ? '#fef3c7' : '#d1fae5',
                          color: item.isOptional ? '#92400e' : '#065f46',
                          fontSize: '0.6875rem',
                          padding: '0.125rem 0.5rem',
                          borderRadius: 12,
                          fontWeight: 600,
                        }}
                      >
                        {item.isOptional ? 'Optional' : 'Required'}
                      </span>

                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>
                        {getCriterionKpiCount(item.id) > 0
                          ? `KPI total: ${getCriterionKpiTotal(item.id)} / 100% · ${getCriterionKpiCount(item.id)} KPI(s)`
                          : 'No KPI assigned yet'}
                      </span>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!isReadOnly && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedConfigCriterion(item);
                              setIsDrawerOpen(true);
                            }}
                          >
                            Configure
                          </Button>
                        )}
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemoveCriterion(item.id);
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#ef4444',
                              fontSize: '0.8125rem',
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedCriterion?.id === item.id && (
                      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' }}>
                        {kpis.filter((kpi) => kpi.parentCriterionId === item.id).length === 0 ? (
                          <div style={{ border: '1px dashed #d1d5db', borderRadius: 8, padding: '0.875rem', color: '#6b7280', fontSize: '0.875rem', textAlign: 'center' }}>
                            Chưa có KPI nào trong criteria này.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            {kpis
                              .filter((kpi) => kpi.parentCriterionId === item.id)
                              .map((kpi) => (
                                <div
                                  key={kpi.id}
                                  style={{
                                    background: '#f9fafb',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 8,
                                    padding: '0.875rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827' }}>
                                      {(kpi.kpi as { name?: string })?.name || 'Unknown KPI'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                      KPI code: {(kpi.kpi as { code?: string })?.code || kpi.kpiId}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <input
                                      type="number"
                                      value={kpi.weight}
                                      disabled={isReadOnly}
                                      onChange={(e) => handleKpiWeightChange(kpi.id, parseFloat(e.target.value) || 0)}
                                      style={{
                                        width: 64,
                                        padding: '0.35rem 0.5rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 6,
                                        fontSize: '0.9375rem',
                                        fontWeight: 700,
                                        textAlign: 'right',
                                      }}
                                    />
                                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#374151' }}>%</span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}

                        {!isReadOnly && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedCriterionId(item.id);
                                setActiveTab('kpi');
                              }}
                            >
                              Add KPI here
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
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
