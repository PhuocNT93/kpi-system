import { describe, it, expect, beforeEach } from 'vitest';
import express, { Request, Response } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import {
  createJwtAuthMiddleware,
  getActorFromContext,
  getActorOrThrow,
  RbacAuthorizer,
  requirePermission,
  JwtConfig,
} from '../../../src/shared/auth/index.js';
import { sendSuccess } from '../../../src/api/http-response.js';

const TEST_SECRET = 'test-secret-key-1234567890';
const jwtConfig: JwtConfig = {
  secret: TEST_SECRET,
  issuer: 'kpi-system-test',
  audience: 'kpi-system-api',
  algorithms: ['HS256'],
};

function createTestApp() {
  const app = express();
  app.use(express.json());

  const authMiddleware = createJwtAuthMiddleware(jwtConfig);
  const authorizer = new RbacAuthorizer();

  app.get('/public', (_req: Request, res: Response) => {
    sendSuccess(res, 200, 'Public endpoint', { ok: true });
  });

  app.get('/protected', authMiddleware, (req: Request, res: Response) => {
    const actor = getActorFromContext(req);
    sendSuccess(res, 200, 'Protected endpoint', { actor });
  });

  app.post('/protected/override-test', authMiddleware, (req: Request, res: Response) => {
    const actorFromCtx = getActorOrThrow(req);
    sendSuccess(res, 200, 'Override check', {
      contextUserId: actorFromCtx.userId,
      receivedBody: req.body,
    });
  });

  app.get(
    '/manager-only',
    authMiddleware,
    requirePermission(authorizer, 'APPROVE', (req: Request) => ({
      type: 'EVALUATION',
      teamId: (req.query.teamId as string) || 'team-alpha',
    })),
    (req: Request, res: Response) => {
      const actor = getActorFromContext(req);
      sendSuccess(res, 200, 'Manager area granted', { actor });
    }
  );

  return app;
}

describe('JWT Auth Middleware, Actor Context & Authorization', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
  });

  it('A. Valid token - Authenticates successfully and attaches actor context', async () => {
    const payload = {
      sub: 'user-123',
      role: 'EMPLOYEE',
      employeeId: 'emp-123',
      iss: 'kpi-system-test',
      aud: 'kpi-system-api',
    };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.actor.userId).toBe('user-123');
    expect(res.body.data.actor.role).toBe('EMPLOYEE');
    expect(res.body.data.actor.employeeId).toBe('emp-123');
  });

  it('B. Invalid token - Malformed JWT or invalid signature returns 401', async () => {
    const resMalformed = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid.jwt.token');

    expect(resMalformed.status).toBe(401);
    expect(resMalformed.body.success).toBe(false);
    expect(resMalformed.body.meta.error.code).toBe('UNAUTHENTICATED');

    const wrongSecretToken = jwt.sign({ sub: 'user-123' }, 'wrong-secret', {
      issuer: 'kpi-system-test',
      audience: 'kpi-system-api',
    });
    const resWrongSecret = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${wrongSecretToken}`);

    expect(resWrongSecret.status).toBe(401);
    expect(resWrongSecret.body.meta.error.code).toBe('UNAUTHENTICATED');
  });

  it('C. Missing token - Returns 401', async () => {
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.meta.error.code).toBe('UNAUTHENTICATED');
  });

  it('D. Actor context extraction - getActorFromContext & getActorOrThrow', async () => {
    const payload = {
      sub: 'user-456',
      role: 'MANAGER',
      employeeId: 'emp-456',
      iss: 'kpi-system-test',
      aud: 'kpi-system-api',
    };
    const token = jwt.sign(payload, TEST_SECRET);

    const res = await request(app)
      .post('/protected/override-test')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'val' });

    expect(res.status).toBe(200);
    expect(res.body.data.contextUserId).toBe('user-456');
    expect(res.body.data.receivedBody).toEqual({ key: 'val' });
  });

  it('E. Authorization middleware - Employee blocked from manager-only resource (403)', async () => {
    const empToken = jwt.sign(
      {
        sub: 'emp-user',
        role: 'EMPLOYEE',
        employeeId: 'emp-999',
        iss: 'kpi-system-test',
        aud: 'kpi-system-api',
      },
      TEST_SECRET
    );

    const res = await request(app)
      .get('/manager-only?teamId=team-alpha')
      .set('Authorization', `Bearer ${empToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.meta.error.code).toBe('FORBIDDEN');
  });

  it('F. Authorization middleware - Manager allowed access to manager-only resource (200)', async () => {
    const managerToken = jwt.sign(
      {
        sub: 'mgr-user',
        role: 'MANAGER',
        employeeId: 'emp-mgr',
        managedTeamIds: ['team-alpha'],
        iss: 'kpi-system-test',
        aud: 'kpi-system-api',
      },
      TEST_SECRET
    );

    const res = await request(app)
      .get('/manager-only?teamId=team-alpha')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.actor.role).toBe('MANAGER');
  });

  it('G. Authorization middleware - Admin allowed access to manager-only resource (200)', async () => {
    const adminToken = jwt.sign(
      {
        sub: 'admin-user',
        role: 'SYSTEM_ADMIN',
        employeeId: 'emp-admin',
        iss: 'kpi-system-test',
        aud: 'kpi-system-api',
      },
      TEST_SECRET
    );

    const res = await request(app)
      .get('/manager-only?teamId=team-alpha')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.actor.role).toBe('SYSTEM_ADMIN');
  });

  it('H. Public endpoint works without auth', async () => {
    const res = await request(app).get('/public');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ok).toBe(true);
  });
});
