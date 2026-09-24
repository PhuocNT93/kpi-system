import { randomBytes } from 'crypto';
import { Pool, PoolClient } from 'pg';
import { withTransaction } from '../../../shared/database/transaction.js';
import { AppError, Forbidden, ValidationDetail } from '../../../api/app-error.js';
import { Actor } from '../../../shared/auth/types.js';
import {
  EvaluationCycle,
  EvaluationCycleErrorCodes,
  EvaluationCycleStatus,
  EvaluationCycleType,
  EvaluationEmployeeRecord,
} from '../domain/evaluation-cycle.types.js';
import { IEvaluationCycleRepository, IEvaluationRepository } from '../domain/evaluation-cycle.repository.js';
import { ACTIVE_EMPLOYMENT_STATUS, isEmployeeInApplicableScope } from '../domain/applicable-employee-filter.js';
import { EvaluationGenerationService } from './evaluation-generation.service.js';
import { resolveValidEmployeeId, resolveValidUserId } from './actor-resolution.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { BusinessDateWindow, getUpcomingBatchCycleWindow } from '../../../config/evaluation-cycle.config.js';

export const DEFAULT_INDIVIDUAL_CYCLE_NAME = 'Individual Review';
export const UPCOMING_BATCH_CYCLE_WARNING_CODE = 'UPCOMING_BATCH_CYCLE';

const INDIVIDUAL_CYCLE_CODE_PREFIX = 'IND';
const CYCLE_CODE_MAX_LENGTH = 50;
const CYCLE_NAME_MAX_LENGTH = 200;
const ROLES_ALLOWED_TO_CREATE = new Set<string>(['HR_ADMIN', 'SYSTEM_ADMIN', 'MANAGER']);

export interface CreateIndividualCyclesCommand {
  name?: string;
  /** When omitted, the latest PUBLISHED template version is used. */
  evaluationTemplateVersionId?: string;
  employeeIds: string[];
  startDate: string;
  endDate: string;
}

export interface IndividualCycleCreated {
  cycle: EvaluationCycle;
  employeeId: string;
  evaluationId: string;
  evaluationItemCount: number;
}

export interface IndividualCycleSkipped {
  employeeId: string;
  reasonCode: typeof EvaluationCycleErrorCodes.EVALUATION_ALREADY_OPEN;
  existingEvaluationId: string;
  existingEvaluationCycleId: string;
}

export interface IndividualCycleWarning {
  code: typeof UPCOMING_BATCH_CYCLE_WARNING_CODE;
  employeeId: string;
  evaluationCycleId: string;
  evaluationCycleCode: string;
  evaluationCycleName: string;
  startDate: string;
  message: string;
}

export interface IndividualCycleCreationResult {
  created: IndividualCycleCreated[];
  skipped: IndividualCycleSkipped[];
  warnings: IndividualCycleWarning[];
}

/**
 * Creates INDIVIDUAL_SCHEDULED evaluation cycles — one cycle and one evaluation per employee
 * (LLD §10.3, §14.1) — reusing the EVAL-02 generation logic shared with batch cycle opening.
 */
export class IndividualCycleCreationService {
  constructor(
    private pool: Pool,
    private cycleRepo: IEvaluationCycleRepository,
    private evaluationRepo: IEvaluationRepository,
    private generationService: EvaluationGenerationService,
    private auditService?: AuditService,
    private resolveUpcomingWindow: () => BusinessDateWindow = () => getUpcomingBatchCycleWindow()
  ) {}

