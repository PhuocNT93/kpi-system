import { Router, RequestHandler } from 'express';
import { ConfigurationController } from './configuration.controller.js';
import { AuthorizationService } from '../../iam/index.js';
import { getActorFromContext } from '../../../shared/auth/index.js';

export function createConfigurationRouter(
  controller: ConfigurationController,
  authorizationService: AuthorizationService,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();

  // Helper middleware to enforce fine-grained RBAC permission
  const requirePermission = (permissionCode: string): RequestHandler => {
    return async (req, res, next) => {
      try {
        const actor = req.actor || getActorFromContext(req);
        if (!actor || !actor.userId) {
          res.status(401).json({ success: false, message: 'Authentication required.' });
          return;
        }
        const hasPerm = await authorizationService.hasPermission(actor.userId, permissionCode);
        if (!hasPerm) {
          res.status(403).json({ success: false, message: `Permission '${permissionCode}' required.` });
          return;
        }
        next();
      } catch (err) {
        next(err);
      }
    };
  };

  router.use(jwtMiddleware);

  // ── Criteria Routes ─────────────────────────────────────────────────────────
  router.get('/criteria', requirePermission('CONFIGURATION_READ'), controller.getCriteria);
  router.post('/criteria', requirePermission('CONFIGURATION_CREATE'), controller.createCriterion);
  router.get('/criteria/:criterionId', requirePermission('CONFIGURATION_READ'), controller.getCriterionById);
  router.put('/criteria/:criterionId', requirePermission('CONFIGURATION_UPDATE'), controller.updateCriterion);
  router.post('/criteria/:criterionId/activate', requirePermission('CONFIGURATION_UPDATE'), controller.activateCriterion);
  router.post('/criteria/:criterionId/deactivate', requirePermission('CONFIGURATION_UPDATE'), controller.deactivateCriterion);
  router.get('/criteria/:criterionId/versions', requirePermission('CONFIGURATION_READ'), controller.getCriterionVersions);
  router.post('/criteria/:criterionId/versions', requirePermission('CONFIGURATION_CREATE'), controller.createCriterionVersion);
  router.get('/criteria/:criterionId/versions/:versionId', requirePermission('CONFIGURATION_READ'), controller.getCriterionVersionById);
  router.put('/criteria/:criterionId/versions/:versionId', requirePermission('CONFIGURATION_UPDATE'), controller.updateCriterionVersion);
  router.post('/criteria/:criterionId/versions/:versionId/publish', requirePermission('CONFIGURATION_PUBLISH'), controller.publishCriterionVersion);

  // ── Evaluation Levels Routes ────────────────────────────────────────────────
  router.get('/levels', requirePermission('CONFIGURATION_READ'), controller.getLevels);
  router.post('/levels', requirePermission('CONFIGURATION_CREATE'), controller.createLevel);
  router.get('/levels/:id', requirePermission('CONFIGURATION_READ'), controller.getLevelById);
  router.put('/levels/:id', requirePermission('CONFIGURATION_UPDATE'), controller.updateLevel);
  router.post('/levels/:id/activate', requirePermission('CONFIGURATION_UPDATE'), controller.activateLevel);
  router.post('/levels/:id/deactivate', requirePermission('CONFIGURATION_UPDATE'), controller.deactivateLevel);

  // ── Scoring Rules Routes ────────────────────────────────────────────────────
  router.get('/scoring-rules', requirePermission('CONFIGURATION_READ'), controller.getScoringRules);
  router.post('/scoring-rules', requirePermission('CONFIGURATION_CREATE'), controller.createScoringRule);
  router.get('/scoring-rules/:id', requirePermission('CONFIGURATION_READ'), controller.getScoringRuleById);
  router.put('/scoring-rules/:id', requirePermission('CONFIGURATION_UPDATE'), controller.updateScoringRule);
  router.post('/scoring-rules/:id/validate', requirePermission('CONFIGURATION_VALIDATE'), controller.validateScoringRule);
  router.post('/scoring-rules/:id/publish', requirePermission('CONFIGURATION_PUBLISH'), controller.publishScoringRule);

  // ── Templates Routes ────────────────────────────────────────────────────────
  router.get('/templates', requirePermission('CONFIGURATION_READ'), controller.getTemplates);
  router.post('/templates', requirePermission('CONFIGURATION_CREATE'), controller.createTemplate);
  router.get('/templates/:id', requirePermission('CONFIGURATION_READ'), controller.getTemplateById);
  router.put('/templates/:id', requirePermission('CONFIGURATION_UPDATE'), controller.updateTemplate);
  router.post('/templates/:id/activate', requirePermission('CONFIGURATION_UPDATE'), controller.activateTemplate);
  router.post('/templates/:id/deactivate', requirePermission('CONFIGURATION_UPDATE'), controller.deactivateTemplate);

  // ── Template Versions & Criteria ────────────────────────────────────────────
  router.get('/templates/:templateId/versions', requirePermission('CONFIGURATION_READ'), controller.getTemplateVersions);
  router.post('/templates/:templateId/versions', requirePermission('CONFIGURATION_CREATE'), controller.createTemplateVersion);
  router.get('/templates/:templateId/versions/:versionId', requirePermission('CONFIGURATION_READ'), controller.getTemplateVersionById);
  router.put('/templates/:templateId/versions/:versionId', requirePermission('CONFIGURATION_UPDATE'), controller.updateTemplateVersion);
  router.post('/templates/:templateId/versions/:versionId/validate', requirePermission('CONFIGURATION_VALIDATE'), controller.validateTemplateVersion);
  router.post('/templates/:templateId/versions/:versionId/publish', requirePermission('CONFIGURATION_PUBLISH'), controller.publishTemplateVersion);
  router.post('/templates/:templateId/versions/:versionId/retire', requirePermission('CONFIGURATION_RETIRE'), controller.retireTemplateVersion);
  router.post('/templates/:templateId/versions/:versionId/clone', requirePermission('CONFIGURATION_CREATE'), controller.cloneTemplateVersion);
  router.get('/templates/:templateId/versions/:versionId/snapshot', requirePermission('CONFIGURATION_READ'), controller.getTemplateSnapshot);
  router.get('/templates/:templateId/versions/:fromVersion/diff/:toVersion', requirePermission('CONFIGURATION_READ'), controller.diffTemplateVersions);
  router.get('/templates/:templateId/versions/:versionId/kpis', requirePermission('CONFIGURATION_READ'), controller.getTemplateKpis);
  router.post('/templates/:templateId/versions/:versionId/kpis', requirePermission('CONFIGURATION_CREATE'), controller.addTemplateKpi);
  router.delete('/templates/:templateId/versions/:versionId/kpis/:id', requirePermission('CONFIGURATION_UPDATE'), controller.removeTemplateKpi);

  router.get('/templates/:templateId/versions/:versionId/criteria', requirePermission('CONFIGURATION_READ'), controller.getTemplateCriteria);
  router.post('/templates/:templateId/versions/:versionId/criteria', requirePermission('CONFIGURATION_CREATE'), controller.addTemplateCriterion);
  router.put('/templates/:templateId/versions/:versionId/criteria', requirePermission('CONFIGURATION_UPDATE'), controller.bulkUpdateTemplateCriteria);
  router.delete('/templates/:templateId/versions/:versionId/criteria/:id', requirePermission('CONFIGURATION_UPDATE'), controller.deleteTemplateCriterion);

  // ── Overrides Routes ────────────────────────────────────────────────────────
  router.get('/role-overrides', requirePermission('CONFIGURATION_READ'), controller.getRoleOverrides);
  router.post('/role-overrides', requirePermission('CONFIGURATION_OVERRIDE'), controller.createRoleOverride);
  router.get('/role-overrides/:id', requirePermission('CONFIGURATION_READ'), controller.getRoleOverrideById);
  router.put('/role-overrides/:id', requirePermission('CONFIGURATION_OVERRIDE'), controller.updateRoleOverride);
  router.delete('/role-overrides/:id', requirePermission('CONFIGURATION_OVERRIDE'), controller.deleteRoleOverride);

  router.get('/team-overrides', requirePermission('CONFIGURATION_READ'), controller.getTeamOverrides);
  router.post('/team-overrides', requirePermission('CONFIGURATION_OVERRIDE'), controller.createTeamOverride);
  router.get('/team-overrides/:id', requirePermission('CONFIGURATION_READ'), controller.getTeamOverrideById);
  router.put('/team-overrides/:id', requirePermission('CONFIGURATION_OVERRIDE'), controller.updateTeamOverride);
  router.delete('/team-overrides/:id', requirePermission('CONFIGURATION_OVERRIDE'), controller.deleteTeamOverride);

  router.get('/template-overrides', requirePermission('CONFIGURATION_READ'), controller.getTemplateOverrides);
  router.post('/template-overrides', requirePermission('CONFIGURATION_OVERRIDE'), controller.createTemplateOverride);
  router.get('/template-overrides/:id', requirePermission('CONFIGURATION_READ'), controller.getTemplateOverrideById);
  router.put('/template-overrides/:id', requirePermission('CONFIGURATION_OVERRIDE'), controller.updateTemplateOverride);
  router.delete('/template-overrides/:id', requirePermission('CONFIGURATION_OVERRIDE'), controller.deleteTemplateOverride);

  // ── Effective Configuration Routes ──────────────────────────────────────────
  router.post('/effective-configurations/resolve', requirePermission('CONFIGURATION_READ'), controller.resolveEffectiveConfig);
  router.post('/effective-configurations/preview', requirePermission('CONFIGURATION_READ'), controller.previewEffectiveConfig);
  router.post('/validate', requirePermission('CONFIGURATION_VALIDATE'), controller.validateGlobalConfig);

  // ── Workflows Routes ────────────────────────────────────────────────────────
  router.get('/workflows', requirePermission('CONFIGURATION_READ'), controller.getWorkflows);
  router.post('/workflows', requirePermission('CONFIGURATION_CREATE'), controller.createWorkflow);
  router.get('/workflows/:id', requirePermission('CONFIGURATION_READ'), controller.getWorkflowById);
  router.put('/workflows/:id', requirePermission('CONFIGURATION_UPDATE'), controller.updateWorkflow);
  router.get('/workflows/:id/states', requirePermission('CONFIGURATION_READ'), controller.getWorkflowStates);
  router.post('/workflows/:id/states', requirePermission('CONFIGURATION_CREATE'), controller.addWorkflowState);
  router.get('/workflows/:id/transitions', requirePermission('CONFIGURATION_READ'), controller.getWorkflowTransitions);
  router.post('/workflows/:id/transitions', requirePermission('CONFIGURATION_CREATE'), controller.addWorkflowTransition);
  router.post('/workflows/:id/validate', requirePermission('CONFIGURATION_VALIDATE'), controller.validateWorkflow);
  router.post('/workflows/:id/publish', requirePermission('CONFIGURATION_PUBLISH'), controller.publishWorkflow);

  // ── Audit Logs Routes ───────────────────────────────────────────────────────
  router.get('/audit-logs', requirePermission('CONFIGURATION_AUDIT_READ'), controller.getAuditLogs);
  router.get('/audit-logs/:id', requirePermission('CONFIGURATION_AUDIT_READ'), controller.getAuditLogById);

  return router;
}
