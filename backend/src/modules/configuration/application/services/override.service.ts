import {
  RoleOverride,
  TeamOverride,
  TemplateOverride,
  OverrideConfig,
  VersionStatus,
  AuditAction,
} from '../../domain/configuration.types.js';
import {
  IOverrideRepository,
  ITemplateVersionRepository,
  ICriterionVersionRepository,
  IConfigurationAuditRepository,
} from '../../domain/repositories.interface.js';
import { NotFound, AppError } from '../../../../api/app-error.js';

export class OverrideService {
  constructor(
    private overrideRepo: IOverrideRepository,
    private templateVersionRepo: ITemplateVersionRepository,
    private criterionVersionRepo: ICriterionVersionRepository,
    private auditRepo: IConfigurationAuditRepository
  ) {}

  private async assertTemplateVersionModifiable(templateVersionId?: string): Promise<void> {
    if (!templateVersionId) return;
    const tv = await this.templateVersionRepo.findById(templateVersionId);
    if (tv && (tv.status === VersionStatus.PUBLISHED || tv.status === VersionStatus.RETIRED)) {
      throw new AppError(409, 'PUBLISHED_CONFIGURATION_IMMUTABLE', 'Overrides on published template versions cannot be modified.');
    }
  }

  // ── Role Overrides ──────────────────────────────────────────────────────────

  async getRoleOverrides(templateVersionId?: string, roleCode?: string): Promise<RoleOverride[]> {
    return this.overrideRepo.findRoleOverrides(templateVersionId, roleCode);
  }

  async getRoleOverrideById(id: string): Promise<RoleOverride> {
    const o = await this.overrideRepo.findRoleOverrideById(id);
    if (!o) throw new NotFound('RoleOverride');
    return o;
  }

  async createRoleOverride(
    data: { role_code: string; template_version_id?: string; criterion_version_id: string; override_config: OverrideConfig },
    actorId?: string
  ): Promise<RoleOverride> {
    await this.assertTemplateVersionModifiable(data.template_version_id);
    const cv = await this.criterionVersionRepo.findById(data.criterion_version_id);
    if (!cv) throw new NotFound('CriterionVersion');

    const created = await this.overrideRepo.createRoleOverride({ ...data, created_by: actorId });
    await this.auditRepo.create({
      entity_type: 'ROLE_OVERRIDE',
      entity_id: created.id,
      action: AuditAction.OVERRIDE,
      performed_by: actorId || 'SYSTEM',
      changes: { created },
    });
    return created;
  }

  async updateRoleOverride(id: string, data: { override_config?: OverrideConfig }, actorId?: string): Promise<RoleOverride> {
    const existing = await this.getRoleOverrideById(id);
    await this.assertTemplateVersionModifiable(existing.template_version_id);

    const updated = await this.overrideRepo.updateRoleOverride(id, data);
    await this.auditRepo.create({
      entity_type: 'ROLE_OVERRIDE',
      entity_id: id,
      action: AuditAction.UPDATE,
      performed_by: actorId || 'SYSTEM',
      changes: { before: existing, after: updated },
    });
    return updated;
  }

  async deleteRoleOverride(id: string, actorId?: string): Promise<void> {
    const existing = await this.getRoleOverrideById(id);
    await this.assertTemplateVersionModifiable(existing.template_version_id);

    await this.overrideRepo.deleteRoleOverride(id);
    await this.auditRepo.create({
      entity_type: 'ROLE_OVERRIDE',
      entity_id: id,
      action: AuditAction.DELETE,
      performed_by: actorId || 'SYSTEM',
      changes: { deletedId: id },
    });
  }

  // ── Team Overrides ──────────────────────────────────────────────────────────

  async getTeamOverrides(templateVersionId?: string, teamCode?: string): Promise<TeamOverride[]> {
    return this.overrideRepo.findTeamOverrides(templateVersionId, teamCode);
  }

  async getTeamOverrideById(id: string): Promise<TeamOverride> {
    const o = await this.overrideRepo.findTeamOverrideById(id);
    if (!o) throw new NotFound('TeamOverride');
    return o;
  }

