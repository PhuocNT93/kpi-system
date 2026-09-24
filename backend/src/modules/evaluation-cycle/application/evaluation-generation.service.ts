import { PoolClient } from 'pg';
import { NotFound, AppError } from '../../../api/app-error.js';
import {
  Evaluation,
  EvaluationStatus,
  EvaluationCycleErrorCodes,
} from '../domain/evaluation-cycle.types.js';
import {
  IEvaluationRepository,
  IEvaluationItemRepository,
} from '../domain/evaluation-cycle.repository.js';
import { CriterionApplicabilityResolver } from './criterion-applicability.resolver.js';
import { NotificationType, NotificationService } from '../../notification/index.js';

/** A template criterion row enriched with its ROLE/TEAM applicability lists. */
export type TemplateCriterionSnapshotRow = Record<string, unknown> & {
  applicable_role_ids: string[];
  applicable_team_ids: string[];
};

/**
 * Everything needed to snapshot a published template version into evaluation items.
 * Prepared once per transaction and reused for every generated evaluation.
 */
export interface PreparedTemplateSnapshot {
  templateVersionId: string;
  criteria: TemplateCriterionSnapshotRow[];
  /** Current template_criterion id → legacy template_criterion id referenced by evaluation_item. */
  legacyTemplateCriterionIdByCurrentId: Map<string, string>;
  levelsByCriterionVersionId: Record<string, Record<string, unknown>[]>;
  criterionTranslations: Record<string, Record<string, string>>;
}

/** An employee's current organisational context; the historical assignment at the snapshot date wins. */
export interface EvaluationSubject {
  employeeId: string;
  teamId: string;
  roleId: string;
  jobLevelId: string | null;
  managerId: string | null;
}

export interface GenerateEvaluationsParams {
  evaluationCycleId: string;
  /** Date (YYYY-MM-DD) whose employee_assignment is snapshotted — the cycle start date. */
  snapshotDate: string;
  subjects: EvaluationSubject[];
  template: PreparedTemplateSnapshot;
  actorEmployeeId: string | null;
}

export interface GeneratedEvaluations {
  evaluations: Evaluation[];
  evaluationItemCount: number;
}

export interface CycleNotificationContext {
  evaluationCycleId: string;
  name: string;
  endDate: string;
}

/**
 * EVAL-02 evaluation generation (Open Cycle, LLD Sequence Diagram §3), shared by batch cycle opening
 * and individual cycle creation so both produce identical evaluations, items and snapshots.
 * All methods run on the caller's transaction client.
 */
export class EvaluationGenerationService {
  constructor(
    private evaluationRepo: IEvaluationRepository,
    private evaluationItemRepo: IEvaluationItemRepository,
    private notificationService?: NotificationService
  ) {}

  /** Latest PUBLISHED template version, used when a caller does not choose one (Review Due Dashboard default). */
  public async resolveLatestPublishedTemplateVersionId(dbClient: PoolClient): Promise<string> {
    const res = await dbClient.query(
      `SELECT id FROM evaluation_template_versions WHERE status = 'PUBLISHED' ORDER BY version_no DESC, created_at DESC LIMIT 1`
    );
    const id = res.rows[0]?.id as string | undefined;
    if (!id) {
      throw new AppError(422, EvaluationCycleErrorCodes.TEMPLATE_NOT_PUBLISHED, 'No published evaluation template version found.');
    }
    return id;
  }

