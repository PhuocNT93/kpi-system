import { OAuth2Client } from 'google-auth-library';
import { GoogleAuthConfig } from '../../../config/google-auth.config.js';
import { Unauthenticated } from '../../../api/app-error.js';

export interface GoogleIdentity {
  subject: string;
  email: string;
  name: string;
}

export interface GoogleIdentityVerifier {
  verify(idToken: string): Promise<GoogleIdentity>;
}

export class GoogleIdTokenVerifier implements GoogleIdentityVerifier {
  private readonly client: OAuth2Client;

  constructor(private readonly config: GoogleAuthConfig) {
    this.client = new OAuth2Client(config.clientId);
  }

  async verify(idToken: string): Promise<GoogleIdentity> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.config.clientId,
      });
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email || payload.email_verified !== true || payload.hd !== this.config.allowedDomain) {
        throw new Unauthenticated('Google account is not eligible to sign in.');
      }

      const email = payload.email.toLowerCase();
      if (!email.endsWith(`@${this.config.allowedDomain}`)) {
        throw new Unauthenticated('Google account is not eligible to sign in.');
      }

      return {
        subject: payload.sub,
        email,
        name: payload.name?.trim() || email,
      };
    } catch (error) {
      if (error instanceof Unauthenticated) {
        throw error;
      }
      throw new Unauthenticated('Google sign-in could not be verified.');
    }
  }
}