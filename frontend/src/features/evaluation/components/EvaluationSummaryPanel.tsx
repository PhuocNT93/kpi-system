import React from 'react';
import { EvaluationStatus } from '../domain/evaluation-models';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { Award, UserCheck, ShieldCheck, CheckCircle2, FileCheck } from 'lucide-react';

interface EvaluationSummaryPanelProps {
  status: EvaluationStatus | string;
  selfScore?: number | null;
  managerScore?: number | null;
  finalScore?: number | null;
  approvedAt?: string | null;
  categoryBreakdown?: Array<{
    categoryName: string;
    weight: number;
    score?: number;
  }>;
}

export const EvaluationSummaryPanel: React.FC<EvaluationSummaryPanelProps> = ({
  status,
  selfScore,
  managerScore,
  finalScore,
  approvedAt,
  categoryBreakdown,
}) => {
  const isPublished = (status as string) === 'PUBLISHED';
  const hasSelfScore = selfScore !== undefined && selfScore !== null;
  const hasManagerScore = isPublished && managerScore !== undefined && managerScore !== null;
  const hasFinalScore = isPublished && finalScore !== undefined && finalScore !== null;

  return (
    <div
      style={{
        backgroundColor: COLORS.neutral.white,
        borderRadius: RADII.xl,
        border: `1px solid ${COLORS.neutral[200]}`,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Award size={20} color={COLORS.primary.DEFAULT} />
        <h2 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
          Tổng quan kết quả đánh giá
        </h2>
      </div>

      {/* Score Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Self Score Card */}
        <div
          style={{
            padding: '16px',
            borderRadius: RADII.lg,
            backgroundColor: COLORS.primary[50],
            border: `1px solid ${COLORS.primary[200]}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: RADII.md,
              backgroundColor: COLORS.primary[100],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: COLORS.primary.DEFAULT,
              flexShrink: 0,
            }}
          >
            <UserCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: COLORS.primary[800] }}>
              Điểm Tự Đánh Giá (Self)
            </div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: 700, color: COLORS.primary[900] }}>
              {hasSelfScore ? selfScore.toFixed(2) : 'Chưa có'}
            </div>
          </div>
        </div>

        {/* Manager Score Card (Only shown if published/permitted) */}
        {hasManagerScore && (
          <div
            style={{
              padding: '16px',
              borderRadius: RADII.lg,
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: RADII.md,
                backgroundColor: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1d4ed8',
                flexShrink: 0,
              }}
            >
              <FileCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: '#1e40af' }}>
                Điểm Quản Lý Đánh Giá
              </div>
              <div style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: 700, color: '#1e3a8a' }}>
                {managerScore.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Final Score Card (Only shown if published/permitted) */}
        {hasFinalScore && (
          <div
            style={{
              padding: '16px',
              borderRadius: RADII.lg,
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: RADII.md,
                backgroundColor: '#d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#047857',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: '#065f46' }}>
                Điểm Chính Thức (Final)
              </div>
              <div style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: 700, color: '#064e3b' }}>
                {finalScore.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Published Notice */}
      {isPublished && approvedAt && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
          <CheckCircle2 size={14} color="#059669" />
          <span>
            Kết quả đã được công bố chính thức vào lúc {new Date(approvedAt).toLocaleString('vi-VN')}.
          </span>
        </div>
      )}

      {/* Category Breakdown (if available) */}
      {categoryBreakdown && categoryBreakdown.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 600, color: COLORS.neutral.textPrimary }}>
            Phân bổ điểm theo nhóm tiêu chí (Category Breakdown)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categoryBreakdown.map((cat, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: RADII.md,
                  backgroundColor: COLORS.neutral[50],
                  border: `1px solid ${COLORS.neutral[200]}`,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 500, color: COLORS.neutral.textPrimary }}>{cat.categoryName}</span>
                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    ({cat.weight}%)
                  </span>
                </div>
                {cat.score !== undefined && (
                  <span style={{ fontWeight: 600, color: COLORS.primary.DEFAULT }}>
                    {cat.score.toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
