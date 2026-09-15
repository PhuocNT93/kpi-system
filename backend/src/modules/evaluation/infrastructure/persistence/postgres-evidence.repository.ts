import { Pool, PoolClient } from 'pg';
import { FinalEvidenceItem, EvidenceType, EvidenceStatus } from '../../../evaluation-data-import/domain/evaluation-data-import.types.js';

export interface IEvidenceRepository {
  createEvidence(
    data: {
      evidence_id?: string;
      evaluation_item_id: string;
      evidence_type: EvidenceType;
      title: string;
      evidence_url?: string | null;
      file_reference?: string | null;
      description?: string | null;
      rationale?: string | null;
      source?: string | null;
      source_import_id?: string | null;
      source_record_id?: string | null;
      metadata?: Record<string, unknown> | null;
      status?: EvidenceStatus;
      created_by?: string | null;
    },
    client?: PoolClient
  ): Promise<FinalEvidenceItem>;

  findByEvaluationItemId(
    evaluationItemId: string,
    options?: { includeSuperseded?: boolean },
    client?: PoolClient
  ): Promise<FinalEvidenceItem[]>;

  supersede(
    evidenceId: string,
    supersededBy: string,
    reason?: string | null,
    client?: PoolClient
  ): Promise<void>;
}

export class PostgresEvidenceRepository implements IEvidenceRepository {
  constructor(private pool: Pool) {}

  private getExecutor(client?: PoolClient | Pool) {
    return client || this.pool;
  }

  async createEvidence(
    data: {
      evidence_id?: string;
      evaluation_item_id: string;
      evidence_type: EvidenceType;
      title: string;
      evidence_url?: string | null;
      file_reference?: string | null;
      description?: string | null;
      rationale?: string | null;
      source?: string | null;
      source_import_id?: string | null;
      source_record_id?: string | null;
      metadata?: Record<string, unknown> | null;
      status?: EvidenceStatus;
      created_by?: string | null;
    },
    client?: PoolClient
  ): Promise<FinalEvidenceItem> {
    const exec = this.getExecutor(client);
    const res = await exec.query(
      `INSERT INTO evidence (
        evidence_id, evaluation_item_id, evidence_type, evidence_value, title,
        evidence_url, file_reference, rationale, source, source_import_id,
        source_record_id, metadata, status, created_by
      ) VALUES (
        COALESCE($1, gen_random_uuid()), $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14
      ) RETURNING *`,
      [
        data.evidence_id || null,
        data.evaluation_item_id,
        data.evidence_type,
        data.evidence_url || data.file_reference || data.title || '',
        data.title,
        data.evidence_url || null,
        data.file_reference || null,
        data.rationale || null,
        data.source || null,
        data.source_import_id || null,
        data.source_record_id || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        data.status || 'ACTIVE',
        data.created_by || null,
      ]
    );

    return this.mapRow(res.rows[0]);
  }

  async findByEvaluationItemId(
    evaluationItemId: string,
    options?: { includeSuperseded?: boolean },
    client?: PoolClient
  ): Promise<FinalEvidenceItem[]> {
    const exec = this.getExecutor(client);
    const includeSuperseded = options?.includeSuperseded ?? false;
    const query = includeSuperseded
      ? `SELECT * FROM evidence WHERE evaluation_item_id = $1 ORDER BY created_at DESC`
      : `SELECT * FROM evidence WHERE evaluation_item_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC`;

    const res = await exec.query(query, [evaluationItemId]);
    return res.rows.map((r) => this.mapRow(r));
  }

  async supersede(
    evidenceId: string,
    supersededBy: string,
    reason?: string | null,
    client?: PoolClient
  ): Promise<void> {
    const exec = this.getExecutor(client);
    await exec.query(
      `UPDATE evidence
       SET status = 'SUPERSEDED',
           superseded_by = $1,
           superseded_at = CURRENT_TIMESTAMP,
           supersede_reason = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE evidence_id = $3`,
      [supersededBy, reason || null, evidenceId]
    );
  }

  private mapRow(row: Record<string, unknown>): FinalEvidenceItem {
    return {
      id: row.evidence_id as string,
      title: (row.title as string) || '',
      type: row.evidence_type as EvidenceType,
      url: (row.evidence_url as string) || null,
      file_reference: (row.file_reference as string) || null,
      description: (row.evidence_value as string) || null,
      rationale: (row.rationale as string) || null,
      source: (row.source as string) || null,
      status: ((row.status as string) || 'ACTIVE') as EvidenceStatus,
      superseded_by: (row.superseded_by as string) || null,
      superseded_at: row.superseded_at ? new Date(row.superseded_at as string) : null,
      supersede_reason: (row.supersede_reason as string) || null,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata as Record<string, unknown>) || null,
      created_at: new Date((row.created_at || row.uploaded_at) as string),
    };
  }
}
