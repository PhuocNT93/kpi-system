import { describe, expect, it } from 'vitest';
import { MigrationTestConfigurationError, getMigrationTestDatabaseUrl } from './migration-test-config.js';

describe('getMigrationTestDatabaseUrl', () => {
  it('returns an isolated test database URL', () => {
    expect(
      getMigrationTestDatabaseUrl({
        DATABASE_URL: 'postgresql://app_user:app_password@localhost:5432/kpi_system',
        TEST_DATABASE_URL: 'postgresql://test_user:test_password@localhost:5432/kpi_system_test'
      })
    ).toBe('postgresql://test_user:test_password@localhost:5432/kpi_system_test');
  });

  it.each([
    [{}, 'TEST_DATABASE_URL must be configured for migration tests.'],
    [
      {
        DATABASE_URL: 'postgresql://app_user:app_password@localhost:5432/kpi_system',
        TEST_DATABASE_URL: 'postgresql://app_user:app_password@localhost:5432/kpi_system'
      },
      'TEST_DATABASE_URL must not match DATABASE_URL.'
    ]
  ])('rejects unsafe configuration %#', (environment, message) => {
    expect(() => getMigrationTestDatabaseUrl(environment)).toThrow(new MigrationTestConfigurationError(message));
  });
});