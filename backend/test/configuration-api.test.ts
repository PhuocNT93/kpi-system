import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { createDatabasePool } from '../src/shared/database/database.js';
import { createConfigurationModule, ConfigurationModule } from '../src/modules/configuration/configuration.module.js';
import { seedConfigurationModule } from '../src/modules/configuration/infrastructure/seed/configuration.seed.js';
import {
  CriterionCategory,
  ScoringRuleType,
  VersionStatus,
  TemplateStatus,
  WeightPolicy,
} from '../src/modules/configuration/domain/configuration.types.js';
import { Conflict, AppError } from '../src/api/app-error.js';

const isDbAvailable = Boolean(process.env.DATABASE_URL);

describe.runIf(isDbAvailable)('Configuration Module Integration & API Tests', () => {
  let pool: Pool;
  let mod: ConfigurationModule;

  beforeAll(async () => {
    pool = createDatabasePool();
    mod = createConfigurationModule(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE configuration_audit_logs, workflow_transitions, workflow_states, workflow_definitions, template_overrides, team_overrides, role_overrides, template_criteria, evaluation_template_versions, evaluation_templates, evaluation_levels, criterion_versions, scoring_rules, criteria CASCADE;');
  });

  it('TC-CFG-01: should create criterion and draft version', async () => {
    const result = await mod.criterionService.createCriterion({
      code: 'ON_TIME_COMPLETION',
      category: CriterionCategory.PERFORMANCE,
      name: 'On-time Completion',
    });

    expect(result.criterion.id).toBeDefined();
    expect(result.criterion.code).toBe('ON_TIME_COMPLETION');
    expect(result.initialVersion.version_no).toBe(1);
    expect(result.initialVersion.status).toBe(VersionStatus.DRAFT);
  });

  it('TC-CFG-02: should prevent mutating a published criterion version', async () => {
    const { initialVersion } = await mod.criterionService.createCriterion({
      code: 'ON_TIME_COMPLETION',
      category: CriterionCategory.PERFORMANCE,
      name: 'On-time Completion',
    });

    await mod.criterionService.updateDraftVersion(initialVersion.id, {
      default_weight: 20,
      measurement_unit: '%',
    });

    await mod.criterionService.publishVersion(initialVersion.id);

    await expect(
      mod.criterionService.updateDraftVersion(initialVersion.id, { default_weight: 30 })
    ).rejects.toThrow(AppError);
  });

  it('TC-CFG-06 & TC-CFG-07: should resolve precedence: Template > Team > Role > Base', async () => {
    // 1. Create base criterion and published version
    const { initialVersion: cv } = await mod.criterionService.createCriterion({
      code: 'ON_TIME_COMPLETION',
      category: CriterionCategory.PERFORMANCE,
      name: 'On-time Completion',
    });

    await mod.criterionService.updateDraftVersion(cv.id, { default_weight: 10, measurement_unit: '%' });
    const publishedCv = await mod.criterionService.publishVersion(cv.id);

    // 2. Create template and version
    const { initialVersion: tv } = await mod.templateService.createTemplate({
      code: 'ENG_TPL',
      name: 'Engineering Evaluation',
    });

    await mod.templateService.addTemplateCriterion(tv.id, {
      criterion_version_id: publishedCv.id,
      weight: 10,
    });

    // 3. Add Role Override: SI -> 15%
    await mod.overrideService.createRoleOverride({
      role_code: 'ROLE_SI',
      template_version_id: tv.id,
      criterion_version_id: publishedCv.id,
      override_config: { weight: 15 },
    });

    // 4. Add Team Override: Platform -> 20%
    await mod.overrideService.createTeamOverride({
      team_code: 'TEAM_PLATFORM',
      template_version_id: tv.id,
      criterion_version_id: publishedCv.id,
      override_config: { weight: 20 },
    });

    // Test Role + Team (No Template Override) -> Expected 20% (TEAM_OVERRIDE)
    let resolved = await mod.effectiveResolver.resolve(tv.id, {
      role_id: 'ROLE_SI',
      team_id: 'TEAM_PLATFORM',
    });

    expect(resolved.criteria).toHaveLength(1);
    expect(resolved.criteria[0].weight).toBe(20);
    expect(resolved.criteria[0].weight_source).toBe('TEAM_OVERRIDE');

    // 5. Add Template Override -> 25%
    await mod.overrideService.createTemplateOverride({
      template_version_id: tv.id,
      criterion_version_id: publishedCv.id,
      override_config: { weight: 25 },
    });

    // Test Role + Team + Template -> Expected 25% (TEMPLATE_OVERRIDE)
    resolved = await mod.effectiveResolver.resolve(tv.id, {
      role_id: 'ROLE_SI',
      team_id: 'TEAM_PLATFORM',
    });

    expect(resolved.criteria[0].weight).toBe(25);
    expect(resolved.criteria[0].weight_source).toBe('TEMPLATE_OVERRIDE');
  });

  it('TC-CFG-09: should clone published template version into new draft', async () => {
    const { template, initialVersion: tv1 } = await mod.templateService.createTemplate({
      code: 'ENG_TPL',
      name: 'Engineering Template',
    });

    const { initialVersion: cv } = await mod.criterionService.createCriterion({
      code: 'CODE_REVIEW',
      category: CriterionCategory.PERFORMANCE,
      name: 'Code Review',
    });
    await mod.criterionService.updateDraftVersion(cv.id, { default_weight: 100, measurement_unit: 'PRs' });
    const pubCv = await mod.criterionService.publishVersion(cv.id);

    await mod.templateService.bulkUpdateTemplateCriteria(tv1.id, [
      { criterion_version_id: pubCv.id, weight: 100 },
    ]);

    await mod.templateService.publishTemplateVersion(tv1.id);

    // Clone tv1 -> tv2
    const tv2 = await mod.cloneService.cloneTemplateVersion(template.id, tv1.id);

    expect(tv2.version_no).toBe(2);
    expect(tv2.status).toBe(VersionStatus.DRAFT);

    const tv2Criteria = await mod.templateService.getTemplateCriteria(tv2.id);
    expect(tv2Criteria).toHaveLength(1);
    expect(tv2Criteria[0].weight).toBe(100);
  });

  it('TC-CFG-10: should calculate diff between two template versions', async () => {
    const { template, initialVersion: tv1 } = await mod.templateService.createTemplate({
      code: 'ENG_TPL',
      name: 'Engineering Template',
    });

    const { initialVersion: cv1 } = await mod.criterionService.createCriterion({
      code: 'ON_TIME_COMPLETION',
      category: CriterionCategory.PERFORMANCE,
      name: 'On time completion',
    });

    await mod.criterionService.updateDraftVersion(cv1.id, { default_weight: 100, measurement_unit: '%' });
    const pubCv1 = await mod.criterionService.publishVersion(cv1.id);

    await mod.templateService.bulkUpdateTemplateCriteria(tv1.id, [
      { criterion_version_id: pubCv1.id, weight: 100 },
    ]);
    await mod.templateService.publishTemplateVersion(tv1.id);

    // Clone into v2
    const tv2 = await mod.cloneService.cloneTemplateVersion(template.id, tv1.id);
    // Modify weight in v2 (note policy custom for test diff)
    await mod.templateService.updateDraftTemplateVersion(tv2.id, { weight_total_policy: WeightPolicy.CUSTOM });
    await mod.templateService.bulkUpdateTemplateCriteria(tv2.id, [
      { criterion_version_id: pubCv1.id, weight: 50 },
    ]);

    const diffResult = await mod.diffService.diff(template.id, 1, 2);

    expect(diffResult.changed).toHaveLength(1);
    expect(diffResult.changed[0].criterion_code).toBe('ON_TIME_COMPLETION');
    expect(diffResult.changed[0].changes?.weight).toEqual({ from: 100, to: 50 });
  });

  it('TC-CFG-11: should generate full snapshot for cycle isolation', async () => {
    await seedConfigurationModule(pool);

    const tpl = await mod.templateRepo.findByCode('ENGINEERING_EVALUATION');
    expect(tpl).not.toBeNull();

    const versions = await mod.templateService.getTemplateVersions(tpl!.id);
    const publishedVersion = versions.find((v) => v.status === VersionStatus.PUBLISHED);
    expect(publishedVersion).toBeDefined();

    const snapshot = await mod.snapshotService.generateSnapshot(tpl!.id, publishedVersion!.id);

    expect(snapshot.template.code).toBe('ENGINEERING_EVALUATION');
    expect(snapshot.levels.length).toBeGreaterThan(0);
    expect(snapshot.criteria.length).toBe(4);
  });

  it('TC-CFG-13: should record audit log entries on state changes', async () => {
    const { criterion } = await mod.criterionService.createCriterion({
      code: 'AUDIT_TEST',
      category: CriterionCategory.CAPABILITY,
      name: 'Audit Test',
    });

    const logs = await mod.auditService.getAuditLogs({ entity_id: criterion.id });
    expect(logs.items).toHaveLength(1);
    expect(logs.items[0].action).toBe('CREATE');
    expect(logs.items[0].entity_type).toBe('CRITERION');
  });

  it('TC-CFG-14: should throw VersionMismatch on optimistic lock failure', async () => {
    const { criterion } = await mod.criterionService.createCriterion({
      code: 'CONCURRENCY_TEST',
      category: CriterionCategory.CAPABILITY,
      name: 'Concurrency Test',
    });

    // Pass stale expected version (e.g., 999)
    await expect(
      mod.criterionService.updateCriterion(criterion.id, { name: 'New Name' }, 999)
    ).rejects.toThrow();
  });
});