  public async createIndividualCycles(
    command: CreateIndividualCyclesCommand,
    actor: Actor
  ): Promise<IndividualCycleCreationResult> {
    if (!ROLES_ALLOWED_TO_CREATE.has(actor.role)) {
      throw new Forbidden('Only HR_ADMIN, SYSTEM_ADMIN or MANAGER can create individual evaluation cycles');
    }

    const employeeIds = Array.from(new Set(command.employeeIds));

    return withTransaction(this.pool, async (client: unknown) => {
      const dbClient = client as unknown as PoolClient;
      const validActorEmployeeId = await resolveValidEmployeeId(dbClient, actor.employeeId ?? actor.userId);
      const validActorUserId = await resolveValidUserId(dbClient, actor.userId, validActorEmployeeId);

      // Row-lock the employees first: concurrent requests for the same employee are serialised here,
      // so the active-evaluation check below cannot be passed by two transactions at once.
      const employees = await this.evaluationRepo.lockEmployeesForEvaluation(employeeIds, dbClient);
      const employeesById = new Map(employees.map((employee) => [employee.employeeId, employee]));
      const orderedEmployees = this.resolveRequestedEmployees(employeeIds, employeesById);

      this.assertWithinActorScope(actor, orderedEmployees);
      this.assertEligible(orderedEmployees);

      const templateVersionId =
        command.evaluationTemplateVersionId ?? (await this.generationService.resolveLatestPublishedTemplateVersionId(dbClient));
      const template = await this.generationService.prepareTemplateSnapshot(dbClient, templateVersionId);

      const activeEvaluations = await this.evaluationRepo.findActiveEvaluationsByEmployees(employeeIds, dbClient);
      const activeByEmployee = new Map<string, (typeof activeEvaluations)[number]>();
      for (const active of activeEvaluations) {
        if (!activeByEmployee.has(active.employeeId)) {
          activeByEmployee.set(active.employeeId, active);
        }
      }

      const skipped: IndividualCycleSkipped[] = [];
      const toCreate: EvaluationEmployeeRecord[] = [];
      for (const employee of orderedEmployees) {
        const active = activeByEmployee.get(employee.employeeId);
        if (active) {
          skipped.push({
            employeeId: employee.employeeId,
            reasonCode: EvaluationCycleErrorCodes.EVALUATION_ALREADY_OPEN,
            existingEvaluationId: active.evaluationId,
            existingEvaluationCycleId: active.evaluationCycleId,
          });
        } else {
          toCreate.push(employee);
        }
      }

      if (toCreate.length === 0) {
        throw new AppError(
          409,
          EvaluationCycleErrorCodes.EVALUATION_ALREADY_OPEN,
          'Every selected employee already has an active evaluation.',
          'employee_ids',
          skipped.map((skip) => ({
            field: 'employee_ids',
            code: EvaluationCycleErrorCodes.EVALUATION_ALREADY_OPEN,
            message: skip.employeeId,
          }))
        );
      }

      const warnings = await this.findUpcomingBatchCycleWarnings(toCreate, dbClient);

      const created: IndividualCycleCreated[] = [];
      for (const employee of toCreate) {
        const cycle = await this.cycleRepo.create(
          {
            code: this.buildCycleCode(employee.employeeCode, command.startDate),
            name: this.buildCycleName(command.name, employee.employeeCode),
            cycleType: EvaluationCycleType.INDIVIDUAL_SCHEDULED,
            triggeredByEmployeeId: employee.employeeId,
            startDate: command.startDate,
            endDate: command.endDate,
            status: EvaluationCycleStatus.OPEN,
            evaluationTemplateVersionId: templateVersionId,
            applicableTeamIds: [],
            applicableRoleIds: [],
            applicableEmployeeIds: [employee.employeeId],
            approvedBy: null,
            lockedAt: null,
            createdBy: validActorEmployeeId,
            updatedBy: validActorEmployeeId,
          },
          dbClient
        );

        const { evaluations, evaluationItemCount } = await this.generationService.generateEvaluations(dbClient, {
          evaluationCycleId: cycle.evaluationCycleId,
          snapshotDate: cycle.startDate,
          subjects: [
            {
              employeeId: employee.employeeId,
              teamId: employee.teamId as string,
              roleId: employee.roleId as string,
              jobLevelId: employee.jobLevelId,
              managerId: employee.managerId,
            },
          ],
          template,
          actorEmployeeId: validActorEmployeeId,
        });
        const evaluation = evaluations[0];
        if (!evaluation) {
          throw new Error(`Evaluation was not created for employee ${employee.employeeId}`);
        }

        if (this.auditService) {
          await this.auditService.record(dbClient, {
            entityType: 'EVALUATION_CYCLE',
            entityId: cycle.evaluationCycleId,
            action: 'INDIVIDUAL_CYCLE_CREATED',
            newValue: JSON.stringify({
              cycle_type: cycle.cycleType,
              status: cycle.status,
              triggered_by_employee_id: employee.employeeId,
              evaluation_id: evaluation.evaluationId,
              evaluation_item_count: evaluationItemCount,
              template_version_id: templateVersionId,
              start_date: cycle.startDate,
              end_date: cycle.endDate,
            }),
            performedBy: validActorUserId,
            source: 'API',
          });
        }

        await this.generationService.enqueueCycleOpenedNotifications(dbClient, cycle, evaluations);

        created.push({
          cycle,
          employeeId: employee.employeeId,
          evaluationId: evaluation.evaluationId,
          evaluationItemCount,
        });
      }

      return { created, skipped, warnings };
    });
  }

