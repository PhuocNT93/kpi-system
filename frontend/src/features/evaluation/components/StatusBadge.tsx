import React from 'react';
import { EvaluationStatus } from '../domain/evaluation-models';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { 
  PlayCircle, 
  Send, 
  Clock, 
  CheckCircle, 
  CheckCircle2, 
  Lock, 
  FileEdit,
  AlertCircle 
} from 'lucide-react';

interface StatusBadgeProps {
  status: EvaluationStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = (st: string) => {
    switch (st) {
      case 'DRAFT':
        return {
          label: 'Chưa mở (Draft)',
          bg: COLORS.neutral[100],
          text: COLORS.neutral[700],
          icon: FileEdit,
        };
      case EvaluationStatus.OPEN:
      case 'SELF_ASSESSMENT':
        return {
          label: 'Đang tự đánh giá (Open)',
          bg: '#ecfdf5',
          text: '#047857',
          icon: PlayCircle,
        };
      case EvaluationStatus.SUBMITTED:
      case 'MANAGER_ASSESSMENT':
        return {
          label: 'Đã nộp / Chờ Manager',
          bg: '#fef3c7',
          text: '#b45309',
          icon: Send,
        };
      case EvaluationStatus.MANAGER_REVIEW:
      case 'REVIEWING':
        return {
          label: 'Đang Review',
          bg: '#eff6ff',
          text: '#1d4ed8',
          icon: Clock,
        };
      case 'CALIBRATION':
        return {
          label: 'Đang Calibration',
          bg: '#f3e8ff',
          text: '#6b21a8',
          icon: Clock,
        };
      case EvaluationStatus.APPROVED:
        return {
          label: 'Đã duyệt (Approved)',
          bg: '#f0fdf4',
          text: '#15803d',
          icon: CheckCircle,
        };
      case 'PUBLISHED':
        return {
          label: 'Đã công bố (Published)',
          bg: '#ecfdf5',
          text: '#065f46',
          icon: CheckCircle2,
        };
      case EvaluationStatus.LOCKED:
        return {
          label: 'Đã khóa (Locked)',
          bg: COLORS.neutral[200],
          text: COLORS.neutral[800],
          icon: Lock,
        };
      default:
        return {
          label: st,
          bg: COLORS.neutral[100],
          text: COLORS.neutral[600],
          icon: AlertCircle,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? '4px' : '6px',
        padding: isSm ? '2px 8px' : '4px 10px',
        borderRadius: RADII.full,
        fontSize: isSm ? TYPOGRAPHY.fontSize.xs : TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        backgroundColor: config.bg,
        color: config.text,
        lineHeight: 1.2,
      }}
    >
      <Icon size={isSm ? 12 : 14} />
      <span>{config.label}</span>
    </span>
  );
};
