import { Pool, PoolClient } from 'pg';
import { IEvaluationDataImportRepository } from '../domain/repositories.interface.js';
import {
  EvaluationDataImport,
  EvaluationDataImportRecord,
  EvaluationDataImportEvidence,
  ImportStatus,
  RecordStatus,
  StagedEvidenceInput,
  CreateImportPayload,
  SourceSnapshot,
  ConflictDetails,
  EvidenceType,
} from '../domain/evaluation-data-import.types.js';

export class PostgresEvaluationDataImportRepository implements IEvaluationDataImportRepository {
  constructor(private pool: Pool) {}

  private getExecutor(client?: PoolClient | Pool) {
    return client || this.pool;
  }

  async create(
    importData: {
      import_id: string;
      source_system: string;
      batch_reference?: string | null;
      status: ImportStatus;
      raw_payload: CreateImportPayload;
      record_count: number;
      success_count: number;
      error_count: number;
      conflict_count: number;
      created_by: string;
        crawl_job_execution_id?: string | null;
    },
    records: Array<{
      record_id: string;
      employee_code: string;
      cycle_id: string;
      kpi_code: string;
      value: number;
      comment?: string | null;
      source_comment?: string | null;
      reviewer_comment?: string | null;
      collected_at?: Date | null;
      measurement_from?: Date | null;
      measurement_to?: Date | null;
      source_updated_at?: Date | null;
      raw_payload_reference?: string | null;
      crawl_job_execution_id?: string | null;
      rationale: string;
      source_snapshot: SourceSnapshot;
      status: RecordStatus;
      error_message?: string | null;
      conflicts?: ConflictDetails | null;
      evidences?: Array<{
        staging_evidence_id: string;
        evidence_type: string;
        title: string;
        evidence_url?: string | null;
        file_reference?: string | null;
        description?: string | null;
        metadata?: Record<string, unknown> | null;
      }>;
    }>,
    client?: PoolClient
  ): Promise<EvaluationDataImport> {
    const exec = this.getExecutor(client);

    // 1. Insert evaluation_data_import
    const importRes = await exec.query(
      `INSERT INTO evaluation_data_import (
        import_id, source_system, batch_reference, status, raw_payload,
        record_count, success_count, error_count, conflict_count, created_by, crawl_job_execution_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        importData.import_id,
        importData.source_system,
        importData.batch_reference || null,
        importData.status,
        JSON.stringify(importData.raw_payload),
        importData.record_count,
        importData.success_count,
        importData.error_count,
        importData.conflict_count,
        importData.created_by,
          importData.crawl_job_execution_id ?? null,
      ]
    );

    // 2. Insert records and evidence
    for (const rec of records) {
      await exec.query(
        `INSERT INTO evaluation_data_import_record (
          record_id, import_id, employee_code, cycle_id, kpi_code, value,
          comment, rationale, source_snapshot, status, error_message, conflicts,
          source_comment, reviewer_comment, collected_at, measurement_from, measurement_to,
          source_updated_at, raw_payload_reference, crawl_job_execution_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          rec.record_id,
          importData.import_id,
          rec.employee_code,
          rec.cycle_id,
          rec.kpi_code,
          rec.value,
          rec.comment || null,
          rec.rationale,
          JSON.stringify(rec.source_snapshot),
          rec.status,
          rec.error_message || null,
          rec.conflicts ? JSON.stringify(rec.conflicts) : null,
          rec.source_comment ?? null,
          rec.reviewer_comment ?? null,
          rec.collected_at ?? null,
          rec.measurement_from ?? null,
          rec.measurement_to ?? null,
          rec.source_updated_at ?? null,
          rec.raw_payload_reference ?? null,
          rec.crawl_job_execution_id ?? null,
        ]
      );

      if (rec.evidences && rec.evidences.length > 0) {
        for (const ev of rec.evidences) {
          await exec.query(
            `INSERT INTO evaluation_data_import_evidence (
              staging_evidence_id, record_id, evidence_type, title,
              evidence_url, file_reference, description, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              ev.staging_evidence_id,
              rec.record_id,
              ev.evidence_type,
              ev.title,
              ev.evidence_url || null,
              ev.file_reference || null,
              ev.description || null,
              ev.metadata ? JSON.stringify(ev.metadata) : null,
            ]
          );
        }
      }
    }

    return this.mapImportRow(importRes.rows[0]);
  }

  async findById(importId: string): Promise<EvaluationDataImport | null> {
    const res = await this.pool.query(
      `SELECT * FROM evaluation_data_import WHERE import_id = $1`,
      [importId]
    );
    if (res.rows.length === 0) return null;
    return this.mapImportRow(res.rows[0]);
  }

  async findByIdForUpdate(importId: string, client?: PoolClient): Promise<EvaluationDataImport | null> {
    const exec = this.getExecutor(client);
    const res = await exec.query(
      `SELECT * FROM evaluation_data_import WHERE import_id = $1 FOR UPDATE`,
      [importId]
    );
    if (res.rows.length === 0) return null;
    return this.mapImportRow(res.rows[0]);
  }

  async findRecordsByImportId(
    importId: string,
    options?: { page?: number; limit?: number; status?: RecordStatus; teamIds?: string[] },
    client?: PoolClient
  ): Promise<{ records: EvaluationDataImportRecord[]; total: number }> {
    const exec = this.getExecutor(client);
    const page = options?.page || 1;
    const limit = options?.limit || 100;
    const offset = (page - 1) * limit;

    if (options?.teamIds && options.teamIds.length === 0) return { records: [], total: 0 };
    const whereClauses = [`r.import_id = $1`];
    const params: unknown[] = [importId];

    if (options?.status) {
      params.push(options.status);
      whereClauses.push(`r.status = $${params.length}`);
    }
    const teamJoin = options?.teamIds ? 'JOIN employee scoped_employee ON UPPER(scoped_employee.employee_code) = UPPER(r.employee_code)' : '';
    if (options?.teamIds) {
      params.push(options.teamIds);
      whereClauses.push(`scoped_employee.team_id = ANY($${params.length}::uuid[])`);
    }

    const whereSql = whereClauses.join(' AND ');

    const countRes = await exec.query(
      `SELECT COUNT(*)::int as total FROM evaluation_data_import_record r ${teamJoin} WHERE ${whereSql}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    params.push(limit, offset);
    const recordsRes = await exec.query(
      `SELECT r.*, ec.code as cycle_code
      FROM evaluation_data_import_record r
      ${teamJoin}
       LEFT JOIN evaluation_cycle ec ON r.cycle_id = ec.evaluation_cycle_id
      WHERE ${whereSql}
       ORDER BY r.created_at ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    if (recordsRes.rows.length === 0) {
      return { records: [], total };
    }

    const recordIds = recordsRes.rows.map((r) => r.record_id);
    const evidenceRes = await exec.query(
      `SELECT * FROM evaluation_data_import_evidence WHERE record_id = ANY($1::uuid[])`,
      [recordIds]
    );

    const evidenceByRecordId: Record<string, EvaluationDataImportEvidence[]> = {};
    for (const evRow of evidenceRes.rows) {
      const ev = this.mapEvidenceRow(evRow);
      if (!evidenceByRecordId[ev.record_id]) {
        evidenceByRecordId[ev.record_id] = [];
      }
      evidenceByRecordId[ev.record_id]!.push(ev);
    }

    const records = recordsRes.rows.map((r) => {
      const rec = this.mapRecordRow(r);
      rec.evidences = evidenceByRecordId[rec.record_id] || [];
      return rec;
    });

    return { records, total };
  }

  async findRecordById(recordId: string, client?: PoolClient): Promise<EvaluationDataImportRecord | null> {
    const exec = this.getExecutor(client);
    const res = await exec.query(
      `SELECT r.*, ec.code as cycle_code
       FROM evaluation_data_import_record r
       LEFT JOIN evaluation_cycle ec ON r.cycle_id = ec.evaluation_cycle_id
       WHERE r.record_id = $1`,
      [recordId]
    );
    if (res.rows.length === 0) return null;

    const rec = this.mapRecordRow(res.rows[0]);
    const evidenceRes = await exec.query(
      `SELECT * FROM evaluation_data_import_evidence WHERE record_id = $1`,
      [recordId]
    );
    rec.evidences = evidenceRes.rows.map((e) => this.mapEvidenceRow(e));
    return rec;
  }

  async updateRecordDraft(
    recordId: string,
    patch: {
      value?: number;
      comment?: string | null;
      reviewer_comment?: string | null;
      rationale?: string;
      status?: RecordStatus;
      conflicts?: ConflictDetails | null;
    },
    evidences?: StagedEvidenceInput[],
    reviewedBy?: string,
    client?: PoolClient
  ): Promise<EvaluationDataImportRecord> {
    const exec = this.getExecutor(client);
    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: unknown[] = [];
    let idx = 1;

    if (patch.value !== undefined) {
      fields.push(`value = $${idx++}`);
      values.push(patch.value);
    }
    if (patch.comment !== undefined) {
      fields.push(`comment = $${idx++}`);
      values.push(patch.comment);
    }
    if (patch.reviewer_comment !== undefined) {
      fields.push(`reviewer_comment = $${idx++}`);
      values.push(patch.reviewer_comment);
      fields.push(`reviewed_by = $${idx++}`);
      values.push(reviewedBy ?? null);
      fields.push(`reviewed_at = CURRENT_TIMESTAMP`);
    }
    if (patch.rationale !== undefined) {
      fields.push(`rationale = $${idx++}`);
      values.push(patch.rationale);
    }
    if (patch.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(patch.status);
    }
    if (patch.conflicts !== undefined) {
      fields.push(`conflicts = $${idx++}`);
      values.push(patch.conflicts ? JSON.stringify(patch.conflicts) : null);
    }

    values.push(recordId);
    await exec.query(
      `UPDATE evaluation_data_import_record
       SET ${fields.join(', ')}
       WHERE record_id = $${idx}`,
      values
    );

    if (evidences) {
      // Replace staged evidence for this draft record
      await exec.query(
        `DELETE FROM evaluation_data_import_evidence WHERE record_id = $1`,
        [recordId]
      );
      for (const ev of evidences) {
        await exec.query(
          `INSERT INTO evaluation_data_import_evidence (
            staging_evidence_id, record_id, evidence_type, title,
            evidence_url, file_reference, description, metadata
          ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
          [
            recordId,
            ev.evidence_type,
            ev.title,
            ev.evidence_url || null,
            ev.file_reference || null,
            ev.description || null,
            ev.metadata ? JSON.stringify(ev.metadata) : null,
          ]
        );
      }
    }

    const updated = await this.findRecordById(recordId, client);
    if (!updated) {
      throw new Error(`Record ${recordId} not found after draft update`);
    }
    return updated;
  }

  async updateImportStatus(
    importId: string,
    status: ImportStatus,
    counts?: { success_count?: number; error_count?: number; conflict_count?: number },
    client?: PoolClient
  ): Promise<void> {
    const exec = this.getExecutor(client);
    const fields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const values: unknown[] = [status];
    let idx = 2;

    if (counts?.success_count !== undefined) {
      fields.push(`success_count = $${idx++}`);
      values.push(counts.success_count);
    }
    if (counts?.error_count !== undefined) {
      fields.push(`error_count = $${idx++}`);
      values.push(counts.error_count);
    }
    if (counts?.conflict_count !== undefined) {
      fields.push(`conflict_count = $${idx++}`);
      values.push(counts.conflict_count);
    }
    if (status === 'APPLIED' || status === 'PARTIALLY_APPLIED') {
      fields.push(`applied_at = CURRENT_TIMESTAMP`);
    }

    values.push(importId);
    await exec.query(
      `UPDATE evaluation_data_import SET ${fields.join(', ')} WHERE import_id = $${idx}`,
      values
    );
  }

  async updateRecordApplied(
    recordId: string,
    evaluationItemId: string,
    finalEvidenceMap: Record<string, string>,
    client?: PoolClient
  ): Promise<void> {
    const exec = this.getExecutor(client);
    await exec.query(
      `UPDATE evaluation_data_import_record
       SET status = 'APPLIED', evaluation_item_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE record_id = $2`,
      [evaluationItemId, recordId]
    );

    for (const [stagingId, finalId] of Object.entries(finalEvidenceMap)) {
      await exec.query(
        `UPDATE evaluation_data_import_evidence
         SET status = 'APPLIED', final_evidence_id = $1
         WHERE staging_evidence_id = $2`,
        [finalId, stagingId]
      );
    }
  }

  async updateRecordRejected(
    recordId: string,
    errorMessage: string,
    client?: PoolClient
  ): Promise<void> {
    const exec = this.getExecutor(client);
    await exec.query(
      `UPDATE evaluation_data_import_record
       SET status = 'REJECTED', error_message = $1, updated_at = CURRENT_TIMESTAMP
       WHERE record_id = $2`,
      [errorMessage, recordId]
    );
  }

  async listImports(options?: { page?: number; limit?: number; crawlOnly?: boolean; teamIds?: string[] }): Promise<{ items: EvaluationDataImport[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;

    if (options?.teamIds && options.teamIds.length === 0) return { items: [], total: 0 };
    const where: string[] = [];
    const params: unknown[] = [];
    if (options?.crawlOnly || options?.teamIds) where.push('i.crawl_job_execution_id IS NOT NULL');
    if (options?.teamIds) {
      params.push(options.teamIds);
      where.push(`EXISTS (SELECT 1 FROM evaluation_data_import_record scoped_record JOIN employee scoped_employee
        ON UPPER(scoped_employee.employee_code) = UPPER(scoped_record.employee_code)
        WHERE scoped_record.import_id = i.import_id AND scoped_employee.team_id = ANY($${params.length}::uuid[]))`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countRes = await this.pool.query(
      `SELECT COUNT(*)::int as total FROM evaluation_data_import i ${whereSql}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const pageParams = [...params, limit, offset];
    const res = await this.pool.query(
      `SELECT i.* FROM evaluation_data_import i ${whereSql} ORDER BY i.created_at DESC LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      pageParams
    );

    return {
      items: res.rows.map((r) => this.mapImportRow(r)),
      total,
    };
  }

  async isImportVisibleToTeams(importId: string, teamIds: string[]): Promise<boolean> {
    if (teamIds.length === 0) return false;
    const result = await this.pool.query(
      `SELECT 1 FROM evaluation_data_import i
       WHERE i.import_id = $1 AND i.crawl_job_execution_id IS NOT NULL
         AND EXISTS (SELECT 1 FROM evaluation_data_import_record record JOIN employee
           ON UPPER(employee.employee_code) = UPPER(record.employee_code)
           WHERE record.import_id = i.import_id AND employee.team_id = ANY($2::uuid[]))`,
      [importId, teamIds]
    );
    return result.rows.length > 0;
  }

  async findPendingConflictingRecords(
    cycleId: string,
    employeeCode: string,
    kpiCode: string,
    excludeImportId?: string
  ): Promise<EvaluationDataImportRecord[]> {
    const query = `
      SELECT r.* FROM evaluation_data_import_record r
      JOIN evaluation_data_import i ON r.import_id = i.import_id
      WHERE r.cycle_id = $1 AND r.employee_code = $2 AND r.kpi_code = $3
        AND i.status IN ('READY', 'CONFLICT', 'VALIDATING', 'PENDING_REVIEW')
        ${excludeImportId ? 'AND r.import_id != $4' : ''}
    `;
    const params = excludeImportId
      ? [cycleId, employeeCode, kpiCode, excludeImportId]
      : [cycleId, employeeCode, kpiCode];

    const res = await this.pool.query(query, params);
    return res.rows.map((r) => this.mapRecordRow(r));
  }

  private mapImportRow(row: Record<string, unknown>): EvaluationDataImport {
    return {
      import_id: row.import_id as string,
      source_system: row.source_system as string,
      batch_reference: (row.batch_reference as string) || null,
      status: row.status as ImportStatus,
      raw_payload: typeof row.raw_payload === 'string' ? JSON.parse(row.raw_payload) : row.raw_payload as CreateImportPayload,
      record_count: row.record_count as number,
      success_count: row.success_count as number,
      error_count: row.error_count as number,
      conflict_count: row.conflict_count as number,
      created_by: row.created_by as string,
      created_at: row.created_at as Date,
      applied_at: (row.applied_at as Date) || null,
      updated_at: row.updated_at as Date,
        crawl_job_execution_id: (row.crawl_job_execution_id as string) || null,
    };
  }

  private mapRecordRow(row: Record<string, unknown>): EvaluationDataImportRecord {
    return {
      record_id: row.record_id as string,
      import_id: row.import_id as string,
      employee_code: row.employee_code as string,
      cycle_id: row.cycle_id as string,
      cycle_code: (row.cycle_code as string) || null,
      evaluation_cycle_code: (row.cycle_code as string) || null,
      kpi_code: row.kpi_code as string,
      value: parseFloat(row.value as string),
      comment: (row.comment as string) || null,
      source_comment: (row.source_comment as string) || null,
      reviewer_comment: (row.reviewer_comment as string) || null,
      rationale: row.rationale as string,
      source_snapshot: typeof row.source_snapshot === 'string' ? JSON.parse(row.source_snapshot) : row.source_snapshot as SourceSnapshot,
      status: row.status as RecordStatus,
      error_message: (row.error_message as string) || null,
      conflicts: typeof row.conflicts === 'string' ? JSON.parse(row.conflicts) : (row.conflicts as ConflictDetails) || null,
      evaluation_item_id: (row.evaluation_item_id as string) || null,
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
      crawl_job_execution_id: (row.crawl_job_execution_id as string) || null,
      collected_at: (row.collected_at as Date) || null,
      measurement_from: (row.measurement_from as Date) || null,
      measurement_to: (row.measurement_to as Date) || null,
      source_updated_at: (row.source_updated_at as Date) || null,
      raw_payload_reference: (row.raw_payload_reference as string) || null,
    };
  }

  private mapEvidenceRow(row: Record<string, unknown>): EvaluationDataImportEvidence {
    return {
      staging_evidence_id: row.staging_evidence_id as string,
      record_id: row.record_id as string,
      evidence_type: row.evidence_type as EvidenceType,
      title: row.title as string,
      evidence_url: (row.evidence_url as string) || null,
      file_reference: (row.file_reference as string) || null,
      description: (row.description as string) || null,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata as Record<string, unknown>) || null,
      status: row.status as 'PENDING' | 'APPLIED',
      final_evidence_id: (row.final_evidence_id as string) || null,
      created_at: row.created_at as Date,
    };
  }
}
