import type { TemplateValidationResult } from '../domain/template-models';

interface WeightStatusBarProps {
  criteriaTotalWeight: number;
  validationResult?: TemplateValidationResult | null;
  criteriaKpiTotals?: Array<{
    criterionId: string;
    criterionName: string;
    totalWeight: number;
  }>;
  hasConditionalApplicability?: boolean;
  scoringNote?: string;
}

export function WeightStatusBar({
  criteriaTotalWeight,
  validationResult = null,
  criteriaKpiTotals = [],
  hasConditionalApplicability = false,
  scoringNote,
}: WeightStatusBarProps) {
  const roundedCriteria = Math.round(criteriaTotalWeight * 100) / 100;
  const hasKpiWeightErrors = Boolean(
    validationResult?.errors?.some(
      (error) => error.code === 'WEIGHT_TOTAL_NOT_100' && Boolean(error.criterionName)
    )
  );
  const criteriaValid = validationResult
    ? !validationResult.errors.some((error) => error.code === 'WEIGHT_TOTAL_NOT_100' && !error.criterionName)
    : Math.abs(roundedCriteria - 100) <= 0.01;
  const kpiValid = validationResult ? !hasKpiWeightErrors : criteriaKpiTotals.every((item) => Math.abs(Math.round(item.totalWeight * 100) / 100 - 100) <= 0.01);
  const isSuccess = criteriaValid && kpiValid;
  const isUnder = !isSuccess && (roundedCriteria < 100 || criteriaKpiTotals.some((item) => item.totalWeight < 100));
  const isOver = !isSuccess && (roundedCriteria > 100 || criteriaKpiTotals.some((item) => item.totalWeight > 100));

  let badgeColor = '#059669'; // success green
  let badgeBg = '#d1fae5';
  let badgeBorder = '#10b981';
  let labelText = '100% Criteria + 100% KPI · Valid';
  let detailText = 'Criteria groups and KPI totals both equal exactly 100%.';

  if (isUnder) {
    const criteriaDiff = Math.abs(Math.round((100 - roundedCriteria) * 100) / 100);
    badgeColor = '#b45309'; // warning amber
    badgeBg = '#fef3c7';
    badgeBorder = '#f59e0b';
    labelText = `${roundedCriteria}% Criteria`;
    detailText = `Need ${criteriaDiff}% criteria weight to reach 100%.`;
  } else if (isOver) {
    const criteriaDiff = Math.abs(Math.round((roundedCriteria - 100) * 100) / 100);
    badgeColor = '#dc2626'; // error red
    badgeBg = '#fee2e2';
    badgeBorder = '#ef4444';
    labelText = `${roundedCriteria}% Criteria`;
    detailText = `Over by ${criteriaDiff}% criteria weight. Totals must be exactly 100%.`;
  }

  return (
    <>
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

        <div
          style={{
            background: 'rgba(255,255,255,0.7)',
            padding: '0.375rem 0.75rem',
            borderRadius: 6,
            fontSize: '0.75rem',
            color: '#4b5563',
            maxWidth: 420,
            lineHeight: 1.3,
            border: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <strong>Evaluation Weight:</strong> Template criteria total and each criteria group's KPI total must both be 100%.
          {validationResult?.isValid ? ' Validation rules are currently satisfied.' : ''}
          {hasConditionalApplicability && ' Some criteria are conditionally applicable and are normalized per employee.'}
          {scoringNote ? ` ${scoringNote}` : ''}
        </div>
      </div>
      {criteriaKpiTotals.length > 0 && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {criteriaKpiTotals.map((item) => {
          const roundedTotal = Math.round(item.totalWeight * 100) / 100;
          const isExact = Math.abs(roundedTotal - 100) <= 0.01;
          return (
            <div
              key={item.criterionId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                borderRadius: 6,
                background: isExact ? '#ecfdf5' : '#fff7ed',
                border: `1px solid ${isExact ? '#a7f3d0' : '#fdba74'}`,
                color: '#374151',
                fontSize: '0.8125rem',
              }}
            >
              <span style={{ fontWeight: 600 }}>{item.criterionName}</span>
              <span style={{ fontWeight: 700, color: isExact ? '#047857' : '#b45309' }}>
                KPI total: {roundedTotal} / 100%
              </span>
            </div>
          );
        })}
        </div>
      )}
    </>
  );
}
