import { Pool, PoolClient } from 'pg';
import { withTransaction } from '../../../shared/database/transaction.js';
import { NotFound, Conflict, BadRequest, AppError } from '../../../api/app-error.js';
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
    return withTransaction(this.pool, async (client: any) => {
      const dbClient = client as PoolClient;
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
      const templateVersionRes = await client.query(
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
      const tcRes = await client.query(
        `SELECT tc.template_criterion_id,
                tc.evaluation_template_version_id,
                tc.criterion_version_id,
                tc.effective_weight,
                tc.applicable_role_ids,
                tc.applicable_team_ids,
                tc.is_disabled,
                tc.display_order,
                c.code AS criterion_code,
                c.name AS criterion_name,
                sr.rule_type,
                sr.rule_config
         FROM template_criterion tc
         JOIN criterion_version cv ON tc.criterion_version_id = cv.criterion_version_id
         JOIN criterion c ON cv.criterion_id = c.criterion_id
         JOIN scoring_rule sr ON cv.scoring_rule_id = sr.scoring_rule_id
         WHERE tc.evaluation_template_version_id = $1
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

      // Sum effective weight of enabled criteria
      const enabledCriteria = templateCriteria.filter((tc: any) => !tc.is_disabled);
      const totalWeight = enabledCriteria.reduce((sum: number, tc: any) => sum + parseFloat(tc.effective_weight), 0);

      // Defensive validation: weight sum must be 100%
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new AppError(
          422,
          EvaluationCycleErrorCodes.INVALID_TEMPLATE_CONFIGURATION,
          `Effective weight sum of template criteria must equal 100%, got ${totalWeight}%.`
        );
      }

      // 5. Load levels for criterion versions
      const criterionVersionIds = templateCriteria.map((tc: any) => tc.criterion_version_id);
      const levelsRes = await client.query(
        `SELECT criterion_level_id, criterion_version_id, level_no, label_en, label_vn, score_value
         FROM criterion_level
         WHERE criterion_version_id = ANY($1::uuid[])
         ORDER BY level_no ASC`,
        [criterionVersionIds]
      );

      const levelsByCvId: Record<string, any[]> = {};
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
      const empValues: any[] = [];
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
      const empRes = await client.query(
        `SELECT employee_id, team_id, role_id, job_level_id, manager_id
         FROM employee
         ${empWhere}`,
        empValues
      );

      const activeEmployees = empRes.rows;
      if (activeEmployees.length === 0) {
        throw new AppError(
          422,
          EvaluationCycleErrorCodes.INVALID_TEMPLATE_CONFIGURATION,
          'No eligible active employees found for this evaluation cycle configuration.'
        );
      }

      const empIds = activeEmployees.map((e: any) => e.employee_id);

      // 7. Load historical employee assignment as of cycle start date
      const assignRes = await client.query(
        `SELECT DISTINCT ON (employee_id) employee_id, team_id, role_id, job_level_id, manager_id
         FROM employee_assignment
         WHERE employee_id = ANY($1::uuid[])
           AND effective_from <= $2
           AND (effective_to IS NULL OR effective_to > $2)
         ORDER BY employee_id, effective_from DESC`,
        [empIds, cycle.startDate]
      );

      const assignmentMap: Record<string, any> = {};
      for (const a of assignRes.rows) {
        assignmentMap[a.employee_id] = a;
      }

      // Build evaluation snapshots
      const evaluationInserts = activeEmployees.map((emp: any) => {
        const histAssignment = assignmentMap[emp.employee_id];
        const teamId = histAssignment?.team_id || emp.team_id;
        const roleId = histAssignment?.role_id || emp.role_id;
        const jobLevelId = histAssignment?.job_level_id || emp.job_level_id || null;
        const managerId = histAssignment?.manager_id || emp.manager_id || null;

        return {
          evaluationCycleId: cycle.evaluationCycleId,
          employeeId: emp.employee_id,
          teamIdSnapshot: teamId,
          roleIdSnapshot: roleId,
          jobLevelSnapshot: jobLevelId,
          managerIdSnapshot: managerId,
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
      const createdEvaluations = await this.evaluationRepo.batchCreate(evaluationInserts, client);

      // Map generated evaluation IDs by employee ID
      const evalMapByEmp: Record<string, string> = {};
      for (const ev of createdEvaluations) {
        evalMapByEmp[ev.employeeId] = ev.evaluationId;
      }

      // 9. Build evaluation item snapshots
      const itemInserts: any[] = [];
      for (const ev of evaluationInserts) {
        const evalId = evalMapByEmp[ev.employeeId];
        const empSnapshot = {
          employeeId: ev.employeeId,
          teamId: ev.teamIdSnapshot,
          roleId: ev.roleIdSnapshot,
          jobLevelId: ev.jobLevelSnapshot,
          managerId: ev.managerIdSnapshot,
        };

        for (const tc of templateCriteria) {
          const isDisabled = CriterionApplicabilityResolver.isDisabledForEmployee(
            {
              templateCriterionId: tc.template_criterion_id,
              applicableRoleIds: tc.applicable_role_ids,
              applicableTeamIds: tc.applicable_team_ids,
              isDisabled: Boolean(tc.is_disabled),
            },
            empSnapshot
          );

          const levels = levelsByCvId[tc.criterion_version_id] || [];

          itemInserts.push({
            evaluationId: evalId,
            templateCriterionId: tc.template_criterion_id,
            criterionCodeSnapshot: tc.criterion_code,
            criterionNameSnapshot: tc.criterion_name,
            weightSnapshot: parseFloat(tc.effective_weight),
            scoringRuleSnapshot: {
              rule_type: tc.rule_type,
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
      await this.evaluationItemRepo.batchCreate(itemInserts, client);

      // 11. Update cycle status to OPEN
      cycle.status = EvaluationCycleStatus.OPEN;
      cycle.updatedBy = validActorEmployeeId;
      await this.cycleRepo.update(cycle, client);

      // 12. Record audit log inside transaction
      if (this.auditService) {
        await this.auditService.record(client as any, {
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
