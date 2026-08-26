export interface GoogleAuthConfig {
  clientId: string;
  allowedDomain: string;
}

export function getGoogleAuthConfig(): GoogleAuthConfig | undefined {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN?.trim().toLowerCase();

  if (!clientId && !allowedDomain) {
    return undefined;
  }

  if (!clientId || !allowedDomain) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_ALLOWED_DOMAIN must both be configured.');
  }

  return { clientId, allowedDomain };
}