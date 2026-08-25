import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { sendFailure } from '../../api/http-response.js';
import { Actor, JwtActorPayload, JwtConfig } from './types.js';
import { runWithActorContext, setActorContext } from './actor-context.js';

const { JsonWebTokenError, TokenExpiredError } = jwt;

export function createJwtAuthMiddleware(config: JwtConfig): RequestHandler {
  const allowedAlgorithms = config.algorithms || ['HS256'];

  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      sendFailure(res, 401, 'Missing authorization token', 'UNAUTHENTICATED');
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1] || !parts[1].trim()) {
      sendFailure(res, 401, 'Invalid authorization format', 'UNAUTHENTICATED');
      return;
    }

    const token = parts[1].trim();

    try {
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader || typeof decodedHeader === 'string' || !decodedHeader.header) {
        sendFailure(res, 401, 'Malformed token', 'UNAUTHENTICATED');
        return;
      }

      const alg = decodedHeader.header.alg as 'HS256' | 'HS384' | 'HS512';
      if (!allowedAlgorithms.includes(alg)) {
        sendFailure(res, 401, 'Invalid signing algorithm', 'UNAUTHENTICATED');
        return;
      }

      const verifyOptions: jwt.VerifyOptions = {
        algorithms: allowedAlgorithms,
      };

      if (config.issuer) {
        verifyOptions.issuer = config.issuer;
      }
      if (config.audience) {
        verifyOptions.audience = config.audience;
      }

      const payload = jwt.verify(token, config.secret, verifyOptions) as JwtPayload & JwtActorPayload;

      if (!payload.sub || typeof payload.sub !== 'string') {
        sendFailure(res, 401, 'Invalid token claims: sub is missing', 'UNAUTHENTICATED');
        return;
      }

      const actor: Actor = {
        userId: payload.sub,
        role: payload.role || 'EMPLOYEE',
        employeeId: payload.employeeId,
        managedTeamIds: payload.managedTeamIds || [],
        permissions: payload.permissions || [],
      };

      setActorContext(req, actor);

      runWithActorContext(actor, () => {
        try {
          next();
        } catch (err) {
          next(err);
        }
      });
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        sendFailure(res, 401, 'Token expired', 'UNAUTHENTICATED');
        return;
      }
      if (error instanceof JsonWebTokenError) {
        sendFailure(res, 401, 'Invalid token', 'UNAUTHENTICATED');
        return;
      }
      sendFailure(res, 401, 'Authentication failed', 'UNAUTHENTICATED');
      return;
    }
  };
}
