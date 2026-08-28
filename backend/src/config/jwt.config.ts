import { JwtConfig } from '../shared/auth/index.js';

export function getJwtConfig(customConfig?: JwtConfig): JwtConfig {
  if (customConfig) {
    return customConfig;
  }

  return {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'kpi-system',
    audience: process.env.JWT_AUDIENCE || 'kpi-system-api',
    algorithms: ['HS256'],
  };
}
