import cors from 'cors';
import express from 'express';
import { errorHandler, notFoundHandler } from './api/error-handler.js';
import { sendSuccess } from './api/http-response.js';
import { requestIdMiddleware } from './shared/request-id.js';

export function createApp() {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_request, response) => {
    sendSuccess(response, 200, 'Service is healthy.', { status: 'healthy' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
