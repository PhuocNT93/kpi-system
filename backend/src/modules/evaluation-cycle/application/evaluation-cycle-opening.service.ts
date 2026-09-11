import { Pool, PoolClient } from 'pg';
import { withTransaction } from '../../../shared/database/transaction.js';
import { NotFound, Conflict, AppError } from '../../../api/app-error.js';
import {
  EvaluationCycleStatus,
  EvaluationStatus,
  EvaluationCycleErrorCodes,
} from '../domain/evaluation-cycle.types.js';
import {
  IEvaluationCycleRepository,
  IEvaluationRepository,
  IEvaluationItemRepository,
} from '../domain/evaluation-cycle.repository.js';
import { EvaluationCycleTransitionService } from './evaluation-cycle-transition.service.js';
import { CriterionApplicabilityResolver } from './criterion-applicability.resolver.js';
import { AuditService } from '../../audit/application/audit.service.js';

export interface OpenCycleResult {
  id: string;
  status: EvaluationCycleStatus;
  evaluationCount: number;
}

export class EvaluationCycleOpeningService {
  constructor(
    private pool: Pool,
    private cycleRepo: IEvaluationCycleRepository,
    private evaluationRepo: IEvaluationRepository,
    private evaluationItemRepo: IEvaluationItemRepository,
    private transitionService: EvaluationCycleTransitionService,
    private auditService?: AuditService
  ) {}

