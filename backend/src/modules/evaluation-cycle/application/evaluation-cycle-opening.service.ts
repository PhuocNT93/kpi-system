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
        `SELECT evaluation_template_version_id, status
         FROM evaluation_template_version
         WHERE evaluation_template_version_id = $1`,
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

      // 4. Load template criteria & defensive weight check
      // Some databases may not have the `template_kpi_id` column due to migration name mismatches.
      // Detect column presence and run a compatible query.
      const colCheck = await dbClient.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        ['template_criterion', 'template_kpi_id']
      );

      let tcRes;
      if (colCheck.rows.length > 0) {
        // Column exists — run original query joining by template_kpi_id
        tcRes = await dbClient.query(
          `SELECT tc.template_criterion_id,
                  tc.template_kpi_id,
                  tc.evaluation_template_version_id,
                  tc.criterion_version_id,
                  tc.effective_weight,
                  tc.applicable_role_ids,
                  tc.applicable_team_ids,
                  tc.is_disabled,
                  tc.display_order,
                  tk.kpi_id,
                  tk.weight AS kpi_weight,
                  k.code AS kpi_code,
                  k.name AS kpi_name,
                  c.code AS criterion_code,
                  c.name AS criterion_name,
                  sr.rule_type,
                  sr.rule_config
           FROM template_criterion tc
           JOIN template_kpi tk ON tc.template_kpi_id = tk.template_kpi_id
           JOIN kpi k ON tk.kpi_id = k.kpi_id
           JOIN criterion_version cv ON tc.criterion_version_id = cv.criterion_version_id
           JOIN criterion c ON cv.criterion_id = c.criterion_id
           JOIN scoring_rule sr ON cv.scoring_rule_id = sr.scoring_rule_id
           WHERE tc.evaluation_template_version_id = $1
           ORDER BY tc.display_order ASC`,
          [cycle.evaluationTemplateVersionId]
        );
      } else {
        // Column missing — fallback: pick the first template_kpi for the template version (legacy templates)
        tcRes = await dbClient.query(
          `SELECT tc.template_criterion_id,
                  NULL::uuid AS template_kpi_id,
                  tc.evaluation_template_version_id,
                  tc.criterion_version_id,
                  tc.effective_weight,
                  tc.applicable_role_ids,
                  tc.applicable_team_ids,
                  tc.is_disabled,
                  tc.display_order,
                  tk.kpi_id,
                  tk.weight AS kpi_weight,
                  k.code AS kpi_code,
                  k.name AS kpi_name,
                  c.code AS criterion_code,
                  c.name AS criterion_name,
                  sr.rule_type,
                  sr.rule_config
           FROM template_criterion tc
           LEFT JOIN LATERAL (
             SELECT * FROM template_kpi tk WHERE tk.template_version_id = tc.evaluation_template_version_id ORDER BY tk.display_order ASC LIMIT 1
           ) tk ON true
           LEFT JOIN kpi k ON tk.kpi_id = k.kpi_id
           JOIN criterion_version cv ON tc.criterion_version_id = cv.criterion_version_id
           JOIN criterion c ON cv.criterion_id = c.criterion_id
           JOIN scoring_rule sr ON cv.scoring_rule_id = sr.scoring_rule_id
           WHERE tc.evaluation_template_version_id = $1
           ORDER BY tc.display_order ASC`,
          [cycle.evaluationTemplateVersionId]
        );
      }

      const templateCriteria = tcRes.rows;
      if (templateCriteria.length === 0) {
        throw new AppError(
          422,
          EvaluationCycleErrorCodes.INVALID_TEMPLATE_CONFIGURATION,
          'Template contains no criteria.'
        );
      }

      // Sum effective weight of enabled criteria
      const enabledCriteria = templateCriteria.filter((tc: Record<string, unknown>) => !tc.is_disabled);
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
      const criterionVersionIds = templateCriteria.map((tc: Record<string, unknown>) => tc.criterion_version_id);
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

        for (const tc of templateCriteria) {
          const isDisabled = CriterionApplicabilityResolver.isDisabledForEmployee(
            {
              templateCriterionId: tc.template_criterion_id as string,
              applicableRoleIds: tc.applicable_role_ids as string[] | null,
              applicableTeamIds: tc.applicable_team_ids as string[] | null,
              isDisabled: Boolean(tc.is_disabled),
            },
            empSnapshot
          );

          const levels = levelsByCvId[tc.criterion_version_id as string] || [];

          itemInserts.push({
            evaluationId: evalId as string,
            templateCriterionId: tc.template_criterion_id as string,
            criterionCodeSnapshot: tc.criterion_code as string,
            criterionNameSnapshot: tc.criterion_name as string,
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
          performedBy: validActorEmployeeId,
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
}
