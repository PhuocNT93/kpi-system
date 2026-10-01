import { Pool } from 'pg';
import { AppError, NotFound } from '../../../api/app-error.js';
import { Actor } from '../../../shared/auth/types.js';
import { withAuditedTransaction } from '../../audit/application/audit-transaction.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { PostgresCrawlJobRepository } from '../infrastructure/postgres-crawl-job.repository.js';
import { CrawlSourceSystemRecord, CreateCrawlSourceSystemPayload, UpdateCrawlSourceSystemPayload } from '../domain/crawl-source-system.types.js';

function toValidUuid(val?: string | null): string | null {
  return val && /^[0-9a-fA-F-]{36}$/.test(val) ? val : null;
}

export class CrawlSourceSystemService {
  constructor(
    private readonly pool: Pool,
    private readonly repository: PostgresCrawlJobRepository,
    private readonly auditService: AuditService
  ) {}

  async listSourceSystems(_actor: Actor): Promise<CrawlSourceSystemRecord[]> {
    const list = await this.repository.listSourceSystems();
    return list as unknown as CrawlSourceSystemRecord[];
  }

  async getSourceSystem(_actor: Actor, idOrCode: string): Promise<CrawlSourceSystemRecord> {
    const record = await this.repository.getSourceSystem(idOrCode);
    if (!record) {
      throw new NotFound(`Crawl source system ${idOrCode}`);
    }
    return record as unknown as CrawlSourceSystemRecord;
  }

  async createSourceSystem(actor: Actor, payload: CreateCrawlSourceSystemPayload): Promise<CrawlSourceSystemRecord> {
    if (actor.role !== 'SYSTEM_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only System Admin can register source systems.');
    }

    return withAuditedTransaction(this.pool, this.auditService, async (_client, audit) => {
      const created = await this.repository.createSourceSystem({
        ...payload,
        created_by: actor.userId,
      });

      audit.record({
        entityType: 'CRAWL_JOB',
        entityId: String(created.id),
        action: 'CREATE',
        newValue: JSON.stringify({ code: created.code, name: created.name }),
      });

      return created as unknown as CrawlSourceSystemRecord;
    }, toValidUuid(actor.userId));
  }

  async updateSourceSystem(actor: Actor, id: string, payload: UpdateCrawlSourceSystemPayload): Promise<CrawlSourceSystemRecord> {
    if (actor.role !== 'SYSTEM_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only System Admin can update source systems.');
    }

    return withAuditedTransaction(this.pool, this.auditService, async (_client, audit) => {
      const updated = await this.repository.updateSourceSystem(id, payload);
      if (!updated) {
        throw new NotFound(`Crawl source system ${id}`);
      }

      audit.record({
        entityType: 'CRAWL_JOB',
        entityId: id,
        action: 'UPDATE',
        newValue: JSON.stringify(payload),
      });

      return updated as unknown as CrawlSourceSystemRecord;
    }, toValidUuid(actor.userId));
  }

  async deleteSourceSystem(actor: Actor, id: string): Promise<{ success: boolean; message: string }> {
    if (actor.role !== 'SYSTEM_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only System Admin can delete source systems.');
    }
    const source = await this.getSourceSystem(actor, id);
    return withAuditedTransaction(this.pool, this.auditService, async (_client, audit) => {
      await this.repository.deleteSourceSystem(id);
      audit.record({
        entityType: 'CRAWL_JOB',
        entityId: id,
        action: 'DELETE',
        oldValue: JSON.stringify({ code: source.code, name: source.name }),
      });
      return { success: true, message: `Source system ${source.name} deleted successfully.` };
    }, toValidUuid(actor.userId));
  }

  async testConnection(actor: Actor, id: string): Promise<{ success: boolean; message: string; duration_ms: number }> {
    const source = await this.getSourceSystem(actor, id);
    const startTime = Date.now();

    if (source.allowed_domains.length === 0) {
      return {
        success: false,
        message: 'No allowed domains configured for this source system.',
        duration_ms: Date.now() - startTime,
      };
    }

    return {
      success: true,
      message: `Successfully validated configuration for ${source.name}. Allowed domains: ${source.allowed_domains.join(', ')}`,
      duration_ms: Date.now() - startTime,
    };
  }
}