  async createTeamOverride(
    data: { team_code: string; template_version_id?: string; criterion_version_id: string; override_config: OverrideConfig },
    actorId?: string
  ): Promise<TeamOverride> {
    await this.assertTemplateVersionModifiable(data.template_version_id);
    const cv = await this.criterionVersionRepo.findById(data.criterion_version_id);
    if (!cv) throw new NotFound('CriterionVersion');

    const created = await this.overrideRepo.createTeamOverride({ ...data, created_by: actorId });
    await this.auditRepo.create({
      entity_type: 'TEAM_OVERRIDE',
      entity_id: created.id,
      action: AuditAction.OVERRIDE,
      performed_by: actorId || 'SYSTEM',
      changes: { created },
    });
    return created;
  }

  async updateTeamOverride(id: string, data: { override_config?: OverrideConfig }, actorId?: string): Promise<TeamOverride> {
    const existing = await this.getTeamOverrideById(id);
    await this.assertTemplateVersionModifiable(existing.template_version_id);

    const updated = await this.overrideRepo.updateTeamOverride(id, data);
    await this.auditRepo.create({
      entity_type: 'TEAM_OVERRIDE',
      entity_id: id,
      action: AuditAction.UPDATE,
      performed_by: actorId || 'SYSTEM',
      changes: { before: existing, after: updated },
    });
    return updated;
  }

  async deleteTeamOverride(id: string, actorId?: string): Promise<void> {
    const existing = await this.getTeamOverrideById(id);
    await this.assertTemplateVersionModifiable(existing.template_version_id);

    await this.overrideRepo.deleteTeamOverride(id);
    await this.auditRepo.create({
      entity_type: 'TEAM_OVERRIDE',
      entity_id: id,
      action: AuditAction.DELETE,
      performed_by: actorId || 'SYSTEM',
      changes: { deletedId: id },
    });
  }

  // ── Template Overrides ──────────────────────────────────────────────────────

  async getTemplateOverrides(templateVersionId: string): Promise<TemplateOverride[]> {
    return this.overrideRepo.findTemplateOverrides(templateVersionId);
  }

  async getTemplateOverrideById(id: string): Promise<TemplateOverride> {
    const o = await this.overrideRepo.findTemplateOverrideById(id);
    if (!o) throw new NotFound('TemplateOverride');
    return o;
  }

  async createTemplateOverride(
    data: { template_version_id: string; criterion_version_id: string; override_config: OverrideConfig },
    actorId?: string
  ): Promise<TemplateOverride> {
    await this.assertTemplateVersionModifiable(data.template_version_id);
    const cv = await this.criterionVersionRepo.findById(data.criterion_version_id);
    if (!cv) throw new NotFound('CriterionVersion');

    const created = await this.overrideRepo.createTemplateOverride({ ...data, created_by: actorId });
    await this.auditRepo.create({
      entity_type: 'TEMPLATE_OVERRIDE',
      entity_id: created.id,
      action: AuditAction.OVERRIDE,
      performed_by: actorId || 'SYSTEM',
      changes: { created },
    });
    return created;
  }

  async updateTemplateOverride(id: string, data: { override_config?: OverrideConfig }, actorId?: string): Promise<TemplateOverride> {
    const existing = await this.getTemplateOverrideById(id);
    await this.assertTemplateVersionModifiable(existing.template_version_id);

    const updated = await this.overrideRepo.updateTemplateOverride(id, data);
    await this.auditRepo.create({
      entity_type: 'TEMPLATE_OVERRIDE',
      entity_id: id,
      action: AuditAction.UPDATE,
      performed_by: actorId || 'SYSTEM',
      changes: { before: existing, after: updated },
    });
    return updated;
  }

  async deleteTemplateOverride(id: string, actorId?: string): Promise<void> {
    const existing = await this.getTemplateOverrideById(id);
    await this.assertTemplateVersionModifiable(existing.template_version_id);

    await this.overrideRepo.deleteTemplateOverride(id);
    await this.auditRepo.create({
      entity_type: 'TEMPLATE_OVERRIDE',
      entity_id: id,
      action: AuditAction.DELETE,
      performed_by: actorId || 'SYSTEM',
      changes: { deletedId: id },
    });
  }
}
