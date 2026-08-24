import { Pool, type PoolConfig } from 'pg';

const DEFAULT_MAX_CONNECTIONS = 10;
const DEFAULT_IDLE_TIMEOUT_MS = 30_000;

export interface DatabaseConfig {
  connectionString: string;
  max: number;
  idleTimeoutMillis: number;
}

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConfigurationError';
  }
}

export function getDatabaseConfig(environment: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const connectionString = environment.DATABASE_URL;

  if (!connectionString) {
    throw new DatabaseConfigurationError('DATABASE_URL must be configured.');
  }

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(connectionString);
  } catch {
    throw new DatabaseConfigurationError('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }

  if (databaseUrl.protocol !== 'postgres:' && databaseUrl.protocol !== 'postgresql:') {
    throw new DatabaseConfigurationError('DATABASE_URL must use the postgres or postgresql protocol.');
  }

  return {
    connectionString,
    max: getPositiveInteger(environment.DATABASE_POOL_MAX, DEFAULT_MAX_CONNECTIONS, 'DATABASE_POOL_MAX'),
    idleTimeoutMillis: getPositiveInteger(
      environment.DATABASE_POOL_IDLE_TIMEOUT_MS,
      DEFAULT_IDLE_TIMEOUT_MS,
      'DATABASE_POOL_IDLE_TIMEOUT_MS'
    )
  };
}

export function createDatabasePool(config: DatabaseConfig = getDatabaseConfig()): Pool {
  const poolConfig: PoolConfig = {
    connectionString: config.connectionString,
    max: config.max,
    idleTimeoutMillis: config.idleTimeoutMillis
  };

  return new Pool(poolConfig);
}

function getPositiveInteger(value: string | undefined, defaultValue: number, variableName: string): number {
  if (value === undefined) {
    return defaultValue;
  }

  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
    throw new DatabaseConfigurationError(`${variableName} must be a positive integer.`);
  }

  return parsedValue;
}