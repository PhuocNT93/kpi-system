import { Pool, PoolClient } from 'pg';
import { BadRequest } from '../../../api/app-error.js';
import { withTransaction } from '../../../shared/database/transaction.js';
import { KpiRelationshipCreateDTO, KpiRelationship } from '../domain/kpi-relationship.model.js';
import { KpiRelationshipRepository } from '../infrastructure/postgres-kpi-relationship.repository.js';
import { TransactionClient, TransactionConnection } from '../../../shared/database/transaction.js';

export class KpiRelationshipService {
  constructor(
    private pool: Pool,
    private relationshipRepo: KpiRelationshipRepository
  ) {}

  async createRelationship(data: KpiRelationshipCreateDTO): Promise<KpiRelationship> {
    if (data.sourceKpiId === data.targetKpiId) {
      throw new BadRequest('KPI cannot have a relationship with itself');
    }

    return withTransaction(this.pool as unknown as TransactionConnection, async (client: TransactionClient) => {
      // 1. Lock the table or just rely on serialized/repeatable read?
      // For MVP, we fetch all active relations in this transaction.
      // Postgres pool client implements TransactionClient.
      const pgClient = client as unknown as PoolClient;
      
      const allActive = await this.relationshipRepo.findAllActive(pgClient);
      
      // 2. Build adjacency list for DFS
      // Graph is directed: source -> target
      const graph = new Map<string, string[]>();
      for (const rel of allActive) {
        if (!graph.has(rel.sourceKpiId)) {
          graph.set(rel.sourceKpiId, []);
        }
        graph.get(rel.sourceKpiId)!.push(rel.targetKpiId);
      }

      // 3. Detect cycle
      // Adding A -> B creates a cycle if there is already a path from B to A.
      const hasPath = this.dfsPathExists(data.targetKpiId, data.sourceKpiId, graph);
      if (hasPath) {
        throw new BadRequest('Circular dependency detected. Adding this relationship creates a cycle.');
      }

      // 4. Create
      return this.relationshipRepo.create(data, pgClient);
    });
  }

  async getAllRelationships(): Promise<KpiRelationship[]> {
    return this.relationshipRepo.findAllActive();
  }

  async deleteRelationship(relationshipId: string): Promise<void> {
    return this.relationshipRepo.delete(relationshipId);
  }

  /**
   * Checks if there's a directed path from `startId` to `endId` in the given graph.
   */
  private dfsPathExists(startId: string, endId: string, graph: Map<string, string[]>): boolean {
    const visited = new Set<string>();
    const stack: string[] = [startId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === endId) return true;
      
      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = graph.get(current) || [];
        for (const neighbor of neighbors) {
          stack.push(neighbor);
        }
      }
    }

    return false;
  }
}