  public async  openCycle(cycleId: string, actorEmployeeId: string | null): Promise<OpenCycleResult> {
    return withTransaction(this.pool, async (client: unknown) => {
      const dbClient = client as unknown as PoolClient;
      const validActorEmployeeId = await this.resolveValidEmployeeId(dbClient, actorEmployeeId);
      const validActorUserId = await this.resolveValidUserId(dbClient, actorEmployeeId, validActorEmployeeId);

      // 1. Lock cycle row for update
      const cycle = await this.cycleRepo.findByIdForUpdate(cycleId, dbClient);
      if (!cycle) {
        throw new NotFound('EvaluationCycle');
      }

      // 2. Validate current status
      if (cycle.status !== EvaluationCycleStatus.DRAFT) {
        throw new Conflict(
          `Evaluation cycle is in status ${cycle.status} and cannot be opened`,
          EvaluationCycleErrorCodes.EVALUATION_CYCLE_NOT_EDITABLE
        );
      }

      this.transitionService.validateTransition(cycle.status, EvaluationCycleStatus.OPEN);

      // 3. Load & validate template version
      const templateVersionRes = await dbClient.query(
        `SELECT id, status
         FROM evaluation_template_versions
         WHERE id = $1`,
        [cycle.evaluationTemplateVersionId]
      );

      if (templateVersionRes.rows.length === 0) {
        throw new NotFound('EvaluationTemplateVersion');
      }

      const tplVersionStatus = templateVersionRes.rows[0].status;
      if (tplVersionStatus !== 'PUBLISHED') {
        throw new AppError(
          422,
          EvaluationCycleErrorCodes.TEMPLATE_NOT_PUBLISHED,
          `Template version ${cycle.evaluationTemplateVersionId} is in status ${tplVersionStatus} and must be PUBLISHED to open cycle.`
        );
      }

      const currentTemplateVersion = await dbClient.query(
        `SELECT template_id, version_no
         FROM evaluation_template_versions
         WHERE id = $1`,
        [cycle.evaluationTemplateVersionId]
      );
      const currentTemplateId = currentTemplateVersion.rows[0]?.template_id as string | undefined;
      const currentVersionNo = currentTemplateVersion.rows[0]?.version_no as number | undefined;
      if (!currentTemplateId || currentVersionNo === undefined) {
        throw new NotFound('EvaluationTemplateVersion');
      }

      const currentTemplateMeta = await dbClient.query(
        `SELECT code, name, description, status, created_at, created_by, updated_at, updated_by
         FROM evaluation_templates
         WHERE id = $1`,
        [currentTemplateId]
      );

      if (currentTemplateMeta.rows.length === 0) {
        throw new NotFound('EvaluationTemplate');
      }

      const legacyTemplateRes = await dbClient.query(
        `SELECT evaluation_template_id
         FROM evaluation_template
         WHERE code = $1
         LIMIT 1`,
        [currentTemplateMeta.rows[0].code]
      );

      let legacyTemplateId = legacyTemplateRes.rows[0]?.evaluation_template_id as string | undefined;
      if (!legacyTemplateId) {

        const legacyTemplateInsertRes = await dbClient.query(
          `INSERT INTO evaluation_template (
             code,
             name,
             description,
             active,
             created_at,
             created_by,
             updated_at,
             updated_by
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING evaluation_template_id`,
          [
            currentTemplateMeta.rows[0].code,
            currentTemplateMeta.rows[0].name,
            currentTemplateMeta.rows[0].description,
            currentTemplateMeta.rows[0].status !== 'ARCHIVED',
            currentTemplateMeta.rows[0].created_at,
            currentTemplateMeta.rows[0].created_by,
            currentTemplateMeta.rows[0].updated_at,
            currentTemplateMeta.rows[0].updated_by,
          ]
        );
        legacyTemplateId = legacyTemplateInsertRes.rows[0].evaluation_template_id as string;
      }

      const legacyVersionRes = await dbClient.query(
        `SELECT evaluation_template_version_id
         FROM evaluation_template_version
         WHERE evaluation_template_id = $1 AND version_no = $2
         LIMIT 1`,
        [legacyTemplateId, currentVersionNo]
      );

      let legacyTemplateVersionId = legacyVersionRes.rows[0]?.evaluation_template_version_id as string | undefined;
      if (!legacyTemplateVersionId) {
        const legacyInsertRes = await dbClient.query(
          `INSERT INTO evaluation_template_version (
             evaluation_template_id,
             version_no,
             status,
             published_at,
             created_by,
             updated_by
           ) VALUES ($1, $2, $3, NOW(), NULL, NULL)
           RETURNING evaluation_template_version_id`,
          [legacyTemplateId, currentVersionNo, tplVersionStatus]
        );
        legacyTemplateVersionId = legacyInsertRes.rows[0].evaluation_template_version_id as string;
      }

      // 4. Load template criteria & defensive weight check
      const tcRes = await dbClient.query(
        `SELECT tc.id AS template_criterion_id,
                tc.template_kpi_id,
                tc.template_version_id AS evaluation_template_version_id,
                tc.criterion_version_id,
                tc.weight AS effective_weight,
                tc.applicability,
                NOT tc.enabled AS is_disabled,
                tc.display_order,
                tk.weight AS kpi_weight,
                k.code AS kpi_code,
                k.name AS kpi_name,
                c.id AS criterion_id,
                c.code AS criterion_code,
                c.name AS criterion_name,
                sr.rule_type,
                  sr.config AS rule_config
         FROM template_criteria tc
         JOIN template_kpi tk ON tc.template_kpi_id = tk.template_kpi_id
         JOIN kpi k ON tk.kpi_id = k.kpi_id
         JOIN criterion_versions cv ON tc.criterion_version_id = cv.id
         JOIN criteria c ON cv.criterion_id = c.id
         JOIN scoring_rules sr ON cv.scoring_rule_id = sr.id
         WHERE tc.template_version_id = $1
         ORDER BY tc.display_order ASC`,
        [cycle.evaluationTemplateVersionId]
      );

      const templateCriteria = tcRes.rows;

      if (templateCriteria.length === 0) {
        throw new AppError(
          422,
          EvaluationCycleErrorCodes.INVALID_TEMPLATE_CONFIGURATION,
          'Template contains no criteria.'
        );
      }

      const criteriaWithApplicability = templateCriteria.map((tc: Record<string, unknown>) => {
        const applicability = (typeof tc.applicability === 'string' ? JSON.parse(tc.applicability) : tc.applicability) as {
          rules?: Array<{ dimension?: string; values?: string[] }>;
        } | null;
        const roleRule = applicability?.rules?.find((rule) => rule.dimension === 'ROLE');
        const teamRule = applicability?.rules?.find((rule) => rule.dimension === 'TEAM');
        return {
          ...tc,
          applicable_role_ids: roleRule?.values ?? [],
          applicable_team_ids: teamRule?.values ?? [],
        };
      }) as Array<
        Record<string, unknown> & {
          applicable_role_ids: string[];
          applicable_team_ids: string[];
        }
      >;

      const legacyCriterionIdByCurrentId = new Map<string, string>();
      const legacyCriterionVersionIdByCurrentId = new Map<string, string>();
      const legacyScoringRuleIdByCurrentId = new Map<string, string>();

      const currentCriterionVersionIds = Array.from(
        new Set(criteriaWithApplicability.map((tc: Record<string, unknown>) => tc.criterion_version_id).filter(Boolean))
      ) as string[];
      if (currentCriterionVersionIds.length > 0) {
        const criterionVersionMirrorRes = await dbClient.query(
          `SELECT
             cv.id AS current_criterion_version_id,
             cv.version_no,
             cv.default_weight,
             cv.measurement_unit,
             cv.measurement_source_label,
             cv.scoring_rule_id,
             cv.effective_from,
             cv.effective_to,
             c.id AS current_criterion_id,
             c.code AS criterion_code,
             c.name AS criterion_name,
             c.category AS criterion_category,
             c.description AS criterion_description,
             c.status AS criterion_status,
             c.created_at AS criterion_created_at,
             c.created_by AS criterion_created_by,
             c.updated_at AS criterion_updated_at,
             c.updated_by AS criterion_updated_by,
             sr.id AS current_scoring_rule_id,
             sr.code AS scoring_rule_code,
             sr.name AS scoring_rule_name,
             sr.rule_type AS scoring_rule_type,
             sr.config AS scoring_rule_config,
             sr.status AS scoring_rule_status,
             sr.created_at AS scoring_rule_created_at,
             sr.created_by AS scoring_rule_created_by,
             sr.updated_at AS scoring_rule_updated_at,
             sr.updated_by AS scoring_rule_updated_by
           FROM criterion_versions cv
           JOIN criteria c ON cv.criterion_id = c.id
           LEFT JOIN scoring_rules sr ON cv.scoring_rule_id = sr.id
           WHERE cv.id = ANY($1::uuid[])`,
          [currentCriterionVersionIds]
        );

        for (const row of criterionVersionMirrorRes.rows as Record<string, unknown>[]) {
          const currentScoringRuleId = row.current_scoring_rule_id as string | undefined;
          let legacyScoringRuleId: string | undefined = undefined;
          if (currentScoringRuleId) {
            const legacyScoringRuleRes = await dbClient.query(
              `SELECT scoring_rule_id
               FROM scoring_rule
               WHERE rule_type = $1 AND rule_config = $2::jsonb
               LIMIT 1`,
              [row.scoring_rule_type, row.scoring_rule_config]
            );
            legacyScoringRuleId = legacyScoringRuleRes.rows[0]?.scoring_rule_id as string | undefined;
            if (!legacyScoringRuleId) {
              const legacyScoringRuleInsertRes = await dbClient.query(
                `INSERT INTO scoring_rule (
                   rule_type,
                   rule_config,
                   description,
                   created_at,
                   created_by,
                   updated_at,
                   updated_by
                 ) VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7)
                 RETURNING scoring_rule_id`,
                [
                  row.scoring_rule_type,
                  row.scoring_rule_config,
                  row.scoring_rule_name,
                  row.scoring_rule_created_at,
                  row.scoring_rule_created_by,
                  row.scoring_rule_updated_at,
                  row.scoring_rule_updated_by,
                ]
              );
              legacyScoringRuleId = legacyScoringRuleInsertRes.rows[0].scoring_rule_id as string;
            }
            legacyScoringRuleIdByCurrentId.set(currentScoringRuleId, legacyScoringRuleId);
          }

          const legacyCriterionRes = await dbClient.query(
            `SELECT criterion_id FROM criterion WHERE code = $1 LIMIT 1`,
            [row.criterion_code as string]
          );
          let legacyCriterionId = legacyCriterionRes.rows[0]?.criterion_id as string | undefined;
          if (!legacyCriterionId) {
            const legacyCriterionInsertRes = await dbClient.query(
              `INSERT INTO criterion (
                 code,
                 category,
                 name,
                 description,
                 active,
                 created_at,
                 created_by,
                 updated_at,
                 updated_by
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               RETURNING criterion_id`,
              [
                row.criterion_code,
                row.criterion_category,
                row.criterion_name,
                row.criterion_description,
                row.criterion_status !== 'ARCHIVED',
                row.criterion_created_at,
                row.criterion_created_by,
                row.criterion_updated_at,
                row.criterion_updated_by,
              ]
            );
            legacyCriterionId = legacyCriterionInsertRes.rows[0].criterion_id as string;
          }
          legacyCriterionIdByCurrentId.set(row.current_criterion_id as string, legacyCriterionId);

          const legacyCriterionVersionRes = await dbClient.query(
            `SELECT criterion_version_id
             FROM criterion_version
             WHERE criterion_id = $1 AND version_no = $2
             LIMIT 1`,
            [legacyCriterionId, row.version_no]
          );

          let legacyCriterionVersionId = legacyCriterionVersionRes.rows[0]?.criterion_version_id as string | undefined;
          if (!legacyCriterionVersionId) {
            const legacyCriterionVersionInsertRes = await dbClient.query(
              `INSERT INTO criterion_version (
                 criterion_id,
                 version_no,
                 default_weight,
                 measurement_unit,
                 measurement_source_label,
                 scoring_rule_id,
                 effective_from,
                 effective_to,
                 status,
                 created_at,
                 created_by
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               RETURNING criterion_version_id`,
              [
                legacyCriterionId,
                row.version_no,
                row.default_weight,
                row.measurement_unit,
                row.measurement_source_label,
                legacyScoringRuleId,
                row.effective_from ?? row.scoring_rule_created_at ?? new Date().toISOString(),
                row.effective_to,
                row.scoring_rule_status || 'DRAFT',
                row.scoring_rule_created_at,
                row.scoring_rule_created_by,
              ]
            );
            legacyCriterionVersionId = legacyCriterionVersionInsertRes.rows[0].criterion_version_id as string;
          }

          legacyCriterionVersionIdByCurrentId.set(row.current_criterion_version_id as string, legacyCriterionVersionId);
        }
      }

      // evaluation_item still references the legacy template_criterion table.
      // Mirror the current template_criteria rows into the legacy table so FK validation succeeds.
      for (const tc of criteriaWithApplicability as Record<string, unknown>[]) {
        const currentId = tc.template_criterion_id as string;
        const currentCriterionVersionId = tc.criterion_version_id as string;
        const legacyCriterionVersionId = legacyCriterionVersionIdByCurrentId.get(currentCriterionVersionId);
        if (!legacyCriterionVersionId) {
          throw new AppError(
            422,
            EvaluationCycleErrorCodes.INVALID_TEMPLATE_CONFIGURATION,
            `Unable to resolve legacy criterion version for current criterion version ${currentCriterionVersionId}.`
          );
        }

        const legacyRes = await dbClient.query(
          `SELECT template_criterion_id
           FROM template_criterion
           WHERE evaluation_template_version_id = $1
             AND criterion_version_id = $2
           LIMIT 1`,
          [legacyTemplateVersionId, legacyCriterionVersionId]
        );

        if (legacyRes.rows.length > 0) {
          legacyCriterionIdByCurrentId.set(currentId, legacyRes.rows[0].template_criterion_id as string);
          continue;
        }

        const legacyInsertRes = await dbClient.query(
          `INSERT INTO template_criterion (
             evaluation_template_version_id,
             criterion_version_id,
             effective_weight,
             applicable_role_ids,
             applicable_team_ids,
             is_disabled,
             display_order
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING template_criterion_id`,
          [
            legacyTemplateVersionId,
            legacyCriterionVersionId,
            tc.effective_weight,
            (tc.applicable_role_ids as string[])?.length ? tc.applicable_role_ids : null,
            (tc.applicable_team_ids as string[])?.length ? tc.applicable_team_ids : null,
            tc.is_disabled,
            tc.display_order,
          ]
        );

        legacyCriterionIdByCurrentId.set(currentId, legacyInsertRes.rows[0].template_criterion_id as string);
      }

      // Sum effective weight of enabled criteria
      const enabledCriteria = criteriaWithApplicability.filter((tc: Record<string, unknown>) => !tc.is_disabled);
      const totalWeight = enabledCriteria.reduce((sum: number, tc: Record<string, unknown>) => sum + parseFloat(tc.effective_weight as string), 0);

      // Defensive validation: weight sum must be 100%
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new AppError(
          422,
          EvaluationCycleErrorCodes.INVALID_TEMPLATE_CONFIGURATION,
          `Effective weight sum of template criteria must equal 100%, got ${totalWeight}%.`
        );
      }

      // 5. Load levels for criterion versions
      const criterionVersionIds = criteriaWithApplicability.map((tc: Record<string, unknown>) => tc.criterion_version_id);
      const levelsRes = await dbClient.query(
        `SELECT criterion_level_id, criterion_version_id, level_no, label_en, label_vn, score_value
         FROM criterion_level
         WHERE criterion_version_id = ANY($1::uuid[])
         ORDER BY level_no ASC`,
        [criterionVersionIds]
      );

      const levelsByCvId: Record<string, Record<string, unknown>[]> = {};
      for (const lvl of levelsRes.rows) {
        if (!levelsByCvId[lvl.criterion_version_id]) {
          levelsByCvId[lvl.criterion_version_id] = [];
        }
        levelsByCvId[lvl.criterion_version_id]!.push({
          level_no: parseInt(lvl.level_no, 10),
          label_en: lvl.label_en,
          label_vn: lvl.label_vn,
          score_value: parseFloat(lvl.score_value),
        });
      }

      // 6. Query eligible active employees
      const empConditions: string[] = ["employment_status = 'ACTIVE'"];
      const empValues: unknown[] = [];
      let idx = 1;

      if (cycle.applicableEmployeeIds && cycle.applicableEmployeeIds.length > 0) {
        empConditions.push(`employee_id = ANY($${idx++}::uuid[])`);
        empValues.push(cycle.applicableEmployeeIds);
      }

      if (cycle.applicableTeamIds && cycle.applicableTeamIds.length > 0) {
        empConditions.push(`team_id = ANY($${idx++}::uuid[])`);
        empValues.push(cycle.applicableTeamIds);
      }

      if (cycle.applicableRoleIds && cycle.applicableRoleIds.length > 0) {
        empConditions.push(`role_id = ANY($${idx++}::uuid[])`);
        empValues.push(cycle.applicableRoleIds);
      }

      const empWhere = `WHERE ${empConditions.join(' AND ')}`;
      const empRes = await dbClient.query(
        `SELECT employee_id, team_id, role_id, job_level_id, manager_id
         FROM employee
         ${empWhere}`,
        empValues
      );

      const activeEmployees = empRes.rows;
      // Defensive: filter out employees missing required snapshot fields (team_id or role_id)
      const filteredEmployees = activeEmployees.filter((e: Record<string, unknown>) => e.team_id && e.role_id);
      if (filteredEmployees.length !== activeEmployees.length) {
        // Log a warning — some employees lack team/role and will be skipped when opening cycle
        // (This prevents NOT NULL violations when seeding in inconsistent dev DBs.)
        
        console.warn('Skipping employees without team_id or role_id when opening cycle:',
          activeEmployees.filter((e: Record<string, unknown>) => !e.team_id || !e.role_id).map((e: Record<string, unknown>) => e.employee_id)
        );
      }

      if (filteredEmployees.length === 0) {
        throw new AppError(
          422,
          EvaluationCycleErrorCodes.INVALID_TEMPLATE_CONFIGURATION,
          'No eligible active employees found for this evaluation cycle configuration.'
        );
      }
      if (activeEmployees.length === 0) {
        throw new AppError(
          422,
          EvaluationCycleErrorCodes.INVALID_TEMPLATE_CONFIGURATION,
          'No eligible active employees found for this evaluation cycle configuration.'
        );
      }

      const empIds = filteredEmployees.map((e: Record<string, unknown>) => e.employee_id);

      // 7. Load historical employee assignment as of cycle start date
      const assignRes = await dbClient.query(
        `SELECT DISTINCT ON (employee_id) employee_id, team_id, role_id, job_level_id, manager_id
         FROM employee_assignment
         WHERE employee_id = ANY($1::uuid[])
           AND effective_from <= $2
           AND (effective_to IS NULL OR effective_to > $2)
         ORDER BY employee_id, effective_from DESC`,
        [empIds, cycle.startDate]
      );

      const assignmentMap: Record<string, Record<string, unknown>> = {};
      for (const a of assignRes.rows) {
        assignmentMap[a.employee_id] = a;
      }

      // Build evaluation snapshots
      const evaluationInserts = filteredEmployees.map((emp: Record<string, unknown>) => {
        const histAssignment = assignmentMap[emp.employee_id as string];
        const teamId = histAssignment?.team_id || emp.team_id;
        const roleId = histAssignment?.role_id || emp.role_id;
        const jobLevelId = histAssignment?.job_level_id || emp.job_level_id || null;
        const managerId = histAssignment?.manager_id || emp.manager_id || null;

        return {
          evaluationCycleId: cycle.evaluationCycleId,
          employeeId: emp.employee_id as string,
          teamIdSnapshot: teamId as string,
          roleIdSnapshot: roleId as string,
          jobLevelSnapshot: jobLevelId as string | null,
          managerIdSnapshot: managerId as string | null,
          status: EvaluationStatus.OPEN,
          selfScore: null,
          managerScore: null,
          finalScore: null,
          submittedAt: null,
          approvedAt: null,
          isLocked: false,
          createdBy: validActorEmployeeId,
          updatedBy: validActorEmployeeId,
        };
      });

      // 8. Batch insert evaluations
      const createdEvaluations = await this.evaluationRepo.batchCreate(evaluationInserts, dbClient);

      // Map generated evaluation IDs by employee ID
      const evalMapByEmp: Record<string, string> = {};
      for (const ev of createdEvaluations) {
        evalMapByEmp[ev.employeeId as string] = ev.evaluationId;
      }

      // 8.5. Load translations for criteria to snapshot as jsonb map
      const criterionIds = Array.from(
        new Set(criteriaWithApplicability.map((tc: Record<string, unknown>) => tc.criterion_id).filter(Boolean))
      );
      const criterionTranslations: Record<string, Record<string, string>> = {};
      if (criterionIds.length > 0) {
        const i18nRes = await dbClient.query(
          `SELECT entity_id, locale, field_name, value
           FROM i18n_translation
           WHERE entity_type = 'CRITERION' AND entity_id = ANY($1::uuid[])`,
          [criterionIds]
        );
        for (const row of i18nRes.rows) {
          let translations = criterionTranslations[row.entity_id];

          if (!translations) {
            translations = {};
            criterionTranslations[row.entity_id] = translations;
          }

          translations[row.locale] = row.value;
        }
      }

      // 9. Build evaluation item snapshots
      const itemInserts: Parameters<typeof this.evaluationItemRepo.batchCreate>[0] = [];
      for (const ev of evaluationInserts) {
        const evalId = evalMapByEmp[ev.employeeId];
        const empSnapshot = {
          employeeId: ev.employeeId as string,
          teamId: ev.teamIdSnapshot as string,
          roleId: ev.roleIdSnapshot as string,
          jobLevelId: ev.jobLevelSnapshot,
          managerId: ev.managerIdSnapshot,
        };

        for (const tc of criteriaWithApplicability) {
          const legacyTemplateCriterionId = legacyCriterionIdByCurrentId.get(tc.template_criterion_id as string);
          if (!legacyTemplateCriterionId) {
            throw new AppError(
              422,
              EvaluationCycleErrorCodes.INVALID_TEMPLATE_CONFIGURATION,
              `Unable to resolve legacy template criterion for criterion version ${tc.criterion_version_id as string}.`
            );
          }

          const isDisabled = CriterionApplicabilityResolver.isDisabledForEmployee(
            {
              templateCriterionId: legacyTemplateCriterionId,
              applicableRoleIds: (tc.applicable_role_ids as string[] | undefined) ?? [],
              applicableTeamIds: (tc.applicable_team_ids as string[] | undefined) ?? [],
              isDisabled: Boolean(tc.is_disabled),
            },
            empSnapshot
          );

          const levels = levelsByCvId[tc.criterion_version_id as string] || [];

          const critId = tc.criterion_id as string;
          const translationsMap = criterionTranslations[critId] || {};
          let nameSnapshot: string;
          if (Object.keys(translationsMap).length > 0) {
            nameSnapshot = JSON.stringify(translationsMap);
          } else {
            const rawName = (tc.criterion_name as string) || '';
            nameSnapshot = rawName.startsWith('{') ? rawName : JSON.stringify({ en: rawName });
          }

          itemInserts.push({
            evaluationId: evalId as string,
            templateCriterionId: legacyTemplateCriterionId,
            criterionCodeSnapshot: tc.criterion_code as string,
            criterionNameSnapshot: nameSnapshot,
            weightSnapshot: parseFloat(tc.effective_weight as string),
            kpiIdSnapshot: tc.kpi_id as string | undefined,
            kpiCodeSnapshot: tc.kpi_code as string | undefined,
            kpiNameSnapshot: tc.kpi_name as string | undefined,
            kpiWeightSnapshot: parseFloat(tc.kpi_weight as string),
            scoringRuleSnapshot: {
              rule_type: tc.rule_type as string,
              rule_config: typeof tc.rule_config === 'string' ? JSON.parse(tc.rule_config) : tc.rule_config,
            },
            levelDefinitionSnapshot: levels,
            resolvedLevel: null,
            rawScore: null,
            weightedScore: null,
            isDisabledForEmployee: isDisabled,
            isMissingScore: false,
            comment: null,
            reviewerId: null,
            reviewDate: null,
            createdBy: validActorEmployeeId,
            updatedBy: validActorEmployeeId,
          });
        }
      }

      // 10. Batch insert evaluation items
      await this.evaluationItemRepo.batchCreate(itemInserts, dbClient);

      // 11. Update cycle status to OPEN
      cycle.status = EvaluationCycleStatus.OPEN;
      cycle.updatedBy = validActorEmployeeId;
      await this.cycleRepo.update(cycle, dbClient);

      // 12. Record audit log inside transaction
      if (this.auditService) {
        await this.auditService.record(dbClient, {
          entityType: 'EVALUATION_CYCLE',
          entityId: cycle.evaluationCycleId,
          action: 'CYCLE_OPENED',
          newValue: JSON.stringify({
            status: EvaluationCycleStatus.OPEN,
            evaluation_count: createdEvaluations.length,
            template_version_id: cycle.evaluationTemplateVersionId,
          }),
          performedBy: validActorUserId,
          source: 'API',
        });
      }

      return {
        id: cycle.evaluationCycleId,
        status: EvaluationCycleStatus.OPEN,
        evaluationCount: createdEvaluations.length,
      };
    });
  }

  private async resolveValidEmployeeId(client: PoolClient, actorEmployeeId: string | null): Promise<string | null> {
    if (actorEmployeeId) {
      const checkEmp = await client.query('SELECT employee_id FROM employee WHERE employee_id = $1', [actorEmployeeId]);
      if (checkEmp.rows.length > 0) {
        return actorEmployeeId;
      }
      const checkUser = await client.query('SELECT employee_id, email FROM app_user WHERE id = $1', [actorEmployeeId]);
      if (checkUser.rows.length > 0) {
        if (checkUser.rows[0].employee_id) {
          return checkUser.rows[0].employee_id;
        }
        const checkEmail = await client.query('SELECT employee_id FROM employee WHERE LOWER(email) = LOWER($1)', [checkUser.rows[0].email]);
        if (checkEmail.rows.length > 0) {
          return checkEmail.rows[0].employee_id;
        }
      }
    }
    const fallback = await client.query('SELECT employee_id FROM employee ORDER BY created_at ASC LIMIT 1');
    return fallback.rows[0]?.employee_id || null;
  }

  private async resolveValidUserId(
    client: PoolClient,
    actorId: string | null,
    actorEmployeeId: string | null
  ): Promise<string> {
    if (actorId) {
      const checkUser = await client.query('SELECT id FROM app_user WHERE id = $1', [actorId]);
      if (checkUser.rows.length > 0) {
        return actorId;
      }

      const checkEmployeeUser = await client.query('SELECT id FROM app_user WHERE employee_id = $1', [actorId]);
      if (checkEmployeeUser.rows.length > 0) {
        return checkEmployeeUser.rows[0].id;
      }

      if (actorEmployeeId) {
        const mappedUser = await client.query('SELECT id FROM app_user WHERE employee_id = $1', [actorEmployeeId]);
        if (mappedUser.rows.length > 0) {
          return mappedUser.rows[0].id;
        }

        const employeeEmailRes = await client.query('SELECT email FROM employee WHERE employee_id = $1', [actorEmployeeId]);
        const email = employeeEmailRes.rows[0]?.email as string | undefined;
        if (email) {
          const emailUser = await client.query('SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)', [email]);
          if (emailUser.rows.length > 0) {
            return emailUser.rows[0].id;
          }
        }
      }
    }

    const fallback = await client.query('SELECT id FROM app_user ORDER BY created_at ASC LIMIT 1');
    if (fallback.rows[0]?.id) {
      return fallback.rows[0].id;
    }

    throw new Error('No app_user available for audit logging');
  }
}
