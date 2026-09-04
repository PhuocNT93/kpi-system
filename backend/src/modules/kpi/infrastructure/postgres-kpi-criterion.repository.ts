import { Pool } from 'pg';
import { KpiCriterionMapping, CreateKpiCriterionMappingDTO, UpdateKpiCriterionMappingDTO } from '../domain/kpi.model.js';

export class PostgresKpiCriterionRepository {
  constructor(private readonly pool: Pool) {}

  async findByKpiId(kpiId: string): Promise<(KpiCriterionMapping & { criterionCode: string, criterionName: string })[]> {
    const query = `
      SELECT kc.kpi_criterion_id, kc.kpi_id, kc.criterion_id, kc.weight, kc.display_order, kc.created_at, kc.updated_at,
             c.code as criterion_code, c.name as criterion_name
      FROM kpi_criterion kc
      JOIN criteria c ON kc.criterion_id = c.id
      WHERE kc.kpi_id = $1
      ORDER BY kc.display_order ASC, kc.created_at ASC
    `;
    const result = await this.pool.query(query, [kpiId]);
    return result.rows.map(row => ({
      kpiCriterionId: row.kpi_criterion_id,
      kpiId: row.kpi_id,
      criterionId: row.criterion_id,
      weight: parseFloat(row.weight),
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      criterionCode: row.criterion_code,
      criterionName: row.criterion_name,
    }));
  }

  async create(kpiId: string, dto: CreateKpiCriterionMappingDTO): Promise<KpiCriterionMapping> {
    const query = `
      INSERT INTO kpi_criterion (kpi_id, criterion_id, weight)
      VALUES ($1, $2, $3)
      RETURNING kpi_criterion_id, kpi_id, criterion_id, weight, display_order, created_at, updated_at
    `;
    const result = await this.pool.query(query, [kpiId, dto.criterionId, dto.weight]);
    const row = result.rows[0];
    return {
      kpiCriterionId: row.kpi_criterion_id,
      kpiId: row.kpi_id,
      criterionId: row.criterion_id,
      weight: parseFloat(row.weight),
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async update(kpiCriterionId: string, dto: UpdateKpiCriterionMappingDTO): Promise<KpiCriterionMapping> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.weight !== undefined) {
      fields.push(`weight = $${paramIndex++}`);
      values.push(dto.weight);
    }
    if (dto.displayOrder !== undefined) {
      fields.push(`display_order = $${paramIndex++}`);
      values.push(dto.displayOrder);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(kpiCriterionId);
    const query = `
      UPDATE kpi_criterion
      SET ${fields.join(', ')}
      WHERE kpi_criterion_id = $${paramIndex}
      RETURNING kpi_criterion_id, kpi_id, criterion_id, weight, display_order, created_at, updated_at
    `;
    
    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('Mapping not found');
    }
    const row = result.rows[0];
    return {
      kpiCriterionId: row.kpi_criterion_id,
      kpiId: row.kpi_id,
      criterionId: row.criterion_id,
      weight: parseFloat(row.weight),
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async delete(kpiCriterionId: string): Promise<void> {
    const query = `DELETE FROM kpi_criterion WHERE kpi_criterion_id = $1`;
    await this.pool.query(query, [kpiCriterionId]);
  }
}
