import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { evaluationApi } from '../api/evaluation-api';
import { useEvaluationCyclesQuery } from '../../evaluation-cycles/hooks/use-evaluation-cycles';
import { EvaluationStatus } from '../domain/evaluation-models';
import { EvaluationHeader } from '../components/EvaluationHeader';
import { EvaluationOverviewPanel } from '../components/EvaluationOverviewPanel';
import { EvaluationScoreSummaryPanel } from '../components/EvaluationScoreSummaryPanel';
import { EvaluationComparisonEditorPanel } from '../components/EvaluationComparisonEditorPanel';
import { PersonalDevelopmentPlanPanel } from '../components/PersonalDevelopmentPlanPanel';
import { KpiEvaluationCard } from '../components/KpiEvaluationCard';
import { SubmitConfirmModal } from '../components/SubmitConfirmModal';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { AlertCircle, ArrowLeft, RefreshCw, CheckCircle2, Sparkles, Sliders, Save } from 'lucide-react';
import { useAuth } from '@/shared/auth/auth-context';
import { OverrideScoreModal } from '../components/OverrideScoreModal';
import { ReviewActionModal, type ReviewActionType } from '../components/ReviewActionModal';
import { buildEvaluationScoringSummary, getLocalizedText, type EvaluationItem, type ScoringKpiResult } from '../domain/evaluation-models';

type EvaluationDetailMode = 'self' | 'manager';

interface DraftItemState {
  resolved_level?: number | null;
  comment?: string;
  isDirty?: boolean;
}

interface KpiItemGroup {
  kpiId: string;
  kpiCode: string;
  kpiName: string;
  kpiWeight: number;
  scoringResult?: ScoringKpiResult;
  items: EvaluationItem[];
  manualOverrideScore?: number | null;
  overrideReason?: string | null;
}

interface CriterionGroup {
  criterionId: string;
  criterionCode: string;
  criterionName: string;
  criterionWeight: number;
  kpis: KpiItemGroup[];
}

type DevelopmentBlock = {
  title: string;
  desc: string;
  accent: string;
  value: string;
};

const LEVEL_PERCENT_MAP: Record<number, number> = {
  1: 60,
  2: 70,
  3: 80,
  4: 90,
  5: 100,
};

const toLevelPercent = (level?: number | null): number | undefined => {
  if (level === null || level === undefined) return undefined;
  return LEVEL_PERCENT_MAP[level] ?? level;
};

const toDisplayLevel = (value?: number | null): number | null => {
  if (value === null || value === undefined) return null;
  if (value >= 100) return 5;
  if (value >= 90) return 4;
  if (value >= 80) return 3;
  if (value >= 70) return 2;
  return 1;
};

