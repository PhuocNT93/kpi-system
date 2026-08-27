interface WeightStatusBarProps {
  totalWeight: number;
  hasConditionalApplicability?: boolean;
}

export function WeightStatusBar({
  totalWeight,
  hasConditionalApplicability = false,
}: WeightStatusBarProps) {
  const rounded = Math.round(totalWeight * 100) / 100;
  const isSuccess = Math.abs(rounded - 100) <= 0.01;
  const isUnder = rounded < 100;
  const isOver = rounded > 100;

  let badgeColor = '#059669'; // success green
  let badgeBg = '#d1fae5';
  let badgeBorder = '#10b981';
  let labelText = '100% Configured · Valid';
  let detailText = 'Total configured criteria weight equals exactly 100%.';

  if (isUnder) {
    const diff = Math.round((100 - rounded) * 100) / 100;
    badgeColor = '#b45309'; // warning amber
    badgeBg = '#fef3c7';
    badgeBorder = '#f59e0b';
    labelText = `${rounded}% Configured`;
    detailText = `${diff}% remaining to reach 100%.`;
  } else if (isOver) {
    const diff = Math.round((rounded - 100) * 100) / 100;
    badgeColor = '#dc2626'; // error red
    badgeBg = '#fee2e2';
    badgeBorder = '#ef4444';
    labelText = `${rounded}% Configured`;
    detailText = `${diff}% over limit! Sum must be exactly 100%.`;
  }

  return (
    <div
      style={{
        background: badgeBg,
        border: `1px solid ${badgeBorder}`,
        borderRadius: 8,
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: badgeColor,
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          {isSuccess ? '✓' : isUnder ? '!' : '✕'}
        </span>
        <div>
          <div style={{ fontWeight: 700, color: badgeColor, fontSize: '0.9375rem' }}>
            Total Configured Weight: {labelText}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#374151', marginTop: '0.125rem' }}>
            {detailText}
          </div>
        </div>
      </div>

      {hasConditionalApplicability && (
        <div
          style={{
            background: 'rgba(255,255,255,0.7)',
            padding: '0.375rem 0.75rem',
            borderRadius: 6,
            fontSize: '0.75rem',
            color: '#4b5563',
            maxWidth: 320,
            lineHeight: 1.3,
            border: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <strong>Note on Evaluation Weight:</strong> Some criteria are conditionally applicable.
          Effective weight per employee is dynamically normalized during evaluation.
        </div>
      )}
    </div>
  );
}