  /**
   * Validates the template version is PUBLISHED with a 100% weight sum, mirrors it into the legacy
   * template tables referenced by evaluation_item, and loads levels and criterion translations.
   */
  public async prepareTemplateSnapshot(dbClient: PoolClient, templateVersionId: string): Promise<PreparedTemplateSnapshot> {
    // 3. Load & validate template version
    const templateVersionRes = await dbClient.query(
      `SELECT id, status
       FROM evaluation_template_versions
       WHERE id = $1`,
      [templateVersionId]
    );

    if (templateVersionRes.rows.length === 0) {
      throw new NotFound('EvaluationTemplateVersion');
    }

    const tplVersionStatus = templateVersionRes.rows[0].status;
    if (tplVersionStatus !== 'PUBLISHED') {
      throw new AppError(
        422,
        EvaluationCycleErrorCodes.TEMPLATE_NOT_PUBLISHED,
        `Template version ${templateVersionId} is in status ${tplVersionStatus} and must be PUBLISHED to open cycle.`
      );
    }

    const currentTemplateVersion = await dbClient.query(
      `SELECT template_id, version_no
       FROM evaluation_template_versions
       WHERE id = $1`,
      [templateVersionId]
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
              tc.template_version_id AS evaluation_template_version_id,
              tc.criterion_version_id,
              tc.weight AS criterion_weight,
              tc.applicability,
              NOT tc.enabled AS is_disabled,
              tc.display_order,
              tk.template_kpi_id,
              tk.kpi_id,
              tk.weight AS kpi_weight,
              (tc.weight * tk.weight / 100.0) AS effective_weight,
              k.code AS kpi_code,
              k.name AS kpi_name,
              c.id AS criterion_id,
              c.code AS criterion_code,
              c.name AS criterion_name,
              sr.rule_type,
              sr.config AS rule_config
       FROM template_criteria tc
       JOIN template_kpi tk ON tk.template_criterion_id = tc.id
       JOIN kpi k ON tk.kpi_id = k.kpi_id
       JOIN criterion_versions cv ON tc.criterion_version_id = cv.id
       JOIN criteria c ON cv.criterion_id = c.id
       JOIN scoring_rules sr ON cv.scoring_rule_id = sr.id
       WHERE tc.template_version_id = $1
       ORDER BY tc.display_order ASC, tk.display_order ASC`,
      [templateVersionId]
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
    // Mirror the current criterion/KPI rows into the legacy table so FK validation succeeds.
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
    const criterionVersionIds = Array.from(
      new Set(criteriaWithApplicability.map((tc: Record<string, unknown>) => tc.criterion_version_id).filter(Boolean))
    );
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
    return {
      templateVersionId,
      criteria: criteriaWithApplicability,
      legacyTemplateCriterionIdByCurrentId: legacyCriterionIdByCurrentId,
      levelsByCriterionVersionId: levelsByCvId,
      criterionTranslations,
    };
  }

  /**
   * Creates one OPEN evaluation per subject plus its evaluation items, snapshotting the employee
   * assignment at `snapshotDate` and the prepared template configuration.
   */
  public async generateEvaluations(dbClient: PoolClient, params: GenerateEvaluationsParams): Promise<GeneratedEvaluations> {
    const { evaluationCycleId, snapshotDate, subjects, template, actorEmployeeId } = params;
    if (subjects.length === 0) {
      return { evaluations: [], evaluationItemCount: 0 };
    }

    const empIds = subjects.map((subject) => subject.employeeId);

    // Load historical employee assignment as of cycle start date
    const assignRes = await dbClient.query(
      `SELECT DISTINCT ON (employee_id) employee_id, team_id, role_id, job_level_id, manager_id
       FROM employee_assignment
       WHERE employee_id = ANY($1::uuid[])
         AND effective_from <= $2
         AND (effective_to IS NULL OR effective_to > $2)
       ORDER BY employee_id, effective_from DESC`,
      [empIds, snapshotDate]
    );

    const assignmentMap: Record<string, Record<string, unknown>> = {};
    for (const a of assignRes.rows) {
      assignmentMap[a.employee_id] = a;
    }

    // Build evaluation snapshots
    const evaluationInserts = subjects.map((subject) => {
      const histAssignment = assignmentMap[subject.employeeId];
      const teamId = histAssignment?.team_id || subject.teamId;
      const roleId = histAssignment?.role_id || subject.roleId;
      const jobLevelId = histAssignment?.job_level_id || subject.jobLevelId || null;
      const managerId = histAssignment?.manager_id || subject.managerId || null;

      return {
        evaluationCycleId,
        employeeId: subject.employeeId,
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
        createdBy: actorEmployeeId,
        updatedBy: actorEmployeeId,
      };
    });

    // Batch insert evaluations
    const createdEvaluations = await this.evaluationRepo.batchCreate(evaluationInserts, dbClient);

    // Map generated evaluation IDs by employee ID
    const evalMapByEmp: Record<string, string> = {};
    for (const ev of createdEvaluations) {
      evalMapByEmp[ev.employeeId as string] = ev.evaluationId;
    }

    // Build evaluation item snapshots
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

      for (const tc of template.criteria) {
        const legacyTemplateCriterionId = template.legacyTemplateCriterionIdByCurrentId.get(tc.template_criterion_id as string);
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

        const levels = template.levelsByCriterionVersionId[tc.criterion_version_id as string] || [];

        const critId = tc.criterion_id as string;
        const translationsMap = template.criterionTranslations[critId] || {};
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
          createdBy: actorEmployeeId,
          updatedBy: actorEmployeeId,
        });
      }
    }

    // Batch insert evaluation items
    await this.evaluationItemRepo.batchCreate(itemInserts, dbClient);

    return { evaluations: createdEvaluations, evaluationItemCount: itemInserts.length };
  }

  /** Enqueues the CYCLE_OPENED notification (outbox, same transaction) for each evaluated employee. */
  public async enqueueCycleOpenedNotifications(
    dbClient: PoolClient,
    cycle: CycleNotificationContext,
    createdEvaluations: Evaluation[]
  ): Promise<void> {
    if (this.notificationService && createdEvaluations.length > 0) {
      for (const createdEval of createdEvaluations) {
        const userRes = await dbClient.query(
          `SELECT u.id as user_id, u.email
           FROM employee e
           JOIN app_user u ON LOWER(u.email) = LOWER(e.email)
           WHERE e.employee_id = $1
           LIMIT 1`,
          [createdEval.employeeId]
        );
        if (userRes.rows.length > 0 && userRes.rows[0]) {
          await this.notificationService.enqueueNotification(
            {
              notificationType: NotificationType.CYCLE_OPENED,
              relatedEntityType: 'EVALUATION_CYCLE',
              relatedEntityId: cycle.evaluationCycleId,
              recipientUserAccountId: String(userRes.rows[0].user_id),
              recipientEmail: String(userRes.rows[0].email),
              contextPayload: {
                cycle_name: cycle.name,
                deadline: typeof cycle.endDate === 'string' ? cycle.endDate : cycle.endDate ? String(cycle.endDate) : '',
              },
            },
            dbClient
          );
        }
      }
    }
  }
}
