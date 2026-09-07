import { Pool } from 'pg';
import { CsvTemplate, CsvTemplateColumn, ICsvTemplateRepository } from '../domain/csv-template.types.js';

export class PostgresCsvTemplateRepository implements ICsvTemplateRepository {
  constructor(private pool: Pool) {}

  async findActiveTemplateByCode(code: string): Promise<CsvTemplate | null> {
    const res = await this.pool.query(
      `SELECT * FROM csv_template 
       WHERE code = $1 AND status = 'ACTIVE' 
       ORDER BY version_no DESC LIMIT 1`,
      [code]
    );
    return res.rows[0] || null;
  }

  async findById(id: string): Promise<CsvTemplate | null> {
    const res = await this.pool.query(
      `SELECT * FROM csv_template WHERE csv_template_id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async findColumnsByTemplateId(templateId: string): Promise<CsvTemplateColumn[]> {
    const res = await this.pool.query(
      `SELECT * FROM csv_template_column 
       WHERE csv_template_id = $1 
       ORDER BY display_order ASC`,
      [templateId]
    );
    return res.rows;
  }
}
