import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import request from 'supertest';
import type { Pool } from 'pg';
import { I18nService } from '../src/modules/i18n/application/i18n.service.js';
import { I18nRepository } from '../src/modules/i18n/domain/i18n.repository.js';
import { localeMiddleware } from '../src/shared/i18n/locale.middleware.js';
import { BadRequest } from '../src/api/app-error.js';
import { createApp } from '../src/app.js';
import { JWTTokenService } from '../src/modules/auth/services/token.service.js';

const tokenService = new JWTTokenService({ secret: 'test-secret-key-must-be-long-enough-for-hs256' });

describe('I18n Module', () => {
  let repository: Record<keyof I18nRepository, Mock>;
  let service: I18nService;

  beforeEach(() => {
    repository = {
      findTranslations: vi.fn(),
      findTranslationsForEntities: vi.fn(),
      upsertTranslations: vi.fn(),
      deleteTranslationsForEntity: vi.fn(),
      updateUserLocale: vi.fn(),
    };
    service = new I18nService(repository);
  });

  describe('I18nService', () => {
    it('returns supported locales', () => {
      const locales = service.getAvailableLocales();
      expect(locales).toEqual(['en', 'vi', 'ja']);
    });

    it('enforces English baseline translation rule (Rule 12)', async () => {
      await expect(
        service.upsertEntityTranslations('DEPARTMENT', 'dept-123', {
          vi: { name: 'Phòng Nhân Sự' },
        })
      ).rejects.toThrow(BadRequest);

      expect(repository.upsertTranslations).not.toHaveBeenCalled();
    });

    it('upserts entity translations when baseline English is provided', async () => {
      await service.upsertEntityTranslations('DEPARTMENT', 'dept-123', {
        en: { name: 'Human Resources', description: 'HR Department' },
        vi: { name: 'Phòng Nhân Sự' },
      });

      expect(repository.upsertTranslations).toHaveBeenCalledWith(
        'DEPARTMENT',
        'dept-123',
        [
          { fieldName: 'name', locale: 'en', value: 'Human Resources' },
          { fieldName: 'description', locale: 'en', value: 'HR Department' },
          { fieldName: 'name', locale: 'vi', value: 'Phòng Nhân Sự' },
        ],
        undefined,
        undefined
      );
    });

    it('resolves translations with target locale and English fallback', async () => {
      repository.findTranslationsForEntities.mockResolvedValue([
        {
          translationId: '1',
          entityType: 'CRITERION',
          entityId: 'crit-1',
          fieldName: 'name',
          locale: 'en',
          value: 'On-time Completion',
        },
        {
          translationId: '2',
          entityType: 'CRITERION',
          entityId: 'crit-1',
          fieldName: 'name',
          locale: 'vi',
          value: 'Hoàn thành đúng hạn',
        },
        {
          translationId: '3',
          entityType: 'CRITERION',
          entityId: 'crit-2',
          fieldName: 'name',
          locale: 'en',
          value: 'Code Quality',
        },
      ]);

      const resolvedVi = await service.resolveEntityTranslations(
        'CRITERION',
        ['crit-1', 'crit-2'],
        'vi'
      );

      // crit-1 has 'vi'
      expect(resolvedVi['crit-1'].name).toBe('Hoàn thành đúng hạn');
      // crit-2 lacks 'vi', falls back to 'en'
      expect(resolvedVi['crit-2'].name).toBe('Code Quality');
    });

    it('updates user preferred locale if supported', async () => {
      await service.updateUserPreferredLocale('user-1', 'vi');
      expect(repository.updateUserLocale).toHaveBeenCalledWith('user-1', 'vi');
    });

    it('rejects unsupported user preferred locale', async () => {
      await expect(service.updateUserPreferredLocale('user-1', 'fr')).rejects.toThrow(
        BadRequest
      );
    });
  });

  describe('localeMiddleware', () => {
    it('sets locale from query param ?locale=vi', () => {
      const req: any = { query: { locale: 'vi' }, headers: {} };
      const next = vi.fn();
      localeMiddleware(req, {} as any, next);
      expect(req.locale).toBe('vi');
      expect(next).toHaveBeenCalled();
    });

    it('sets locale from Accept-Language header when no query param', () => {
      const req: any = { query: {}, headers: { 'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8' } };
      const next = vi.fn();
      localeMiddleware(req, {} as any, next);
      expect(req.locale).toBe('vi');
    });

    it('defaults locale to en', () => {
      const req: any = { query: {}, headers: {} };
      const next = vi.fn();
      localeMiddleware(req, {} as any, next);
      expect(req.locale).toBe('en');
    });
  });

  describe('I18n API Endpoints', () => {
    it('GET /api/i18n/locales returns system supported locales', async () => {
      const query = vi.fn().mockResolvedValue({ rows: [] });
      const app = createApp({ dbPool: { query } as unknown as Pool, jwtConfig: { secret: 'test-secret-key-must-be-long-enough-for-hs256' } });
      const token = tokenService.generateAccessToken({
        userId: 'user-1',
        role: 'EMPLOYEE',
      });
      const res = await request(app)
        .get('/api/i18n/locales')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.locales).toEqual(['en', 'vi', 'ja']);
    });

    it('GET /api/i18n/:entity_type/:entity_id retrieves entity translations', async () => {
      const query = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('FROM i18n_translation')) {
          return Promise.resolve({
            rows: [
              {
                translation_id: 't-1',
                entity_type: 'DEPARTMENT',
                entity_id: 'd-1',
                field_name: 'name',
                locale: 'en',
                value: 'Engineering',
              },
              {
                translation_id: 't-2',
                entity_type: 'DEPARTMENT',
                entity_id: 'd-1',
                field_name: 'name',
                locale: 'vi',
                value: 'Kỹ Thuật',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const app = createApp({ dbPool: { query, connect: () => Promise.resolve({ query, release: () => {} }) } as unknown as Pool, jwtConfig: { secret: 'test-secret-key-must-be-long-enough-for-hs256' } });
      const token = tokenService.generateAccessToken({
        userId: 'user-admin',
        role: 'HR_ADMIN',
        employeeId: 'emp-admin',
      });

      const res = await request(app)
        .get('/api/i18n/DEPARTMENT/d-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.translations).toEqual({
        en: { name: 'Engineering' },
        vi: { name: 'Kỹ Thuật' },
      });
    });

    it('PUT /api/i18n/:entity_type/:entity_id enforces HR_ADMIN / SYSTEM_ADMIN role', async () => {
      const query = vi.fn().mockResolvedValue({ rows: [] });
      const app = createApp({ dbPool: { query } as unknown as Pool, jwtConfig: { secret: 'test-secret-key-must-be-long-enough-for-hs256' } });
      const token = tokenService.generateAccessToken({
        userId: 'user-employee',
        role: 'EMPLOYEE',
        employeeId: 'emp-normal',
      });

      const res = await request(app)
        .put('/api/i18n/DEPARTMENT/d-1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          en: { name: 'Sales' },
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('PATCH /api/users/me/locale updates user preferred locale', async () => {
      const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const app = createApp({ dbPool: { query } as unknown as Pool, jwtConfig: { secret: 'test-secret-key-must-be-long-enough-for-hs256' } });
      const token = tokenService.generateAccessToken({
        userId: 'user-employee',
        role: 'EMPLOYEE',
        employeeId: 'emp-normal',
      });

      const res = await request(app)
        .patch('/api/users/me/locale')
        .set('Authorization', `Bearer ${token}`)
        .send({ locale: 'vi' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.locale).toBe('vi');
    });
  });
});
