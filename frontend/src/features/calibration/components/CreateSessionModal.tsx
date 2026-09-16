import React, { useState } from 'react';
import type { CalibrationScopeType, CreateSessionDTO } from '../types/calibration-types';
import { Button } from '@/shared/ui/Button/Button';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { PlusCircle, X, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  cycleId: string;
  cycleName?: string;
  onClose: () => void;
  onSubmit: (data: CreateSessionDTO) => Promise<void>;
  isPending: boolean;
}

export const CreateSessionModal: React.FC<Props> = ({
  isOpen,
  cycleId,
  cycleName,
  onClose,
  onSubmit,
  isPending,
}) => {
  const [scopeType, setScopeType] = useState<CalibrationScopeType>('ORG');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit({
        evaluation_cycle_id: cycleId,
        scope_type: scopeType,
        scope_id: null,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo phiên hiệu chuẩn.');
    }
  };

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
          maxWidth: '480px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
              <PlusCircle size={20} />
            </span>
            <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: 700, color: '#0f172a' }}>
              Tạo phiên hiệu chuẩn mới
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

          <div>
            <label style={{ display: 'block', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Kỳ đánh giá (Evaluation Cycle)
            </label>
            <input
              type="text"
              value={cycleName || cycleId}
              disabled
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: RADII.md,
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                fontSize: TYPOGRAPHY.fontSize.sm,
                color: '#64748b',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Phạm vi hiệu chuẩn (Scope)
            </label>
            <select
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value as CalibrationScopeType)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: RADII.md,
                border: '1px solid #cbd5e1',
                fontSize: TYPOGRAPHY.fontSize.sm,
                backgroundColor: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              <option value="ORG">Toàn công ty (Org-wide)</option>
              <option value="DEPARTMENT">Theo phòng ban (Department)</option>
              <option value="TEAM">Theo nhóm dự án (Team)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="outlined" size="sm" onClick={onClose} disabled={isPending}>
              Hủy bỏ
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? 'Đang tạo...' : 'Tạo phiên hiệu chuẩn'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
