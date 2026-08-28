import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { createDatabasePool } from '../src/shared/database/database.js';
import { KpiRelationshipService } from '../src/modules/kpi/services/kpi-relationship.service.js';
import { PostgresKpiRelationshipRepository } from '../src/modules/kpi/infrastructure/postgres-kpi-relationship.repository.js';
import { KpiRelationshipCreateDTO } from '../src/modules/kpi/domain/kpi-relationship.model.js';

const isDbAvailable = Boolean(process.env.DATABASE_URL);

describe.runIf(isDbAvailable)('KPI Relationship & DAG Validation', () => {
  let pool: Pool;
  let service: KpiRelationshipService;
  let repo: PostgresKpiRelationshipRepository;
  
  let kpiA: string;
  let kpiB: string;
  let kpiC: string;
  let kpiD: string;

  beforeAll(async () => {
    pool = createDatabasePool();
    repo = new PostgresKpiRelationshipRepository(pool);
    service = new KpiRelationshipService(pool, repo);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clear relationships
    await pool.query('DELETE FROM kpi_relationship');
    await pool.query('DELETE FROM kpi');

    // Insert 4 dummy KPIs
    const result = await pool.query(`
      INSERT INTO kpi (code, name) VALUES 
      ('KPI_A', 'KPI A'),
      ('KPI_B', 'KPI B'),
      ('KPI_C', 'KPI C'),
      ('KPI_D', 'KPI D')
      RETURNING kpi_id;
    `);
    
    kpiA = result.rows[0].kpi_id;
    kpiB = result.rows[1].kpi_id;
    kpiC = result.rows[2].kpi_id;
    kpiD = result.rows[3].kpi_id;
  });

  it('should allow creating a simple relationship A -> B', async () => {
    const data: KpiRelationshipCreateDTO = {
      sourceKpiId: kpiA,
      targetKpiId: kpiB,
      relationshipType: 'DEPENDS_ON'
    };
    const rel = await service.createRelationship(data);
    expect(rel).toBeDefined();
    expect(rel.sourceKpiId).toBe(kpiA);
    expect(rel.targetKpiId).toBe(kpiB);
  });

  it('should allow creating a chain A -> B -> C', async () => {
    await service.createRelationship({ sourceKpiId: kpiA, targetKpiId: kpiB, relationshipType: 'DEPENDS_ON' });
    const rel = await service.createRelationship({ sourceKpiId: kpiB, targetKpiId: kpiC, relationshipType: 'DEPENDS_ON' });
    expect(rel).toBeDefined();
  });

  it('should reject a direct cycle A -> B, B -> A', async () => {
    await service.createRelationship({ sourceKpiId: kpiA, targetKpiId: kpiB, relationshipType: 'DEPENDS_ON' });
    
    await expect(
      service.createRelationship({ sourceKpiId: kpiB, targetKpiId: kpiA, relationshipType: 'DEPENDS_ON' })
    ).rejects.toThrow(/Circular dependency detected/);
  });

  it('should reject a transitive cycle A -> B, B -> C, C -> A', async () => {
    await service.createRelationship({ sourceKpiId: kpiA, targetKpiId: kpiB, relationshipType: 'DEPENDS_ON' });
    await service.createRelationship({ sourceKpiId: kpiB, targetKpiId: kpiC, relationshipType: 'DEPENDS_ON' });
    
    await expect(
      service.createRelationship({ sourceKpiId: kpiC, targetKpiId: kpiA, relationshipType: 'DEPENDS_ON' })
    ).rejects.toThrow(/Circular dependency detected/);
  });

  it('should allow multiple branches A -> B, A -> C', async () => {
    await service.createRelationship({ sourceKpiId: kpiA, targetKpiId: kpiB, relationshipType: 'DEPENDS_ON' });
    const rel = await service.createRelationship({ sourceKpiId: kpiA, targetKpiId: kpiC, relationshipType: 'DEPENDS_ON' });
    expect(rel).toBeDefined();
  });

  it('should allow diamond shape A -> B -> D, A -> C -> D', async () => {
    await service.createRelationship({ sourceKpiId: kpiA, targetKpiId: kpiB, relationshipType: 'DEPENDS_ON' });
    await service.createRelationship({ sourceKpiId: kpiB, targetKpiId: kpiD, relationshipType: 'DEPENDS_ON' });
    await service.createRelationship({ sourceKpiId: kpiA, targetKpiId: kpiC, relationshipType: 'DEPENDS_ON' });
    
    // C -> D does not create a cycle!
    const rel = await service.createRelationship({ sourceKpiId: kpiC, targetKpiId: kpiD, relationshipType: 'DEPENDS_ON' });
    expect(rel).toBeDefined();
  });

  it('should reject a KPI having a relationship with itself', async () => {
    await expect(
      service.createRelationship({ sourceKpiId: kpiA, targetKpiId: kpiA, relationshipType: 'DEPENDS_ON' })
    ).rejects.toThrow(/KPI cannot have a relationship with itself/);
  });
});
