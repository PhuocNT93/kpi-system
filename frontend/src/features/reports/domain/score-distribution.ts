export interface ScoreDistributionBin {
  label: string;
  count: number;
  percentage: number;
}

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

// The API field is untyped JSON: dashboard services send [{ range, count, percentage? }],
// older aggregates send { LABEL: count }. Anything else is treated as "no distribution".
export function toScoreDistributionBins(value: unknown): ScoreDistributionBin[] {
  let raw: Array<{ label: string; count: number; percentage?: number }> = [];

  if (Array.isArray(value)) {
    raw = value.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      const label = typeof record.range === 'string' ? record.range : typeof record.label === 'string' ? record.label : null;
      if (label === null || !isCount(record.count)) return [];
      return [{ label, count: record.count, percentage: isCount(record.percentage) ? record.percentage : undefined }];
    });
  } else if (value && typeof value === 'object') {
    raw = Object.entries(value as Record<string, unknown>).flatMap(([label, count]) =>
      isCount(count) ? [{ label, count }] : []
    );
  }

  const total = raw.reduce((sum, bin) => sum + bin.count, 0);
  if (total === 0) return [];

  return raw.map((bin) => ({
    label: bin.label,
    count: bin.count,
    percentage: bin.percentage ?? (bin.count / total) * 100,
  }));
}
