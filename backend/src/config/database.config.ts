import { Pool } from 'pg';
import { createDatabasePool } from '../shared/database/database.js';

export function resolveDatabasePool(dbPool?: Pool): Pool | undefined {
  if (dbPool) {
    return dbPool;
  }
  if (process.env.DATABASE_URL) {
    return createDatabasePool();
  }
  return undefined;
}
