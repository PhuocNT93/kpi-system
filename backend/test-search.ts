import { Pool } from 'pg';
import { PostgresEmployeeRepository } from './src/modules/employee/infrastructure/postgres-employee.repository.js';

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/kpi_system_dev',
});

const repo = new PostgresEmployeeRepository(pool);
repo.search({ limit: 20, offset: 0 }, { role: 'SYSTEM_ADMIN', employeeId: 'sys-admin-1', permissions: [] } as unknown)
  .then(r => console.log('SUCCESS:', r.total))
  .catch(err => console.error('ERROR:', err))
  .finally(() => pool.end());
