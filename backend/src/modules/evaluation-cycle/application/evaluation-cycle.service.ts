import { Pool, PoolClient } from 'pg';
import { withTransaction } from '../../../shared/database/transaction.js';
import { NotFound, Conflict, BadRequest } from '../../../api/app-error.js';
import {
  EvaluationCycle,
  EvaluationCycleStatus,
  EvaluationCycleErrorCodes,
  ListEvaluationCycleQuery,
} from '../domain/evaluation-cycle.types.js';
import {
  IEvaluationCycleRepository,
  IEvaluationRepository,
} from '../domain/evaluation-cycle.repository.js';
import { EvaluationCycleTransitionService } from './evaluation-cycle-transition.service.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { CreateEvaluationCycleInput, UpdateEvaluationCycleInput } from '../api/evaluation-cycle.dto.js';

export class EvaluationCycleService {
  constructor(
    private pool: Pool,
    private cycleRepo: IEvaluationCycleRepository,
    private evaluationRepo: IEvaluationRepository,
    private transitionService: EvaluationCycleTransitionService,
    private auditService?: AuditService
  ) {}

  public async createCycle(
    input: CreateEvaluationCycleInput,
    actorEmployeeId: string | null
  ): Promise<EvaluationCycle> {
    // Check code uniqueness
    const existingCode = await this.cycleRepo.findByCode(input.code);
    if (existingCode) {
      throw new Conflict(
        `Evaluation cycle code '${input.code}' already exists`,
        EvaluationCycleErrorCodes.EVALUATION_CYCLE_CODE_ALREADY_EXISTS
      );
    }

    // Verify template version existence
    if (this.pool && typeof this.pool.query === 'function') {
      const tplRes = await this.pool.query(
        'SELECT evaluation_template_version_id FROM evaluation_template_version WHERE evaluation_template_version_id = $1',
        [input.evaluation_template_version_id]
      );
      if (tplRes.rows.length === 0) {
        throw new NotFound('EvaluationTemplateVersion');
      }

      // Verify team IDs if provided
      if (input.applicable_team_ids && input.applicable_team_ids.length > 0) {
        const teamRes = await this.pool.query(
          'SELECT team_id FROM team WHERE team_id = ANY($1::uuid[])',
          [input.applicable_team_ids]
        );
        if (teamRes.rows.length !== new Set(input.applicable_team_ids).size) {
          throw new BadRequest('One or more applicable_team_ids do not exist');
        }
      }

      // Verify role IDs if provided
      if (input.applicable_role_ids && input.applicable_role_ids.length > 0) {
        const roleRes = await this.pool.query(
          'SELECT role_id FROM role WHERE role_id = ANY($1::uuid[])',
          [input.applicable_role_ids]
        );
        if (roleRes.rows.length !== new Set(input.applicable_role_ids).size) {
          throw new BadRequest('One or more applicable_role_ids do not exist');
        }
      }
    }

    const newCycle = await withTransaction(this.pool, async (client: any) => {
      const dbClient = client as PoolClient;
      const validActorEmployeeId = await this.resolveValidEmployeeId(dbClient, actorEmployeeId);

      const created = await this.cycleRepo.create(
        {
          code: input.code,
          name: input.name,
          startDate: input.start_date,
          endDate: input.end_date,
          status: EvaluationCycleStatus.DRAFT,
          evaluationTemplateVersionId: input.evaluation_template_version_id,
          applicableTeamIds: input.applicable_team_ids || [],
          applicableRoleIds: input.applicable_role_ids || [],
          approvedBy: null,
          lockedAt: null,
          createdBy: validActorEmployeeId,
          updatedBy: validActorEmployeeId,
        },
        client
      );

      if (this.auditService) {
        await this.auditService.record(client as any, {
          entityType: 'EVALUATION_CYCLE',
          entityId: created.evaluationCycleId,
          action: 'CREATE',
          newValue: JSON.stringify(created),
          performedBy: validActorEmployeeId,
          source: 'API',
        });
      }

      return created;
    });

    return newCycle;
  }

  public async getCycleById(id: string): Promise<EvaluationCycle> {
    const cycle = await this.cycleRepo.findById(id);
    if (!cycle) {
      throw new NotFound('EvaluationCycle');
    }
    return cycle;
  }

  public async listCycles(query: ListEvaluationCycleQuery): Promise<{ items: EvaluationCycle[]; total: number }> {
    return this.cycleRepo.findMany(query);
  }

  public async updateDraftCycle(
    id: string,
    input: UpdateEvaluationCycleInput,
    actorEmployeeId: string | null
  ): Promise<EvaluationCycle> {
    return withTransaction(this.pool, async (client: any) => {
      const dbClient = client as PoolClient;
      const validActorEmployeeId = await this.resolveValidEmployeeId(dbClient, actorEmployeeId);

      const cycle = await this.cycleRepo.findByIdForUpdate(id, dbClient);
      if (!cycle) {
        throw new NotFound('EvaluationCycle');
      }

      if (cycle.status !== EvaluationCycleStatus.DRAFT) {
        throw new Conflict(
          `Evaluation cycle is in status '${cycle.status}' and cannot be edited. Only DRAFT cycles can be edited.`,
          EvaluationCycleErrorCodes.EVALUATION_CYCLE_NOT_EDITABLE
        );
      }

      if (input.code && input.code !== cycle.code) {
        const existingCode = await this.cycleRepo.findByCode(input.code, client);
        if (existingCode && existingCode.evaluationCycleId !== id) {
          throw new Conflict(
            `Evaluation cycle code '${input.code}' already exists`,
            EvaluationCycleErrorCodes.EVALUATION_CYCLE_CODE_ALREADY_EXISTS
          );
        }
        cycle.code = input.code;
      }

      if (input.name !== undefined) cycle.name = input.name;
      if (input.start_date !== undefined) cycle.startDate = input.start_date;
      if (input.end_date !== undefined) cycle.endDate = input.end_date;
      if (input.evaluation_template_version_id !== undefined) {
        cycle.evaluationTemplateVersionId = input.evaluation_template_version_id;
      }
      if (input.applicable_team_ids !== undefined) cycle.applicableTeamIds = input.applicable_team_ids;
      if (input.applicable_role_ids !== undefined) cycle.applicableRoleIds = input.applicable_role_ids;

      cycle.updatedBy = validActorEmployeeId;

      const updated = await this.cycleRepo.update(cycle, client);

      if (this.auditService) {
        await this.auditService.record(client as any, {
          entityType: 'EVALUATION_CYCLE',
          entityId: updated.evaluationCycleId,
          action: 'UPDATE',
          newValue: JSON.stringify(updated),
          performedBy: validActorEmployeeId,
          source: 'API',
        });
      }

      return updated;
    });
  }

