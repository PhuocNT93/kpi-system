import { Pool } from 'pg';
import { PostgresCriterionRepository } from './infrastructure/persistence/postgres-criterion.repository.js';
import { PostgresCriterionVersionRepository } from './infrastructure/persistence/postgres-criterion-version.repository.js';
import { PostgresEvaluationLevelRepository } from './infrastructure/persistence/postgres-evaluation-level.repository.js';
import { PostgresScoringRuleRepository } from './infrastructure/persistence/postgres-scoring-rule.repository.js';
import { PostgresTemplateRepository } from './infrastructure/persistence/postgres-template.repository.js';
import { PostgresTemplateVersionRepository } from './infrastructure/persistence/postgres-template-version.repository.js';
import { PostgresTemplateKpiRepository } from './infrastructure/persistence/postgres-template-kpi.repository.js';
import { PostgresTemplateKpiCriterionRepository } from './infrastructure/persistence/postgres-template-kpi-criterion.repository.js';
import { PostgresOverrideRepository } from './infrastructure/persistence/postgres-override.repository.js';
import { PostgresWorkflowRepository } from './infrastructure/persistence/postgres-workflow.repository.js';
import { PostgresConfigurationAuditRepository } from './infrastructure/persistence/postgres-configuration-audit.repository.js';

import { CriterionService } from './application/services/criterion.service.js';
import { EvaluationLevelService } from './application/services/evaluation-level.service.js';
import { ScoringRuleService } from './application/services/scoring-rule.service.js';
import { TemplateService } from './application/services/template.service.js';
import { OverrideService } from './application/services/override.service.js';
import { EffectiveConfigurationResolver } from './application/services/effective-configuration-resolver.js';
import { ConfigurationDiffService } from './application/services/configuration-diff.service.js';
import { ConfigurationCloneService } from './application/services/configuration-clone.service.js';
import { ConfigurationSnapshotService } from './application/services/configuration-snapshot.service.js';
import { WorkflowConfigurationService } from './application/services/workflow-configuration.service.js';
import { ConfigurationAuditService } from './application/services/configuration-audit.service.js';

import { ConfigurationController } from './api/configuration.controller.js';

export interface ConfigurationModule {
  criterionRepo: PostgresCriterionRepository;
  versionRepo: PostgresCriterionVersionRepository;
  levelRepo: PostgresEvaluationLevelRepository;
  scoringRuleRepo: PostgresScoringRuleRepository;
  templateRepo: PostgresTemplateRepository;
  templateVersionRepo: PostgresTemplateVersionRepository;
  templateKpiRepo: PostgresTemplateKpiRepository;
  templateKpiCriterionRepo: PostgresTemplateKpiCriterionRepository;
  overrideRepo: PostgresOverrideRepository;
  workflowRepo: PostgresWorkflowRepository;
  auditRepo: PostgresConfigurationAuditRepository;

  criterionService: CriterionService;
  levelService: EvaluationLevelService;
  scoringRuleService: ScoringRuleService;
  templateService: TemplateService;
  overrideService: OverrideService;
  effectiveResolver: EffectiveConfigurationResolver;
  diffService: ConfigurationDiffService;
  cloneService: ConfigurationCloneService;
  snapshotService: ConfigurationSnapshotService;
  workflowService: WorkflowConfigurationService;
  auditService: ConfigurationAuditService;

  configurationController: ConfigurationController;
}

export function createConfigurationModule(pool: Pool): ConfigurationModule {
  const criterionRepo = new PostgresCriterionRepository(pool);
  const versionRepo = new PostgresCriterionVersionRepository(pool);
  const levelRepo = new PostgresEvaluationLevelRepository(pool);
  const scoringRuleRepo = new PostgresScoringRuleRepository(pool);
  const templateRepo = new PostgresTemplateRepository(pool);
  const templateVersionRepo = new PostgresTemplateVersionRepository(pool);
  const templateKpiRepo = new PostgresTemplateKpiRepository(pool);
  const templateKpiCriterionRepo = new PostgresTemplateKpiCriterionRepository(pool);
  const overrideRepo = new PostgresOverrideRepository(pool);
  const workflowRepo = new PostgresWorkflowRepository(pool);
  const auditRepo = new PostgresConfigurationAuditRepository(pool);

  const criterionService = new CriterionService(criterionRepo, versionRepo, scoringRuleRepo, auditRepo, pool);
  const levelService = new EvaluationLevelService(levelRepo, auditRepo);
  const scoringRuleService = new ScoringRuleService(scoringRuleRepo, auditRepo);
  const templateService = new TemplateService(templateRepo, templateVersionRepo, templateKpiRepo, templateKpiCriterionRepo, versionRepo, auditRepo, pool);
  const overrideService = new OverrideService(overrideRepo, templateVersionRepo, versionRepo, auditRepo);
  const effectiveResolver = new EffectiveConfigurationResolver(
    templateRepo,
    templateVersionRepo,
    templateKpiRepo,
    templateKpiCriterionRepo,
    criterionRepo,
    versionRepo,
    scoringRuleRepo,
    overrideRepo
  );
  const diffService = new ConfigurationDiffService(templateVersionRepo, templateKpiRepo, templateKpiCriterionRepo, versionRepo, criterionRepo);
  const cloneService = new ConfigurationCloneService(templateRepo, templateVersionRepo, templateKpiRepo, templateKpiCriterionRepo, auditRepo, pool);
  const snapshotService = new ConfigurationSnapshotService(
    templateRepo,
    templateVersionRepo,
    templateKpiRepo,
    templateKpiCriterionRepo,
    criterionRepo,
    versionRepo,
    levelRepo,
    scoringRuleRepo,
    workflowRepo
  );
  const workflowService = new WorkflowConfigurationService(workflowRepo, auditRepo);
  const auditService = new ConfigurationAuditService(auditRepo);

  const configurationController = new ConfigurationController(
    criterionService,
    levelService,
    scoringRuleService,
    templateService,
    overrideService,
    effectiveResolver,
    diffService,
    cloneService,
    snapshotService,
    workflowService,
    auditService
  );

  return {
    criterionRepo,
    versionRepo,
    levelRepo,
    scoringRuleRepo,
    templateRepo,
    templateVersionRepo,
    templateKpiRepo,
    templateKpiCriterionRepo,
    overrideRepo,
    workflowRepo,
    auditRepo,

    criterionService,
    levelService,
    scoringRuleService,
    templateService,
    overrideService,
    effectiveResolver,
    diffService,
    cloneService,
    snapshotService,
    workflowService,
    auditService,

    configurationController,
  };
}
