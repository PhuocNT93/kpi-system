import { describe, expect, it } from 'vitest';
import { DatabaseConfigurationError, getDatabaseConfig } from './database.js';

const validDatabaseUrl = 'postgresql://app_user:app_password@localhost:5432/kpi_system';

describe('getDatabaseConfig', () => {
  it('uses a valid PostgreSQL URL and default pool settings', () => {
    expect(getDatabaseConfig({ DATABASE_URL: validDatabaseUrl })).toEqual({
      connectionString: validDatabaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000
    });
  });

  it('uses configured pool settings', () => {
    expect(
      getDatabaseConfig({
        DATABASE_URL: validDatabaseUrl,
        DATABASE_POOL_MAX: '20',
        DATABASE_POOL_IDLE_TIMEOUT_MS: '15000'
      })
    ).toMatchObject({ max: 20, idleTimeoutMillis: 15_000 });
  });

  it.each([
    [{}, 'DATABASE_URL must be configured.'],
    [{ DATABASE_URL: 'not a URL' }, 'DATABASE_URL must be a valid PostgreSQL connection URL.'],
    [{ DATABASE_URL: 'mysql://localhost/kpi_system' }, 'DATABASE_URL must use the postgres or postgresql protocol.'],
    [{ DATABASE_URL: validDatabaseUrl, DATABASE_POOL_MAX: '0' }, 'DATABASE_POOL_MAX must be a positive integer.']
  ])('rejects invalid configuration %#', (environment, message) => {
    expect(() => getDatabaseConfig(environment)).toThrow(new DatabaseConfigurationError(message));
  });
});