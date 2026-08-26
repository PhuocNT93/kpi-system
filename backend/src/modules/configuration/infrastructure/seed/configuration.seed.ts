import { Pool } from 'pg';
import { createConfigurationModule } from '../../configuration.module.js';
import { CriterionCategory, ScoringRuleType } from '../../domain/configuration.types.js';

export async function seedConfigurationModule(pool: Pool): Promise<void> {
  const configModule = createConfigurationModule(pool);

  // 1. Levels (LEVEL_1 to LEVEL_5)
  const levelDefs = [
    { code: 'LEVEL_1', level_number: 1, name: 'Needs Improvement', score_value: 1, description: 'Below expectations' },
    { code: 'LEVEL_2', level_number: 2, name: 'Developing', score_value: 2, description: 'Developing skills' },
    { code: 'LEVEL_3', level_number: 3, name: 'Meets Expectation', score_value: 3, description: 'Consistently meets expectations' },
    { code: 'LEVEL_4', level_number: 4, name: 'Exceeds Expectation', score_value: 4, description: 'Exceeds expectations' },
    { code: 'LEVEL_5', level_number: 5, name: 'Outstanding', score_value: 5, description: 'Outstanding performance' },
  ];

  for (const l of levelDefs) {
    const existing = await configModule.levelRepo.findByCode(l.code);
    if (!existing) {
      await configModule.levelService.createLevel(l, 'SEED_SYSTEM');
    }
  }

  // 2. Rules
  const rules = [
    {
      code: 'RULE_ON_TIME_COMPLETION',
      name: 'On-Time Completion Rule',
      rule_type: ScoringRuleType.RANGE_THRESHOLD,
      config: {
        type: ScoringRuleType.RANGE_THRESHOLD,
        ranges: [
          { min: 0, max: 69.99, level: 1 },
          { min: 70, max: 89.99, level: 2 },
          { min: 90, max: 99.99, level: 3 },
          { min: 100, max: 100, level: 4 },
        ],
      },
    },
    {
      code: 'RULE_PRODUCTION_INCIDENT',
      name: 'Production Incident Rule',
      rule_type: ScoringRuleType.INVERSE_THRESHOLD,
      config: {
        type: ScoringRuleType.INVERSE_THRESHOLD,
        thresholds: [
          { max_incidents: 0, level: 5 },
          { max_incidents: 1, level: 4 },
          { max_incidents: 2, level: 3 },
          { max_incidents: 3, level: 2 },
        ],
      },
    },
    {
      code: 'RULE_KNOWLEDGE_SHARING',
      name: 'Knowledge Sharing Rule',
      rule_type: ScoringRuleType.COUNT_THRESHOLD,
      config: {
        type: ScoringRuleType.COUNT_THRESHOLD,
        counts: [
          { min_count: 0, max_count: 1, level: 1 },
          { min_count: 2, max_count: 3, level: 2 },
          { min_count: 4, max_count: 5, level: 3 },
          { min_count: 6, level: 4 },
        ],
      },
    },
    {
      code: 'RULE_INDEPENDENCE',
      name: 'Independence Manual Rule',
      rule_type: ScoringRuleType.ORDINAL_MANUAL,
      config: {
        type: ScoringRuleType.ORDINAL_MANUAL,
        allowed_levels: [1, 2, 3, 4, 5],
      },
    },
  ];

  const ruleMap = new Map<string, string>();
  for (const r of rules) {
    let existing = await configModule.scoringRuleRepo.findByCode(r.code);
    if (!existing) {
      existing = await configModule.scoringRuleService.createScoringRule(r, 'SEED_SYSTEM');
      await configModule.scoringRuleService.publishScoringRule(existing.id, 'SEED_SYSTEM');
    }
    ruleMap.set(r.code, existing.id);
  }

  // 3. Criteria & Versions
  const criteriaDefs = [
    { code: 'ON_TIME_COMPLETION', category: CriterionCategory.PERFORMANCE, name: 'On-time Completion', weight: 25, unit: '%', ruleCode: 'RULE_ON_TIME_COMPLETION' },
    { code: 'PRODUCTION_INCIDENT', category: CriterionCategory.PERFORMANCE, name: 'Production Incident', weight: 25, unit: 'incidents', ruleCode: 'RULE_PRODUCTION_INCIDENT' },
    { code: 'KNOWLEDGE_SHARING', category: CriterionCategory.CONTRIBUTION, name: 'Knowledge Sharing', weight: 20, unit: 'sessions', ruleCode: 'RULE_KNOWLEDGE_SHARING' },
    { code: 'INDEPENDENCE', category: CriterionCategory.CAPABILITY, name: 'Independence', weight: 30, unit: 'level', ruleCode: 'RULE_INDEPENDENCE' },
  ];

  const criterionVersionIds: Array<{ versionId: string; weight: number }> = [];

  for (const c of criteriaDefs) {
    let existingCriterion = await configModule.criterionRepo.findByCode(c.code);
    let versionId: string;

    if (!existingCriterion) {
      const created = await configModule.criterionService.createCriterion({
        code: c.code,
        category: c.category,
        name: c.name,
      }, 'SEED_SYSTEM');

      existingCriterion = created.criterion;

      const version = await configModule.criterionService.updateDraftVersion(created.initialVersion.id, {
        default_weight: c.weight,
        measurement_unit: c.unit,
        scoring_rule_id: ruleMap.get(c.ruleCode),
      }, undefined, 'SEED_SYSTEM');

      const published = await configModule.criterionService.publishVersion(version.id, 'SEED_SYSTEM');
      versionId = published.id;
    } else {
      const versions = await configModule.criterionService.getCriterionVersions(existingCriterion.id);
      if (versions.length > 0 && versions[0]) {
        versionId = versions[0].id;
      } else {
        const v = await configModule.criterionService.createVersion(existingCriterion.id, {
          default_weight: c.weight,
          measurement_unit: c.unit,
          scoring_rule_id: ruleMap.get(c.ruleCode),
        }, 'SEED_SYSTEM');
        const published = await configModule.criterionService.publishVersion(v.id, 'SEED_SYSTEM');
        versionId = published.id;
      }
    }

    criterionVersionIds.push({ versionId, weight: c.weight });
  }

  // 4. Template: ENGINEERING_EVALUATION
  let template = await configModule.templateRepo.findByCode('ENGINEERING_EVALUATION');
  if (!template) {
    const createdTemplate = await configModule.templateService.createTemplate({
      code: 'ENGINEERING_EVALUATION',
      name: 'Engineering Performance Evaluation Framework',
    }, 'SEED_SYSTEM');

    template = createdTemplate.template;
    const versionId = createdTemplate.initialVersion.id;

    const criteriaPayload = criterionVersionIds.map((item, idx) => ({
      criterion_version_id: item.versionId,
      weight: item.weight,
      display_order: idx + 1,
      required: true,
      enabled: true,
    }));

    await configModule.templateService.bulkUpdateTemplateCriteria(versionId, criteriaPayload, 'SEED_SYSTEM');
    await configModule.templateService.publishTemplateVersion(versionId, 'SEED_SYSTEM');
  }
}
