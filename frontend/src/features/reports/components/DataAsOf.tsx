import React from 'react';
import { Clock } from 'lucide-react';
import { TYPOGRAPHY } from '@/shared/theme';
import { COLORS } from '@/lib/theme';

interface DataAsOfProps {
  timestamp?: string | null;
}

export const DataAsOf: React.FC<DataAsOfProps> = ({ timestamp }) => {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);

  return (
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '6px', 
      fontSize: TYPOGRAPHY.fontSize.xs, 
      color: COLORS.neutral.textSecondary,
      backgroundColor: COLORS.neutral[50],
      padding: '4px 8px',
      borderRadius: '4px',
      border: `1px solid ${COLORS.neutral[200]}`
    }}>
      <Clock size={12} />
      <span>Data as of {formattedTime}</span>
    </div>
  );
};
