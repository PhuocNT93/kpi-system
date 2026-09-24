import { Pool, PoolClient } from 'pg';
import { withTransaction } from '../../../shared/database/transaction.js';
import { NotFound, Conflict, AppError } from '../../../api/app-error.js';
import {
  EvaluationCycleStatus,
  EvaluationCycleErrorCodes,
} from '../domain/evaluation-cycle.types.js';
import { IEvaluationCycleRepository } from '../domain/evaluation-cycle.repository.js';
import { buildApplicableEmployeeConditions } from '../domain/applicable-employee-filter.js';
import { EvaluationCycleTransitionService } from './evaluation-cycle-transition.service.js';
import { EvaluationGenerationService, EvaluationSubject } from './evaluation-generation.service.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { resolveValidEmployeeId, resolveValidUserId } from './actor-resolution.js';

export interface OpenCycleResult {
  id: string;
  status: EvaluationCycleStatus;
  evaluationCount: number;
}

export class EvaluationCycleOpeningService {
  constructor(
    private pool: Pool,
    private cycleRepo: IEvaluationCycleRepository,
    private generationService: EvaluationGenerationService,
    private transitionService: EvaluationCycleTransitionService,
    private auditService?: AuditService
  ) {}

  public async  openCycle(cycleId: string, actorEmployeeId: string | null): Promise<OpenCycleResult> {
    return withTransaction(this.pool, async (client: unknown) => {
      const dbClient = client as unknown as PoolClient;
      const validActorEmployeeId = await resolveValidEmployeeId(dbClient, actorEmployeeId);
      const validActorUserId = await resolveValidUserId(dbClient, actorEmployeeId, validActorEmployeeId);

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

      // 3-5. Validate template version and prepare criteria/level/translation snapshots (shared EVAL-02 logic)
      const template = await this.generationService.prepareTemplateSnapshot(dbClient, cycle.evaluationTemplateVersionId);

      // 6. Query eligible active employees
      const { conditions: empConditions, values: empValues } = buildApplicableEmployeeConditions(cycle);

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

      const subjects: EvaluationSubject[] = filteredEmployees.map((emp: Record<string, unknown>) => ({
        employeeId: emp.employee_id as string,
        teamId: emp.team_id as string,
        roleId: emp.role_id as string,
        jobLevelId: (emp.job_level_id as string | null) ?? null,
        managerId: (emp.manager_id as string | null) ?? null,
      }));

      // 7-10. Snapshot assignments, create evaluations and evaluation items (shared EVAL-02 logic)
      const { evaluations: createdEvaluations } = await this.generationService.generateEvaluations(dbClient, {
        evaluationCycleId: cycle.evaluationCycleId,
        snapshotDate: cycle.startDate,
        subjects,
        template,
        actorEmployeeId: validActorEmployeeId,
      });

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

      // 13. Enqueue CYCLE_OPENED notification for participating employees
      await this.generationService.enqueueCycleOpenedNotifications(dbClient, cycle, createdEvaluations);

      return {
        id: cycle.evaluationCycleId,
        status: EvaluationCycleStatus.OPEN,
        evaluationCount: createdEvaluations.length,
      };
    });
  }
}
