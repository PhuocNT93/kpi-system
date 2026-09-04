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
      await configModule.levelService.createLevel(l);
    }
  }

  // 2. Rules
  const rules = [
    {
      code: 'RANGE_ON_TIME',
      name: 'Range Threshold',
      rule_type: ScoringRuleType.RANGE_THRESHOLD,
      config: {
        type: ScoringRuleType.RANGE_THRESHOLD,
        ranges: [
          { min: 0, max: 69.99, level: 1 },
          { min: 70, max: 89.99, level: 2 },
          { min: 90, max: 100, level: 3 },
        ],
      },
    },
    {
      code: 'RANGE_PLANNING',
      name: 'Range Threshold',
      rule_type: ScoringRuleType.RANGE_THRESHOLD,
      config: {
        type: ScoringRuleType.RANGE_THRESHOLD,
        ranges: [
          { min: 0, max: 79.99, level: 1 },
          { min: 80, max: 89.99, level: 2 },
          { min: 90, max: 100, level: 3 },
        ],
      },
    },
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
      code: 'RULE_OWNERSHIP',
      name: 'Product Ownership Manual Rule',
      rule_type: ScoringRuleType.ORDINAL_MANUAL,
      config: {
        type: ScoringRuleType.ORDINAL_MANUAL,
        allowed_levels: [1, 2, 3, 4, 5],
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
    {
      code: 'RULE_SYSTEM_ARCHITECTURE',
      name: 'System Architecture Manual Rule',
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
      existing = await configModule.scoringRuleService.createScoringRule(r);
      await configModule.scoringRuleService.publishScoringRule(existing.id);
    }
    ruleMap.set(r.code, existing.id);
  }

  // 3. Criteria & Versions
  const criteriaDefs = [
    {
      code: 'ON_TIME_COMPLETION',
      category: CriterionCategory.PERFORMANCE,
      name: 'On-time Completion',
      description: 'Percentage of assigned Jira tasks delivered within milestone target dates.',
      weight: 20,
      unit: '%',
      sourceLabel: 'Jira Software',
      ruleCode: 'RANGE_ON_TIME',
      applicableRoleIds: ['role-si', 'role-sm'],
      applicableTeamIds: [],
    },
    {
      code: 'PLANNING_DISCIPLINE',
      category: CriterionCategory.PERFORMANCE,
      name: 'Planning Discipline',
      description: 'Quality of sprint estimation and milestone planning accuracy.',
      weight: 15,
      unit: '%',
      sourceLabel: 'Direct Input',
      ruleCode: 'RANGE_PLANNING',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'OWNERSHIP',
      category: CriterionCategory.CAPABILITY,
      name: 'Product Ownership',
      description: 'Proactive end-to-end accountability for component quality.',
      weight: 20,
      unit: 'Ordinal',
      sourceLabel: 'Manager Assessment',
      ruleCode: 'RULE_OWNERSHIP',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'INDEPENDENCE',
      category: CriterionCategory.CONTRIBUTION,
      name: 'Autonomous Execution',
      description: 'Ability to execute complex technical goals with minimal supervision.',
      weight: 25,
      unit: 'Score',
      sourceLabel: 'Peer & Manager Review',
      ruleCode: 'RULE_INDEPENDENCE',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'SYSTEM_ARCHITECTURE',
      category: CriterionCategory.CONTRIBUTION,
      name: 'System Architecture & LLD Quality',
      description: 'Technical design quality and alignment with enterprise LLD standards.',
      weight: 20,
      unit: 'Score',
      sourceLabel: 'Architecture Guild',
      ruleCode: 'RULE_SYSTEM_ARCHITECTURE',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'PRODUCTION_INCIDENT',
      category: CriterionCategory.PERFORMANCE,
      name: 'Production Incident',
      description: 'Number of production incidents caused.',
      weight: 25,
      unit: 'incidents',
      sourceLabel: 'Incident System',
      ruleCode: 'RULE_PRODUCTION_INCIDENT',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'KNOWLEDGE_SHARING',
      category: CriterionCategory.CONTRIBUTION,
      name: 'Knowledge Sharing',
      description: 'Tech talks or knowledge sharing sessions conducted.',
      weight: 20,
      unit: 'sessions',
      sourceLabel: 'Internal Wiki',
      ruleCode: 'RULE_KNOWLEDGE_SHARING',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
  ];

  const criterionVersionMap = new Map<string, { versionId: string; weight: number; applicableRoleIds: string[]; applicableTeamIds: string[] }>();

  for (const c of criteriaDefs) {
    let existingCriterion = await configModule.criterionRepo.findByCode(c.code);
    let versionId: string;

    if (!existingCriterion) {
      const created = await configModule.criterionService.createCriterion({
        code: c.code,
        category: c.category,
        name: c.name,
        description: c.description,
      });

      existingCriterion = created.criterion;

      const version = await configModule.criterionService.updateDraftVersion(created.initialVersion.id, {
        default_weight: c.weight,
        measurement_unit: c.unit,
        measurement_source_label: c.sourceLabel,
        scoring_rule_id: ruleMap.get(c.ruleCode),
      });

      const published = await configModule.criterionService.publishVersion(version.id);
      versionId = published.id;
    } else {
      const versions = await configModule.criterionService.getCriterionVersions(existingCriterion.id);
      if (versions.length > 0 && versions[0]) {
        versionId = versions[0].id;
      } else {
        const v = await configModule.criterionService.createVersion(existingCriterion.id, {
          default_weight: c.weight,
          measurement_unit: c.unit,
          measurement_source_label: c.sourceLabel,
          scoring_rule_id: ruleMap.get(c.ruleCode),
        });
        const published = await configModule.criterionService.publishVersion(v.id);
        versionId = published.id;
      }
    }

    criterionVersionMap.set(c.code, {
      versionId,
      weight: c.weight,
      applicableRoleIds: c.applicableRoleIds,
      applicableTeamIds: c.applicableTeamIds,
    });
  }

  // 4. Templates: ENG_EVAL_2026 & ENGINEERING_EVALUATION
  const templateCodesToSeed = [
    {
      code: 'ENG_EVAL_2026',
      name: 'Engineering Evaluation 2026',
      description: 'Standard annual performance evaluation framework for engineering teams.',
      criteriaItems: [
        { code: 'ON_TIME_COMPLETION', weight: 20 },
        { code: 'PLANNING_DISCIPLINE', weight: 15 },
        { code: 'OWNERSHIP', weight: 20 },
        { code: 'INDEPENDENCE', weight: 25 },
        { code: 'SYSTEM_ARCHITECTURE', weight: 20 },
      ],
    },
    {
      code: 'ENGINEERING_EVALUATION',
      name: 'Engineering Performance Evaluation Framework',
      description: 'Standard performance evaluation framework.',
      criteriaItems: [
        { code: 'ON_TIME_COMPLETION', weight: 25 },
        { code: 'PRODUCTION_INCIDENT', weight: 25 },
        { code: 'KNOWLEDGE_SHARING', weight: 25 },
        { code: 'INDEPENDENCE', weight: 25 },
      ],
    },
  ];

  for (const tplDef of templateCodesToSeed) {
    let template = await configModule.templateRepo.findByCode(tplDef.code);
    if (!template) {
      const createdTemplate = await configModule.templateService.createTemplate({
        code: tplDef.code,
        name: tplDef.name,
        description: tplDef.description,
      });

      template = createdTemplate.template;
      const versionId = createdTemplate.initialVersion.id;

      const legacyKpiRes = await pool.query(`SELECT kpi_id FROM "kpi" WHERE code = 'LEGACY_KPI'`);
      let legacyKpiId = legacyKpiRes.rows[0]?.kpi_id;
      if (!legacyKpiId) {
        const insertRes = await pool.query(`INSERT INTO "kpi" (code, name, description) VALUES ('LEGACY_KPI', 'Legacy Migration KPI', 'Auto-generated KPI for legacy 1-level templates') RETURNING kpi_id`);
        legacyKpiId = insertRes.rows[0].kpi_id;
      }
      
      const tk = await configModule.templateService.addKpiToTemplate(versionId, { kpi_id: legacyKpiId, weight: 100 });
      const templateKpiId = tk.id;

      const criteriaPayload = tplDef.criteriaItems.map((cItem, idx) => {
        const item = criterionVersionMap.get(cItem.code)!;
        const applicabilityRules = [];
        if (item.applicableRoleIds.length) {
          applicabilityRules.push({ dimension: 'ROLE', operator: 'IN', values: item.applicableRoleIds });
        }
        if (item.applicableTeamIds.length) {
          applicabilityRules.push({ dimension: 'TEAM', operator: 'IN', values: item.applicableTeamIds });
        }

        return {
          criterion_version_id: item.versionId,
          weight: cItem.weight,
          display_order: idx + 1,
          required: true,
          enabled: true,
          applicability: applicabilityRules.length ? { rules: applicabilityRules } : {},
        };
      });

      await configModule.templateService.bulkUpdateTemplateCriteria(versionId, templateKpiId, criteriaPayload);
    }
  }
}

