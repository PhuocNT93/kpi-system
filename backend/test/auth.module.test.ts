import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { InMemoryUserRepository } from './mocks/in-memory-test-repositories.js';
import { JwtConfig } from '../src/shared/auth/types.js';

const JWT_SECRET = 'test-jwt-secret-key-999';
const jwtConfig: JwtConfig = {
  secret: JWT_SECRET,
  issuer: 'kpi-system-test',
  audience: 'kpi-system-api',
  algorithms: ['HS256'],
};

describe('Auth Module Integration & Business Logic Tests', () => {
  let userRepository: InMemoryUserRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    app = createApp({ userRepository, jwtConfig });
  });

  describe('1. SIGNUP TESTS (POST /api/auth/signup)', () => {
    it('should successfully signup a user and return safe response (no password or passwordHash)', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        email: 'alice@example.com',
        password: 'password123',
        name: 'Alice',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.email).toBe('alice@example.com');
      expect(res.body.data.name).toBe('Alice');
      expect(res.body.data.password).toBeUndefined();
      expect(res.body.data.passwordHash).toBeUndefined();

      // Verify in repository
      const stored = await userRepository.findByEmail('alice@example.com');
      expect(stored).not.toBeNull();
      expect(stored!.passwordHash).not.toBe('password123');
    });

    it('should reject signup with duplicate email', async () => {
      await request(app).post('/api/auth/signup').send({
        email: 'alice@example.com',
        password: 'password123',
        name: 'Alice',
      });

      const res = await request(app).post('/api/auth/signup').send({
        email: 'ALICE@example.com', // casing check
        password: 'anotherpassword',
        name: 'Alice Duplicate',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.meta.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('should reject signup with missing or invalid fields', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        email: 'invalid-email',
        password: '123', // too short
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.meta.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. LOGIN TESTS (POST /api/auth/login)', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/signup').send({
        email: 'bob@example.com',
        password: 'secretpassword',
        name: 'Bob',
      });
    });

    it('should successfully login and return access token and safe user info', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'bob@example.com',
        password: 'secretpassword',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokenType).toBe('Bearer');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('bob@example.com');
      expect(res.body.data.user.name).toBe('Bob');
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Verify JWT payload
      const payload = jwt.verify(res.body.data.accessToken, JWT_SECRET) as jwt.JwtPayload;
      expect(payload.sub).toBe(res.body.data.user.id);
    });

    it('should fail login with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'bob@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.meta.error.code).toBe('UNAUTHENTICATED');
    });

    it('should fail login with unknown email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'unknown@example.com',
        password: 'secretpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.meta.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('3. JWT AUTH & ACTOR SECURITY TESTS', () => {
    it('should reject protected route without Authorization header', async () => {
      const res = await request(app).post('/api/auth/change-password').send({
        currentPassword: 'old',
        newPassword: 'new',
      });

      expect(res.status).toBe(401);
      expect(res.body.meta.error.code).toBe('UNAUTHENTICATED');
    });

    it('should reject expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { sub: 'user-123', role: 'EMPLOYEE', exp: Math.floor(Date.now() / 1000) - 100 },
        JWT_SECRET,
        { issuer: 'kpi-system-test', audience: 'kpi-system-api' }
      );

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ currentPassword: 'old', newPassword: 'new' });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/expired/i);
    });

    it('should reject JWT token signed with invalid secret', async () => {
      const invalidToken = jwt.sign(
        { sub: 'user-123', role: 'EMPLOYEE' },
        'wrong-secret',
        { issuer: 'kpi-system-test', audience: 'kpi-system-api' }
      );

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({ currentPassword: 'old', newPassword: 'new' });

      expect(res.status).toBe(401);
    });

    it('should ignore request-supplied actor/userId in request body and strictly use JWT sub', async () => {
      // 1. Create User A and User B
      await request(app).post('/api/auth/signup').send({
        email: 'usera@example.com',
        password: 'userApassword',
        name: 'User A',
      });
      const userBRes = await request(app).post('/api/auth/signup').send({
        email: 'userb@example.com',
        password: 'userBpassword',
        name: 'User B',
      });

      // 2. Login as User A to get Token A
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'usera@example.com',
        password: 'userApassword',
      });
      const tokenA = loginRes.body.data.accessToken;

      // 3. User A sends change-password request with malicious "userId" / "actorId" for User B in body
      const changeRes = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          actorId: userBRes.body.data.id,
          userId: userBRes.body.data.id,
          currentPassword: 'userApassword',
          newPassword: 'newuserApassword',
        });

      expect(changeRes.status).toBe(200);

      // 4. Verify User A's password was changed, while User B remains unchanged
      const loginAOld = await request(app).post('/api/auth/login').send({
        email: 'usera@example.com',
        password: 'userApassword',
      });
      expect(loginAOld.status).toBe(401);

      const loginANew = await request(app).post('/api/auth/login').send({
        email: 'usera@example.com',
        password: 'newuserApassword',
      });
      expect(loginANew.status).toBe(200);

      // User B login should still work with original password
      const loginB = await request(app).post('/api/auth/login').send({
        email: 'userb@example.com',
        password: 'userBpassword',
      });
      expect(loginB.status).toBe(200);
    });
  });

  describe('4. FULL AUTH FLOW TEST (Signup -> Login -> Change Password -> Login validation)', () => {
    it('should complete the entire authentication lifecycle', async () => {
      // Step 1: Signup
      const signupRes = await request(app).post('/api/auth/signup').send({
        email: 'charlie@example.com',
        password: 'initialPassword123',
        name: 'Charlie',
      });
      expect(signupRes.status).toBe(201);

      // Step 2: Login with initial password
      const login1Res = await request(app).post('/api/auth/login').send({
        email: 'charlie@example.com',
        password: 'initialPassword123',
      });
      expect(login1Res.status).toBe(200);
      const token = login1Res.body.data.accessToken;

      // Step 3: Change password using token
      const changeRes = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'initialPassword123',
          newPassword: 'updatedPassword456',
        });
      expect(changeRes.status).toBe(200);
      expect(changeRes.body.data.email).toBe('charlie@example.com');

      // Step 4: Login with old password -> should fail
      const loginOldRes = await request(app).post('/api/auth/login').send({
        email: 'charlie@example.com',
        password: 'initialPassword123',
      });
      expect(loginOldRes.status).toBe(401);

      // Step 5: Login with new password -> should succeed
      const loginNewRes = await request(app).post('/api/auth/login').send({
        email: 'charlie@example.com',
        password: 'updatedPassword456',
      });
      expect(loginNewRes.status).toBe(200);
      expect(loginNewRes.body.data.accessToken).toBeDefined();
    });
  });

  describe('5. REFRESH TOKEN TESTS (POST /api/auth/refresh)', () => {
    it('should successfully refresh access token using valid refresh token', async () => {
      await request(app).post('/api/auth/signup').send({
        email: 'dave@example.com',
        password: 'password123',
        name: 'Dave',
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'dave@example.com',
        password: 'password123',
      });

      const { accessToken, refreshToken } = loginRes.body.data;
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      const refreshRes = await request(app).post('/api/auth/refresh').send({
        refreshToken,
      });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();
      expect(refreshRes.body.data.refreshToken).toBeDefined();
      expect(refreshRes.body.data.tokenType).toBe('Bearer');

      // Verify new access token can be used on protected routes
      const protectedRes = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${refreshRes.body.data.accessToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newPassword123',
        });

      expect(protectedRes.status).toBe(200);
    });

    it('should reject refresh when refresh token is missing', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.meta.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject refresh when access token is passed instead of refresh token', async () => {
      await request(app).post('/api/auth/signup').send({
        email: 'eve@example.com',
        password: 'password123',
        name: 'Eve',
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'eve@example.com',
        password: 'password123',
      });

      const { accessToken } = loginRes.body.data;

      const refreshRes = await request(app).post('/api/auth/refresh').send({
        refreshToken: accessToken,
      });

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.body.success).toBe(false);
      expect(refreshRes.body.meta.error.code).toBe('UNAUTHENTICATED');
    });

    it('should reject invalid or malformed refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: 'invalid.refresh.token',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.meta.error.code).toBe('UNAUTHENTICATED');
    });
  });
});
