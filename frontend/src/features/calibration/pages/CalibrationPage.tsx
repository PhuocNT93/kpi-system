import { useState, useEffect } from 'react';
import { useEvaluationCyclesQuery } from '../../evaluation-cycles/hooks/use-evaluation-cycles';
import {
  useCalibrationSessions,
  useCalibrationSessionDetail,
  useCreateCalibrationSessionMutation,
  useAdjustScoreMutation,
  useFinalizeSessionMutation,
} from '../hooks/use-calibration';
import { CalibrationDistributionChart } from '../components/CalibrationDistributionChart';
import { CalibrationAdjustmentModal } from '../components/CalibrationAdjustmentModal';
import { CreateSessionModal } from '../components/CreateSessionModal';
import type { CalibrationEvaluationRow, CreateSessionDTO } from '../types/calibration-types';
import { Button } from '@/shared/ui/Button/Button';
import { LoadingSpinner, EmptyState } from '@/shared/components/ui';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import {
  SlidersHorizontal,
  PlusCircle,
  CheckCircle2,
  Lock,
  History,
  Calendar,
  Layers,
} from 'lucide-react';

export function CalibrationPage() {
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [adjustingEvaluation, setAdjustingEvaluation] = useState<CalibrationEvaluationRow | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const cyclesQuery = useEvaluationCyclesQuery();
  const sessionsQuery = useCalibrationSessions(selectedCycleId);
  const sessionDetailQuery = useCalibrationSessionDetail(selectedSessionId);

  const createSessionMutation = useCreateCalibrationSessionMutation();
  const adjustScoreMutation = useAdjustScoreMutation(selectedSessionId);
  const finalizeSessionMutation = useFinalizeSessionMutation(selectedSessionId);

  // Auto-select first cycle when cycles load
  useEffect(() => {
    if (cyclesQuery.data && cyclesQuery.data.length > 0 && !selectedCycleId) {
      const activeCycle = cyclesQuery.data.find(
        (c) => c.status === 'CALIBRATION' || c.status === 'REVIEWING' || c.status === 'IN_PROGRESS'
      );
      setSelectedCycleId(activeCycle ? activeCycle.id : cyclesQuery.data[0].id);
    }
  }, [cyclesQuery.data, selectedCycleId]);

  // Auto-select first session when sessions load
  useEffect(() => {
    if (sessionsQuery.data && sessionsQuery.data.length > 0) {
      const activeSession = sessionsQuery.data.find((s) => s.status === 'OPEN') || sessionsQuery.data[0];
      setSelectedSessionId(activeSession.calibrationSessionId);
    } else {
      setSelectedSessionId('');
    }
  }, [sessionsQuery.data]);

  const selectedCycle = cyclesQuery.data?.find((c) => c.id === selectedCycleId);
  const sessionDetail = sessionDetailQuery.data;
  const isFinalized = sessionDetail?.session.status === 'FINALIZED';

  const handleCreateSession = async (data: CreateSessionDTO) => {
    try {
      const newSession = await createSessionMutation.mutateAsync(data);
      setSelectedSessionId(newSession.calibrationSessionId);
      setFeedbackMsg({ type: 'success', text: 'Tạo phiên hiệu chuẩn điểm thành công!' });
    } catch (err: unknown) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Lỗi khi tạo phiên hiệu chuẩn.' });
    }
  };

  const handleAdjustSubmit = async (evaluationId: string, newScore: number, reason: string) => {
    await adjustScoreMutation.mutateAsync({
      evaluation_id: evaluationId,
      new_final_score: newScore,
      reason,
    });
    setFeedbackMsg({ type: 'success', text: 'Hiệu chuẩn điểm số thành công và đã ghi log kiểm toán.' });
  };

  const handleFinalize = async () => {
    if (
      window.confirm(
        'Bạn có chắc chắn muốn chốt (Finalize) phiên hiệu chuẩn này? Điểm số cuối cùng của nhân viên sẽ được khóa và không thể chỉnh sửa thêm trong phiên này.'
      )
    ) {
      try {
        await finalizeSessionMutation.mutateAsync();
        setFeedbackMsg({ type: 'success', text: 'Đã chốt phiên hiệu chuẩn điểm thành công!' });
      } catch (err: unknown) {
        setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Lỗi khi chốt phiên hiệu chuẩn.' });
      }
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '42px',
              borderRadius: RADII.xl,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
            }}
          >
            <SlidersHorizontal size={24} />
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral[900] }}>
              Hiệu chuẩn điểm đánh giá (Calibration Sessions)
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral[500] }}>
              Cân bằng phân bổ điểm số của các phòng ban/nhóm, điều chỉnh điểm cuối cùng (Final Score) kèm lý do bắt buộc.
            </p>
          </div>
        </div>

        {/* Action button */}
        {selectedCycleId && (
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <PlusCircle size={16} style={{ marginRight: '6px' }} />
            Tạo phiên hiệu chuẩn mới
          </Button>
        )}
      </div>

      {/* Feedback banner */}
      {feedbackMsg && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: RADII.lg,
            backgroundColor: feedbackMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
            border: `1px solid ${feedbackMsg.type === 'success' ? '#86efac' : '#fca5a5'}`,
            color: feedbackMsg.type === 'success' ? '#15803d' : '#991b1b',
            fontSize: TYPOGRAPHY.fontSize.sm,
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Cycle & Session Selectors Bar */}
      <section
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
          backgroundColor: '#fff',
          padding: '16px 20px',
          borderRadius: RADII.xl,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Select Cycle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} color="#64748b" />
          <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: '#475569' }}>Kỳ đánh giá:</span>
          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: RADII.md,
              border: '1px solid #cbd5e1',
              fontSize: TYPOGRAPHY.fontSize.sm,
              backgroundColor: '#fff',
              outline: 'none',
              fontWeight: 500,
            }}
          >
            {cyclesQuery.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code}) - {c.status}
              </option>
            ))}
          </select>
        </div>

        {/* Select Session */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} color="#64748b" />
          <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: '#475569' }}>Phiên hiệu chuẩn:</span>
          {sessionsQuery.data && sessionsQuery.data.length > 0 ? (
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: RADII.md,
                border: '1px solid #cbd5e1',
                fontSize: TYPOGRAPHY.fontSize.sm,
                backgroundColor: '#fff',
                outline: 'none',
                fontWeight: 500,
              }}
            >
              {sessionsQuery.data.map((s) => (
                <option key={s.calibrationSessionId} value={s.calibrationSessionId}>
                  {s.scopeType} - {s.scopeName} [{s.status}] ({new Date(s.createdAt).toLocaleDateString('vi-VN')})
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#94a3b8', fontStyle: 'italic' }}>
              Chưa có phiên nào. Bấm nút tạo phiên ở trên.
            </span>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      {sessionsQuery.isLoading || sessionDetailQuery.isLoading ? (
        <LoadingSpinner label="Đang tải phiên hiệu chuẩn điểm..." />
      ) : !sessionDetail ? (
        <EmptyState message="Vui lòng chọn hoặc tạo mới một phiên hiệu chuẩn để bắt đầu cân bằng điểm số." />
      ) : (
        <>
          {/* Session Banner */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: RADII.xl,
              backgroundColor: isFinalized ? '#f8fafc' : '#eff6ff',
              border: `1px solid ${isFinalized ? '#cbd5e1' : '#bfdbfe'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.base, fontWeight: 700, color: '#0f172a' }}>
                  {sessionDetail.session.scopeType} &bull; {sessionDetail.session.scopeName}
                </span>
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: RADII.full,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: isFinalized ? '#e2e8f0' : '#dcfce7',
                    color: isFinalized ? '#475569' : '#166534',
                    border: `1px solid ${isFinalized ? '#cbd5e1' : '#bbf7d0'}`,
                  }}
                >
                  {isFinalized ? 'ĐÃ CHỐT (FINALIZED)' : 'ĐANG MỞ (OPEN)'}
                </span>
              </div>
              <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b', marginTop: '4px' }}>
                Tạo bởi {sessionDetail.session.createdByName || 'Hệ thống'} vào{' '}
                {new Date(sessionDetail.session.createdAt).toLocaleString('vi-VN')}
              </div>
            </div>

            <div>
              {!isFinalized ? (
                <Button
                  size="sm"
                  onClick={handleFinalize}
                  disabled={finalizeSessionMutation.isPending}
                >
                  <CheckCircle2 size={16} style={{ marginRight: '6px' }} />
                  {finalizeSessionMutation.isPending ? 'Đang chốt...' : 'Chốt phiên hiệu chuẩn (Finalize)'}
                </Button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600 }}>
                  <Lock size={16} />
                  <span>Phiên đã chốt hoàn tất (Chỉ đọc)</span>
                </div>
              )}
            </div>
          </div>

          {/* Score Distribution Chart */}
          <CalibrationDistributionChart distribution={sessionDetail.distribution} />

          {/* Evaluations Table */}
          <section
            style={{
              backgroundColor: '#fff',
              borderRadius: RADII.xl,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: 700, color: '#0f172a' }}>
                  Danh sách nhân viên ({sessionDetail.evaluations.length})
                </h3>
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b' }}>
                  Điểm tính toán gốc và điểm cuối cùng sau hiệu chuẩn.
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.sm }}>
                <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Nhân viên</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Mã NV</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Nhóm / Phòng ban</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Trạng thái</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Điểm gốc</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Điểm sau hiệu chuẩn</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Lịch sử điều chỉnh</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionDetail.evaluations.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        Không có nhân viên nào trong phạm vi hiệu chuẩn này.
                      </td>
                    </tr>
                  ) : (
                    sessionDetail.evaluations.map((row) => {
                      const isAdjusted = row.finalScore != null && row.calculatedScore != null && row.finalScore !== row.calculatedScore;
                      return (
                        <tr key={row.evaluationId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                            {row.employeeName}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace' }}>
                            {row.employeeCode}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>
                            {row.teamName || row.departmentName || '-'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: RADII.full,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                              }}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>
                            {row.calculatedScore != null ? row.calculatedScore.toFixed(2) : '-'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: '0.9375rem',
                                color: isAdjusted ? '#2563eb' : '#0f172a',
                              }}
                            >
                              {row.finalScore != null
                                ? row.finalScore.toFixed(2)
                                : row.calculatedScore != null
                                ? row.calculatedScore.toFixed(2)
                                : '-'}
                            </span>
                            {isAdjusted && (
                              <span
                                style={{
                                  marginLeft: '6px',
                                  fontSize: '0.7rem',
                                  backgroundColor: '#dbeafe',
                                  color: '#1e40af',
                                  padding: '1px 6px',
                                  borderRadius: RADII.sm,
                                  fontWeight: 600,
                                }}
                              >
                                Đã hiệu chuẩn
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#64748b', maxWidth: '260px' }}>
                            {row.latestAdjustmentReason ? (
                              <div>
                                <div style={{ fontWeight: 500, color: '#334155' }}>&ldquo;{row.latestAdjustmentReason}&rdquo;</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                  Bởi {row.latestAdjustedByName || 'Admin'} vào{' '}
                                  {new Date(row.latestAdjustedAt!).toLocaleDateString('vi-VN')}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>Chưa có điều chỉnh</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <Button
                              size="sm"
                              variant="outlined"
                              onClick={() => setAdjustingEvaluation(row)}
                              disabled={isFinalized || row.isLocked}
                            >
                              Hiệu chuẩn điểm
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Adjustments Log */}
          {sessionDetail.adjustments.length > 0 && (
            <section
              style={{
                backgroundColor: '#fff',
                borderRadius: RADII.xl,
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <History size={18} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: 700, color: '#0f172a' }}>
                  Lịch sử các lần hiệu chuẩn trong phiên này ({sessionDetail.adjustments.length})
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sessionDetail.adjustments.map((adj) => (
                  <div
                    key={adj.calibrationAdjustmentId}
                    style={{
                      padding: '12px 16px',
                      borderRadius: RADII.lg,
                      backgroundColor: '#f8fafc',
                      border: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                      fontSize: TYPOGRAPHY.fontSize.xs,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{adj.employeeName}</span>{' '}
                      <span style={{ color: '#64748b' }}>({adj.employeeCode}):</span>{' '}
                      <span style={{ textDecoration: 'line-through', color: '#ef4444' }}>
                        {adj.oldFinalScore.toFixed(2)}
                      </span>{' '}
                      &rarr;{' '}
                      <span style={{ fontWeight: 700, color: '#16a34a' }}>
                        {adj.newFinalScore.toFixed(2)}
                      </span>
                      <div style={{ color: '#475569', marginTop: '3px' }}>
                        <em>Lý do:</em> {adj.reason}
                      </div>
                    </div>

                    <div style={{ color: '#94a3b8', textAlign: 'right' }}>
                      <div>Bởi: {adj.adjustedByName || 'Admin'}</div>
                      <div>{new Date(adj.adjustedAt).toLocaleString('vi-VN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modals */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        cycleId={selectedCycleId}
        cycleName={selectedCycle?.name}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSession}
        isPending={createSessionMutation.isPending}
      />

      <CalibrationAdjustmentModal
        isOpen={Boolean(adjustingEvaluation)}
        evaluation={adjustingEvaluation}
        onClose={() => setAdjustingEvaluation(null)}
        onSubmit={handleAdjustSubmit}
        isPending={adjustScoreMutation.isPending}
      />
    </main>
  );
}
