import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { evaluationApi } from '../api/evaluation-api';
import { EvaluationStatus } from '../domain/evaluation-models';
import { ActiveEvaluationCard } from '../components/ActiveEvaluationCard';
import { EvaluationHistoryTable } from '../components/EvaluationHistoryTable';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { LayoutTemplate, AlertCircle, RefreshCw, History } from 'lucide-react';

export function MyEvaluationPage() {
  const {
    data: evaluations = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-evaluations'],
    queryFn: evaluationApi.getMyEvaluations,
  });

  // Split into active evaluation and past/history evaluations
  const { activeEvaluation, pastEvaluations } = useMemo(() => {
    if (!evaluations || evaluations.length === 0) {
      return { activeEvaluation: null, pastEvaluations: [] };
    }

    // Find the first open/active evaluation, or the latest evaluation
    const active = evaluations.find(
      (e) =>
        e.evaluation.status === EvaluationStatus.OPEN ||
        (e.evaluation.status as any) === 'SELF_ASSESSMENT'
    ) || evaluations[0];

    const past = evaluations.filter(
      (e) => e.evaluation.evaluation_id !== active?.evaluation.evaluation_id
    );

    return { activeEvaluation: active, pastEvaluations: past };
  }, [evaluations]);

  // Loading State
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
        <div>
          <div style={{ width: '240px', height: '32px', backgroundColor: COLORS.neutral[200], borderRadius: RADII.md, marginBottom: '8px' }} />
          <div style={{ width: '380px', height: '18px', backgroundColor: COLORS.neutral[200], borderRadius: RADII.sm }} />
        </div>

        <div
          style={{
            height: '220px',
            backgroundColor: COLORS.neutral.white,
            borderRadius: RADII['2xl'],
            border: `1px solid ${COLORS.neutral[200]}`,
            padding: '24px',
          }}
        >
          <div style={{ width: '180px', height: '24px', backgroundColor: COLORS.neutral[200], borderRadius: RADII.sm, marginBottom: '16px' }} />
          <div style={{ width: '100%', height: '40px', backgroundColor: COLORS.neutral[100], borderRadius: RADII.md, marginBottom: '16px' }} />
          <div style={{ width: '120px', height: '36px', backgroundColor: COLORS.neutral[200], borderRadius: RADII.md, marginLeft: 'auto' }} />
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
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
            Không thể tải dữ liệu đánh giá
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: TYPOGRAPHY.fontSize.sm, color: '#7f1d1d' }}>
            {(error as any)?.message || 'Đã có lỗi xảy ra khi kết nối máy chủ. Vui lòng thử lại.'}
          </p>
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
    );
  }

  // Empty State
  if (evaluations.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
            My Evaluation
          </h1>
          <p style={{ margin: 0, color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm }}>
            Theo dõi và thực hiện tự đánh giá hiệu suất của bạn theo từng kỳ đánh giá.
          </p>
        </div>

        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: COLORS.neutral.white,
            borderRadius: RADII['2xl'],
            border: `1.5px dashed ${COLORS.neutral[300]}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: RADII.full,
              backgroundColor: COLORS.neutral[100],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: COLORS.neutral[400],
            }}
          >
            <LayoutTemplate size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
            Chưa có kỳ đánh giá nào
          </h3>
          <p style={{ margin: 0, color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm, maxWidth: '420px', lineHeight: 1.5 }}>
            Hiện tại bạn chưa được gán kỳ đánh giá nào. Khi Phòng Nhân sự (HR) hoặc Quản lý mở kỳ đánh giá mới, thông tin sẽ xuất hiện tại đây.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
          My Evaluation
        </h1>
        <p style={{ margin: 0, color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm }}>
          Quản lý quá trình tự đánh giá hiệu suất, theo dõi tiến độ và xem kết quả chính thức của bạn.
        </p>
      </div>

      {/* Active Evaluation Section */}
      {activeEvaluation && (
        <section>
          <ActiveEvaluationCard evaluation={activeEvaluation} />
        </section>
      )}

      {/* Past Cycles & Evaluation History Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color={COLORS.neutral[600]} />
          <h2 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
            Lịch sử các kỳ đánh giá
          </h2>
        </div>

        <EvaluationHistoryTable evaluations={pastEvaluations.length > 0 ? pastEvaluations : evaluations} />
      </section>
    </div>
  );
}
