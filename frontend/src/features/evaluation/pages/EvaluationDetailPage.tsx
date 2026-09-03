import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { evaluationApi } from '../api/evaluation-api';
import { EvaluationStatus } from '../domain/evaluation-models';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { ArrowLeft, Save, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

// Use simple alert for now since sonner might not be installed
const toast = {
  success: (msg: string) => alert(`Success: ${msg}`),
  error: (msg: string) => alert(`Error: ${msg}`),
};

type EvaluationDetailMode = 'self' | 'manager';

export function EvaluationDetailContent({ mode }: { mode: EvaluationDetailMode }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [draftItems, setDraftItems] = useState<Record<string, { resolved_level?: number; comment?: string }>>({});

  const { data: detail, isLoading } = useQuery({
    queryKey: ['evaluation-detail', id],
    queryFn: () => evaluationApi.getEvaluationDetail(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (detail?.items) {
      const initial: Record<string, { resolved_level?: number; comment?: string }> = {};
      detail.items.forEach(item => {
        initial[item.evaluation_item_id] = {
          resolved_level: item.resolved_level,
          comment: item.comment || '',
        };
      });
      setDraftItems(initial);
    }
  }, [detail]);

  const saveMutation = useMutation({
    mutationFn: (items: any[]) => evaluationApi.saveDraft(id!, items),
    onSuccess: () => {
      toast.success('Draft saved successfully');
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', id] });
    },
    onError: () => toast.error('Failed to save draft'),
  });

  const submitMutation = useMutation({
    mutationFn: () => evaluationApi.submitEvaluation(id!),
    onSuccess: () => {
      toast.success('Evaluation submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['my-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['team-evaluations'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit evaluation'),
  });

  const approveMutation = useMutation({
    mutationFn: () => evaluationApi.approveEvaluation(id!),
    onSuccess: () => {
      toast.success('Evaluation approved successfully');
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['team-evaluations'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to approve evaluation'),
  });

  if (isLoading || !detail) return <div style={{ padding: '24px' }}>Loading...</div>;

  const isManagerMode = mode === 'manager';
  const isEditable = isManagerMode
    ? detail.status === EvaluationStatus.SUBMITTED || detail.status === EvaluationStatus.MANAGER_REVIEW
    : detail.status === EvaluationStatus.OPEN;

  const handleLevelSelect = (itemId: string, level: number) => {
    if (!isEditable) return;
    setDraftItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], resolved_level: level },
    }));
  };

  const handleCommentChange = (itemId: string, comment: string) => {
    if (!isEditable) return;
    setDraftItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], comment },
    }));
  };

  const handleSave = () => {
    const itemsToSave = Object.entries(draftItems).map(([itemId, val]) => ({
      id: itemId,
      resolved_level: val.resolved_level,
      comment: val.comment,
    }));
    saveMutation.mutate(itemsToSave);
  };

  const handleSubmit = () => {
    // Basic validation: Check if all items have a score
    const uncompleted = detail.items.filter(item => !item.is_disabled_for_employee && !draftItems[item.evaluation_item_id]?.resolved_level);
    if (uncompleted.length > 0) {
      toast.error(`Please complete all criteria before submitting. Missing: ${uncompleted.length}`);
      return;
    }
    
    // First save draft, then submit
    const itemsToSave = Object.entries(draftItems).map(([itemId, val]) => ({
      id: itemId,
      resolved_level: val.resolved_level,
      comment: val.comment,
    }));
    
    saveMutation.mutate(itemsToSave, {
      onSuccess: () => {
        if (isManagerMode) {
          approveMutation.mutate();
        } else {
          submitMutation.mutate();
        }
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: COLORS.neutral[50] }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: COLORS.neutral.white, 
        padding: '20px 24px', 
        borderBottom: `1px solid ${COLORS.neutral[200]}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => navigate(isManagerMode ? '/admin/team-evaluations' : '/admin/my-evaluations')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: RADII.full, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = COLORS.neutral[100]}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={20} color={COLORS.neutral.textPrimary} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
              {isManagerMode ? 'Manager Review & Scoring' : 'Evaluation Form'}
            </h1>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, marginTop: '4px' }}>
              Status: <span style={{ fontWeight: 600, color: isEditable ? (COLORS.semantic as any).success.DEFAULT : (COLORS.semantic as any).warning.DEFAULT }}>{detail.status}</span>
            </div>
          </div>
        </div>

        {isEditable && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: RADII.md,
                backgroundColor: COLORS.neutral.white, border: `1px solid ${COLORS.neutral[300]}`,
                color: COLORS.neutral.textPrimary, fontWeight: 500, cursor: 'pointer'
              }}
            >
              <Save size={16} /> Save Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitMutation.isPending || approveMutation.isPending || saveMutation.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: RADII.md,
                backgroundColor: COLORS.primary.DEFAULT, border: 'none',
                color: COLORS.neutral.white, fontWeight: 500, cursor: 'pointer'
              }}
            >
              <Send size={16} /> {isManagerMode ? 'Approve & Finalize' : 'Submit Evaluation'}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        {!isEditable && (
          <div style={{ backgroundColor: (COLORS.semantic as any).warning[50], border: `1px solid ${(COLORS.semantic as any).warning[200]}`, padding: '16px', borderRadius: RADII.md, marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertCircle size={20} color={(COLORS.semantic as any).warning.DEFAULT} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ margin: '0 0 4px', color: (COLORS.semantic as any).warning[800], fontWeight: 600 }}>Read Only</h4>
              <p style={{ margin: 0, color: (COLORS.semantic as any).warning[800], fontSize: TYPOGRAPHY.fontSize.sm }}>This evaluation is in {detail.status} status and can no longer be edited.</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {detail.items.map((item, index) => {
            const draft = draftItems[item.evaluation_item_id];
            const rule = item.scoring_rule_snapshot;
            const levels = item.level_definition_snapshot?.levels || [];

            return (
              <div key={item.evaluation_item_id} style={{ 
                backgroundColor: COLORS.neutral.white, 
                borderRadius: RADII.xl, 
                border: `1px solid ${COLORS.neutral[200]}`,
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <div style={{ padding: '20px', borderBottom: `1px solid ${COLORS.neutral[100]}`, backgroundColor: COLORS.neutral[50] }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: 600, color: COLORS.neutral.textPrimary }}>
                      {index + 1}. {item.criterion_name_snapshot}
                    </h3>
                    <div style={{ backgroundColor: COLORS.primary[50], color: COLORS.primary[700], padding: '4px 8px', borderRadius: RADII.md, fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600 }}>
                      Weight: {item.weight_snapshot}%
                    </div>
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
                    Code: {item.criterion_code_snapshot} | Rule: {rule?.name || 'Standard'}
                  </div>
                </div>

                <div style={{ padding: '20px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 600, color: COLORS.neutral.textPrimary }}>Select Level</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {levels.map((lvl: any) => {
                        const isSelected = draft?.resolved_level === lvl.level;
                        return (
                          <div
                            key={lvl.level}
                            onClick={() => handleLevelSelect(item.evaluation_item_id, lvl.level)}
                            style={{
                              padding: '12px 16px',
                              borderRadius: RADII.md,
                              border: `1px solid ${isSelected ? COLORS.primary.DEFAULT : COLORS.neutral[200]}`,
                              backgroundColor: isSelected ? COLORS.primary[50] : COLORS.neutral.white,
                              cursor: isEditable ? 'pointer' : 'default',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ marginTop: '2px' }}>
                              {isSelected ? (
                                <CheckCircle2 size={18} color={COLORS.primary.DEFAULT} />
                              ) : (
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${COLORS.neutral[300]}` }} />
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500, color: isSelected ? COLORS.primary[900] : COLORS.neutral.textPrimary }}>
                                Level {lvl.level}: {lvl.name || `Score ${lvl.score}`}
                              </div>
                              {lvl.description && (
                                <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, marginTop: '4px' }}>
                                  {lvl.description}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 600, color: COLORS.neutral.textPrimary }}>Comments / Evidence</h4>
                    <textarea
                      disabled={!isEditable}
                      value={draft?.comment || ''}
                      onChange={(e) => handleCommentChange(item.evaluation_item_id, e.target.value)}
                      placeholder="Provide evidence or comments for your self-evaluation..."
                      style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '12px',
                        borderRadius: RADII.md,
                        border: `1px solid ${COLORS.neutral[300]}`,
                        backgroundColor: !isEditable ? COLORS.neutral[100] : COLORS.neutral.white,
                        fontFamily: 'inherit',
                        fontSize: TYPOGRAPHY.fontSize.sm,
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function EvaluationDetailPage() {
  return <EvaluationDetailContent mode="self" />;
}