  private resolveRequestedEmployees(
    employeeIds: string[],
    employeesById: Map<string, EvaluationEmployeeRecord>
  ): EvaluationEmployeeRecord[] {
    const missing = employeeIds.filter((id) => !employeesById.has(id));
    if (missing.length > 0) {
      throw new AppError(
        404,
        'RESOURCE_NOT_FOUND',
        'One or more employees were not found.',
        'employee_ids',
        missing.map((id) => ({ field: 'employee_ids', code: 'RESOURCE_NOT_FOUND', message: id }))
      );
    }
    return employeeIds.map((id) => employeesById.get(id) as EvaluationEmployeeRecord);
  }

  /** MANAGER may only target employees of the teams they manage; HR_ADMIN/SYSTEM_ADMIN are org-wide. */
  private assertWithinActorScope(actor: Actor, employees: EvaluationEmployeeRecord[]): void {
    if (actor.role !== 'MANAGER') {
      return;
    }
    const managedTeamIds = new Set(actor.managedTeamIds ?? []);
    const outOfScope = employees.some((employee) => !employee.teamId || !managedTeamIds.has(employee.teamId));
    if (outOfScope) {
      throw new Forbidden('One or more employees are outside the teams you manage.');
    }
  }

  private assertEligible(employees: EvaluationEmployeeRecord[]): void {
    const details: ValidationDetail[] = [];
    for (const employee of employees) {
      if (employee.employmentStatus !== ACTIVE_EMPLOYMENT_STATUS) {
        details.push({ field: 'employee_ids', code: 'EMPLOYEE_NOT_ACTIVE', message: employee.employeeId });
      } else if (!employee.teamId || !employee.roleId) {
        details.push({ field: 'employee_ids', code: 'EMPLOYEE_MISSING_TEAM_OR_ROLE', message: employee.employeeId });
      }
    }
    if (details.length > 0) {
      throw new AppError(
        422,
        EvaluationCycleErrorCodes.EMPLOYEE_NOT_ELIGIBLE,
        'One or more employees are not eligible for evaluation (must be ACTIVE with a team and role).',
        'employee_ids',
        details
      );
    }
  }

  /** Soft warnings: never block creation. One warning per (employee, batch cycle). */
  private async findUpcomingBatchCycleWarnings(
    employees: EvaluationEmployeeRecord[],
    dbClient: PoolClient
  ): Promise<IndividualCycleWarning[]> {
    const { fromDate, toDate } = this.resolveUpcomingWindow();
    const upcomingCycles = await this.cycleRepo.findUpcomingBatchCycles(fromDate, toDate, dbClient);

    const warnings: IndividualCycleWarning[] = [];
    const seen = new Set<string>();
    for (const employee of employees) {
      for (const batchCycle of upcomingCycles) {
        const key = `${employee.employeeId}:${batchCycle.evaluationCycleId}`;
        if (seen.has(key) || !isEmployeeInApplicableScope(batchCycle, employee)) {
          continue;
        }
        seen.add(key);
        warnings.push({
          code: UPCOMING_BATCH_CYCLE_WARNING_CODE,
          employeeId: employee.employeeId,
          evaluationCycleId: batchCycle.evaluationCycleId,
          evaluationCycleCode: batchCycle.code,
          evaluationCycleName: batchCycle.name,
          startDate: batchCycle.startDate,
          message: `Employee ${employee.employeeCode} is included in batch cycle ${batchCycle.code} scheduled to open on ${batchCycle.startDate}.`,
        });
      }
    }
    return warnings;
  }

  private buildCycleCode(employeeCode: string, startDate: string): string {
    const suffix = `-${startDate.replace(/-/g, '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const maxEmployeeCodeLength = CYCLE_CODE_MAX_LENGTH - INDIVIDUAL_CYCLE_CODE_PREFIX.length - 1 - suffix.length;
    return `${INDIVIDUAL_CYCLE_CODE_PREFIX}-${employeeCode.slice(0, maxEmployeeCodeLength)}${suffix}`;
  }

  private buildCycleName(name: string | undefined, employeeCode: string): string {
    const baseName = name?.trim() || DEFAULT_INDIVIDUAL_CYCLE_NAME;
    return `${baseName} - ${employeeCode}`.slice(0, CYCLE_NAME_MAX_LENGTH);
  }
}
