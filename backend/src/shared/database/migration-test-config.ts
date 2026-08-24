export class MigrationTestConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationTestConfigurationError';
  }
}

export function getMigrationTestDatabaseUrl(environment: NodeJS.ProcessEnv = process.env): string {
  const testDatabaseUrl = environment.TEST_DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new MigrationTestConfigurationError('TEST_DATABASE_URL must be configured for migration tests.');
  }

  if (testDatabaseUrl === environment.DATABASE_URL) {
    throw new MigrationTestConfigurationError('TEST_DATABASE_URL must not match DATABASE_URL.');
  }

  return testDatabaseUrl;
}