import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ImportController } from './import.controller.js';
import { AuthorizationService } from '../../iam/index.js';
import { getActorFromContext } from '../../../shared/auth/actor-context.js';
import { sendFailure } from '../../../api/http-response.js';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export function createImportRouter(
  controller: ImportController,
  authorizationService: AuthorizationService,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(jwtMiddleware);

  const requireHrAdmin = (req: Request, res: Response, next: NextFunction): void => {
    const actor = getActorFromContext(req);
    if (!actor) {
      sendFailure(res, 401, 'Authentication required', 'UNAUTHENTICATED');
      return;
    }
    if (actor.role !== 'HR_ADMIN' && actor.role !== 'SYSTEM_ADMIN') {
      sendFailure(res, 403, 'Forbidden', 'FORBIDDEN');
      return;
    }
    next();
  };

  router.get('/csv-templates/current', requireHrAdmin, (req, res, next) => {
    controller.getCurrentCsvTemplate(req, res).catch(next);
  });

  router.get('/csv-templates/current/download', requireHrAdmin, (req, res, next) => { 
    controller.downloadCurrentCsvTemplate(req, res).catch(next); 
  });

  router.get('/csv-templates/:csv_template_id/download', requireHrAdmin, (req, res, next) => { 
    controller.downloadCsvTemplateById(req, res).catch(next); 
  });

  router.post('/imports/csv', requireHrAdmin, upload.single('file'), (req, res, next) => {
    controller.uploadCsv(req, res).catch(next);
  });

  router.post('/imports/:id/confirm', requireHrAdmin, (req, res, next) => {
    controller.confirmImport(req, res).catch(next);
  });

  router.get('/imports/:id', requireHrAdmin, (req, res, next) => {
    controller.getImportStatus(req, res).catch(next);
  });

  router.get('/imports', requireHrAdmin, (req, res, next) => {
    controller.getImportHistory(req, res).catch(next);
  });

  router.get('/imports/:id/rows', requireHrAdmin, (req, res, next) => {
    controller.getImportRows(req, res).catch(next);
  });

  return router;
}
