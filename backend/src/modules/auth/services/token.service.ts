import jwt, { JwtPayload, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Actor, JwtActorPayload, JwtConfig } from '../../../shared/auth/types.js';
import { Unauthenticated } from '../../../api/app-error.js';

export interface TokenService {
  generateAccessToken(actor: Actor): string;
  verifyAccessToken(token: string): JwtActorPayload;
}

export class JWTTokenService implements TokenService {
  constructor(private config: JwtConfig) {}

  generateAccessToken(actor: Actor): string {
    const payload: JwtActorPayload = {
      sub: actor.userId,
      role: actor.role,
      employeeId: actor.employeeId,
      managedTeamIds: actor.managedTeamIds,
      permissions: actor.permissions,
    };

    const options: jwt.SignOptions = {
      algorithm: (this.config.algorithms && this.config.algorithms[0]) || 'HS256',
      expiresIn: '1h',
    };

    if (this.config.issuer) {
      options.issuer = this.config.issuer;
    }
    if (this.config.audience) {
      options.audience = this.config.audience;
    }

    return jwt.sign(payload, this.config.secret, options);
  }

  verifyAccessToken(token: string): JwtActorPayload {
    try {
      const allowedAlgorithms = this.config.algorithms || ['HS256'];
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader || typeof decodedHeader === 'string' || !decodedHeader.header) {
        throw new Unauthenticated('Malformed token');
      }

      const alg = decodedHeader.header.alg as 'HS256' | 'HS384' | 'HS512';
      if (!allowedAlgorithms.includes(alg)) {
        throw new Unauthenticated('Invalid signing algorithm');
      }

      const verifyOptions: jwt.VerifyOptions = {
        algorithms: allowedAlgorithms,
      };

      if (this.config.issuer) {
        verifyOptions.issuer = this.config.issuer;
      }
      if (this.config.audience) {
        verifyOptions.audience = this.config.audience;
      }

      const payload = jwt.verify(token, this.config.secret, verifyOptions) as JwtPayload & JwtActorPayload;

      if (!payload.sub || typeof payload.sub !== 'string') {
        throw new Unauthenticated('Invalid token claims: sub is missing');
      }

      return payload;
    } catch (error) {
      if (error instanceof Unauthenticated) {
        throw error;
      }
      if (error instanceof TokenExpiredError) {
        throw new Unauthenticated('Token expired');
      }
      if (error instanceof JsonWebTokenError) {
        throw new Unauthenticated('Invalid token');
      }
      throw new Unauthenticated('Authentication failed');
    }
  }
}