  public async lockCycle(id: string, actorEmployeeId: string | null): Promise<EvaluationCycle> {
    return withTransaction(this.pool, async (client: any) => {
      const dbClient = client as PoolClient;
      const validActorEmployeeId = await this.resolveValidEmployeeId(dbClient, actorEmployeeId);

      const cycle = await this.cycleRepo.findByIdForUpdate(id, dbClient);
      if (!cycle) {
        throw new NotFound('EvaluationCycle');
      }

      if (cycle.status === EvaluationCycleStatus.LOCKED) {
        throw new Conflict(
          'Evaluation cycle is already locked.',
          EvaluationCycleErrorCodes.EVALUATION_CYCLE_ALREADY_LOCKED
        );
      }

      if (!this.transitionService.isLockable(cycle.status)) {
        throw new Conflict(
          `Cannot lock evaluation cycle in status '${cycle.status}'.`,
          EvaluationCycleErrorCodes.INVALID_CYCLE_STATE_TRANSITION
        );
      }

      this.transitionService.validateTransition(cycle.status, EvaluationCycleStatus.LOCKED);

      const lockedAt = new Date().toISOString();

      // Lock cycle status
      const lockedCycle = await this.cycleRepo.lockCycle(id, lockedAt, client);

      // Lock child evaluations
      await this.evaluationRepo.lockEvaluationsByCycleId(id, client);

      if (this.auditService) {
        await this.auditService.record(client as any, {
          entityType: 'EVALUATION_CYCLE',
          entityId: id,
          action: 'LOCK',
          newValue: JSON.stringify({ status: EvaluationCycleStatus.LOCKED, locked_at: lockedAt }),
          performedBy: validActorEmployeeId,
          source: 'API',
        });
      }

      return lockedCycle;
    });
  }

  public async getScopePreview(id: string): Promise<{
    employeeCount: number;
    byTeam: { teamId: string; name: string; count: number }[];
    byRole: { roleId: string; name: string; count: number }[];
  }> {
    const cycle = await this.cycleRepo.findById(id);
    if (!cycle) {
      throw new NotFound('EvaluationCycle');
    }

    if (!this.pool || typeof this.pool.query !== 'function') {
      return { employeeCount: 0, byTeam: [], byRole: [] };
    }

    const conditions: string[] = ["e.employment_status = 'ACTIVE'"];
    const params: any[] = [];
    let idx = 1;

    if (cycle.applicableTeamIds && cycle.applicableTeamIds.length > 0) {
      conditions.push(`e.team_id = ANY($${idx++}::uuid[])`);
      params.push(cycle.applicableTeamIds);
    }

    if (cycle.applicableRoleIds && cycle.applicableRoleIds.length > 0) {
      conditions.push(`e.role_id = ANY($${idx++}::uuid[])`);
      params.push(cycle.applicableRoleIds);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const res = await this.pool.query(
      `SELECT e.employee_id, e.team_id, t.name AS team_name, e.role_id, r.name AS role_name
       FROM employee e
       LEFT JOIN team t ON e.team_id = t.team_id
       LEFT JOIN role r ON e.role_id = r.role_id
       ${whereClause}`,
      params
    );

    const rows = res.rows;
    const employeeCount = rows.length;

    const teamMap = new Map<string, { teamId: string; name: string; count: number }>();
    const roleMap = new Map<string, { roleId: string; name: string; count: number }>();

    for (const r of rows) {
      const teamId = r.team_id || 'unassigned';
      const teamName = r.team_name || 'Unassigned';
      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, { teamId, name: teamName, count: 0 });
      }
      teamMap.get(teamId)!.count++;

      const roleId = r.role_id || 'unassigned';
      const roleName = r.role_name || 'Unassigned';
      if (!roleMap.has(roleId)) {
        roleMap.set(roleId, { roleId, name: roleName, count: 0 });
      }
      roleMap.get(roleId)!.count++;
    }

    return {
      employeeCount,
      byTeam: Array.from(teamMap.values()),
      byRole: Array.from(roleMap.values()),
    };
  }

  public async getOpeningStatus(id: string): Promise<{
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
    total: number;
    processed: number;
    successful: number;
    failed: number;
  }> {
    const cycle = await this.cycleRepo.findById(id);
    if (!cycle) {
      throw new NotFound('EvaluationCycle');
    }

    if (!this.pool || typeof this.pool.query !== 'function') {
      return { status: 'COMPLETED', total: 0, processed: 0, successful: 0, failed: 0 };
    }

    const res = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM evaluation WHERE evaluation_cycle_id = $1`,
      [id]
    );
    const count = parseInt(res.rows[0]?.count || '0', 10);

    return {
      status: 'COMPLETED',
      total: count,
      processed: count,
      successful: count,
      failed: 0,
    };
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
