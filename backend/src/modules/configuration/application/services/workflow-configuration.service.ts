import {
  WorkflowDefinition,
  WorkflowState,
  WorkflowTransition,
  WorkflowStateType,
  VersionStatus,
  ValidationResult,
  AuditAction,
} from '../../domain/configuration.types.js';
import {
  IWorkflowRepository,
  IConfigurationAuditRepository,
} from '../../domain/repositories.interface.js';
import { ConfigurationValidationService } from '../validation/configuration-validation.service.js';
import { Conflict, NotFound, ValidationError, AppError } from '../../../../api/app-error.js';

export class WorkflowConfigurationService {
  constructor(
    private workflowRepo: IWorkflowRepository,
    private auditRepo: IConfigurationAuditRepository
  ) {}

  // ── Definitions ─────────────────────────────────────────────────────────────

  async createWorkflow(
    data: { code: string; name: string },
    actorId?: string
  ): Promise<WorkflowDefinition> {
    const existing = await this.workflowRepo.findDefinitionByCode(data.code);
    if (existing) {
      throw new Conflict(`Workflow code '${data.code}' already exists.`, 'WORKFLOW_CODE_ALREADY_EXISTS');
    }

    const created = await this.workflowRepo.createDefinition({
      code: data.code,
      name: data.name,
      status: VersionStatus.DRAFT,
      created_by: actorId,
    });

    await this.auditRepo.create({
      entity_type: 'WORKFLOW_DEFINITION',
      entity_id: created.id,
      action: AuditAction.CREATE,
      performed_by: actorId || 'SYSTEM',
      changes: { created },
    });

    return created;
  }

  async getWorkflows(): Promise<WorkflowDefinition[]> {
    return this.workflowRepo.findAllDefinitions();
  }

  async getWorkflowById(id: string): Promise<WorkflowDefinition> {
    const wf = await this.workflowRepo.findDefinitionById(id);
    if (!wf) throw new NotFound('WorkflowDefinition');
    return wf;
  }

  async updateWorkflow(
    id: string,
    data: { name?: string },
    expectedVersion?: number,
    actorId?: string
  ): Promise<WorkflowDefinition> {
    const existing = await this.getWorkflowById(id);
    if (existing.status === VersionStatus.PUBLISHED) {
      throw new AppError(409, 'PUBLISHED_CONFIGURATION_IMMUTABLE', 'Published workflow definitions are immutable.');
    }

    const updated = await this.workflowRepo.updateDefinition(id, data, expectedVersion);
    await this.auditRepo.create({
      entity_type: 'WORKFLOW_DEFINITION',
      entity_id: id,
      action: AuditAction.UPDATE,
      performed_by: actorId || 'SYSTEM',
      changes: { before: existing, after: updated },
    });
    return updated;
  }

  // ── States ──────────────────────────────────────────────────────────────────

  async getWorkflowStates(workflowId: string): Promise<WorkflowState[]> {
    await this.getWorkflowById(workflowId);
    return this.workflowRepo.findStatesByWorkflowId(workflowId);
  }

  async addWorkflowState(
    workflowId: string,
    data: { code: string; name: string; type: WorkflowStateType },
    actorId?: string
  ): Promise<WorkflowState> {
    const wf = await this.getWorkflowById(workflowId);
    if (wf.status === VersionStatus.PUBLISHED) {
      throw new AppError(409, 'PUBLISHED_CONFIGURATION_IMMUTABLE', 'Published workflow definitions are immutable.');
    }

    const created = await this.workflowRepo.createState({
      workflow_definition_id: workflowId,
      code: data.code,
      name: data.name,
      type: data.type,
    });

    await this.auditRepo.create({
      entity_type: 'WORKFLOW_STATE',
      entity_id: created.id,
      action: AuditAction.CREATE,
      performed_by: actorId || 'SYSTEM',
      changes: { created },
    });

    return created;
  }

  // ── Transitions ─────────────────────────────────────────────────────────────

  async getWorkflowTransitions(workflowId: string): Promise<WorkflowTransition[]> {
    await this.getWorkflowById(workflowId);
    return this.workflowRepo.findTransitionsByWorkflowId(workflowId);
  }

  async addWorkflowTransition(
    workflowId: string,
    data: { from_state: string; action: string; to_state: string; allowed_roles?: string[]; validation_policy?: Record<string, unknown> },
    actorId?: string
  ): Promise<WorkflowTransition> {
    const wf = await this.getWorkflowById(workflowId);
    if (wf.status === VersionStatus.PUBLISHED) {
      throw new AppError(409, 'PUBLISHED_CONFIGURATION_IMMUTABLE', 'Published workflow definitions are immutable.');
    }

    const created = await this.workflowRepo.createTransition({
      workflow_definition_id: workflowId,
      from_state: data.from_state,
      action: data.action,
      to_state: data.to_state,
      allowed_roles: data.allowed_roles || [],
      validation_policy: data.validation_policy || {},
    });

    await this.auditRepo.create({
      entity_type: 'WORKFLOW_TRANSITION',
      entity_id: created.id,
      action: AuditAction.CREATE,
      performed_by: actorId || 'SYSTEM',
      changes: { created },
    });

    return created;
  }

  // ── Validation & Publishing ────────────────────────────────────────────────

  async validateWorkflow(workflowId: string): Promise<ValidationResult> {
    await this.getWorkflowById(workflowId);
    const states = await this.workflowRepo.findStatesByWorkflowId(workflowId);
    const transitions = await this.workflowRepo.findTransitionsByWorkflowId(workflowId);

    return ConfigurationValidationService.validateWorkflowGraph(states, transitions);
  }

  async publishWorkflow(workflowId: string, actorId?: string): Promise<WorkflowDefinition> {
    const wf = await this.getWorkflowById(workflowId);
    if (wf.status === VersionStatus.PUBLISHED) {
      throw new Conflict('Workflow is already published.', 'VERSION_ALREADY_PUBLISHED');
    }

    const validation = await this.validateWorkflow(workflowId);
    if (!validation.valid) {
      throw new ValidationError(
        'Cannot publish workflow with invalid state graph.',
        validation.errors.map((e) => ({ field: e.path, code: e.code, message: e.message }))
      );
    }

    const updated = await this.workflowRepo.updateDefinition(workflowId, { status: VersionStatus.PUBLISHED });

    await this.auditRepo.create({
      entity_type: 'WORKFLOW_DEFINITION',
      entity_id: workflowId,
      action: AuditAction.PUBLISH,
      performed_by: actorId || 'SYSTEM',
      changes: { status: VersionStatus.PUBLISHED },
    });

    return updated;
  }
}
