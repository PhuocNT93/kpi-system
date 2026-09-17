import React, { useState, useEffect, useMemo } from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import {
  X,
  Save,
  AlertTriangle,
  Sliders,
  Layers,
  Info,
} from 'lucide-react';
import type { EvaluationItem } from '../domain/evaluation-models';
import { getLocalizedText } from '../domain/evaluation-models';

interface OverrideScoreModalProps {
  isOpen: boolean;
  kpiList: EvaluationItem[];
  isSubmitting: boolean;
  onSubmit: (kpiId: string, manual_override_score: number, override_reason: string) => void;
  onClose: () => void;
  initialSelectedKpiId?: string;
}

interface CategoryInfo {
  id: string;
  name: string;
  totalCount: number;
  adjustedCount: number;
}

interface CriterionOption {
  criterionId: string;
  criterionCode: string;
  criterionName: string;
  ruleType: string;
  isAdjusted: boolean;
  items: EvaluationItem[];
}

const CATEGORY_NAMES: Record<string, string> = {
  PERFORMANCE: 'Hiệu suất (Performance)',
  CAPABILITY: 'Năng lực (Capability)',
  CONTRIBUTION: 'Đóng góp (Contribution)',
  GENERAL: 'Tiêu chí chung (General)',
};

export const OverrideScoreModal: React.FC<OverrideScoreModalProps> = ({
  isOpen,
  kpiList,
  isSubmitting,
  onSubmit,
  onClose,
  initialSelectedKpiId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCriterionCode, setSelectedCriterionCode] = useState<string>('');
  const [selectedKpiId, setSelectedKpiId] = useState<string>('');
  const [overrideScore, setOverrideScore] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Helper to resolve category for an item
  const getItemCategory = (item: EvaluationItem): string => {
    const rawCat = (item as unknown as Record<string, unknown>).category;
    if (rawCat) {
      return String(rawCat).toUpperCase();
    }
    const code = (item.criterion_code_snapshot || '').toUpperCase();
    if (code.startsWith('PERF') || code.includes('JOB') || code.includes('TASK') || code.includes('DELIVERY') || code.includes('QUALITY')) {
      return 'PERFORMANCE';
    }
    if (code.startsWith('CAP') || code.includes('SKILL') || code.includes('TECH') || code.includes('LEAD')) {
      return 'CAPABILITY';
    }
    if (code.startsWith('CONTRIB') || code.includes('CULTURE') || code.includes('TEAM') || code.includes('INITIATIVE')) {
      return 'CONTRIBUTION';
    }
    return (item.kpi_name_snapshot || 'GENERAL').toUpperCase();
  };

  // Helper to resolve rule type
  const getItemRuleType = (item: EvaluationItem): string => {
    const rule = item.scoring_rule_snapshot as Record<string, unknown> | undefined;
    return (rule?.rule_type || rule?.type || 'TIÊU CHUẨN') as string;
  };

  // 1. Group items by Category
  const categories = useMemo<CategoryInfo[]>(() => {
    const map = new Map<string, { total: number; adjusted: number }>();
    kpiList.forEach((item) => {
      const cat = getItemCategory(item);
      const isAdjusted = item.manual_override_score !== null && item.manual_override_score !== undefined;
      const current = map.get(cat) || { total: 0, adjusted: 0 };
      current.total += 1;
      if (isAdjusted) current.adjusted += 1;
      map.set(cat, current);
    });

    return Array.from(map.entries()).map(([id, stats]) => ({
      id,
      name: CATEGORY_NAMES[id] || id,
      totalCount: stats.total,
      adjustedCount: stats.adjusted,
    }));
  }, [kpiList]);

  // 2. Filter criteria & rule by selected Category
  const criteriaOptions = useMemo<CriterionOption[]>(() => {
    if (!selectedCategory) return [];

    const map = new Map<string, CriterionOption>();
    kpiList
      .filter((item) => getItemCategory(item) === selectedCategory)
      .forEach((item) => {
        const key = item.criterion_code_snapshot || item.evaluation_item_id;
        if (!map.has(key)) {
          const ruleType = getItemRuleType(item);
          map.set(key, {
            criterionId: item.evaluation_item_id,
            criterionCode: item.criterion_code_snapshot || 'N/A',
            criterionName: getLocalizedText(item.criterion_name_snapshot) || item.criterion_code_snapshot || 'Tiêu chí',
            ruleType,
            isAdjusted: item.manual_override_score !== null && item.manual_override_score !== undefined,
            items: [],
          });
        }
        const option = map.get(key)!;
        option.items.push(item);
        if (item.manual_override_score !== null && item.manual_override_score !== undefined) {
          option.isAdjusted = true;
        }
      });

    return Array.from(map.values());
  }, [kpiList, selectedCategory]);

  // 3. Filter KPIs by selected Criterion
  const kpiOptions = useMemo<EvaluationItem[]>(() => {
    if (!selectedCriterionCode) return [];
    const crit = criteriaOptions.find((c) => c.criterionCode === selectedCriterionCode);
    return crit ? crit.items : [];
  }, [criteriaOptions, selectedCriterionCode]);

  // Active selected item
  const selectedItem = useMemo(() => {
    return kpiList.find((i) => i.evaluation_item_id === selectedKpiId);
  }, [kpiList, selectedKpiId]);

  // Initialize or reset selections
  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialSelectedKpiId) {
        const initialItem = kpiList.find((i) => i.evaluation_item_id === initialSelectedKpiId);
        if (initialItem) {
          const cat = getItemCategory(initialItem);
          setSelectedCategory(cat);
          setSelectedCriterionCode(initialItem.criterion_code_snapshot || initialItem.evaluation_item_id);
          setSelectedKpiId(initialItem.evaluation_item_id);
          setOverrideScore(
            initialItem.manual_override_score !== null && initialItem.manual_override_score !== undefined
              ? String(initialItem.manual_override_score)
              : ''
          );
          setOverrideReason(initialItem.override_reason || '');
          return;
        }
      }

      // Default to first category
      if (categories.length > 0 && categories[0]) {
        setSelectedCategory(categories[0].id);
      }
      setSelectedCriterionCode('');
      setSelectedKpiId('');
      setOverrideScore('');
      setOverrideReason('');
    }
  }, [isOpen, initialSelectedKpiId, categories, kpiList]);

  // When category changes, auto-select first criterion
  useEffect(() => {
    if (selectedCategory && criteriaOptions.length > 0) {
      const firstCrit = criteriaOptions[0];
      if (firstCrit && (!selectedCriterionCode || !criteriaOptions.some((c) => c.criterionCode === selectedCriterionCode))) {
        setSelectedCriterionCode(firstCrit.criterionCode);
      }
    } else if (criteriaOptions.length === 0) {
      setSelectedCriterionCode('');
      setSelectedKpiId('');
    }
  }, [selectedCategory, criteriaOptions, selectedCriterionCode]);

  // When criterion changes, auto-select first KPI
  useEffect(() => {
    if (kpiOptions.length > 0) {
      const firstKpi = kpiOptions[0];
      if (firstKpi && (!selectedKpiId || !kpiOptions.some((k) => k.evaluation_item_id === selectedKpiId))) {
        setSelectedKpiId(firstKpi.evaluation_item_id);
        setOverrideScore(
          firstKpi.manual_override_score !== null && firstKpi.manual_override_score !== undefined
            ? String(firstKpi.manual_override_score)
            : ''
        );
        setOverrideReason(firstKpi.override_reason || '');
      }
    } else {
      setSelectedKpiId('');
      setOverrideScore('');
      setOverrideReason('');
    }
  }, [kpiOptions, selectedKpiId]);

  // When user picks a different KPI explicitly
  const handleKpiSelect = (kpiId: string) => {
    setSelectedKpiId(kpiId);
    const item = kpiList.find((i) => i.evaluation_item_id === kpiId);
    if (item) {
      setOverrideScore(
        item.manual_override_score !== null && item.manual_override_score !== undefined
          ? String(item.manual_override_score)
          : ''
      );
      setOverrideReason(item.override_reason || '');
    }
  };

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedKpiId) {
      setError('Vui lòng chọn KPI mục tiêu cần hiệu chỉnh.');
      return;
    }

    const scoreNum = Number(overrideScore);
    if (overrideScore === '' || isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setError('Điểm số hiệu chỉnh phải là số hợp lệ từ 0 đến 100 (%).');
      return;
    }

    if (!overrideReason.trim() || overrideReason.trim().length < 3) {
      setError('Lý do hiệu chỉnh là bắt buộc và phải có ít nhất 3 ký tự để phục vụ kiểm toán.');
      return;
    }

    onSubmit(selectedKpiId, scoreNum, overrideReason.trim());
  };

  const totalAdjustedInCycle = kpiList.filter(
    (i) => i.manual_override_score !== null && i.manual_override_score !== undefined
  ).length;

  // Live preview calculations
  const weightNum = selectedItem ? Number(selectedItem.weight_snapshot || selectedItem.kpi_weight_snapshot || 0) : 0;
  const originalRawScore = selectedItem?.raw_score ?? null;
  const newScoreNum = !isNaN(Number(overrideScore)) && overrideScore !== '' ? Number(overrideScore) : null;
  const newWeightedContribution = newScoreNum !== null ? Math.round((newScoreNum / 100) * weightNum * 100) / 100 : null;
  const originalWeightedContribution = originalRawScore !== null ? Math.round((originalRawScore / 100) * weightNum * 100) / 100 : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={!isSubmitting ? onClose : undefined}
    >
      <div
        style={{
          backgroundColor: COLORS.neutral.white,
          borderRadius: RADII['2xl'],
          width: '100%',
          maxWidth: '680px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: `1px solid ${COLORS.neutral[200]}`,
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: RADII.xl,
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sliders size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
                  Hiệu chỉnh điểm KPI
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: RADII.sm,
                    backgroundColor: totalAdjustedInCycle > 0 ? '#fef3c7' : '#f1f5f9',
                    color: totalAdjustedInCycle > 0 ? '#92400e' : '#64748b',
                    border: `1px solid ${totalAdjustedInCycle > 0 ? '#fde68a' : '#e2e8f0'}`,
                  }}
                >
                  {totalAdjustedInCycle}/{kpiList.length} KPI đã hiệu chỉnh
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                Chọn theo thứ tự: <strong>Category &gt; Critical &amp; Rule &gt; KPI</strong>. Điểm tổng sẽ được tính lại theo % trọng số.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: isSubmitting ? 'default' : 'pointer',
              color: COLORS.neutral[400],
              padding: '6px',
              borderRadius: RADII.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <form id="override-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Step 1: Category Selection */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 700, color: '#334155' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: 700 }}>1</span>
                  Chọn Category (Nhóm danh mục) <span style={{ color: '#ef4444' }}>*</span>
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                  {categories.length} nhóm
                </span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: RADII.lg,
                        border: `1.5px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: isSelected ? '#1d4ed8' : '#334155' }}>
                        {cat.name}
                      </div>
                      <div style={{ fontSize: '11px', color: isSelected ? '#3b82f6' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Layers size={12} />
                        {cat.totalCount} KPI {cat.adjustedCount > 0 && <span style={{ color: '#d97706', fontWeight: 600 }}>({cat.adjustedCount} đã chỉnh)</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Critical & Rule Selection */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 700, color: '#334155' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: 700 }}>2</span>
                  Chọn Critical &amp; Rule (Tiêu chí &amp; Quy tắc) <span style={{ color: '#ef4444' }}>*</span>
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                  {criteriaOptions.length} tiêu chí trong nhóm
                </span>
              </label>

              <select
                value={selectedCriterionCode}
                onChange={(e) => setSelectedCriterionCode(e.target.value)}
                disabled={isSubmitting || criteriaOptions.length === 0}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: RADII.lg,
                  border: `1.5px solid ${selectedCriterionCode ? '#3b82f6' : COLORS.neutral[300]}`,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  fontWeight: 600,
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              >
                {criteriaOptions.length === 0 && <option value="">Không có tiêu chí trong nhóm này</option>}
                {criteriaOptions.map((crit) => (
                  <option key={crit.criterionCode} value={crit.criterionCode}>
                    {crit.criterionName} ({crit.criterionCode}) • Quy tắc: [{crit.ruleType}] {crit.isAdjusted ? '★ [Đã hiệu chỉnh]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Target KPI Selection */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 700, color: '#334155' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: 700 }}>3</span>
                  Chọn KPI Mục tiêu (KPI) <span style={{ color: '#ef4444' }}>*</span>
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                  {kpiOptions.length} chỉ số
                </span>
              </label>

              {kpiOptions.length > 1 ? (
                <select
                  value={selectedKpiId}
                  onChange={(e) => handleKpiSelect(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: RADII.lg,
                    border: `1.5px solid ${selectedKpiId ? '#3b82f6' : COLORS.neutral[300]}`,
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    marginBottom: '10px',
                  }}
                >
                  {kpiOptions.map((kpi) => {
                    const isAdj = kpi.manual_override_score !== null && kpi.manual_override_score !== undefined;
                    return (
                      <option key={kpi.evaluation_item_id} value={kpi.evaluation_item_id}>
                        {kpi.kpi_name_snapshot || getLocalizedText(kpi.criterion_name_snapshot)} ({kpi.kpi_code_snapshot || kpi.criterion_code_snapshot}) - Trọng số: {kpi.weight_snapshot}% {isAdj ? `[Đã chỉnh: ${kpi.manual_override_score}%]` : `[Điểm gốc: ${kpi.raw_score ?? 'N/A'}]`}
                      </option>
                    );
                  })}
                </select>
              ) : null}

              {/* Selected KPI Context Card */}
              {selectedItem && (
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: RADII.xl,
                    backgroundColor: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b', fontWeight: 600 }}>
                        {selectedItem.kpi_code_snapshot || selectedItem.criterion_code_snapshot} &bull; Trọng số {weightNum}%
                      </div>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 700, color: '#0f172a' }}>
                        {selectedItem.kpi_name_snapshot || getLocalizedText(selectedItem.criterion_name_snapshot)}
                      </div>
                    </div>
                    {selectedItem.manual_override_score !== null && selectedItem.manual_override_score !== undefined ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: RADII.sm,
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fde68a',
                        }}
                      >
                        <Sliders size={12} />
                        Đang hiệu chỉnh: {selectedItem.manual_override_score}%
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: RADII.sm,
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        Chưa hiệu chỉnh
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Điểm tính toán gốc: </span>
                      <strong style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: '#334155' }}>
                        {selectedItem.raw_score !== null && selectedItem.raw_score !== undefined ? `${selectedItem.raw_score}%` : 'Chưa có'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Quy tắc tính: </span>
                      <strong style={{ fontSize: '11px', color: '#2563eb' }}>
                        {getItemRuleType(selectedItem)}
                      </strong>
                    </div>
                  </div>

                  {selectedItem.override_reason && (
                    <div style={{ fontSize: '11px', color: '#92400e', backgroundColor: '#fffbeb', padding: '6px 10px', borderRadius: RADII.md, border: '1px solid #fef3c7' }}>
                      <strong>Lý do điều chỉnh trước đó:</strong> {selectedItem.override_reason}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input New Score (%) & Reason */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#334155' }}>
                  Điểm hiệu chỉnh mới (0 - 100%) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(e.target.value)}
                  disabled={isSubmitting || !selectedKpiId}
                  placeholder="VD: 92.5"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: RADII.lg,
                    border: '1.5px solid #cbd5e1',
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#334155' }}>
                  Xem trước điểm đóng góp (Weighted %)
                </label>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: RADII.lg,
                    backgroundColor: newWeightedContribution !== null ? '#f0fdf4' : '#f8fafc',
                    border: `1.5px solid ${newWeightedContribution !== null ? '#86efac' : '#e2e8f0'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#475569' }}>
                    Đóng góp: {originalWeightedContribution !== null ? `(Gốc: ${originalWeightedContribution}%) → ` : ''}
                  </span>
                  <strong style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: newWeightedContribution !== null ? '#15803d' : '#94a3b8' }}>
                    {newWeightedContribution !== null ? `${newWeightedContribution}%` : '--'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Reason Textarea */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#334155' }}>
                Lý do hiệu chuẩn (Bắt buộc kiểm toán) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                disabled={isSubmitting || !selectedKpiId}
                placeholder="Nêu rõ căn cứ điều chỉnh: thành tích dự án đột xuất, lỗi ghi nhận hệ thống, hoặc cân bằng độ khó theo team..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: RADII.lg,
                  border: '1.5px solid #cbd5e1',
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            {/* Error banner */}
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: RADII.md,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${COLORS.neutral[200]}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Info size={14} /> Điểm tổng sẽ được hệ thống tính lại tức thì theo %
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 16px',
                borderRadius: RADII.lg,
                backgroundColor: COLORS.neutral.white,
                border: `1px solid ${COLORS.neutral[300]}`,
                color: COLORS.neutral.textPrimary,
                fontSize: TYPOGRAPHY.fontSize.sm,
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="override-form"
              disabled={isSubmitting || !selectedKpiId}
              style={{
                padding: '9px 20px',
                borderRadius: RADII.lg,
                backgroundColor: '#2563eb',
                border: 'none',
                color: COLORS.neutral.white,
                fontSize: TYPOGRAPHY.fontSize.sm,
                fontWeight: 600,
                cursor: isSubmitting || !selectedKpiId ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isSubmitting || !selectedKpiId ? 0.7 : 1,
              }}
            >
              <Save size={16} />
              {isSubmitting ? 'Đang lưu & tính lại...' : 'Lưu hiệu chỉnh & Tính lại'}
            </button>
          </div>
        </div>
      </div>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(16px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>
    </div>
  );
};
