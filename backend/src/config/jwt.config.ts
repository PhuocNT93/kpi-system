import { JwtConfig } from '../shared/auth/index.js';

export function getJwtConfig(customConfig?: JwtConfig): JwtConfig {
  if (customConfig) {
    return customConfig;
  }

  return {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    issuer: process.env.JWT_ISSUER || 'kpi-system',
    audience: process.env.JWT_AUDIENCE || 'kpi-system-api',
    algorithms: ['HS256'],
  };
}
