import type {
  EvaluationTemplate,
  EvaluationTemplateVersion,
  TemplateKpi,
  TemplateKpiCriterion,
  Criterion,
  CriterionVersion,
  ScoringRule,
  TemplateValidationResult,
  ValidationErrorItem,
  VersionDiffItem,
} from './template-models';

export function calculateConfiguredWeightTotal(kpis: TemplateKpi[]): number {
  return kpis.reduce((sum, k) => sum + (Number(k.weight) || 0), 0);
}

export function validateTemplateClientSide(
  kpis: TemplateKpi[]
): TemplateValidationResult {
  const totalWeight = Math.round(calculateConfiguredWeightTotal(kpis) * 100) / 100;
  const errors: ValidationErrorItem[] = [];
  const warnings: ValidationErrorItem[] = [];

  // Weight validation - KPIs level
  if (Math.abs(totalWeight - 100) > 0.01) {
    errors.push({
      code: 'WEIGHT_TOTAL_NOT_100',
      category: 'WEIGHT',
      message: `Total configured KPI weight is ${totalWeight}%. Expected exactly 100%.`,
      actual: totalWeight,
      expected: 100,
    });
  }

  // Weight validation - Criteria level inside each KPI
  kpis.forEach(kpi => {
    const activeCriteria = kpi.criteria.filter((c) => !c.isDisabled);
    const totalCriteriaWeight = Math.round(
      activeCriteria.reduce((sum, c) => sum + (Number(c.effectiveWeight) || 0), 0) * 100
    ) / 100;

    if (Math.abs(totalCriteriaWeight - 100) > 0.01) {
      errors.push({
        code: 'WEIGHT_TOTAL_NOT_100',
        category: 'WEIGHT',
        message: `Total criteria weight for KPI "${kpi.kpiName || 'Unknown'}" is ${totalCriteriaWeight}%. Expected exactly 100%.`,
        actual: totalCriteriaWeight,
        expected: 100,
      });
    }

    // Scoring Rule & Applicability validation
    activeCriteria.forEach((tc) => {
      if (tc.effectiveWeight <= 0) {
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          category: 'WEIGHT',
          criterionCode: tc.criterion.code,
          criterionName: tc.criterion.name,
          message: `Criterion "${tc.criterion.name}" weight must be greater than 0%.`,
        });
      }

      if (tc.isOptional) {
        warnings.push({
          code: 'MISSING_REQUIRED_FIELD',
          category: 'WARNINGS',
          criterionCode: tc.criterion.code,
          criterionName: tc.criterion.name,
          message: `Criterion "${tc.criterion.name}" is marked as optional.`,
          isWarning: true,
        });
      }

      // Scoring rule validation for RANGE_THRESHOLD
      const rule = tc.customScoringRule || tc.criterion.currentVersion?.scoringRule;
      if (rule && rule.ruleType === 'RANGE_THRESHOLD' && rule.config) {
        const config = rule.config as { ranges?: { minScore: number; maxScore: number }[] };
        if (config.ranges && config.ranges.length > 1) {
          for (let i = 0; i < config.ranges.length - 1; i++) {
            const curr = config.ranges[i];
            const next = config.ranges[i + 1];
            if (curr.maxScore >= next.minScore) {
              errors.push({
                code: 'INVALID_RANGE',
                category: 'SCORING_RULE',
                criterionCode: tc.criterion.code,
                criterionName: tc.criterion.name,
                message: `Scoring range overlap detected between level ${i + 1} and ${i + 2} in "${tc.criterion.name}".`,
              });
            }
          }
        }
      }

      // ROLE_CONDITIONAL check
      if (rule && rule.ruleType === 'ROLE_CONDITIONAL' && rule.config) {
        const config = rule.config as { branches?: { roleId: string; roleName: string }[] };
        if (!config.branches || config.branches.length === 0) {
          errors.push({
            code: 'MISSING_SCORING_BRANCH',
            category: 'APPLICABILITY',
            criterionCode: tc.criterion.code,
            criterionName: tc.criterion.name,
            message: `Role conditional rule in "${tc.criterion.name}" has no configured role branches.`,
          });
        }
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    configuredWeightTotal: totalWeight,
  };
}

export function compareTemplateVersions(
  v1Kpis: TemplateKpi[],
  v2Kpis: TemplateKpi[]
): VersionDiffItem[] {
  // A simplistic diff for now, flattening the criteria to compare them.
  // In a real scenario, we might also want to diff KPIs themselves.
  const v1Criteria = v1Kpis.flatMap(k => k.criteria);
  const v2Criteria = v2Kpis.flatMap(k => k.criteria);
  const diffs: VersionDiffItem[] = [];
  const v1Map = new Map(v1Criteria.map((c) => [c.criterion.code, c]));
  const v2Map = new Map(v2Criteria.map((c) => [c.criterion.code, c]));

  // Check v2 criteria
  v2Criteria.forEach((v2Item) => {
    const v1Item = v1Map.get(v2Item.criterion.code);
    if (!v1Item) {
      diffs.push({
        criterionCode: v2Item.criterion.code,
        criterionName: v2Item.criterion.name,
        v1Weight: null,
        v2Weight: v2Item.effectiveWeight,
        changeType: 'ADDED',
        detailMessage: `Added with ${v2Item.effectiveWeight}% weight`,
      });
    } else {
      const weightChanged = v1Item.effectiveWeight !== v2Item.effectiveWeight;
      const rule1 = v1Item.customScoringRule?.ruleType || v1Item.criterion.currentVersion?.scoringRule?.ruleType;
      const rule2 = v2Item.customScoringRule?.ruleType || v2Item.criterion.currentVersion?.scoringRule?.ruleType;
      const ruleChanged = rule1 !== rule2;

      let changeType: VersionDiffItem['changeType'] = 'UNCHANGED';
      let detailMessage = 'No changes';

      if (weightChanged && ruleChanged) {
        changeType = 'WEIGHT_CHANGED';
        detailMessage = `Weight: ${v1Item.effectiveWeight}% → ${v2Item.effectiveWeight}%, Rule: ${rule1} → ${rule2}`;
      } else if (weightChanged) {
        changeType = 'WEIGHT_CHANGED';
        const diff = v2Item.effectiveWeight - v1Item.effectiveWeight;
        const sign = diff > 0 ? `+${diff}%` : `${diff}%`;
        detailMessage = `Weight changed from ${v1Item.effectiveWeight}% to ${v2Item.effectiveWeight}% (${sign})`;
      } else if (ruleChanged) {
        changeType = 'RULE_CHANGED';
        detailMessage = `Rule updated: ${rule1} → ${rule2}`;
      }

      diffs.push({
        criterionCode: v2Item.criterion.code,
        criterionName: v2Item.criterion.name,
        v1Weight: v1Item.effectiveWeight,
        v2Weight: v2Item.effectiveWeight,
        changeType,
        detailMessage,
      });
    }
  });

  // Check removed in v2
  v1Criteria.forEach((v1Item) => {
    if (!v2Map.has(v1Item.criterion.code)) {
      diffs.push({
        criterionCode: v1Item.criterion.code,
        criterionName: v1Item.criterion.name,
        v1Weight: v1Item.effectiveWeight,
        v2Weight: null,
        changeType: 'REMOVED',
        detailMessage: `Removed (was ${v1Item.effectiveWeight}%)`,
      });
    }
  });

  return diffs;
}

// ── Snake Case Wire Mappers ──────────────────────────────────────────────────
export function mapWireTemplateToDomain(wire: any): EvaluationTemplate {
  return {
    id: wire.id,
    code: wire.code,
    name: wire.name,
    description: wire.description ?? undefined,
    status: wire.status,
    currentVersionId: wire.current_version_id ?? undefined,
    currentVersion: wire.current_version ? mapWireVersionToDomain(wire.current_version) : undefined,
    criteriaCount: wire.criteria_count ?? (wire.current_version?.kpis?.reduce((sum: number, kpi: any) => sum + (kpi.criteria?.length || 0), 0) || 0),
    version: wire.version ?? 1,
    createdAt: wire.created_at,
    createdBy: wire.created_by ?? undefined,
    updatedAt: wire.updated_at,
    updatedBy: wire.updated_by ?? undefined,
    updatedByName: wire.updated_by_name ?? 'HR Admin',
  };
}

export function mapWireVersionToDomain(wire: any): EvaluationTemplateVersion {
  return {
    id: wire.id,
    templateId: wire.template_id,
    versionNo: wire.version_no,
    status: wire.status,
    weightTotalPolicy: wire.weight_total_policy ?? 'EXACT_100',
    effectiveFrom: wire.effective_from ?? undefined,
    effectiveTo: wire.effective_to ?? undefined,
    publishedAt: wire.published_at ?? undefined,
    publishedBy: wire.published_by ?? undefined,
    publishedByName: wire.published_by_name ?? undefined,
    version: wire.version ?? 1,
    kpis: Array.isArray(wire.kpis)
      ? wire.kpis.map(mapWireTemplateKpiToDomain)
      : [],
  };
}

export function mapWireTemplateKpiToDomain(wire: any): TemplateKpi {
  return {
    id: wire.id,
    templateVersionId: wire.template_version_id,
    kpiId: wire.kpi_id,
    kpiName: wire.kpi_name || wire.kpi?.name || 'Unknown KPI',
    weight: Number(wire.weight) || 0,
    displayOrder: wire.display_order ?? 0,
    criteria: Array.isArray(wire.criteria)
      ? wire.criteria.map(mapWireTemplateKpiCriterionToDomain)
      : [],
  };
}

export function mapWireTemplateKpiCriterionToDomain(wire: any): TemplateKpiCriterion {
  return {
    id: wire.id,
    templateKpiId: wire.template_kpi_id,
    criterionVersionId: wire.criterion_version_id,
    criterion: mapWireCriterionToDomain(wire.criterion || {}),
    effectiveWeight: Number(wire.effective_weight) || 0,
    applicableRoleIds: wire.applicable_role_ids || [],
    applicableTeamIds: wire.applicable_team_ids || [],
    isDisabled: Boolean(wire.is_disabled),
    isOptional: Boolean(wire.is_optional),
    displayOrder: wire.display_order ?? 0,
    customScoringRule: wire.custom_scoring_rule ? mapWireScoringRuleToDomain(wire.custom_scoring_rule) : undefined,
    provenance: wire.provenance ? mapWireProvenanceToDomain(wire.provenance) : undefined,
  };
}

export function mapWireCriterionToDomain(wire: any): Criterion {
  return {
    id: wire.id || '',
    code: wire.code || '',
    category: wire.category || 'General',
    name: wire.name || 'Unnamed Criterion',
    description: wire.description ?? undefined,
    status: wire.status || 'ACTIVE',
    version: wire.version ?? 1,
    currentVersion: wire.current_version ? mapWireCriterionVersionToDomain(wire.current_version) : undefined,
  };
}

export function mapWireCriterionVersionToDomain(wire: any): CriterionVersion {
  return {
    id: wire.id,
    criterionId: wire.criterion_id,
    versionNo: wire.version_no,
    defaultWeight: Number(wire.default_weight) || 0,
    measurementUnit: wire.measurement_unit || '%',
    measurementSourceLabel: wire.measurement_source_label ?? undefined,
    scoringRuleId: wire.scoring_rule_id ?? undefined,
    scoringRule: wire.scoring_rule ? mapWireScoringRuleToDomain(wire.scoring_rule) : undefined,
    status: wire.status || 'PUBLISHED',
  };
}

export function mapWireScoringRuleToDomain(wire: any): ScoringRule {
  return {
    id: wire.id,
    code: wire.code || '',
    name: wire.name || '',
    ruleType: wire.rule_type,
    config: wire.config || {},
    status: wire.status || 'ACTIVE',
    version: wire.version ?? 1,
  };
}

export function mapWireProvenanceToDomain(wire: any): TemplateKpiCriterion['provenance'] {
  if (!wire) return undefined;
  return {
    effectiveWeight: Number(wire.effective_weight) || 0,
    effectiveSource: wire.effective_source || 'TEMPLATE',
    effectiveSourceLabel: wire.effective_source_label || 'Template',
    tiers: Array.isArray(wire.tiers)
      ? wire.tiers.map((t: any) => ({
          scope: t.scope,
          scopeLabel: t.scope_label || t.scope,
          weight: Number(t.weight) || 0,
          isApplied: Boolean(t.is_applied),
        }))
      : [],
  };
}
