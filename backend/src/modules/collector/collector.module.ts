import { Pool } from 'pg';
import { Router } from 'express';
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

export function createCollectorModule(pool: Pool): CollectorModule {
  const service = new CollectorService(pool);
  const scheduler = new CollectorSchedulerService(service);
  const controller = new CollectorController(service, scheduler);
  const router = createCollectorRouter(controller);

  // Automatically seed default Blueprint source if not existing
  (async () => {
    try {
      const sources = await service.listDataSources();
      if (sources.length === 0) {
        await service.createDataSource({
          name: 'Blueprint CLV Attendance (UI_TAT_028)',
          source_type: 'BLUEPRINT',
          auth_config: {
            baseUrl: 'https://blueprint.cyberlogitec.com.vn',
            username: 'khoadang',
            password: 'Khoa@69',
          },
        });
        console.log('[CollectorModule] Seeded initial Blueprint data source');
      }

      // Initialize scheduler
      await scheduler.start();
    } catch (err) {
      console.error('[CollectorModule] Initialization error:', err);
    }
  })();

  return { service, scheduler, controller, router };
}
