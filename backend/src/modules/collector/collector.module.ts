import { Pool } from 'pg';
import { Router, RequestHandler } from 'express';
import { CollectorService } from './application/collector.service.js';
import { CollectorSchedulerService } from './application/collector-scheduler.service.js';
import { CollectorController } from './api/collector.controller.js';
import { createCollectorRouter } from './api/collector.router.js';

export interface CollectorModule {
  service: CollectorService;
  scheduler: CollectorSchedulerService;
  controller: CollectorController;
  router: Router;
}

export function createCollectorModule(pool: Pool, jwtMiddleware?: RequestHandler): CollectorModule {
  const service = new CollectorService(pool);
  const scheduler = new CollectorSchedulerService(service);
  const controller = new CollectorController(service, scheduler);
  const router = createCollectorRouter(controller, jwtMiddleware);


  // Start background scheduler (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    (async () => {
      try {
        await scheduler.start();
      } catch (err) {
        console.error('[CollectorModule] Scheduler initialization error:', err);
      }
    })();
  }

  return { service, scheduler, controller, router };
}
