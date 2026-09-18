/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GmailApiSenderService } from '../src/modules/notification/application/gmail-api-sender.service.js';
import { createEmailSender } from '../src/modules/notification/application/email-sender.factory.js';
import { SmtpSenderService } from '../src/modules/notification/application/smtp-sender.service.js';

vi.mock('googleapis', () => {
  const mockSend = vi.fn();
  const mockGetAccessToken = vi.fn();

  class MockOAuth2 {
    setCredentials = vi.fn();
    getAccessToken = mockGetAccessToken;
  }

  return {
    google: {
      auth: {
        OAuth2: MockOAuth2,
      },
      gmail: vi.fn(() => ({
        users: {
          messages: {
            send: mockSend,
          },
        },
      })),
    },
    __mockSend: mockSend,
    __mockGetAccessToken: mockGetAccessToken,
  };
});

describe('GmailApiSenderService & Factory', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createEmailSender factory', () => {
    it('returns SmtpSenderService by default when EMAIL_PROVIDER is not set', () => {
      delete process.env.EMAIL_PROVIDER;
      const sender = createEmailSender();
      expect(sender).toBeInstanceOf(SmtpSenderService);
    });

    it('returns SmtpSenderService when EMAIL_PROVIDER=smtp', () => {
      process.env.EMAIL_PROVIDER = 'smtp';
      const sender = createEmailSender();
      expect(sender).toBeInstanceOf(SmtpSenderService);
    });

    it('returns GmailApiSenderService when EMAIL_PROVIDER=gmail', () => {
      process.env.EMAIL_PROVIDER = 'gmail';
      const sender = createEmailSender();
      expect(sender).toBeInstanceOf(GmailApiSenderService);
    });

    it('returns GmailApiSenderService when EMAIL_PROVIDER=gmail_api', () => {
      process.env.EMAIL_PROVIDER = 'gmail_api';
      const sender = createEmailSender();
      expect(sender).toBeInstanceOf(GmailApiSenderService);
    });
  });

  describe('GmailApiSenderService', () => {
    it('throws an error if credentials are missing when sendEmail is called', async () => {
      const sender = new GmailApiSenderService({});
      await expect(
        sender.sendEmail({
          to: 'recipient@example.com',
          subject: 'Test Subject',
          html: '<p>Test</p>',
        })
      ).rejects.toThrow('Gmail API credentials missing');
    });

    it('returns false on verifyConnection if credentials are missing', async () => {
      const sender = new GmailApiSenderService({});
      const isConnected = await sender.verifyConnection();
      expect(isConnected).toBe(false);
    });

    it('falls back to GOOGLE_CLIENT_ID and GMAIL_CLIENT_SECRET from environment variables', async () => {
      process.env.GOOGLE_CLIENT_ID = 'workspace-google-client-id';
      process.env.GMAIL_CLIENT_SECRET = 'workspace-gmail-client-secret';
      process.env.GMAIL_REFRESH_TOKEN = 'workspace-refresh-token';

      const { google } = await import('googleapis');
      const mockSend = vi.fn().mockResolvedValue({ data: { id: 'msg-workspace-456' } });
      (google.gmail as any) = vi.fn(() => ({
        users: {
          messages: {
            send: mockSend,
          },
        },
      }));

      const sender = new GmailApiSenderService();
      const result = await sender.sendEmail({
        to: 'employee@example.com',
        subject: 'Workspace Test',
        html: '<p>Reused Client ID</p>',
      });

      expect(result.messageId).toBe('msg-workspace-456');
    });

    it('sends email successfully using Gmail API messages.send', async () => {
      const { google } = await import('googleapis');
      const mockSend = (google as any).__mockSend || vi.fn().mockResolvedValue({ data: { id: 'msg-gmail-123' } });
      (google.gmail as any) = vi.fn(() => ({
        users: {
          messages: {
            send: mockSend,
          },
        },
      }));

      const sender = new GmailApiSenderService({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
        userEmail: 'sender@example.com',
        fromName: 'Test Sender',
      });

      const result = await sender.sendEmail({
        to: 'recipient@example.com',
        subject: 'Thông báo đánh giá KPI',
        html: '<p>Xin chào</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'me',
          requestBody: expect.objectContaining({
            raw: expect.any(String),
          }),
        })
      );
      expect(result.messageId).toBe('msg-gmail-123');
    });

    it('returns true on verifyConnection when token acquisition succeeds', async () => {
      const { google } = await import('googleapis');
      (google.auth.OAuth2 as any) = class {
        setCredentials = vi.fn();
        getAccessToken = vi.fn().mockResolvedValue({ token: 'mock-access-token' });
      };

      const sender = new GmailApiSenderService({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      });

      const isConnected = await sender.verifyConnection();
      expect(isConnected).toBe(true);
    });

    it('returns false on verifyConnection when token acquisition fails', async () => {
      const { google } = await import('googleapis');
      (google.auth.OAuth2 as any) = class {
        setCredentials = vi.fn();
        getAccessToken = vi.fn().mockRejectedValue(new Error('Invalid grant'));
      };

      const sender = new GmailApiSenderService({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      });

      const isConnected = await sender.verifyConnection();
      expect(isConnected).toBe(false);
    });
  });
});
