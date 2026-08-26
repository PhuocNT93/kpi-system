import { Pool, PoolClient } from 'pg';
import { WorkflowDefinition, WorkflowState, WorkflowTransition, VersionStatus, WorkflowStateType } from '../../domain/configuration.types.js';
import { IWorkflowRepository } from '../../domain/repositories.interface.js';
import { VersionMismatch, NotFound } from '../../../../api/app-error.js';

export class PostgresWorkflowRepository implements IWorkflowRepository {
  constructor(private pool: Pool) {}

  private mapDefinition(row: Record<string, unknown>): WorkflowDefinition {
    return {
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      version_no: Number(row.version_no),
      status: row.status as VersionStatus,
      version: Number(row.version),
      created_at: new Date(row.created_at as string),
      created_by: row.created_by ? (row.created_by as string) : undefined,
    };
  }

  private mapState(row: Record<string, unknown>): WorkflowState {
    return {
      id: row.id as string,
      workflow_definition_id: row.workflow_definition_id as string,
      code: row.code as string,
      name: row.name as string,
      type: row.type as WorkflowStateType,
      created_at: new Date(row.created_at as string),
    };
  }

  private mapTransition(row: Record<string, unknown>): WorkflowTransition {
    return {
      id: row.id as string,
      workflow_definition_id: row.workflow_definition_id as string,
      from_state: row.from_state as string,
      action: row.action as string,
      to_state: row.to_state as string,
      allowed_roles: (typeof row.allowed_roles === 'string' ? JSON.parse(row.allowed_roles) : row.allowed_roles) as string[],
      validation_policy: (typeof row.validation_policy === 'string' ? JSON.parse(row.validation_policy) : row.validation_policy) as Record<string, unknown>,
      created_at: new Date(row.created_at as string),
    };
  }

  // ── Definitions ─────────────────────────────────────────────────────────────

  async findDefinitionById(id: string, client?: PoolClient): Promise<WorkflowDefinition | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM workflow_definitions WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapDefinition(res.rows[0]);
  }

  async findDefinitionByCode(code: string, client?: PoolClient): Promise<WorkflowDefinition | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM workflow_definitions WHERE code = $1', [code]);
    if (res.rows.length === 0) return null;
    return this.mapDefinition(res.rows[0]);
  }

  async findAllDefinitions(client?: PoolClient): Promise<WorkflowDefinition[]> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM workflow_definitions ORDER BY created_at DESC');
    return res.rows.map((r) => this.mapDefinition(r));
  }

  async createDefinition(wf: Partial<WorkflowDefinition>, client?: PoolClient): Promise<WorkflowDefinition> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO workflow_definitions (code, name, version_no, status, created_by)
       VALUES ($1, $2, COALESCE($3, 1), COALESCE($4, 'DRAFT'), $5)
       RETURNING *`,
      [wf.code, wf.name, wf.version_no || 1, wf.status || 'DRAFT', wf.created_by || null]
    );
    return this.mapDefinition(res.rows[0]);
  }

  async updateDefinition(id: string, wf: Partial<WorkflowDefinition>, expectedVersion?: number, client?: PoolClient): Promise<WorkflowDefinition> {
    const runner = client || this.pool;
    if (expectedVersion !== undefined) {
      const res = await runner.query(
        `UPDATE workflow_definitions
         SET name = COALESCE($1, name),
             status = COALESCE($2, status),
             version = version + 1
         WHERE id = $3 AND version = $4
         RETURNING *`,
        [wf.name || null, wf.status || null, id, expectedVersion]
      );
      if (res.rows.length === 0) {
        const check = await this.findDefinitionById(id, client);
        if (!check) throw new NotFound('WorkflowDefinition');
        throw new VersionMismatch('WorkflowDefinition');
      }
      return this.mapDefinition(res.rows[0]);
    } else {
      const res = await runner.query(
        `UPDATE workflow_definitions
         SET name = COALESCE($1, name),
             status = COALESCE($2, status),
             version = version + 1
         WHERE id = $3
         RETURNING *`,
        [wf.name || null, wf.status || null, id]
      );
      if (res.rows.length === 0) throw new NotFound('WorkflowDefinition');
      return this.mapDefinition(res.rows[0]);
    }
  }

  // ── States ──────────────────────────────────────────────────────────────────

  async findStatesByWorkflowId(workflowId: string, client?: PoolClient): Promise<WorkflowState[]> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM workflow_states WHERE workflow_definition_id = $1 ORDER BY created_at ASC', [workflowId]);
    return res.rows.map((r) => this.mapState(r));
  }

  async findStateById(id: string, client?: PoolClient): Promise<WorkflowState | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM workflow_states WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapState(res.rows[0]);
  }

  async createState(state: Partial<WorkflowState>, client?: PoolClient): Promise<WorkflowState> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO workflow_states (workflow_definition_id, code, name, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [state.workflow_definition_id, state.code, state.name, state.type]
    );
    return this.mapState(res.rows[0]);
  }

  async updateState(id: string, state: Partial<WorkflowState>, client?: PoolClient): Promise<WorkflowState> {
    const runner = client || this.pool;
    const res = await runner.query(
      `UPDATE workflow_states
       SET name = COALESCE($1, name),
           type = COALESCE($2, type)
       WHERE id = $3
       RETURNING *`,
      [state.name || null, state.type || null, id]
    );
    if (res.rows.length === 0) throw new NotFound('WorkflowState');
    return this.mapState(res.rows[0]);
  }

  // ── Transitions ─────────────────────────────────────────────────────────────

  async findTransitionsByWorkflowId(workflowId: string, client?: PoolClient): Promise<WorkflowTransition[]> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM workflow_transitions WHERE workflow_definition_id = $1 ORDER BY created_at ASC', [workflowId]);
    return res.rows.map((r) => this.mapTransition(r));
  }

  async findTransitionById(id: string, client?: PoolClient): Promise<WorkflowTransition | null> {
    const runner = client || this.pool;
    const res = await runner.query('SELECT * FROM workflow_transitions WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapTransition(res.rows[0]);
  }

  async createTransition(tr: Partial<WorkflowTransition>, client?: PoolClient): Promise<WorkflowTransition> {
    const runner = client || this.pool;
    const res = await runner.query(
      `INSERT INTO workflow_transitions (workflow_definition_id, from_state, action, to_state, allowed_roles, validation_policy)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        tr.workflow_definition_id,
        tr.from_state,
        tr.action,
        tr.to_state,
        JSON.stringify(tr.allowed_roles || []),
        JSON.stringify(tr.validation_policy || {}),
      ]
    );
    return this.mapTransition(res.rows[0]);
  }

  async updateTransition(id: string, tr: Partial<WorkflowTransition>, client?: PoolClient): Promise<WorkflowTransition> {
    const runner = client || this.pool;
    const res = await runner.query(
      `UPDATE workflow_transitions
       SET from_state = COALESCE($1, from_state),
           action = COALESCE($2, action),
           to_state = COALESCE($3, to_state),
           allowed_roles = COALESCE($4::jsonb, allowed_roles),
           validation_policy = COALESCE($5::jsonb, validation_policy)
       WHERE id = $6
       RETURNING *`,
      [
        tr.from_state || null,
        tr.action || null,
        tr.to_state || null,
        tr.allowed_roles ? JSON.stringify(tr.allowed_roles) : null,
        tr.validation_policy ? JSON.stringify(tr.validation_policy) : null,
        id,
      ]
    );
    if (res.rows.length === 0) throw new NotFound('WorkflowTransition');
    return this.mapTransition(res.rows[0]);
  }
}
