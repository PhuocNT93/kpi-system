import { Pool } from 'pg';
import { createConfigurationModule } from '../../configuration.module.js';
import { CriterionCategory, ScoringRuleType } from '../../domain/configuration.types.js';

export async function clearConfigurationData(pool: Pool): Promise<void> {
  await pool.query(`
    DELETE FROM evaluation;
    DELETE FROM evaluation_cycle;
    DELETE FROM template_criteria;
    DELETE FROM template_kpi;
    DELETE FROM role_overrides;
    DELETE FROM team_overrides;
    DELETE FROM template_overrides;
    DELETE FROM evaluation_template_versions;
    DELETE FROM evaluation_templates;
    DELETE FROM kpi_criterion;
    DELETE FROM criterion_versions;
    DELETE FROM criteria;
    DELETE FROM scoring_rules;
  `);
}

export async function seedConfigurationModule(pool: Pool, options?: { clearOld?: boolean }): Promise<void> {
  const configModule = createConfigurationModule(pool);

  // Clear old data if requested or by default to ensure real data consistency
  if (options?.clearOld !== false) {
    await clearConfigurationData(pool);
  }

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

  // 2. Scoring Rules (18 real rules matching the 2026 Evaluation Framework Rubric)
  const rules = [
    // ── Performance ─────────────────────────────────────────────────────────
    {
      code: 'RULE_ON_TIME_COMPLETION',
      name: 'On-time Completion Scoring Rule',
      rule_type: ScoringRuleType.RANGE_THRESHOLD,
      config: {
        type: ScoringRuleType.RANGE_THRESHOLD,
        ranges: [
          { min: 0, max: 69.99, level: 1 },
          { min: 70, max: 84.99, level: 2 },
          { min: 85, max: 94.99, level: 3 },
          { min: 95, max: 99.99, level: 4 },
          { min: 100, max: 100, level: 5 },
        ],
      },
    },
    {
      code: 'RULE_PLAN_MILESTONE_ADHERENCE',
      name: 'Plan / Milestone Adherence Scoring Rule',
      rule_type: ScoringRuleType.ORDINAL_MANUAL,
      config: {
        type: ScoringRuleType.ORDINAL_MANUAL,
        level_labels: {
          '1': 'Severe delay without warning',
          '2': 'Warning provided but baseline delayed',
          '3': 'Early warning of plan deviation; maintain baseline',
          '4': 'Excellent milestone management, no deviation',
          '5': 'Proactively optimize and shorten milestones',
        },
      },
    },
    {
      code: 'RULE_ESTIMATION_PLANNING',
      name: 'Estimation & Planning Scoring Rule',
      rule_type: ScoringRuleType.ORDINAL_MANUAL,
      config: {
        type: ScoringRuleType.ORDINAL_MANUAL,
        level_labels: {
          '1': 'Large estimation deviation (>50%)',
          '2': 'Estimation deviation exists, rarely adjusted',
          '3': 'Close estimation; proactively adjust plan',
          '4': 'High estimation accuracy, good risk buffering',
          '5': 'Role model for planning & estimation accuracy',
        },
      },
    },
    {
      code: 'RULE_OWNERSHIP_SCOPE',
      name: 'Ownership Scope Scoring Rule',
      rule_type: ScoringRuleType.ORDINAL_MANUAL,
      config: {
        type: ScoringRuleType.ORDINAL_MANUAL,
        level_labels: {
          '1': 'Single task',
          '2': 'Sub-feature',
          '3': 'Module',
          '4': 'Service / Subsystem',
          '5': 'Entire system',
        },
      },
    },
    {
      code: 'RULE_INDEPENDENCE',
      name: 'Independence Scoring Rule',
      rule_type: ScoringRuleType.ORDINAL_MANUAL,
      config: {
        type: ScoringRuleType.ORDINAL_MANUAL,
        level_labels: {
          '1': 'Requires step-by-step detailed guidance',
          '2': 'Requires frequent support',
          '3': 'Independent',
          '4': 'Fully autonomous, proactively supports others',
          '5': 'Highly independent technical leadership',
        },
      },
    },

    // ── Capability ──────────────────────────────────────────────────────────
    {
      code: 'RULE_TASK_QUALITY',
      name: 'Task Quality (Bug & Rework) Scoring Rule',
      rule_type: ScoringRuleType.INVERSE_THRESHOLD,
      config: {
        type: ScoringRuleType.INVERSE_THRESHOLD,
        ranges: [
          { min: 0, max: 0, level: 5 },
          { min: 1, max: 1, level: 4 },
          { min: 2, max: 2, level: 3 },
          { min: 3, max: 4, level: 2 },
          { min: 5, max: null, level: 1 },
        ],
      },
    },
    {
      code: 'RULE_PRODUCTION_INCIDENT',
      name: 'Production Incident Scoring Rule',
      rule_type: ScoringRuleType.INVERSE_THRESHOLD,
      config: {
        type: ScoringRuleType.INVERSE_THRESHOLD,
        ranges: [
          { min: 0, max: 0, level: 5 },
          { min: 1, max: 1, level: 2 },
          { min: 2, max: null, level: 1 },
        ],
      },
    },
    {
      code: 'RULE_CORE_ENGINEERING_SKILLSET',
      name: 'Core Engineering Skillset Scoring Rule',
      rule_type: ScoringRuleType.ORDINAL_MANUAL,
      config: {
        type: ScoringRuleType.ORDINAL_MANUAL,
        level_labels: {
          '1': 'Level 1 (Basic knowledge)',
          '2': 'Level 2 (Developing)',
          '3': 'Level 3 (OOP, SOLID, Clean Code)',
          '4': 'Level 4 (Design Patterns, Best Practices)',
          '5': 'Level 5 (Core technical expert)',
        },
      },
    },
    {
      code: 'RULE_SQL_DATABASE',
      name: 'SQL & Database Scoring Rule',
      rule_type: ScoringRuleType.ORDINAL_MANUAL,
      config: {
        type: ScoringRuleType.ORDINAL_MANUAL,
        level_labels: {
          '1': 'Level 1 (Simple queries)',
          '2': 'Level 2 (Basic non-optimized operations)',
          '3': 'Level 3 (Optimize queries/ structure)',
          '4': 'Level 4 (Optimize index, execution plan, profiling)',
          '5': 'Level 5 (Distributed DB architecture, deep tuning)',
        },
      },
    },
    {
      code: 'RULE_CODE_REVIEW_FEEDBACK',
      name: 'Code Review & Feedback Scoring Rule',
      rule_type: ScoringRuleType.COUNT_THRESHOLD,
      config: {
        type: ScoringRuleType.COUNT_THRESHOLD,
        thresholds: [1, 2, 3, 5],
      },
    },
    {
      code: 'RULE_TESTING_DOCUMENTATION',
      name: 'Testing & Documentation Scoring Rule',
      rule_type: ScoringRuleType.ORDINAL_MANUAL,
      config: {
        type: ScoringRuleType.ORDINAL_MANUAL,
        level_labels: {
          '1': 'Lack of unit tests and documentation',
          '2': 'Insufficient coverage and poor documentation',
          '3': 'SI: main flow unit tests + design notes; SM: docs on logic/DB change',
          '4': 'High coverage (>80%), detailed design documentation',
          '5': 'Comprehensive test automation & standardized documentation',
        },
      },
    },
    {
      code: 'RULE_BUSINESS_DOMAIN_KNOWLEDGE',
      name: 'Business Domain Knowledge Scoring Rule',
      rule_type: ScoringRuleType.ORDINAL_MANUAL,
      config: {
        type: ScoringRuleType.ORDINAL_MANUAL,
        level_labels: {
          '1': 'Limited basic business understanding',
          '2': 'Follows spec only, lacks deep business understanding',
          '3': 'Optimize / decision making',
          '4': 'Deep business understanding, consults solutions for PO',
          '5': 'Domain expert, shapes business solutions',
        },
      },
    },

    // ── Contribution ────────────────────────────────────────────────────────
    {
      code: 'RULE_MENTORING',
      name: 'Mentoring Scoring Rule',
      rule_type: ScoringRuleType.COUNT_THRESHOLD,
      config: {
        type: ScoringRuleType.COUNT_THRESHOLD,
        thresholds: [1, 2],
      },
    },
    {
      code: 'RULE_KNOWLEDGE_SHARING',
      name: 'Knowledge Sharing Scoring Rule',
      rule_type: ScoringRuleType.COUNT_THRESHOLD,
      config: {
        type: ScoringRuleType.COUNT_THRESHOLD,
        thresholds: [1, 2, 3],
      },
    },
    {
      code: 'RULE_TEAMWORK_COMMUNICATION',
      name: 'Teamwork & Communication Scoring Rule',
      rule_type: ScoringRuleType.ORDINAL_MANUAL,
      config: {
        type: ScoringRuleType.ORDINAL_MANUAL,
        level_labels: {
          '1': 'Passive communication, little coordination',
          '2': 'Communicates only when asked',
          '3': 'Frequent',
          '4': 'Proactively connects and drives the team',
          '5': 'Spreads positive energy and team engagement',
        },
      },
    },
    {
      code: 'RULE_CUSTOMER_COMMS_ENGLISH',
      name: 'Customer Comms & English Scoring Rule',
      rule_type: ScoringRuleType.ORDINAL_MANUAL,
      config: {
        type: ScoringRuleType.ORDINAL_MANUAL,
        level_labels: {
          '1': 'Lacks confidence in English communication',
          '2': 'Basic chat with support',
          '3': 'Chat + Email · B1-B2',
          '4': 'Good communication in meeting and email/chat (B2-C1)',
          '5': 'Fluent direct collaboration with international clients',
        },
      },
    },
    {
      code: 'RULE_PROPOSING_IMPROVEMENTS',
      name: 'Proposing Improvements Scoring Rule',
      rule_type: ScoringRuleType.COUNT_THRESHOLD,
      config: {
        type: ScoringRuleType.COUNT_THRESHOLD,
        thresholds: [1, 2, 3],
      },
    },
    {
      code: 'RULE_ATTITUDE_COMPANY_CULTURE',
      name: 'Attitude & Company Culture Scoring Rule',
      rule_type: ScoringRuleType.ORDINAL_MANUAL,
      config: {
        type: ScoringRuleType.ORDINAL_MANUAL,
        level_labels: {
          '1': 'Passive, lacks cultural engagement',
          '2': 'Meets minimum level',
          '3': 'Proactive, positive',
          '4': 'Positive role model, contributes to building culture',
          '5': 'Company culture ambassador role model',
        },
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

  // 3. Criteria & Versions (18 criteria matching PDF rubric)
  const criteriaDefs = [
    // ── Performance ─────────────────────────────────────────────────────────
    {
      code: 'ON_TIME_COMPLETION',
      category: CriterionCategory.PERFORMANCE,
      name: 'On-time Completion',
      description: 'Ensure timely completion of work according to plan (Expectation: 100% predictable). Tracking via Jira.',
      weight: 10,
      unit: '%',
      sourceLabel: 'Jira tracking',
      ruleCode: 'RULE_ON_TIME_COMPLETION',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'PLAN_MILESTONE_ADHERENCE',
      category: CriterionCategory.PERFORMANCE,
      name: 'Plan / Milestone Adherence',
      description: 'Adhere to plans and milestones (Expectation: Early warning of plan deviation; maintain baseline). Assessed via Planned vs actual (WBS).',
      weight: 8,
      unit: 'Score',
      sourceLabel: 'Planned vs actual (WBS)',
      ruleCode: 'RULE_PLAN_MILESTONE_ADHERENCE',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'ESTIMATION_PLANNING',
      category: CriterionCategory.PERFORMANCE,
      name: 'Estimation & Planning',
      description: 'Accuracy in work estimation and planning (Expectation: Close estimation; proactively adjust plan). Assessed by Teamlead/PM review.',
      weight: 6,
      unit: 'Score',
      sourceLabel: 'Teamlead/PM review',
      ruleCode: 'RULE_ESTIMATION_PLANNING',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'OWNERSHIP_SCOPE',
      category: CriterionCategory.PERFORMANCE,
      name: 'Ownership Scope',
      description: 'Scope of technical and product ownership (Expectation: Module). Assessed by Teamlead/PM.',
      weight: 8,
      unit: 'Scope',
      sourceLabel: 'Recorded by Teamlead/PM',
      ruleCode: 'RULE_OWNERSHIP_SCOPE',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'INDEPENDENCE',
      category: CriterionCategory.PERFORMANCE,
      name: 'Independence',
      description: 'Level of independent work and frequency of needed support (Expectation: Independent). Assessed via frequency of help needed.',
      weight: 8,
      unit: 'Score',
      sourceLabel: 'Frequency of help needed',
      ruleCode: 'RULE_INDEPENDENCE',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },

    // ── Capability ──────────────────────────────────────────────────────────
    {
      code: 'TASK_QUALITY',
      category: CriterionCategory.CAPABILITY,
      name: 'Task Quality (Bug & Rework)',
      description: 'Quality of work execution, limiting bugs and rework (Expectation: ≤ 1 - Zero-defect mindset). Assessed via QA reports, CR logs.',
      weight: 5,
      unit: 'bugs/CR',
      sourceLabel: 'QA reports, CR logs',
      ruleCode: 'RULE_TASK_QUALITY',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'PRODUCTION_INCIDENT',
      category: CriterionCategory.CAPABILITY,
      name: 'Production Incident',
      description: 'Number of incidents on Production environment affecting services (Expectation: 0 incidents). Assessed via Incident count.',
      weight: 5,
      unit: 'incidents',
      sourceLabel: 'Incident count',
      ruleCode: 'RULE_PRODUCTION_INCIDENT',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'CORE_ENGINEERING_SKILLSET',
      category: CriterionCategory.CAPABILITY,
      name: 'Core Engineering Skillset',
      description: 'Core technical foundation capability (OOP, SOLID principles, Clean Code) (Expectation: Level 3). Assessed via Tech interview / PR review.',
      weight: 5,
      unit: 'Level',
      sourceLabel: 'Tech interview / PR review',
      ruleCode: 'RULE_CORE_ENGINEERING_SKILLSET',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'SQL_DATABASE',
      category: CriterionCategory.CAPABILITY,
      name: 'SQL & Database',
      description: 'Skills working with SQL and databases (Expectation: Level 3 - Optimize queries/ structure). Assessed via Task review.',
      weight: 4,
      unit: 'Level',
      sourceLabel: 'Task review',
      ruleCode: 'RULE_SQL_DATABASE',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'CODE_REVIEW_FEEDBACK',
      category: CriterionCategory.CAPABILITY,
      name: 'Code Review & Feedback',
      description: 'Level of participation and quality of code review feedback (Expectation: Active / 3 comments). Assessed by Lead assessment of PRs.',
      weight: 4,
      unit: 'comments/PR',
      sourceLabel: 'Lead assessment of PRs',
      ruleCode: 'RULE_CODE_REVIEW_FEEDBACK',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'TESTING_DOCUMENTATION',
      category: CriterionCategory.CAPABILITY,
      name: 'Testing & Documentation',
      description: 'Writing tests and technical documentation (Expectation: SI: main flow unit tests + design notes; SM: docs on logic/DB change). Assessed via PR review / Checklist.',
      weight: 3,
      unit: 'Checklist',
      sourceLabel: 'PR review / Checklist',
      ruleCode: 'RULE_TESTING_DOCUMENTATION',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'BUSINESS_DOMAIN_KNOWLEDGE',
      category: CriterionCategory.CAPABILITY,
      name: 'Business Domain Knowledge',
      description: 'Understanding of project business domain (Expectation: Optimize / decision making). Assessed via PO feedback / real tasks.',
      weight: 4,
      unit: 'Score',
      sourceLabel: 'PO feedback / real tasks',
      ruleCode: 'RULE_BUSINESS_DOMAIN_KNOWLEDGE',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },

    // ── Contribution ────────────────────────────────────────────────────────
    {
      code: 'MENTORING',
      category: CriterionCategory.CONTRIBUTION,
      name: 'Mentoring',
      description: 'Guide, train, and support capability development for junior members (Expectation: 1 Junior). Assessed via Mentor log / Feedback.',
      weight: 6,
      unit: 'juniors',
      sourceLabel: 'Mentor log / Feedback',
      ruleCode: 'RULE_MENTORING',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'KNOWLEDGE_SHARING',
      category: CriterionCategory.CONTRIBUTION,
      name: 'Knowledge Sharing',
      description: 'Share knowledge through technical articles or internal tech talks (Expectation: 3 times). Assessed via Posts, internal talks.',
      weight: 5,
      unit: 'sessions',
      sourceLabel: 'Posts, internal talks',
      ruleCode: 'RULE_KNOWLEDGE_SHARING',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'TEAMWORK_COMMUNICATION',
      category: CriterionCategory.CONTRIBUTION,
      name: 'Teamwork & Communication',
      description: 'Effective communication and teamwork coordination (Expectation: Frequent). Assessed via Jira logs, peer review.',
      weight: 5,
      unit: 'Score',
      sourceLabel: 'Jira logs, peer review',
      ruleCode: 'RULE_TEAMWORK_COMMUNICATION',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'CUSTOMER_COMMS_ENGLISH',
      category: CriterionCategory.CONTRIBUTION,
      name: 'Customer Comms & English',
      description: 'English skills and communication with clients (Expectation: Chat + Email · B1-B2). Assessed via PM/Client feedback.',
      weight: 5,
      unit: 'Proficiency',
      sourceLabel: 'PM/Client feedback',
      ruleCode: 'RULE_CUSTOMER_COMMS_ENGLISH',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'PROPOSING_IMPROVEMENTS',
      category: CriterionCategory.CONTRIBUTION,
      name: 'Proposing Improvements',
      description: 'Contribute initiatives to improve processes, techniques, or working tools (Expectation: 3 proposals). Assessed via Impactful proposals count.',
      weight: 5,
      unit: 'proposals',
      sourceLabel: 'Impactful proposals count',
      ruleCode: 'RULE_PROPOSING_IMPROVEMENTS',
      applicableRoleIds: [],
      applicableTeamIds: [],
    },
    {
      code: 'ATTITUDE_COMPANY_CULTURE',
      category: CriterionCategory.CONTRIBUTION,
      name: 'Attitude & Company Culture',
      description: 'Work attitude, sense of responsibility, and company culture engagement (Expectation: Proactive, positive). Assessed via Org feedback.',
      weight: 4,
      unit: 'Score',
      sourceLabel: 'Org feedback',
      ruleCode: 'RULE_ATTITUDE_COMPANY_CULTURE',
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

  // 4. Template: AllegroNX 2026 Evaluation Framework (100% total weight across all 18 criteria)
  const templateCodesToSeed = [
    {
      code: 'ENG_EVAL_2026',
      name: 'Engineering Evaluation 2026',
      description: 'Standard 2026 performance evaluation framework for engineering teams (AllegroNX Middle Level Framework).',
      criteriaItems: [
        { code: 'ON_TIME_COMPLETION', weight: 10 },
        { code: 'PLAN_MILESTONE_ADHERENCE', weight: 8 },
        { code: 'ESTIMATION_PLANNING', weight: 6 },
        { code: 'OWNERSHIP_SCOPE', weight: 8 },
        { code: 'INDEPENDENCE', weight: 8 },
        { code: 'TASK_QUALITY', weight: 5 },
        { code: 'PRODUCTION_INCIDENT', weight: 5 },
        { code: 'CORE_ENGINEERING_SKILLSET', weight: 5 },
        { code: 'SQL_DATABASE', weight: 4 },
        { code: 'CODE_REVIEW_FEEDBACK', weight: 4 },
        { code: 'TESTING_DOCUMENTATION', weight: 3 },
        { code: 'BUSINESS_DOMAIN_KNOWLEDGE', weight: 4 },
        { code: 'MENTORING', weight: 6 },
        { code: 'KNOWLEDGE_SHARING', weight: 5 },
        { code: 'TEAMWORK_COMMUNICATION', weight: 5 },
        { code: 'CUSTOMER_COMMS_ENGLISH', weight: 5 },
        { code: 'PROPOSING_IMPROVEMENTS', weight: 5 },
        { code: 'ATTITUDE_COMPANY_CULTURE', weight: 4 },
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
        const insertRes = await pool.query(
          `INSERT INTO "kpi" (code, name, description) VALUES ('LEGACY_KPI', 'Legacy Migration KPI', 'Auto-generated KPI for evaluation templates') RETURNING kpi_id`
        );
        legacyKpiId = insertRes.rows[0].kpi_id;
      }

      const tk = await configModule.templateService.addKpiToTemplate(versionId, { kpi_id: legacyKpiId, weight: 100 });
      const templateKpiId = tk.id;

      const criteriaPayload = tplDef.criteriaItems.map((cItem, idx) => {
        const item = criterionVersionMap.get(cItem.code)!;
        const applicabilityRules = [];
        if (item.applicableRoleIds.length) {
          applicabilityRules.push({ dimension: 'ROLE' as const, operator: 'IN' as const, values: item.applicableRoleIds });
        }
        if (item.applicableTeamIds.length) {
          applicabilityRules.push({ dimension: 'TEAM' as const, operator: 'IN' as const, values: item.applicableTeamIds });
        }

        return {
          template_kpi_id: templateKpiId,
          criterion_version_id: item.versionId,
          weight: cItem.weight,
          display_order: idx + 1,
          required: true,
          enabled: true,
          applicability: applicabilityRules.length ? { rules: applicabilityRules } : { rules: [] },
        };
      });

      await configModule.templateService.bulkUpdateTemplateCriteria(versionId, criteriaPayload);
    }
  }
}
