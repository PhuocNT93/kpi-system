import { Pool } from 'pg';
import { IImportRepository, ImportJob, ImportRow } from '../domain/import.types.js';

export class PostgresImportRepository implements IImportRepository {
  constructor(private pool: Pool) {}

  async createImportJob(job: ImportJob): Promise<void> {
    await this.pool.query(
      `INSERT INTO import_job (
        import_job_id, csv_template_id, evaluation_cycle_id, file_name, file_hash, 
        status, total_rows, success_rows, error_rows, imported_by, started_at, finished_at, idempotency_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        job.import_job_id, job.csv_template_id, job.evaluation_cycle_id, job.file_name, job.file_hash,
        job.status, job.total_rows, job.success_rows, job.error_rows, job.imported_by, job.started_at, job.finished_at, job.idempotency_key
      ]
    );
  }

  async updateImportJob(job: Partial<ImportJob> & { import_job_id: string }): Promise<void> {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(job)) {
      if (key !== 'import_job_id' && value !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0) return;

    values.push(job.import_job_id);
    await this.pool.query(
      `UPDATE import_job SET ${fields.join(', ')} WHERE import_job_id = $${idx}`,
      values
    );
  }

  async getImportJobByHash(cycleId: string, fileHash: string): Promise<ImportJob | null> {
    const res = await this.pool.query(
      `SELECT * FROM import_job WHERE evaluation_cycle_id = $1 AND file_hash = $2 LIMIT 1`,
      [cycleId, fileHash]
    );
    return res.rows[0] || null;
  }

  async getImportJobByIdempotencyKey(actorId: string, idempotencyKey: string): Promise<ImportJob | null> {
    const res = await this.pool.query(
      `SELECT * FROM import_job WHERE imported_by = $1 AND idempotency_key = $2 LIMIT 1`,
      [actorId, idempotencyKey]
    );
    return res.rows[0] || null;
  }

  async bulkInsertImportRows(rows: ImportRow[]): Promise<void> {
    if (rows.length === 0) return;

    // Using unnest for bulk insert
    const import_row_id = [];
    const import_job_id = [];
    const row_no = [];
    const raw_data = [];
    const status = [];
    const error_messages = [];
    const evaluation_item_id = [];

    for (const r of rows) {
      import_row_id.push(r.import_row_id);
      import_job_id.push(r.import_job_id);
      row_no.push(r.row_no);
      raw_data.push(JSON.stringify(r.raw_data));
      status.push(r.status);
      error_messages.push(r.error_messages ? JSON.stringify(r.error_messages) : null);
      evaluation_item_id.push(r.evaluation_item_id);
    }

    await this.pool.query(
      `INSERT INTO import_row (
        import_row_id, import_job_id, row_no, raw_data, status, error_messages, evaluation_item_id
      ) SELECT * FROM UNNEST(
        $1::uuid[], $2::uuid[], $3::int[], $4::jsonb[], $5::varchar[], $6::jsonb[], $7::uuid[]
      )`,
      [import_row_id, import_job_id, row_no, raw_data, status, error_messages, evaluation_item_id]
    );
  }
}
