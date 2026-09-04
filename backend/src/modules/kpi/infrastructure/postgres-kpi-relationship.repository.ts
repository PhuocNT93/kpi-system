import { Pool, PoolClient } from 'pg';
import { Conflict, NotFound } from '../../../api/app-error.js';
import { KpiRelationship, KpiRelationshipCreateDTO, KpiRelationshipType } from '../domain/kpi-relationship.model.js';

interface KpiRelationshipRow {
  relationship_id: string;
  source_kpi_id: string;
  target_kpi_id: string;
  relationship_type: KpiRelationshipType;
  effective_from: Date;
  effective_to: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface KpiRelationshipRepository {
  create(data: KpiRelationshipCreateDTO, client?: PoolClient): Promise<KpiRelationship>;
  findAllActive(client?: PoolClient): Promise<KpiRelationship[]>;
  findBySource(sourceKpiId: string, client?: PoolClient): Promise<KpiRelationship[]>;
  delete(relationshipId: string, client?: PoolClient): Promise<void>;
}

export class PostgresKpiRelationshipRepository implements KpiRelationshipRepository {
  constructor(private pool: Pool) {}

  private getClient(client?: PoolClient) {
    return client || this.pool;
  }

  private mapToModel(row: KpiRelationshipRow): KpiRelationship {
    return {
      relationshipId: row.relationship_id,
      sourceKpiId: row.source_kpi_id,
      targetKpiId: row.target_kpi_id,
      relationshipType: row.relationship_type,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(data: KpiRelationshipCreateDTO, client?: PoolClient): Promise<KpiRelationship> {
    const query = `
      INSERT INTO kpi_relationship (source_kpi_id, target_kpi_id, relationship_type, effective_from, effective_to)
      VALUES ($1, $2, $3, COALESCE($4, CURRENT_TIMESTAMP), $5)
      RETURNING *
    `;
    const values = [
      data.sourceKpiId,
      data.targetKpiId,
      data.relationshipType,
      data.effectiveFrom || null,
      data.effectiveTo || null,
    ];

    try {
      const result = await this.getClient(client).query(query, values);
      return this.mapToModel(result.rows[0]);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        throw new Conflict('KPI Relationship already exists');
      }
      if (code === '23503') {
        throw new NotFound('Referenced KPI does not exist');
      }
      throw error;
    }
  }

  async findAllActive(client?: PoolClient): Promise<KpiRelationship[]> {
    const query = `
      SELECT * FROM kpi_relationship
      WHERE effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP
    `;
    const result = await this.getClient(client).query(query);
    return result.rows.map(this.mapToModel);
  }

  async findBySource(sourceKpiId: string, client?: PoolClient): Promise<KpiRelationship[]> {
    const query = `
      SELECT * FROM kpi_relationship
      WHERE source_kpi_id = $1
    `;
    const result = await this.getClient(client).query(query, [sourceKpiId]);
    return result.rows.map(this.mapToModel);
  }

  async delete(relationshipId: string, client?: PoolClient): Promise<void> {
    const query = `DELETE FROM kpi_relationship WHERE relationship_id = $1`;
    const result = await this.getClient(client).query(query, [relationshipId]);
    if (result.rowCount === 0) {
      throw new NotFound('KPI Relationship');
    }
  }
}
