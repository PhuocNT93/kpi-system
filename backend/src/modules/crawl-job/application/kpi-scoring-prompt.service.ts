import { Pool } from 'pg';
import { createHash } from 'node:crypto';
import { AppError, NotFound } from '../../../api/app-error.js';
import { Actor } from '../../../shared/auth/types.js';
import { withAuditedTransaction } from '../../audit/application/audit-transaction.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { PostgresCrawlJobRepository } from '../infrastructure/postgres-crawl-job.repository.js';
import {
  CreatePromptPayload,
  CreatePromptVersionPayload,
  KpiScoringPromptRecord,
  KpiScoringPromptVersionRecord,
} from '../domain/kpi-scoring-prompt.types.js';

function toValidUuid(val?: string | null): string | null {
  return val && /^[0-9a-fA-F-]{36}$/.test(val) ? val : null;
}

export class KpiScoringPromptService {
  constructor(
    private readonly pool: Pool,
    private readonly repository: PostgresCrawlJobRepository,
    private readonly auditService: AuditService
  ) {}

  async listPrompts(_actor: Actor): Promise<KpiScoringPromptRecord[]> {
    const list = await this.repository.listPrompts();
    return list as unknown as KpiScoringPromptRecord[];
  }

  async getPrompt(_actor: Actor, promptId: string): Promise<KpiScoringPromptRecord> {
    const record = await this.repository.getPrompt(promptId);
    if (!record) throw new NotFound(`KPI scoring prompt ${promptId}`);
    return record as unknown as KpiScoringPromptRecord;
  }

  async createPrompt(actor: Actor, payload: CreatePromptPayload): Promise<KpiScoringPromptRecord> {
    if (actor.role !== 'SYSTEM_ADMIN' && actor.role !== 'HR_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only Administrators can create KPI scoring prompts.');
    }

    return withAuditedTransaction(this.pool, this.auditService, async (_client, audit) => {
      const created = await this.repository.createPrompt({
        code: payload.code.trim().toUpperCase(),
        name: payload.name.trim(),
        criterion_id: payload.criterion_id || null,
        criterion_code: payload.criterion_code || null,
        description: payload.description || null,
        created_by: actor.userId,
      });

      const promptId = String(created.prompt_id);

      if (payload.initial_user_prompt_template) {
        const template = payload.initial_user_prompt_template.trim();
        const systemPrompt = payload.initial_system_prompt?.trim() ||
          'You are an objective evaluation specialist assessing a single KPI record.';
        const checksum = createHash('sha256').update(template, 'utf8').digest('hex');

        await this.repository.createPromptVersion({
          prompt_id: promptId,
          system_prompt: systemPrompt,
          user_prompt_template: template,
          model: payload.model || 'gemini-2.5-flash',
          temperature: payload.temperature ?? 0.2,
          checksum,
          created_by: actor.userId,
          status: 'DRAFT',
        });
      }

      audit.record({
        entityType: 'KPI',
        entityId: promptId,
        action: 'CREATE',
        newValue: JSON.stringify({ code: created.code, name: created.name }),
      });

      return created as unknown as KpiScoringPromptRecord;
    }, toValidUuid(actor.userId));
  }

  async updatePrompt(
    actor: Actor,
    promptId: string,
    payload: { name?: string; description?: string; criterion_code?: string; criterion_id?: string | null }
  ): Promise<KpiScoringPromptRecord> {
    if (actor.role !== 'SYSTEM_ADMIN' && actor.role !== 'HR_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only Administrators can update KPI scoring prompts.');
    }
    await this.getPrompt(actor, promptId);
    return withAuditedTransaction(this.pool, this.auditService, async (_client, audit) => {
      const updated = await this.repository.updatePrompt(promptId, payload);
      if (!updated) throw new NotFound(`KPI scoring prompt ${promptId}`);
      audit.record({
        entityType: 'KPI',
        entityId: promptId,
        action: 'UPDATE',
        newValue: JSON.stringify(payload),
      });
      return updated as unknown as KpiScoringPromptRecord;
    }, toValidUuid(actor.userId));
  }

  async deletePrompt(actor: Actor, promptId: string): Promise<{ success: boolean; message: string }> {
    if (actor.role !== 'SYSTEM_ADMIN' && actor.role !== 'HR_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only Administrators can delete KPI scoring prompts.');
    }
    const existing = await this.getPrompt(actor, promptId);
    return withAuditedTransaction(this.pool, this.auditService, async (_client, audit) => {
      await this.repository.deletePrompt(promptId);
      audit.record({
        entityType: 'KPI',
        entityId: promptId,
        action: 'DELETE',
        oldValue: JSON.stringify({ code: existing.code, name: existing.name }),
      });
      return { success: true, message: `KPI scoring prompt ${existing.name} deleted successfully.` };
    }, toValidUuid(actor.userId));
  }

  async listPromptVersions(_actor: Actor, promptId: string): Promise<KpiScoringPromptVersionRecord[]> {
    const list = await this.repository.listPromptVersions(promptId);
    return list as unknown as KpiScoringPromptVersionRecord[];
  }

  async getPromptVersion(_actor: Actor, versionId: string): Promise<KpiScoringPromptVersionRecord> {
    const record = await this.repository.getPromptVersion(versionId);
    if (!record) throw new NotFound(`Prompt version ${versionId}`);
    return record as unknown as KpiScoringPromptVersionRecord;
  }

  async createPromptVersion(
    actor: Actor,
    promptId: string,
    payload: CreatePromptVersionPayload
  ): Promise<KpiScoringPromptVersionRecord> {
    if (actor.role !== 'SYSTEM_ADMIN' && actor.role !== 'HR_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only Administrators can create prompt versions.');
    }

    const template = payload.user_prompt_template.trim();
    const systemPrompt = payload.system_prompt.trim();
    const checksum = createHash('sha256').update(template, 'utf8').digest('hex');

    return withAuditedTransaction(this.pool, this.auditService, async (_client, audit) => {
      const created = await this.repository.createPromptVersion({
        prompt_id: promptId,
        system_prompt: systemPrompt,
        user_prompt_template: template,
        expected_output_schema: payload.expected_output_schema,
        model: payload.model || 'gemini-2.5-flash',
        temperature: payload.temperature ?? 0.2,
        checksum,
        created_by: actor.userId,
        status: 'DRAFT',
      });

      audit.record({
        entityType: 'KPI',
        entityId: String(created.prompt_version_id),
        action: 'CREATE',
        newValue: JSON.stringify({ prompt_id: promptId, version_no: created.version_no, checksum }),
      });

      return created as unknown as KpiScoringPromptVersionRecord;
    }, toValidUuid(actor.userId));
  }

  async publishPromptVersion(actor: Actor, versionId: string): Promise<KpiScoringPromptVersionRecord> {
    if (actor.role !== 'SYSTEM_ADMIN' && actor.role !== 'HR_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only Administrators can publish prompt versions.');
    }

    return withAuditedTransaction(this.pool, this.auditService, async (_client, audit) => {
      const published = await this.repository.publishPromptVersion(versionId, actor.userId);
      if (!published) {
        throw new AppError(422, 'CANNOT_PUBLISH_PROMPT', 'Prompt version is not in DRAFT status or not found.');
      }

      audit.record({
        entityType: 'KPI',
        entityId: versionId,
        action: 'PUBLISH',
        newValue: JSON.stringify({ version_id: versionId, version_no: published.version_no }),
      });

      return published as unknown as KpiScoringPromptVersionRecord;
    }, toValidUuid(actor.userId));
  }
}
