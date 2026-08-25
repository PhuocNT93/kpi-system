import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { Actor, JwtActorPayload, JwtRefreshTokenPayload, JwtConfig } from '../../../shared/auth/types.js';
import { Unauthenticated } from '../../../api/app-error.js';

const { JsonWebTokenError, TokenExpiredError } = jwt;

export interface TokenService {
  generateAccessToken(actor: Actor): string;
  verifyAccessToken(token: string): JwtActorPayload;
  generateRefreshToken(actor: Actor): string;
  verifyRefreshToken(token: string): JwtRefreshTokenPayload;
  generateTokens(actor: Actor): { accessToken: string; refreshToken: string };
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
      expiresIn: (this.config.expiresIn as jwt.SignOptions['expiresIn']) || '1h',
    };

    if (this.config.issuer) {
      options.issuer = this.config.issuer;
    }
    if (this.config.audience) {
      options.audience = this.config.audience;
    }

    return jwt.sign(payload, this.config.secret, options);
  }

  generateRefreshToken(actor: Actor): string {
    const payload: JwtRefreshTokenPayload = {
      sub: actor.userId,
      role: actor.role,
      type: 'refresh',
    };

    const options: jwt.SignOptions = {
      algorithm: (this.config.algorithms && this.config.algorithms[0]) || 'HS256',
      expiresIn: (this.config.refreshTokenExpiresIn as jwt.SignOptions['expiresIn']) || '7d',
    };

    if (this.config.issuer) {
      options.issuer = this.config.issuer;
    }
    if (this.config.audience) {
      options.audience = this.config.audience;
    }

    const secret = this.config.refreshTokenSecret || this.config.secret;
    return jwt.sign(payload, secret, options);
  }

  generateTokens(actor: Actor): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateAccessToken(actor),
      refreshToken: this.generateRefreshToken(actor),
    };
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

  verifyRefreshToken(token: string): JwtRefreshTokenPayload {
    try {
      const allowedAlgorithms = this.config.algorithms || ['HS256'];
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader || typeof decodedHeader === 'string' || !decodedHeader.header) {
        throw new Unauthenticated('Malformed refresh token');
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

      const secret = this.config.refreshTokenSecret || this.config.secret;
      const payload = jwt.verify(token, secret, verifyOptions) as JwtPayload & JwtRefreshTokenPayload;

      if (!payload.sub || typeof payload.sub !== 'string') {
        throw new Unauthenticated('Invalid refresh token claims: sub is missing');
      }

      if (payload.type !== 'refresh') {
        throw new Unauthenticated('Invalid token type for refresh token');
      }

      return payload;
    } catch (error) {
      if (error instanceof Unauthenticated) {
        throw error;
      }
      if (error instanceof TokenExpiredError) {
        throw new Unauthenticated('Refresh token expired');
      }
      if (error instanceof JsonWebTokenError) {
        throw new Unauthenticated('Invalid refresh token');
      }
      throw new Unauthenticated('Refresh token authentication failed');
    }
  }
}