export function EvaluationDetailContent({ mode }: { mode: EvaluationDetailMode }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isHrAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';

  const [draftItems, setDraftItems] = useState<Record<string, DraftItemState>>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [targetOverrideKpiId, setTargetOverrideKpiId] = useState<string | undefined>(undefined);
  const [reviewActionType, setReviewActionType] = useState<ReviewActionType | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [previousEvaluationText, setPreviousEvaluationText] = useState('');
  const [currentEvaluationText, setCurrentEvaluationText] = useState('');
  const [developmentBlocks, setDevelopmentBlocks] = useState<DevelopmentBlock[]>([
    {
      title: 'Objective(s)',
      desc: 'What do you want to achieve during the next review period?',
      accent: COLORS.primary.DEFAULT,
      value: 'Lead a cross-functional discovery initiative and improve product storytelling.',
    },
    {
      title: 'Achievements',
      desc: 'What have you accomplished during this review period?',
      accent: COLORS.semantic.success.DEFAULT,
      value: 'Delivered a redesign that increased activation, and mentored two junior designers.',
    },
    {
      title: 'Need Improvement',
      desc: 'What skills, behaviors or areas would you like to improve?',
      accent: COLORS.semantic.warning.DEFAULT,
      value: 'Sharpen prioritization for ambiguous roadmap requests and improve delegation.',
    },
    {
      title: 'Suggestions / Requests',
      desc: 'What support, resources, training or opportunities would help you grow?',
      accent: COLORS.secondary.DEFAULT,
      value: 'Access to strategy workshops, stakeholder shadowing, and a quarterly coaching session.',
    },
  ]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['evaluation-detail', id],
    queryFn: () => evaluationApi.getEvaluationDetail(id!),
    enabled: !!id,
  });

  const { data: cyclesData } = useEvaluationCyclesQuery();
  const cycles = Array.isArray(cyclesData) ? cyclesData : [];

  // Sync draft state with server detail
  useEffect(() => {
    if (detail?.items) {
      const initial: Record<string, DraftItemState> = {};
      detail.items.forEach((item) => {
        initial[item.evaluation_item_id] = {
          resolved_level: toDisplayLevel(item.resolved_level ?? null),
          comment: item.comment || '',
          isDirty: false,
        };
      });
      setDraftItems(initial);
    }
  }, [detail]);

  const isManagerMode = mode === 'manager';
  const isEditable = true;

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return Object.values(draftItems).some((item) => item.isDirty);
  }, [draftItems]);

  // Handle beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Save batch draft mutation
  const saveBatchMutation = useMutation({
    mutationFn: (items: { id: string; resolved_level?: number; comment?: string }[]) =>
      evaluationApi.saveDraft(id!, items),
    onSuccess: () => {
      showToast('success', 'Đã lưu bản nháp thành công.');
      // Mark all as not dirty
      setDraftItems((prev) => {
        const next: Record<string, DraftItemState> = {};
        Object.entries(prev).forEach(([k, v]) => {
          next[k] = { ...v, isDirty: false };
        });
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', id] });
    },
    onError: (err: Error) => {
      showToast('error', err.message || 'Lỗi khi lưu bản nháp.');
    },
  });

  // Save single item mutation
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const saveSingleMutation = useMutation({
    mutationFn: async ({ itemId, payload }: { itemId: string; payload: { resolved_level?: number; comment?: string } }) => {
      setSavingItemId(itemId);
      return evaluationApi.saveItemDraft(id!, itemId, payload);
    },
    onSuccess: (_, variables) => {
      showToast('success', 'Đã lưu tiêu chí thành công.');
      setDraftItems((prev) => ({
        ...prev,
        [variables.itemId]: { ...prev[variables.itemId], isDirty: false },
      }));
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', id] });
      setSavingItemId(null);
    },
    onError: (err: Error) => {
      showToast('error', err.message || 'Lỗi khi lưu tiêu chí.');
      setSavingItemId(null);
    },
  });

  // Submit self-assessment mutation
  const submitMutation = useMutation({
    mutationFn: () => {
      const idempotencyKey = `self-submit-${id}-${Date.now()}`;
      return evaluationApi.submitEvaluation(id!, idempotencyKey);
    },
    onSuccess: () => {
      showToast('success', isManagerMode
        ? 'Đã duyệt đánh giá thành công.'
        : 'Đã nộp bản tự đánh giá thành công! Đánh giá đã chuyển sang trạng thái Chờ Quản lý.');
      setIsSubmitModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['my-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['team-evaluations'] });
    },
    onError: (err: Error) => {
      showToast('error', err.message || 'Không thể nộp tự đánh giá. Vui lòng kiểm tra lại.');
      setIsSubmitModalOpen(false);
    },
  });

  // Approve mutation (for manager mode)
  const approveMutation = useMutation({
    mutationFn: () => evaluationApi.approveEvaluation(id!),
    onSuccess: () => {
      showToast('success', 'Đã phê duyệt đánh giá thành công.');
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['team-evaluations'] });
    },
    onError: (err: Error) => {
      showToast('error', err.message || 'Không thể duyệt đánh giá.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => evaluationApi.rejectEvaluation(id!, reason),
    onSuccess: () => {
      showToast('success', 'Đã từ chối bản đánh giá.');
      setReviewActionType(null);
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['team-evaluations'] });
    },
    onError: (err: Error) => {
      showToast('error', err.message || 'Lỗi khi từ chối đánh giá.');
    },
  });

  const requestCorrectionMutation = useMutation({
    mutationFn: (reason: string) => evaluationApi.requestCorrection(id!, reason),
    onSuccess: () => {
      showToast('success', 'Đã gửi yêu cầu chỉnh sửa cho nhân viên.');
      setReviewActionType(null);
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['team-evaluations'] });
    },
    onError: (err: Error) => {
      showToast('error', err.message || 'Lỗi khi gửi yêu cầu chỉnh sửa.');
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => evaluationApi.publishEvaluation(id!),
    onSuccess: () => {
      showToast('success', 'Đã công bố đánh giá thành công.');
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', id] });
    },
    onError: (err: Error) => {
      showToast('error', err.message || 'Không thể công bố đánh giá.');
    },
  });

  const lockMutation = useMutation({
    mutationFn: () => evaluationApi.lockEvaluation(id!),
    onSuccess: () => {
      showToast('success', 'Đã khóa đánh giá thành công.');
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', id] });
    },
    onError: (err: Error) => {
      showToast('error', err.message || 'Không thể khóa đánh giá.');
    },
  });

  const overrideMutation = useMutation({
    mutationFn: ({ kpiId, score, reason }: { kpiId: string; score: number; reason: string }) => 
      evaluationApi.overrideKpiScore(id!, kpiId, { manual_override_score: score, override_reason: reason }),
    onSuccess: () => {
      showToast('success', 'Đã ghi đè điểm KPI thành công.');
      setIsOverrideModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', id] });
    },
    onError: (err: Error) => {
      showToast('error', err.message || 'Lỗi khi ghi đè điểm KPI.');
    },
  });

  // Level selection handler
  const handleLevelChange = (itemId: string, level: number) => {
    setDraftItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        resolved_level: level,
        isDirty: true,
      },
    }));
  };

  // Comment change handler
  const handleCommentChange = (itemId: string, comment: string) => {
    setDraftItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        comment,
        isDirty: true,
      },
    }));
  };

  // Save all draft changes
  const handleSaveAll = () => {
    if (!detail?.items) return;
    const itemsToSave = Object.entries(draftItems).map(([itemId, val]) => {
      const payload: { id: string; resolved_level?: number; comment?: string } = {
        id: itemId,
        comment: val.comment,
      };
      const resolvedLevel = toLevelPercent(val.resolved_level);
      if (resolvedLevel !== undefined) {
        payload.resolved_level = resolvedLevel;
      }
      return payload;
    });
    saveBatchMutation.mutate(itemsToSave);
  };

  // Save single item
  const handleSaveSingle = (itemId: string) => {
    const itemDraft = draftItems[itemId];
    if (!itemDraft) return;
    saveSingleMutation.mutate({
      itemId,
      payload: (() => {
        const payload: { resolved_level?: number; comment?: string } = {
          comment: itemDraft.comment,
        };
        const resolvedLevel = toLevelPercent(itemDraft.resolved_level);
        if (resolvedLevel !== undefined) {
          payload.resolved_level = resolvedLevel;
        }
        return payload;
      })(),
    });
  };

  // Calculate missing items for submit check
  const activeCriteria = useMemo(() => {
    if (!detail?.items) return [];
    return detail.items;
  }, [detail]);

  const missingCriteria = useMemo(() => {
    if (!activeCriteria.length) return [];
    return activeCriteria
      .filter((item) => {
        const draft = draftItems[item.evaluation_item_id];
        return draft?.resolved_level === null || draft?.resolved_level === undefined;
      })
      .map((item) => ({
        id: item.evaluation_item_id,
        code: item.criterion_code_snapshot,
        name: getLocalizedText(item.criterion_name_snapshot),
      }));
  }, [activeCriteria, draftItems]);

  const completedCount = activeCriteria.length - missingCriteria.length;

  const formatCriterionName = (value: unknown): string => {
    return getLocalizedText(value as Record<string, string> | string | undefined);
  };

  const criterionGroups = useMemo(() => {
    if (!detail?.items) return [];

    const groupsMap = new Map<
      string,
      CriterionGroup
    >();
    const scoringMap = new Map<string, ScoringKpiResult>();

    if (detail.scoring_breakdown?.kpi_results) {
      detail.scoring_breakdown.kpi_results.forEach((kr) => {
        scoringMap.set(kr.kpi_id, kr);
      });
    }

    detail.items.forEach((item) => {
      const criterionId = item.template_criterion_id || item.criterion_code_snapshot || formatCriterionName(item.criterion_name_snapshot);
      const criterionCode = item.criterion_code_snapshot || criterionId;
      const criterionName = formatCriterionName(item.criterion_name_snapshot) || criterionCode || 'Criterion';
      const rawCriterionWeight = item.weight_snapshot;
      const criterionWeight =
        rawCriterionWeight !== undefined && rawCriterionWeight !== null
          ? rawCriterionWeight <= 1 && rawCriterionWeight > 0
            ? Math.round(rawCriterionWeight * 100)
            : rawCriterionWeight
          : 0;

      const kpiId = item.kpi_id_snapshot || 'general';
      const kpiCode = item.kpi_code_snapshot || (kpiId === 'general' ? 'GENERAL' : kpiId);
      const kpiName = item.kpi_name_snapshot || (kpiId === 'general' ? 'Tiêu chí chung' : kpiCode);
      const rawWeight = item.kpi_weight_snapshot;
      const kpiWeight =
        rawWeight !== undefined && rawWeight !== null
          ? rawWeight <= 1 && rawWeight > 0
            ? Math.round(rawWeight * 100)
            : rawWeight
          : 0;

      if (!groupsMap.has(criterionId)) {
        groupsMap.set(criterionId, {
          criterionId,
          criterionCode,
          criterionName,
          criterionWeight,
          kpis: [],
        });
      }

      const group = groupsMap.get(criterionId)!;

      let kpiGroup = group.kpis.find((candidate) => candidate.kpiId === kpiId);
      if (!kpiGroup) {
        kpiGroup = {
          kpiId,
          kpiCode,
          kpiName,
          kpiWeight,
          scoringResult: scoringMap.get(kpiId),
          items: [],
          manualOverrideScore: item.manual_override_score,
          overrideReason: item.override_reason,
        };
        group.kpis.push(kpiGroup);
      }

      kpiGroup.items.push(item);

      if (item.manual_override_score !== null && item.manual_override_score !== undefined) {
        kpiGroup.manualOverrideScore = item.manual_override_score;
        kpiGroup.overrideReason = item.override_reason;
      }
    });

    return Array.from(groupsMap.values());
  }, [detail?.items, detail?.scoring_breakdown]);

  const cycleProgress = useMemo(() => {
    const resolvedCycle = detail?.cycle ?? cycles.find((cycle) => cycle.id === detail?.evaluation_cycle_id);
    const startDate = resolvedCycle && 'period' in resolvedCycle ? resolvedCycle.period.startDate : resolvedCycle?.start_date;
    const endDate = resolvedCycle && 'period' in resolvedCycle ? resolvedCycle.period.endDate : resolvedCycle?.end_date;

    if (startDate && endDate) {
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();
      const nowTime = Date.now();

      if (!Number.isNaN(startTime) && !Number.isNaN(endTime) && endTime > startTime) {
        const percentage = Math.max(0, Math.min(100, ((nowTime - startTime) / (endTime - startTime)) * 100));
        const startLabel = new Date(startDate).toLocaleDateString('vi-VN');
        const endLabel = new Date(endDate).toLocaleDateString('vi-VN');

        return {
          percentage,
          label: `${Math.round(percentage)}%`,
          dateLabel: `${startLabel} - ${endLabel}`,
        };
      }
    }

    const anchorDate = detail?.approved_at ?? detail?.published_at ?? detail?.submitted_at;
    if (!anchorDate) {
      return { percentage: 0, label: 'N/A', dateLabel: 'Chưa có mốc thời gian' };
    }

    const parsed = new Date(anchorDate);
    if (Number.isNaN(parsed.getTime())) {
      return { percentage: 0, label: 'N/A', dateLabel: 'Chưa có mốc thời gian' };
    }

    const daysAgo = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)));
    const percentage = Math.max(0, Math.min(100, daysAgo * 4));

    return {
      percentage,
      label: `${Math.round(percentage)}%`,
      dateLabel: parsed.toLocaleDateString('vi-VN'),
    };
  }, [cycles, detail?.approved_at, detail?.cycle, detail?.evaluation_cycle_id, detail?.published_at, detail?.submitted_at]);

  const detailForScoring = useMemo(() => {
    if (!detail?.items) {
      return detail;
    }

    return {
      ...detail,
      items: detail.items.map((item) => {
        const draft = draftItems[item.evaluation_item_id];
        if (!draft) {
          return item;
        }

        return {
          ...item,
          resolved_level: toLevelPercent(draft.resolved_level) ?? item.resolved_level,
          comment: draft.comment,
        };
      }),
    };
  }, [detail, draftItems]);

  const scoreFormula = useMemo(() => buildEvaluationScoringSummary(detailForScoring), [detailForScoring]);
  const currentRank = useMemo(() => {
    if (scoreFormula.totalScore > 4.5) {
      return 'S';
    }

    if (scoreFormula.totalScore >= 3) {
      return 'A';
    }

    return 'B';
  }, [scoreFormula.totalScore]);

  useEffect(() => {
    if (!detail) {
      return;
    }

    setPreviousEvaluationText((current) => current || `Previous evaluation snapshot\n- Final score: ${detail.final_score ?? 'N/A'}\n- Self score: ${detail.self_score ?? 'N/A'}\n- Manager score: ${detail.manager_score ?? 'N/A'}\n- Approved at: ${detail.approved_at ?? 'N/A'}`);
    setCurrentEvaluationText((current) => current || `This evaluation notes\n- Status: ${detail.status}\n- Final score: ${detail.final_score ?? 'N/A'}\n- Key items: ${detail.items.length}`);
  }, [detail]);

  useEffect(() => {
    if (!detail?.development_blocks || detail.development_blocks.length === 0) {
      return;
    }

    setDevelopmentBlocks(
      detail.development_blocks.map((block, index) => ({
        title: block.title,
        desc: block.desc ?? '',
        accent: block.accent ?? [COLORS.primary.DEFAULT, COLORS.semantic.success.DEFAULT, COLORS.semantic.warning.DEFAULT, COLORS.secondary.DEFAULT][index % 4],
        value: String(block.value ?? '').slice(0, 2000),
      })),
    );
  }, [detail]);

  useEffect(() => {
    if (!detail?.development_blocks || detail.development_blocks.length === 0) {
      setDevelopmentBlocks([
        {
          title: 'Objective(s)',
          desc: 'What do you want to achieve during the next review period?',
          accent: COLORS.primary.DEFAULT,
          value: 'Lead a cross-functional discovery initiative and improve product storytelling.',
        },
        {
          title: 'Achievements',
          desc: 'What have you accomplished during this review period?',
          accent: COLORS.semantic.success.DEFAULT,
          value: 'Delivered a redesign that increased activation, and mentored two junior designers.',
        },
        {
          title: 'Need Improvement',
          desc: 'What skills, behaviors or areas would you like to improve?',
          accent: COLORS.semantic.warning.DEFAULT,
          value: 'Sharpen prioritization for ambiguous roadmap requests and improve delegation.',
        },
        {
          title: 'Suggestions / Requests',
          desc: 'What support, resources, training or opportunities would help you grow?',
          accent: COLORS.secondary.DEFAULT,
          value: 'Access to strategy workshops, stakeholder shadowing, and a quarterly coaching session.',
        },
      ]);
    }
  }, [detail]);

  const updateDevelopmentBlock = (index: number, value: string) => {
    setDevelopmentBlocks((current) => current.map((block, blockIndex) => (blockIndex === index ? { ...block, value: value.slice(0, 2000) } : block)));
  };

  const saveDevelopmentBlocksMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error('Missing evaluation id');
      }

      await evaluationApi.saveDevelopmentBlocks(id, developmentBlocks);
    },
    onSuccess: () => {
      showToast('success', 'Đã lưu kế hoạch phát triển cá nhân.');
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', id] });
    },
    onError: (err: Error) => {
      showToast('error', err.message || 'Không thể lưu kế hoạch phát triển cá nhân.');
    },
  });

  const handleApplyAllSystemSuggestions = () => {
    if (!detail?.items) return;
    const updated: Record<string, DraftItemState> = { ...draftItems };
    let appliedCount = 0;

    detail.items.forEach((item) => {
      if (item.system_suggested_level) {
        appliedCount++;
        const currentDraft = updated[item.evaluation_item_id] || { resolved_level: null, comment: '', isDirty: false };
        const sampleComment = `Tôi xác nhận và đồng ý với dữ liệu đo lường từ ${item.system_source || 'hệ thống Blueprint'}: Đề xuất mức ${item.system_suggested_level} (${item.system_suggested_score}/10 điểm).`;
        updated[item.evaluation_item_id] = {
          ...currentDraft,
          resolved_level: item.system_suggested_level,
          comment: currentDraft.comment && currentDraft.comment.trim() !== '' ? currentDraft.comment : sampleComment,
          isDirty: true,
        };
      }
    });

    setDraftItems(updated);
    showToast('success', `Đã áp dụng nhanh gợi ý hệ thống cho ${appliedCount} tiêu chí! Hãy xem lại và nhấn 'Lưu nháp' hoặc 'Nộp tự đánh giá'.`);
  };

  // Open submit confirmation modal
  const handleOpenSubmit = () => {
    setIsSubmitModalOpen(true);
  };

  const handlePublish = () => publishMutation.mutate();
  const handleLock = () => lockMutation.mutate();

  const handleOverrideSubmit = (kpiId: string, score: number, reason: string) => {
    overrideMutation.mutate({ kpiId, score, reason });
  };

  // Confirm submit after saving dirty items if any
  const handleConfirmSubmit = () => {
    if (hasUnsavedChanges) {
      const itemsToSave = Object.entries(draftItems).map(([itemId, val]) => ({
        id: itemId,
        ...(toLevelPercent(val.resolved_level) !== undefined ? { resolved_level: toLevelPercent(val.resolved_level) } : {}),
        comment: val.comment,
      }));

      saveBatchMutation.mutate(itemsToSave, {
        onSuccess: () => {
          if (isManagerMode) {
            approveMutation.mutate();
          } else {
            submitMutation.mutate();
          }
        },
      });
    } else {
      if (isManagerMode) {
        approveMutation.mutate();
      } else {
        submitMutation.mutate();
      }
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', margin: '0 auto', width: '100%' }}>
        <div style={{ height: '120px', backgroundColor: COLORS.neutral.white, borderRadius: RADII.xl, border: `1px solid ${COLORS.neutral[200]}` }} />
        <div style={{ height: '140px', backgroundColor: COLORS.neutral.white, borderRadius: RADII.xl, border: `1px solid ${COLORS.neutral[200]}` }} />
        <div style={{ height: '260px', backgroundColor: COLORS.neutral.white, borderRadius: RADII.xl, border: `1px solid ${COLORS.neutral[200]}` }} />
      </div>
    );
  }

  // Error view
  if (isError || !detail) {
    return (
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: RADII.xl,
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <AlertCircle size={40} color="#dc2626" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: '#991b1b' }}>
            Không tìm thấy bản đánh giá
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: TYPOGRAPHY.fontSize.sm, color: '#7f1d1d' }}>
            {(error as Error)?.message || 'Bạn không có quyền truy cập hoặc bản đánh giá không tồn tại.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate(isManagerMode ? '/admin/team-evaluations' : '/admin/my-evaluations')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: RADII.lg,
                backgroundColor: COLORS.neutral.white,
                color: COLORS.neutral.textPrimary,
                border: `1px solid ${COLORS.neutral[300]}`,
                fontSize: TYPOGRAPHY.fontSize.sm,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={15} /> Quay lại danh sách
            </button>
            <button
              onClick={() => refetch()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: RADII.lg,
                backgroundColor: '#dc2626',
                color: COLORS.neutral.white,
                border: 'none',
                fontSize: TYPOGRAPHY.fontSize.sm,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} /> Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            borderRadius: RADII.lg,
            backgroundColor:
              toastMessage.type === 'success'
                ? '#ecfdf5'
                : toastMessage.type === 'error'
                ? '#fef2f2'
                : COLORS.neutral.white,
            color:
              toastMessage.type === 'success'
                ? '#065f46'
                : toastMessage.type === 'error'
                ? '#991b1b'
                : COLORS.neutral.textPrimary,
            border: `1px solid ${
              toastMessage.type === 'success'
                ? '#a7f3d0'
                : toastMessage.type === 'error'
                ? '#fecaca'
                : COLORS.neutral[200]
            }`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: TYPOGRAPHY.fontSize.sm,
            fontWeight: 500,
          }}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} color="#059669" />
          ) : (
            <AlertCircle size={18} color="#dc2626" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Evaluation Header */}
      <EvaluationHeader
        cycleName={isManagerMode ? 'Chi tiết đánh giá nhân viên' : 'Kỳ Đánh Giá Hiệu Suất'}
        status={detail.status}
        mode={mode}
        isLocked={detail.status === EvaluationStatus.LOCKED}
        isEditable={isEditable}
        totalActiveItems={activeCriteria.length}
        completedItems={completedCount}
        missingCount={missingCriteria.length}
        isSaving={saveBatchMutation.isPending}
        isSubmitting={submitMutation.isPending || approveMutation.isPending}
        hasUnsavedChanges={hasUnsavedChanges}
        onSaveDraft={handleSaveAll}
        onSubmit={handleOpenSubmit}
        backPath={isManagerMode ? '/admin/team-evaluations' : '/admin/my-evaluations'}
        backLabel={isManagerMode ? 'Team Evaluations' : 'My Evaluations'}
        isHrAdmin={isHrAdmin}
        onPublish={handlePublish}
        onLock={handleLock}
        onRequestCorrection={() => setReviewActionType('REQUEST_CORRECTION')}
        onReject={() => setReviewActionType('REJECT')}
        submitLabel={isManagerMode ? 'Duyệt đánh giá' : 'Nộp tự đánh giá'}
        submittingLabel={isManagerMode ? 'Đang duyệt...' : 'Đang gửi...'}
      />

      <EvaluationOverviewPanel
        score={scoreFormula.totalRawScoreValue}
        cycleProgress={cycleProgress}
      />

      <EvaluationScoreSummaryPanel
        score={scoreFormula.totalScore}
        grouped={scoreFormula.grouped}
      />

      <section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px', alignItems: 'stretch' }}>
            {[
              {
                rank: 'B',
                label: 'Need Improvement',
                range: '< 3',
                tone: COLORS.semantic.warning.DEFAULT,
                background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(239,68,68,0.10))',
                border: 'rgba(239,68,68,0.35)',
                description: 'Nhân viên mới cần thời gian catch up hoặc nhân viên cũ nhưng vẫn chưa đạt yêu cầu.',
                badge: 'BÁO ĐỘNG',
              },
              {
                rank: 'A',
                label: 'Meet Expectation',
                range: '3 - 4.4',
                tone: COLORS.semantic.success.DEFAULT,
                background: 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(16,185,129,0.08))',
                border: 'rgba(34,197,94,0.30)',
                description: 'Đại đa số nhân viên hoàn thành tốt công việc và đạt mức kỳ vọng.',
                badge: 'AN TOÀN',
              },
              {
                rank: 'S',
                label: 'Exceed Expectation',
                range: '> 4.5',
                tone: COLORS.primary.DEFAULT,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.12))',
                border: 'rgba(99,102,241,0.32)',
                description: 'Chỉ những người thực sự xuất sắc và vượt kỳ vọng rõ rệt.',
                badge: 'TỐT',
              },
            ].map((level) => {
              const isActive = currentRank === level.rank;
              return (
              <div
                key={level.rank}
                style={{
                  borderRadius: RADII['2xl'],
                  padding: isActive ? '22px' : '15px',
                  border: `1px solid ${level.border}`,
                  background: level.background,
                  boxShadow: isActive ? (level.rank === 'B' ? '0 22px 52px rgba(239,68,68,0.18)' : level.rank === 'A' ? '0 22px 52px rgba(34,197,94,0.16)' : '0 22px 52px rgba(99,102,241,0.18)') : '0 10px 24px rgba(15,23,42,0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: isActive ? 1 : 0.55,
                  transform: isActive ? 'translateY(-6px) scale(1.04)' : 'scale(0.94)',
                  transition: 'transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease',
                  minHeight: '100%',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                    <div style={{ width: isActive ? '60px' : '44px', height: isActive ? '60px' : '44px', borderRadius: '18px', display: 'grid', placeItems: 'center', background: `${level.tone}18`, color: level.tone, border: `1px solid ${level.border}`, opacity: isActive ? 1 : 0.72, flexShrink: 0 }}>
                      <span style={{ fontSize: isActive ? TYPOGRAPHY.fontSize['3xl'] : TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.extrabold, lineHeight: 1 }}>{level.rank}</span>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: isActive ? '4px 10px' : '3px 8px', borderRadius: RADII.full, background: `${level.tone}14`, color: level.tone, fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.semibold, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: isActive ? 1 : 0.68, whiteSpace: 'nowrap' }}>
                        {level.badge}
                      </div>
                      <div style={{ marginTop: '8px', fontSize: isActive ? TYPOGRAPHY.fontSize['2xl'] : TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary, opacity: isActive ? 1 : 0.72, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{level.label}</div>
                      <div style={{ marginTop: '4px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, opacity: isActive ? 1 : 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Range rank: {level.range}</div>
                    </div>
                  </div>

                  <div style={{ minWidth: '72px', textAlign: 'right', opacity: isActive ? 1 : 0.4, flexShrink: 0 }}>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>Level</div>
                    <div style={{ marginTop: '6px', fontSize: isActive ? TYPOGRAPHY.fontSize['3xl'] : TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.extrabold, color: level.tone }}>{level.rank}</div>
                  </div>
                </div>

                <div style={{ marginTop: '14px', display: 'grid', gap: '10px', opacity: isActive ? 1 : 0.45 }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textPrimary, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{level.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>Mức ưu tiên</div>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: level.tone, whiteSpace: 'nowrap' }}>{level.rank === 'B' ? 'Cần xử lý ngay' : level.rank === 'A' ? 'Ổn định' : 'Nổi bật'}</div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
      </section>

      <PersonalDevelopmentPlanPanel
        blocks={developmentBlocks}
        isSaving={saveDevelopmentBlocksMutation.isPending}
        isSaved={!saveDevelopmentBlocksMutation.isPending}
        canSave={!!id}
        onSave={() => saveDevelopmentBlocksMutation.mutate()}
        onChangeBlock={updateDevelopmentBlock}
      />

      <EvaluationComparisonEditorPanel
        previousValue={previousEvaluationText}
        currentValue={currentEvaluationText}
        onPreviousChange={setPreviousEvaluationText}
        onCurrentChange={setCurrentEvaluationText}
        onCopyPreviousToCurrent={() => setCurrentEvaluationText(previousEvaluationText)}
        onClearCurrent={() => setCurrentEvaluationText('')}
      />

      {detail.scoring_breakdown && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-label="Scoring breakdown">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
              Kết quả tính điểm
            </h2>
            <div style={{ display: 'flex', gap: '20px', color: COLORS.neutral.textPrimary }}>
              <strong>Overall: {detail.scoring_breakdown.overall_weighted_score}</strong>
              <strong>Official: {detail.scoring_breakdown.official_score}</strong>
            </div>
          </div>

          {detail.scoring_breakdown.kpi_results.map((kpiResult) => (
            <article
              key={kpiResult.kpi_id}
              style={{
                border: `1px solid ${COLORS.neutral[200]}`,
                borderRadius: RADII.lg,
                padding: '16px',
                backgroundColor: COLORS.neutral.white,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <strong>{kpiResult.kpi_name}</strong>
                <span>{kpiResult.is_na ? 'N/A' : `KPI score: ${kpiResult.normalized_score}`}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', fontSize: TYPOGRAPHY.fontSize.sm }}>
                <span>KPI weight: {kpiResult.effective_weight}</span>
                <span>Contribution: {kpiResult.weighted_contribution ?? 'N/A'}</span>
                <span>Applicable weight: {kpiResult.applicable_weight}</span>
              </div>
              <div style={{ overflowX: 'auto', marginTop: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: TYPOGRAPHY.fontSize.sm }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Criterion</th>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Level</th>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Raw / max</th>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Normalized</th>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Weight</th>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Contribution</th>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(kpiResult.criterion_results || []).map((criterionResult) => {
                      const item = detail.items.find((candidate) => candidate.evaluation_item_id === criterionResult.criterion_id);
                      return (
                        <tr key={criterionResult.criterion_id}>
                          <td style={{ padding: '6px' }}>{formatCriterionName(item?.criterion_name_snapshot ?? criterionResult.criterion_id)}</td>
                          <td style={{ padding: '6px' }}>{criterionResult.is_na ? 'N/A' : criterionResult.resolved_level ?? 'N/A'}</td>
                          <td style={{ padding: '6px' }}>{criterionResult.is_na ? 'N/A' : `${criterionResult.raw_score} / ${criterionResult.max_score}`}</td>
                          <td style={{ padding: '6px' }}>{criterionResult.normalized_score ?? 'N/A'}</td>
                          <td style={{ padding: '6px' }}>{criterionResult.effective_weight}</td>
                          <td style={{ padding: '6px' }}>{criterionResult.weighted_contribution ?? 'N/A'}</td>
                          <td style={{ padding: '6px' }}>{criterionResult.is_na ? 'N/A' : 'Scored'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Criteria Section Organised by KPI Cards */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-label="Criteria Section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
              Danh sách tiêu chí theo nhóm criteria ({criterionGroups.length} criteria &bull; {detail.items.length} KPI)
            </h2>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '3px' }}>
              Criteria là nhóm cha, KPI nằm bên trong và giữ cơ chế chọn mức đánh giá riêng của từng KPI.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {isEditable && (
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={!hasUnsavedChanges || saveBatchMutation.isPending || submitMutation.isPending || approveMutation.isPending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: RADII.lg,
                  backgroundColor: hasUnsavedChanges ? '#fff7ed' : '#f8fafc',
                  color: hasUnsavedChanges ? '#b45309' : COLORS.neutral.textSecondary,
                  border: `1px solid ${hasUnsavedChanges ? '#fdba74' : COLORS.neutral[300]}`,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  fontWeight: 600,
                  cursor: !hasUnsavedChanges || saveBatchMutation.isPending || submitMutation.isPending || approveMutation.isPending ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <Save size={15} />
                {saveBatchMutation.isPending
                  ? 'Đang lưu toàn bộ...'
                  : hasUnsavedChanges
                  ? 'Lưu toàn bộ mức đánh giá'
                  : 'Chưa có thay đổi để lưu'}
              </button>
            )}

            {isHrAdmin && (detail.status === EvaluationStatus.APPROVED || detail.status === EvaluationStatus.PUBLISHED) && !detail.is_locked && (
              <button
                type="button"
                onClick={() => {
                  setTargetOverrideKpiId(undefined);
                  setIsOverrideModalOpen(true);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: RADII.md,
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sliders size={14} />
                Hiệu chỉnh điểm KPI
              </button>
            )}

            {isEditable && (
              <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                * {isManagerMode ? 'Chọn mức đánh giá và nhập nhận xét cho từng tiêu chí' : 'Chọn mức độ và nhập giải trình cho từng tiêu chí'}
              </span>
            )}
          </div>
        </div>

        {/* Smart Auto-Fill Banner for Self Evaluation */}
        {mode === 'self' && isEditable && detail.items.some((i) => i.system_suggested_level) && (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: RADII.xl,
              backgroundColor: '#f5f3ff',
              border: '1.5px solid #ddd6fe',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 1px 3px rgba(99, 102, 241, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={18} />
              </span>
              <div>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 700, color: '#312e81' }}>
                  Hệ thống đã tự động đối soát {detail.items.filter((i) => i.system_suggested_level).length}/{detail.items.length} tiêu chí từ Blueprint
                </div>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#4338ca', marginTop: '3px' }}>
                  Bạn có thể áp dụng toàn bộ mức đánh giá do hệ thống đề xuất chỉ với 1 cú nhấp chuột hoặc tự tùy chỉnh từng tiêu chí.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyAllSystemSuggestions}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: RADII.lg,
                backgroundColor: '#6366f1',
                color: '#ffffff',
                border: 'none',
                fontSize: TYPOGRAPHY.fontSize.sm,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6366f1')}
            >
              <Sparkles size={15} />
              ⚡ Nạp nhanh toàn bộ gợi ý hệ thống
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {criterionGroups.map((criterionGroup, criterionIdx) => (
            <KpiEvaluationCard
              key={criterionGroup.criterionId}
              kpiGroup={criterionGroup}
              index={criterionIdx}
              draftItems={draftItems}
              isEditable={isEditable}
              savingItemId={savingItemId}
              mode={mode}
              canOverride={isHrAdmin && (detail.status === EvaluationStatus.APPROVED || detail.status === EvaluationStatus.PUBLISHED) && !detail.is_locked}
              onLevelChange={handleLevelChange}
              onCommentChange={handleCommentChange}
              onSaveSingle={handleSaveSingle}
              onOverrideKpi={(kpiItemId) => {
                setTargetOverrideKpiId(kpiItemId);
                setIsOverrideModalOpen(true);
              }}
            />
          ))}
        </div>
      </section>

      {/* Submit Confirmation Modal */}
      <SubmitConfirmModal
        isOpen={isSubmitModalOpen}
        missingItems={missingCriteria}
        isSubmitting={submitMutation.isPending || approveMutation.isPending || saveBatchMutation.isPending}
        onConfirm={handleConfirmSubmit}
        onClose={() => setIsSubmitModalOpen(false)}
        mode={mode}
      />

      {isHrAdmin && (
        <OverrideScoreModal
          isOpen={isOverrideModalOpen}
          kpiList={activeCriteria}
          initialSelectedKpiId={targetOverrideKpiId}
          isSubmitting={overrideMutation.isPending}
          onSubmit={handleOverrideSubmit}
          onClose={() => {
            setIsOverrideModalOpen(false);
            setTargetOverrideKpiId(undefined);
          }}
        />
      )}

      <ReviewActionModal
        isOpen={!!reviewActionType}
        actionType={reviewActionType || 'REJECT'}
        isSubmitting={rejectMutation.isPending || requestCorrectionMutation.isPending}
        onConfirm={(reason) => {
          if (reviewActionType === 'REJECT') {
            rejectMutation.mutate(reason);
          } else {
            requestCorrectionMutation.mutate(reason);
          }
        }}
        onClose={() => setReviewActionType(null)}
      />
    </div>
  );
}

export function EvaluationDetailPage() {
  return <EvaluationDetailContent mode="self" />;
}
