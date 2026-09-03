import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { evaluationApi } from '../api/evaluation-api';
import { EvaluationStatus } from '../domain/evaluation-models';
import { EvaluationHeader } from '../components/EvaluationHeader';
import { EvaluationSummaryPanel } from '../components/EvaluationSummaryPanel';
import { CriterionCard } from '../components/CriterionCard';
import { SubmitConfirmModal } from '../components/SubmitConfirmModal';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { AlertCircle, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

type EvaluationDetailMode = 'self' | 'manager';

interface DraftItemState {
  resolved_level?: number | null;
  comment?: string;
  isDirty?: boolean;
}

export function EvaluationDetailContent({ mode }: { mode: EvaluationDetailMode }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [draftItems, setDraftItems] = useState<Record<string, DraftItemState>>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

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

  // Sync draft state with server detail
  useEffect(() => {
    if (detail?.items) {
      const initial: Record<string, DraftItemState> = {};
      detail.items.forEach((item) => {
        initial[item.evaluation_item_id] = {
          resolved_level: item.resolved_level ?? null,
          comment: item.comment || '',
          isDirty: false,
        };
      });
      setDraftItems(initial);
    }
  }, [detail]);

  const isManagerMode = mode === 'manager';
  const isEditable = isManagerMode
    ? detail?.status === EvaluationStatus.SUBMITTED || detail?.status === EvaluationStatus.MANAGER_REVIEW
    : detail?.status === EvaluationStatus.OPEN || (detail?.status as any) === 'SELF_ASSESSMENT';

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
    onError: (err: any) => {
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
    onError: (err: any) => {
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
      showToast('success', 'Đã nộp bản tự đánh giá thành công! Đánh giá đã chuyển sang trạng thái Chờ Quản lý.');
      setIsSubmitModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['my-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['team-evaluations'] });
    },
    onError: (err: any) => {
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
    onError: (err: any) => {
      showToast('error', err.message || 'Không thể duyệt đánh giá.');
    },
  });

  // Level selection handler
  const handleLevelChange = (itemId: string, level: number) => {
    if (!isEditable) return;
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
    if (!isEditable) return;
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
    const itemsToSave = Object.entries(draftItems).map(([itemId, val]) => ({
      id: itemId,
      resolved_level: val.resolved_level !== null ? val.resolved_level : undefined,
      comment: val.comment,
    }));
    saveBatchMutation.mutate(itemsToSave);
  };

  // Save single item
  const handleSaveSingle = (itemId: string) => {
    const itemDraft = draftItems[itemId];
    if (!itemDraft) return;
    saveSingleMutation.mutate({
      itemId,
      payload: {
        resolved_level: itemDraft.resolved_level !== null ? itemDraft.resolved_level : undefined,
        comment: itemDraft.comment,
      },
    });
  };

  // Calculate missing items for submit check
  const activeCriteria = useMemo(() => {
    if (!detail?.items) return [];
    return detail.items.filter((item) => !item.is_disabled_for_employee);
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
        name: item.criterion_name_snapshot,
      }));
  }, [activeCriteria, draftItems]);

  const completedCount = activeCriteria.length - missingCriteria.length;

  // Open submit confirmation modal
  const handleOpenSubmit = () => {
    setIsSubmitModalOpen(true);
  };

  // Confirm submit after saving dirty items if any
  const handleConfirmSubmit = () => {
    if (hasUnsavedChanges) {
      const itemsToSave = Object.entries(draftItems).map(([itemId, val]) => ({
        id: itemId,
        resolved_level: val.resolved_level !== null ? val.resolved_level : undefined,
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
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
            {(error as any)?.message || 'Bạn không có quyền truy cập hoặc bản đánh giá không tồn tại.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/admin/my-evaluations')}
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
        maxWidth: '1100px',
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
        cycleName="Kỳ Đánh Giá Hiệu Suất"
        status={detail.status}
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
      />

      {/* Summary Score Panel */}
      <EvaluationSummaryPanel
        status={detail.status}
        selfScore={detail.self_score}
        managerScore={detail.manager_score}
        finalScore={detail.final_score}
      />

      {/* Criteria Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
            Danh sách tiêu chí đánh giá ({detail.items.length})
          </h2>
          {isEditable && (
            <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
              * Chọn mức độ và nhập giải trình cho từng tiêu chí
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {detail.items.map((item, index) => {
            const draft = draftItems[item.evaluation_item_id];
            return (
              <CriterionCard
                key={item.evaluation_item_id}
                item={item}
                index={index}
                resolvedLevel={draft?.resolved_level}
                comment={draft?.comment}
                isDirty={draft?.isDirty}
                isEditable={isEditable}
                onLevelChange={(lvl) => handleLevelChange(item.evaluation_item_id, lvl)}
                onCommentChange={(cmt) => handleCommentChange(item.evaluation_item_id, cmt)}
                onSaveSingle={() => handleSaveSingle(item.evaluation_item_id)}
                isSavingSingle={savingItemId === item.evaluation_item_id}
              />
            );
          })}
        </div>
      </section>

      {/* Submit Confirmation Modal */}
      <SubmitConfirmModal
        isOpen={isSubmitModalOpen}
        missingItems={missingCriteria}
        isSubmitting={submitMutation.isPending || approveMutation.isPending || saveBatchMutation.isPending}
        onConfirm={handleConfirmSubmit}
        onClose={() => setIsSubmitModalOpen(false)}
      />
    </div>
  );
}

export function EvaluationDetailPage() {
  return <EvaluationDetailContent mode="self" />;
}

