import { describe, it, expect, vi } from 'vitest';
import { PostgresEmployeeRepository } from '../src/modules/employee/infrastructure/postgres-employee.repository.js';

describe('PostgresEmployeeRepository.findMany', () => {
  it('filters by department using current employee assignment as well as employee.department_id', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('COUNT(*) as total')) {
        return { rows: [{ total: '1' }] };
      }
      return {
        rows: [
          {
            employee_id: 'emp-1',
            employee_code: 'EMP-1',
            full_name: 'Test User',
            email: 'test@example.com',
            department_id: 'dept-assigned',
            team_id: null,
            role_id: 'role-1',
            job_level_id: 'lvl-1',
            manager_id: null,
            employment_status: 'ACTIVE',
            join_date: '2026-01-01',
            termination_date: null,
            version: 1,
            review_cadence: null,
            last_evaluation_completed_at: null,
            next_review_due_date: null,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
            created_by: null,
            updated_by: null,
          },
        ],
      };
    });

    const repo = new PostgresEmployeeRepository({ query } as never);

    const result = await repo.findMany({ departmentId: 'dept-assigned', limit: 10, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.employees).toHaveLength(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('EXISTS ('),
      ['dept-assigned', 10, 0]
    );
  });
});