import React, { useState, useEffect } from 'react';
import type { CalibrationEvaluationRow } from '../types/calibration-types';
import { Button } from '@/shared/ui/Button/Button';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { Sliders, AlertCircle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  evaluation: CalibrationEvaluationRow | null;
  onClose: () => void;
  onSubmit: (evaluationId: string, newScore: number, reason: string) => Promise<void>;
  isPending: boolean;
}

export const CalibrationAdjustmentModal: React.FC<Props> = ({
  isOpen,
  evaluation,
  onClose,
  onSubmit,
  isPending,
}) => {
  const [newScore, setNewScore] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (evaluation) {
      const currentScore = evaluation.finalScore ?? evaluation.calculatedScore ?? 0;
      setNewScore(String(currentScore));
      setReason('');
      setError(null);
    }
  }, [evaluation]);

  if (!isOpen || !evaluation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const scoreNum = parseFloat(newScore);

    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setError('Điểm số hiệu chuẩn phải là số hợp lệ từ 0 đến 100.');
      return;
    }

    if (!reason.trim() || reason.trim().length < 3) {
      setError('Lý do điều chỉnh điểm là bắt buộc (tối thiểu 3 ký tự) để phục vụ kiểm toán.');
      return;
    }

    try {
      await onSubmit(evaluation.evaluationId, scoreNum, reason.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi cập nhật điểm hiệu chuẩn.');
    }
  };

  const originalScore = evaluation.calculatedScore != null ? evaluation.calculatedScore.toFixed(2) : 'Chưa có';
  const currentFinalScore = evaluation.finalScore != null ? evaluation.finalScore.toFixed(2) : originalScore;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: RADII.xl,
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: RADII.lg,
                backgroundColor: '#eff6ff',
                color: '#2563eb',
              }}
            >
              <Sliders size={18} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: 700, color: '#0f172a' }}>
                Hiệu chuẩn điểm đánh giá
              </h3>
              <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b' }}>
                {evaluation.employeeName} &bull; {evaluation.employeeCode}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              borderRadius: RADII.sm,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Current Score Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div
              style={{
                padding: '12px',
                borderRadius: RADII.lg,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Điểm tính toán gốc</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>
                {originalScore}
              </div>
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: RADII.lg,
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
              }}
            >
              <div style={{ fontSize: '11px', color: '#1d4ed8', marginBottom: '2px' }}>Điểm cuối hiện tại</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1d4ed8' }}>
                {currentFinalScore}
              </div>
            </div>
          </div>

          {/* Input New Score */}
          <div>
            <label
              htmlFor="newScore"
              style={{
                display: 'block',
                fontSize: TYPOGRAPHY.fontSize.xs,
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Điểm hiệu chuẩn mới (Final Score) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="newScore"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              placeholder="Nhập điểm số (0 - 100)"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: RADII.md,
                border: '1px solid #cbd5e1',
                fontSize: TYPOGRAPHY.fontSize.sm,
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              required
            />
          </div>

          {/* Input Reason */}
          <div>
            <label
              htmlFor="adjustmentReason"
              style={{
                display: 'block',
                fontSize: TYPOGRAPHY.fontSize.xs,
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Lý do điều chỉnh (Bắt buộc kiểm toán) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              id="adjustmentReason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Cân bằng theo đường cong năng suất chung của team; kết quả dự án hoàn thành xuất sắc đột xuất..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: RADII.md,
                border: '1px solid #cbd5e1',
                fontSize: TYPOGRAPHY.fontSize.sm,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              required
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button type="button" variant="outlined" size="sm" onClick={onClose} disabled={isPending}>
              Hủy bỏ
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? 'Đang lưu...' : 'Lưu hiệu chuẩn'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
