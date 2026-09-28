import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calculator,
  Award,
  Shield,
  Save,
  Lock,
  Unlock,
  Building,
  Users,
  Plus,
  Trash2,
  Tag,
} from 'lucide-react';
import {
  formulaApi,
  type FormulaComponent,
  type FormulaSimulationResult,
  type CriterionCategoryEntity,
} from '../api/formula-api';
import { useTheme, RADII } from '../../../shared/theme';

interface Props {
  teamId?: string;
  teamName?: string;
  departmentId?: string;
  departmentName?: string;
  onFormulaUpdated?: () => void;
}

export const TeamFormulaBuilderTab: React.FC<Props> = ({
  teamId,
  teamName,
  departmentId,
  departmentName,
  onFormulaUpdated,
}) => {
  const { isDark } = useTheme();

  const isDepartmentScope = Boolean(departmentId && !teamId);
  const displayName = isDepartmentScope ? (departmentName || 'Phòng Ban') : (teamName || 'Team');

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isInherited, setIsInherited] = useState<boolean>(true);
  const [inheritedFrom, setInheritedFrom] = useState<'GLOBAL' | 'DEPARTMENT' | null>(null);
  const [parentDeptName, setParentDeptName] = useState<string | null>(departmentName || null);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [components, setComponents] = useState<FormulaComponent[]>([]);
  const [allCategories, setAllCategories] = useState<CriterionCategoryEntity[]>([]);

  // Simulator State
  const [simScores, setSimScores] = useState<Record<string, number>>({
    'Con.1': 5.0,
    'Con.2': 4.0,
    'Con.3': 4.0,
  });
  const [simSalary, setSimSalary] = useState<number>(35_000_000);
  const [simResult, setSimResult] = useState<FormulaSimulationResult | null>(null);

  // Fetch initial formula and categories
  const fetchFormula = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [formulaRes, catRes] = await Promise.all([
        teamId
          ? formulaApi.getTeamFormula(teamId)
          : departmentId
          ? formulaApi.getDepartmentFormula(departmentId)
          : formulaApi.getGlobalFormula(),
        formulaApi.getCategories(),
      ]);

      setIsInherited(formulaRes.isInherited);
      setInheritedFrom(formulaRes.inheritedFrom || (formulaRes.isInherited ? 'GLOBAL' : null));
      if (formulaRes.departmentName) setParentDeptName(formulaRes.departmentName);
      setIsCustomMode(!formulaRes.isInherited);
      setComponents(formulaRes.formula.components || []);
      setAllCategories(catRes || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải cấu hình công thức';
      setFeedback({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [teamId, departmentId]);

  useEffect(() => {
    fetchFormula();
  }, [fetchFormula]);

  // Refresh category list when a new category is created elsewhere (e.g. Criteria Studio)
  useEffect(() => {
    const handleCategoryCreated = () => {
      formulaApi.getCategories().then((cats) => {
        if (cats) setAllCategories(cats);
      }).catch(() => {/* silently ignore */});
    };
    window.addEventListener('category-created', handleCategoryCreated);
    return () => window.removeEventListener('category-created', handleCategoryCreated);
  }, []);

  // Helper: Match component with category
  const matchCategoryWithComponent = useCallback((cat: CriterionCategoryEntity, comp: FormulaComponent): boolean => {
    const catCode = (cat.code || '').toUpperCase();
    const compCode = (comp.code || '').toUpperCase();
    const compName = (comp.name || '').toUpperCase();
    const catName = (cat.name || '').toUpperCase();

    if (catCode === compCode) return true;
    if (compName.includes(catCode) || catName.includes(compCode)) return true;

    if (catCode === 'PERFORMANCE' && (compCode === 'CON.1' || compName.includes('PERFORMANCE'))) return true;
    if (catCode === 'CAPABILITY' && (compCode === 'CON.2' || compName.includes('CAPABILITY'))) return true;
    if (catCode === 'CONTRIBUTION' && (compCode === 'CON.3' || compName.includes('CONTRIBUTION'))) return true;

    return false;
  }, []);

  const findCategoryForComponent = useCallback((comp: FormulaComponent) => {
    return allCategories.find((cat) => matchCategoryWithComponent(cat, comp));
  }, [allCategories, matchCategoryWithComponent]);

  // Unassigned categories (created in studio or system, not yet in formula)
  const unassignedCategories = useMemo(() => {
    return allCategories.filter((cat) => {
      return !components.some((comp) => matchCategoryWithComponent(cat, comp));
    });
  }, [allCategories, components, matchCategoryWithComponent]);

  // Total weight calculation & validation
  const totalWeight = useMemo(() => {
    return components.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  }, [components]);

  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  // Auto-balance: distribute 100% evenly across active (non-inactive) components
  const handleAutoBalance = () => {
    if (!isCustomMode || components.length === 0) return;
    const activeCount = components.length;
    const equalShare = Math.floor((100 / activeCount) * 10) / 10;
    const remainder = Number((100 - equalShare * activeCount).toFixed(1));
    setComponents((prev) =>
      prev.map((comp, idx) => ({
        ...comp,
        weight: idx === prev.length - 1 ? equalShare + remainder : equalShare,
      }))
    );
    setFeedback({
      type: 'success',
      message: `Đã phân bổ đều trọng số: mỗi thành phần ~${equalShare}%, tổng = 100%.`,
    });
  };

  // Handle adding an unassigned category to components
  const handleAddComponent = (cat: CriterionCategoryEntity) => {
    if (cat.status === 'INACTIVE') {
      alert(`Danh mục "${cat.name}" đang bị vô hiệu hóa trong hệ thống, không thể thêm vào công thức.`);
      return;
    }
    // Auto-enable custom mode if not already active
    if (!isCustomMode) {
      setIsCustomMode(true);
    }
    const newComp: FormulaComponent = {
      code: cat.code,
      name: cat.name,
      weight: 0,
      source_type: 'MANUAL_RATING',
      scale_max: 5.0,
      description: cat.description || `Đánh giá theo danh mục ${cat.name}`,
    };
    setComponents((prev) => [...prev, newComp]);
    setSimScores((prev) => ({ ...prev, [cat.code]: 4.0 }));
    setFeedback({
      type: 'success',
      message: `Đã thêm danh mục "${cat.name}" vào công thức với trọng số khởi tạo 0%. Nhấn "Phân bổ đều" hoặc điều chỉnh thanh trượt để tổng trọng số đạt 100%.`,
    });
  };

  // Handle removing a non-system component
  const handleRemoveComponent = (compIndex: number) => {
    if (!isCustomMode) return;
    const comp = components[compIndex];
    const cat = findCategoryForComponent(comp);
    if (cat?.is_system) {
      alert('Không thể xóa danh mục cốt lõi của hệ thống (System Category). Bạn có thể đặt trọng số về 0% nếu không muốn tính điểm.');
      return;
    }
    setComponents((prev) => prev.filter((_, idx) => idx !== compIndex));
  };

  // Handle weight change for a component
  const handleWeightChange = (index: number, newWeight: number) => {
    if (!isCustomMode) return;
    const next = [...components];
    const comp = { ...next[index], weight: Math.max(0, Math.min(100, newWeight)) };

    // Proportionally adjust sub-criteria if present
    if (comp.sub_criteria && comp.sub_criteria.length > 0) {
      const equalShare = Number((comp.weight / comp.sub_criteria.length).toFixed(1));
      comp.sub_criteria = comp.sub_criteria.map((sub, i) => ({
        ...sub,
        weight: i === comp.sub_criteria!.length - 1
          ? Number((comp.weight - equalShare * (comp.sub_criteria!.length - 1)).toFixed(1))
          : equalShare,
      }));
    }

    next[index] = comp;
    setComponents(next);
  };

  // Handle sub-criteria weight change
  const handleSubWeightChange = (compIndex: number, subIndex: number, newWeight: number) => {
    if (!isCustomMode) return;
    const next = [...components];
    const comp = { ...next[compIndex] };
    if (!comp.sub_criteria) return;

    const subs = [...comp.sub_criteria];
    subs[subIndex] = { ...subs[subIndex], weight: Math.max(0, newWeight) };
    comp.sub_criteria = subs;
    next[compIndex] = comp;
    setComponents(next);
  };

  // Run Simulator
  const runSimulation = useCallback(async () => {
    try {
      const res = await formulaApi.simulate({
        teamId,
        departmentId,
        components,
        scores: simScores,
        currentSalary: simSalary,
      });
      setSimResult(res);
    } catch {
      // Fallback local calculation
      let score = 0;
      components.forEach((c) => {
        score += (simScores[c.code] ?? 0) * (c.weight / 100);
      });
      score = Number(score.toFixed(2));
      const rank = score >= 4.5 ? 'S' : score >= 3.0 ? 'A' : 'B';
      const tier = simSalary < 30_000_000 ? '<30m' : simSalary < 50_000_000 ? '30m-50m' : '>=50m';
      const raiseRange = rank === 'S' ? [10, 15] : rank === 'A' ? [4, 8] : [0, 2];

      setSimResult({
        final_score: score,
        scale_max: 5.0,
        rank,
        rank_label: rank === 'S' ? 'Exceed Expectation' : rank === 'A' ? 'Meet Expectation' : 'Need Improvement',
        breakdown: components.map((c) => ({
          code: c.code,
          name: c.name,
          raw_score: simScores[c.code] ?? 0,
          weight_percent: c.weight,
          contribution: Number(((simScores[c.code] ?? 0) * (c.weight / 100)).toFixed(2)),
        })),
        salary_recommendation: {
          salary_tier: tier,
          min_percent: raiseRange[0],
          max_percent: raiseRange[1],
          ceiling_action: rank === 'S' ? 'ONE_TIME_BONUS' : 'FREEZE',
          ceiling_note: rank === 'S'
            ? 'Lương sẽ bị đóng băng nếu chạm trần. Xem xét one-time bonus cho member loại S.'
            : 'Lương sẽ bị đóng băng nếu lương của member chạm mức trần.',
        },
      });
    }
  }, [teamId, departmentId, components, simScores, simSalary]);

  useEffect(() => {
    if (components.length > 0) {
      runSimulation();
    }
  }, [components, simScores, simSalary, runSimulation]);

  // Save formula
  const handleSave = async () => {
    if (!isWeightValid) {
      setFeedback({ type: 'error', message: 'Tổng trọng số phải đúng 100% trước khi lưu.' });
      return;
    }

    // Validate that no component belongs to an inactive category if weight > 0
    for (const comp of components) {
      const cat = findCategoryForComponent(comp);
      if (cat?.status === 'INACTIVE' && Number(comp.weight || 0) > 0) {
        setFeedback({
          type: 'error',
          message: `Danh mục "${comp.name}" đã bị vô hiệu hóa trong hệ thống. Vui lòng chuyển trọng số về 0% hoặc xóa khỏi công thức trước khi lưu.`,
        });
        return;
      }
    }

    setSaving(true);
    setFeedback(null);
    try {
      if (teamId) {
        await formulaApi.saveTeamFormula(teamId, {
          components,
          isCustomOverride: true,
          scaleMax: 5.0,
        });
        setIsInherited(false);
        setIsCustomMode(true);
        setFeedback({
          type: 'success',
          message: `Đã lưu công thức đánh giá riêng cho Team ${displayName}! Áp dụng cho TOÀN BỘ THÀNH VIÊN thuộc team này.`,
        });
      } else if (departmentId) {
        await formulaApi.saveDepartmentFormula(departmentId, {
          components,
          isCustomOverride: true,
          scaleMax: 5.0,
        });
        setIsInherited(false);
        setIsCustomMode(true);
        setFeedback({
          type: 'success',
          message: `Đã lưu công thức đánh giá riêng cho Phòng ban ${displayName}! Áp dụng cho TOÀN BỘ CÁC TEAM trực thuộc phòng ban (trừ các team có công thức riêng).`,
        });
      } else {
        await formulaApi.saveGlobalFormula({
          components,
          scaleMax: 5.0,
        });
        setFeedback({
          type: 'success',
          message: `Đã lưu công thức đánh giá mặc định toàn công ty thành công!`,
        });
      }
      onFormulaUpdated?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi lưu công thức';
      setFeedback({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  // Reset to inherited
  const handleReset = async () => {
    const confirmMsg = isDepartmentScope
      ? `Bạn có chắc chắn muốn hủy công thức riêng của Phòng ban ${displayName} và quay lại kế thừa mặc định công ty?`
      : `Bạn có chắc chắn muốn hủy công thức riêng của Team ${displayName} và quay lại kế thừa ${inheritedFrom === 'DEPARTMENT' ? `từ phòng ban ${parentDeptName || ''}` : 'mặc định công ty'}?`;

    if (!window.confirm(confirmMsg)) return;

    setResetting(true);
    setFeedback(null);
    try {
      let res;
      if (teamId) {
        res = await formulaApi.resetTeamFormula(teamId);
      } else if (departmentId) {
        res = await formulaApi.resetDepartmentFormula(departmentId);
      }
      if (res) {
        setIsInherited(res.isInherited);
        setInheritedFrom(res.inheritedFrom || 'GLOBAL');
        setIsCustomMode(false);
        setComponents(res.formula.components || []);
      }
      setFeedback({
        type: 'success',
        message: `Đã hủy công thức riêng. ${displayName} hiện sử dụng công thức kế thừa thành công.`,
      });
      onFormulaUpdated?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi hoàn tác về mặc định';
      setFeedback({ type: 'error', message });
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: isDark ? '#94a3b8' : '#64748b' }}>
        Đang tải cấu hình công thức đánh giá của {displayName}...
      </div>
    );
  }

  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1100px' }}>
      {/* ── Section 1: Top Identity & Ownership Header ───────────────────────── */}
      <div
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: RADII.xl,
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isDepartmentScope ? (
                <Building size={24} color={isDark ? '#38bdf8' : '#0284c7'} />
              ) : (
                <Users size={24} color={isDark ? '#818cf8' : '#4f46e5'} />
              )}
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: textColor }}>
                  {isDepartmentScope ? `Công thức Đánh giá — Phòng ban: ${displayName}` : `Công thức Đánh giá — Team: ${displayName}`}
                </h2>
                <div style={{ fontSize: '0.75rem', color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                  {isDepartmentScope
                    ? `PHÒNG BAN: ${displayName} (Áp dụng cho TOÀN BỘ CÁC TEAM trực thuộc)`
                    : `TEAM: ${displayName} (Áp dụng cho TOÀN BỘ THÀNH VIÊN của team)`}
                </div>
              </div>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: subTextColor }}>
              {isDepartmentScope
                ? `Cấu hình tỷ trọng công thức áp dụng cho tất cả các team thuộc phòng ban ${displayName}. Nếu team nào có công thức riêng, công thức của team đó sẽ được ưu tiên.`
                : `Cấu hình tỷ trọng công thức tính điểm và đề xuất tăng lương riêng cho tất cả thành viên của Team ${displayName}.`}
            </p>
          </div>

          {/* Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {!isInherited ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: RADII.md,
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5',
                  color: isDark ? '#6ee7b7' : '#047857',
                  border: `1px solid ${isDark ? '#059669' : '#a7f3d0'}`,
                }}
              >
                <Award size={15} />
                ⭐ Công thức riêng của {isDepartmentScope ? `Phòng ban ${displayName}` : `Team ${displayName}`}
              </span>
            ) : inheritedFrom === 'DEPARTMENT' ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: RADII.md,
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  backgroundColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#f0f9ff',
                  color: isDark ? '#38bdf8' : '#0369a1',
                  border: `1px solid ${isDark ? '#0284c7' : '#bae6fd'}`,
                }}
              >
                <Building size={15} />
                🏢 Kế thừa từ Phòng ban {parentDeptName || 'Engineering'}
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: RADII.md,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                  color: isDark ? '#93c5fd' : '#1d4ed8',
                  border: `1px solid ${isDark ? '#2563eb' : '#bfdbfe'}`,
                }}
              >
                <Shield size={15} />
                🛡️ Kế thừa mặc định của toàn công ty
              </span>
            )}
          </div>
        </div>

        {/* Feedback alert message */}
        {feedback && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 18px',
              borderRadius: RADII.md,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: feedback.type === 'success' ? (isDark ? '#064e3b' : '#f0fdf4') : (isDark ? '#7f1d1d' : '#fef2f2'),
              border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#f87171'}`,
              color: feedback.type === 'success' ? (isDark ? '#a7f3d0' : '#15803d') : (isDark ? '#fca5a5' : '#b91c1c'),
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* ── Section 2: Banner & Unlock Custom Mode ───────────────────────────── */}
      {isInherited && !isCustomMode && (
        <div
          style={{
            border: `1px solid ${isDark ? '#1e40af' : '#bfdbfe'}`,
            borderRadius: RADII.xl,
            padding: '24px',
            background: isDark
              ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.6) 100%)'
              : 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} color={isDark ? '#60a5fa' : '#2563eb'} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: textColor }}>
              {isDepartmentScope
                ? `Phòng ban ${displayName} chưa có công thức đánh giá riêng`
                : `Team ${displayName} chưa có công thức đánh giá riêng`}
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: subTextColor, lineHeight: 1.5 }}>
            {isDepartmentScope ? (
              <>
                Hiện tại các team trong phòng ban <strong>{displayName}</strong> đang áp dụng công thức mặc định toàn công ty. Bạn có thể nhấn nút dưới đây để tạo công thức riêng cho phòng ban <strong>{displayName}</strong> (công thức này sẽ tự động apply cho toàn bộ các team trong phòng ban).
              </>
            ) : (
              <>
                Hiện tại các thành viên thuộc team <strong>{displayName}</strong> đang kế thừa{' '}
                {inheritedFrom === 'DEPARTMENT' ? (
                  <strong>công thức của phòng ban {parentDeptName || 'Engineering'}</strong>
                ) : (
                  <strong>công thức mặc định chung của toàn công ty</strong>
                )}. Bạn có thể nhấn nút dưới đây để tạo công thức riêng biệt áp dụng cho riêng team <strong>{displayName}</strong>.
              </>
            )}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={() => setIsCustomMode(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 26px',
                borderRadius: RADII.lg,
                backgroundColor: isDepartmentScope ? (isDark ? '#0284c7' : '#0369a1') : (isDark ? '#2563eb' : '#1d4ed8'),
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              <Sparkles size={18} />
              {isDepartmentScope
                ? `Bật & Tạo Công Thức Cho Phòng Ban ${displayName}`
                : `Bật & Tạo Công Thức Riêng Cho Team ${displayName}`}
            </button>
            <span style={{ fontSize: '0.8125rem', color: subTextColor, fontStyle: 'italic' }}>
              (Nhấn nút để mở khóa và điều chỉnh trọng số)
            </span>
          </div>
        </div>
      )}

      {isCustomMode && isInherited && (
        <div
          style={{
            border: `1px solid ${isDark ? '#2563eb' : '#93c5fd'}`,
            borderRadius: RADII.lg,
            padding: '16px 20px',
            backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Unlock size={18} color="#2563eb" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: isDark ? '#93c5fd' : '#1e40af' }}>
              ⚡ Bạn đang ở chế độ tùy biến công thức cho <strong>{displayName}</strong>. Điều chỉnh thanh trượt trọng số (tổng = 100%), kiểm tra mô phỏng trực tiếp, sau đó nhấn <strong>"Lưu Công Thức"</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCustomMode(false);
              fetchFormula();
            }}
            style={{
              padding: '6px 14px',
              borderRadius: RADII.md,
              fontSize: '0.8125rem',
              fontWeight: 600,
              backgroundColor: 'transparent',
              border: `1px solid ${isDark ? '#3b82f6' : '#93c5fd'}`,
              color: isDark ? '#93c5fd' : '#1d4ed8',
              cursor: 'pointer',
            }}
          >
            Hủy chế độ tạo riêng
          </button>
        </div>
      )}

      {!isInherited && (
        <div
          style={{
            border: `1px solid ${isDark ? '#059669' : '#a7f3d0'}`,
            borderRadius: RADII.lg,
            padding: '16px 20px',
            backgroundColor: isDark ? 'rgba(5, 150, 105, 0.12)' : '#ecfdf5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={20} color="#059669" />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#6ee7b7' : '#065f46' }}>
                ⭐ {isDepartmentScope ? `PHÒNG BAN ${displayName.toUpperCase()} ĐANG ÁP DỤNG CÔNG THỨC RIÊNG` : `TEAM ${displayName.toUpperCase()} ĐANG ÁP DỤNG CÔNG THỨC RIÊNG`}
              </div>
              <div style={{ fontSize: '0.8125rem', color: isDark ? '#a7f3d0' : '#047857', marginTop: '2px' }}>
                {isDepartmentScope
                  ? `Công thức này sẽ áp dụng cho tất cả các team trong phòng ban ${displayName} (trừ những team có công thức riêng).`
                  : `Công thức này áp dụng cho toàn bộ thành viên thuộc team ${displayName}.`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: RADII.md,
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
              color: isDark ? '#f87171' : '#dc2626',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: resetting ? 'not-allowed' : 'pointer',
            }}
          >
            <RotateCcw size={14} />
            {resetting ? 'Đang hoàn tác...' : 'Hủy công thức riêng (Về kế thừa)'}
          </button>
        </div>
      )}

      {/* ── Section 3: Weight Validation Progress Bar ─────────────────────────── */}
      <div
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: RADII.xl,
          padding: '16px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: textColor }}>
            Tổng Trọng Số Cấu Hình Cho {displayName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isCustomMode && !isWeightValid && components.length > 0 && (
              <button
                type="button"
                onClick={handleAutoBalance}
                title="Phân bổ đều 100% cho tất cả thành phần"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 12px',
                  borderRadius: RADII.md,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  backgroundColor: isDark ? 'rgba(234,88,12,0.18)' : '#fff7ed',
                  border: `1px solid ${isDark ? '#ea580c' : '#fed7aa'}`,
                  color: isDark ? '#fb923c' : '#c2410c',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Calculator size={13} />
                Phân bổ đều (÷{components.length})
              </button>
            )}
            <span
              style={{
                fontSize: '0.875rem',
                fontWeight: 700,
                color: isWeightValid ? '#16a34a' : totalWeight > 100 ? '#dc2626' : '#ea580c',
              }}
            >
              {totalWeight}% / 100% {isWeightValid ? '✅ (Hợp lệ)' : '⚠️ (Cần đúng 100%)'}
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: '10px', backgroundColor: isDark ? '#334155' : '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(100, totalWeight)}%`,
              height: '100%',
              backgroundColor: isWeightValid ? '#16a34a' : totalWeight > 100 ? '#dc2626' : '#f59e0b',
              transition: 'width 0.3s ease, background-color 0.3s ease',
            }}
          />
        </div>
        {isCustomMode && !isWeightValid && (
          <div style={{ marginTop: '6px', fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b' }}>
            💡 Tip: Nhấn <strong>"Phân bổ đều"</strong> để chia đều {(100 / (components.length || 1)).toFixed(1)}% cho mỗi thành phần, hoặc kéo thanh trượt thủ công.
          </div>
        )}
      </div>

      {/* ── Section 4: Component Cards (Con.1, Con.2, Con.3) ─────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: textColor }}>
            Các Thành Phần Đánh Giá (Evaluation Components) — {displayName}
          </h3>
          {!isCustomMode && (
            <span style={{ fontSize: '0.8125rem', color: isDark ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={13} />
              Đang ở chế độ xem trước kế thừa
            </span>
          )}
        </div>

        {components.map((comp, idx) => {
          const cat = findCategoryForComponent(comp);
          const isCatInactive = cat?.status === 'INACTIVE';
          const isSystemCat = Boolean(cat?.is_system);

          return (
            <div
              key={comp.code}
              style={{
                backgroundColor: cardBg,
                border: isCatInactive
                  ? `1px solid ${isDark ? '#ef4444' : '#f87171'}`
                  : `1px solid ${borderColor}`,
                borderRadius: RADII.xl,
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                opacity: isCustomMode ? 1 : 0.85,
              }}
            >
              {/* Inactive Category Warning Banner */}
              {isCatInactive && (
                <div
                  style={{
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                    border: '1px solid #ef4444',
                    borderRadius: RADII.md,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: isDark ? '#fca5a5' : '#b91c1c',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                  }}
                >
                  <AlertTriangle size={18} color="#ef4444" />
                  <span>
                    ⚠️ Danh mục <strong>{comp.name}</strong> đã bị <strong>VÔ HIỆU HÓA</strong> trong hệ thống. Để lưu công thức, bạn phải chuyển trọng số về <strong>0%</strong> hoặc gỡ khỏi công thức.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '0.875rem',
                        padding: '3px 8px',
                        borderRadius: RADII.sm,
                        backgroundColor: isCatInactive ? '#fee2e2' : idx === 0 ? '#eff6ff' : idx === 1 ? '#f5f3ff' : '#ecfdf5',
                        color: isCatInactive ? '#dc2626' : idx === 0 ? '#1d4ed8' : idx === 1 ? '#6d28d9' : '#047857',
                        border: `1px solid ${isCatInactive ? '#fca5a5' : idx === 0 ? '#bfdbfe' : idx === 1 ? '#ddd6fe' : '#a7f3d0'}`,
                      }}
                    >
                      {comp.code}
                    </span>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: textColor }}>
                      {comp.name}
                    </h4>
                    {isCatInactive && (
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          color: '#dc2626',
                          backgroundColor: isDark ? 'rgba(220, 38, 38, 0.2)' : '#fee2e2',
                          border: '1px solid #f87171',
                          padding: '2px 8px',
                          borderRadius: RADII.sm,
                        }}
                      >
                        ĐÃ BỊ VÔ HIỆU HÓA
                      </span>
                    )}
                  </div>
                  {comp.description && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: subTextColor }}>
                      {comp.description}
                    </p>
                  )}
                </div>

                {/* Right controls: Weight Controller & Optional Remove */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: textColor }}>
                      Trọng số:
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={comp.weight}
                      disabled={!isCustomMode}
                      onChange={(e) => handleWeightChange(idx, Number(e.target.value))}
                      style={{ width: '130px', cursor: isCustomMode ? 'pointer' : 'not-allowed' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={comp.weight}
                        disabled={!isCustomMode}
                        onChange={(e) => handleWeightChange(idx, Number(e.target.value))}
                        style={{
                          width: '60px',
                          padding: '6px 8px',
                          borderRadius: RADII.md,
                          border: `1px solid ${borderColor}`,
                          backgroundColor: isDark ? '#0f172a' : '#fff',
                          color: textColor,
                          fontWeight: 700,
                          textAlign: 'center',
                          cursor: isCustomMode ? 'text' : 'not-allowed',
                        }}
                      />
                      <span style={{ fontWeight: 700, color: subTextColor }}>%</span>
                    </div>
                  </div>

                  {/* Remove button for non-system custom categories */}
                  {!isSystemCat && isCustomMode && (
                    <button
                      type="button"
                      onClick={() => handleRemoveComponent(idx)}
                      title="Gỡ danh mục khỏi công thức"
                      style={{
                        background: 'transparent',
                        border: `1px solid ${borderColor}`,
                        cursor: 'pointer',
                        color: isDark ? '#94a3b8' : '#64748b',
                        padding: '6px 12px',
                        borderRadius: RADII.md,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.borderColor = '#ef4444';
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = isDark ? '#94a3b8' : '#64748b';
                        e.currentTarget.style.borderColor = borderColor;
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Trash2 size={15} />
                      <span>Gỡ</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-criteria for Con.3 if present */}
              {comp.sub_criteria && comp.sub_criteria.length > 0 && (
                <div
                  style={{
                    marginTop: '4px',
                    padding: '14px 18px',
                    borderRadius: RADII.lg,
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    border: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`,
                  }}
                >
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: textColor, marginBottom: '10px' }}>
                    Tiêu chí con (Sub-criteria) bên trong {comp.code}:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    {comp.sub_criteria.map((sub, subIdx) => (
                      <div
                        key={sub.code}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: RADII.md,
                          backgroundColor: cardBg,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        <span style={{ fontSize: '0.8125rem', color: textColor, fontWeight: 500 }}>
                          {sub.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={sub.weight}
                            disabled={!isCustomMode}
                            onChange={(e) => handleSubWeightChange(idx, subIdx, Number(e.target.value))}
                            style={{
                              width: '50px',
                              padding: '4px 6px',
                              borderRadius: RADII.sm,
                              border: `1px solid ${borderColor}`,
                              backgroundColor: isDark ? '#0f172a' : '#fff',
                              color: textColor,
                              fontWeight: 700,
                              textAlign: 'center',
                              fontSize: '0.8125rem',
                              cursor: isCustomMode ? 'text' : 'not-allowed',
                            }}
                          />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: subTextColor }}>%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Section: Available Categories from System (Sync) ── */}
        {unassignedCategories.length > 0 && (
          <div
            style={{
              backgroundColor: cardBg,
              border: `1px dashed ${borderColor}`,
              borderRadius: RADII.xl,
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={18} color={isDark ? '#38bdf8' : '#0284c7'} />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: textColor }}>
                  Danh Mục Khả Dụng Trong Hệ Thống (Đồng Bộ Từ Studio)
                </h4>
              </div>
              <span style={{ fontSize: '0.75rem', color: subTextColor }}>
                {unassignedCategories.length} danh mục chưa được thêm vào công thức
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: subTextColor }}>
              Các danh mục này đã được định nghĩa trong hệ thống nhưng chưa nằm trong công thức của {displayName}. Khi thêm vào, trọng số khởi tạo sẽ là 0% để không làm thay đổi kết quả các công thức hiện tại.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {unassignedCategories.map((cat) => {
                const isInactive = cat.status === 'INACTIVE';
                return (
                  <div
                    key={cat.code}
                    style={{
                      padding: '14px 16px',
                      borderRadius: RADII.lg,
                      border: `1px solid ${isInactive ? (isDark ? '#7f1d1d' : '#fecaca') : borderColor}`,
                      backgroundColor: isInactive ? (isDark ? 'rgba(127, 29, 29, 0.1)' : '#fff5f5') : (isDark ? '#0f172a' : '#f8fafc'),
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            padding: '2px 6px',
                            borderRadius: RADII.sm,
                            backgroundColor: isInactive ? '#fee2e2' : (isDark ? '#1e293b' : '#e2e8f0'),
                            color: isInactive ? '#dc2626' : (isDark ? '#94a3b8' : '#475569'),
                          }}
                        >
                          {cat.code}
                        </span>
                        {isInactive && (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#dc2626' }}>
                            VÔ HIỆU HÓA
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: textColor, marginTop: '8px' }}>
                        {cat.name}
                      </div>
                      {cat.description && (
                        <div style={{ fontSize: '0.75rem', color: subTextColor, marginTop: '4px', lineHeight: 1.4 }}>
                          {cat.description}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isInactive}
                      onClick={() => handleAddComponent(cat)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: RADII.md,
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        backgroundColor: !isInactive ? (isDark ? '#2563eb' : '#3b82f6') : (isDark ? '#334155' : '#e2e8f0'),
                        color: !isInactive ? '#fff' : (isDark ? '#64748b' : '#94a3b8'),
                        border: 'none',
                        cursor: !isInactive ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s ease',
                      }}
                      title={isInactive ? 'Danh mục đã bị vô hiệu hóa, không thể thêm' : !isCustomMode ? 'Nhấn để tự động bật chế độ tạo công thức riêng và thêm danh mục này' : 'Thêm vào công thức'}
                    >
                      <Plus size={14} />
                      {!isCustomMode ? '+ Thêm (tự bật custom)' : '+ Thêm vào công thức'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Section 5: Live Interactive Simulator ─────────────────────────────── */}
      <div
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: RADII.xl,
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Calculator size={20} color={isDark ? '#818cf8' : '#4f46e5'} />
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: textColor }}>
            Mô Phỏng Tính Điểm — {displayName}
          </h3>
        </div>
        <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: subTextColor }}>
          Thử nghiệm nhập điểm số các tiêu chí để kiểm tra xếp loại Rank (S / A / B) và mức đề xuất tăng lương theo trọng số đang thiết lập của <strong>{displayName}</strong>.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Inputs Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {components.map((c) => (
              <div key={c.code} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ fontWeight: 600, color: textColor }}>
                    {c.code} - {c.name} ({c.weight}%)
                  </span>
                  <span style={{ fontWeight: 800, color: isDark ? '#818cf8' : '#4f46e5' }}>
                    {(simScores[c.code] ?? 0).toFixed(1)} / 5.0
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5.0"
                  step="0.1"
                  value={simScores[c.code] ?? 0}
                  onChange={(e) =>
                    setSimScores((prev) => ({ ...prev, [c.code]: Number(e.target.value) }))
                  }
                  style={{ cursor: 'pointer' }}
                />
              </div>
            ))}

            <div style={{ marginTop: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: textColor, marginBottom: '6px' }}>
                Mức lương hiện tại của member:
              </label>
              <select
                value={simSalary}
                onChange={(e) => setSimSalary(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: RADII.md,
                  border: `1px solid ${borderColor}`,
                  backgroundColor: isDark ? '#0f172a' : '#fff',
                  color: textColor,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                <option value={25_000_000}>Dưới 30 Triệu (&lt; 30M)</option>
                <option value={35_000_000}>Từ 30 đến 50 Triệu (30M - 50M)</option>
                <option value={60_000_000}>Từ 50 Triệu trở lên (≥ 50M)</option>
              </select>
            </div>
          </div>

          {/* Results Display */}
          {simResult && (
            <div
              style={{
                backgroundColor: isDark ? '#1e1b4b' : '#eef2ff',
                borderRadius: RADII.lg,
                padding: '20px',
                border: `1px solid ${isDark ? '#3730a3' : '#c7d2fe'}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.8125rem', color: isDark ? '#a5b4fc' : '#4f46e5', fontWeight: 700, textTransform: 'uppercase' }}>
                  Kết Quả Tính Điểm & Đối Soát ({displayName})
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 900, color: isDark ? '#fff' : '#1e1b4b' }}>
                    {simResult.final_score.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '1rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                    / 5.0
                  </span>

                  <span
                    style={{
                      marginLeft: 'auto',
                      padding: '6px 14px',
                      borderRadius: RADII.full,
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      backgroundColor:
                        simResult.rank === 'S' ? '#fef3c7' : simResult.rank === 'A' ? '#dbeafe' : '#ffedd5',
                      color:
                        simResult.rank === 'S' ? '#92400e' : simResult.rank === 'A' ? '#1e40af' : '#9a3412',
                      border: `1px solid ${
                        simResult.rank === 'S' ? '#fde68a' : simResult.rank === 'A' ? '#bfdbfe' : '#fed7aa'
                      }`,
                    }}
                  >
                    RANK {simResult.rank} ({simResult.rank_label})
                  </span>
                </div>

                {/* Formula Breakdown Details */}
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {simResult.breakdown.map((b) => (
                    <div key={b.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: isDark ? '#cbd5e1' : '#4b5563' }}>
                      <span>{b.code} ({b.weight_percent}%): {b.raw_score.toFixed(1)} × {b.weight_percent}%</span>
                      <span style={{ fontWeight: 700 }}>= +{b.contribution.toFixed(2)} đ</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Salary Recommendation */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: RADII.md,
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: subTextColor }}>
                    Đề xuất tăng lương ({simResult.salary_recommendation.salary_tier}):
                  </span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16a34a' }}>
                    +{simResult.salary_recommendation.min_percent}% - {simResult.salary_recommendation.max_percent}%
                  </span>
                </div>
                <div style={{ marginTop: '6px', fontSize: '0.75rem', color: subTextColor, lineHeight: 1.4 }}>
                  {simResult.salary_recommendation.ceiling_note}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 6: Action Footer ─────────────────────────────────────────── */}
      {isCustomMode && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isWeightValid}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 32px',
              borderRadius: RADII.lg,
              backgroundColor: isWeightValid
                ? (isDepartmentScope ? (isDark ? '#0284c7' : '#0369a1') : (isDark ? '#4f46e5' : '#4338ca'))
                : '#94a3b8',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: 'none',
              cursor: saving || !isWeightValid ? 'not-allowed' : 'pointer',
              boxShadow: isWeightValid ? '0 4px 12px rgba(67, 56, 202, 0.3)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Save size={18} />
            {saving ? 'Đang lưu...' : `Lưu Công Thức Cho ${displayName}`}
          </button>
        </div>
      )}
    </div>
  );
};
