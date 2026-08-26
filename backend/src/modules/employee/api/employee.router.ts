import { Router, RequestHandler } from 'express';
import { EmployeeController } from './employee.controller.js';

export function createEmployeeRouter(
  employeeController: EmployeeController,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();

  // Apply basic jwt authentication middleware for all routes in this module
  router.use(jwtMiddleware);

  // ── Employee Routes ────────────────────────────────────────────────────────
  router.get('/employees', (req, res, next) => { employeeController.getEmployees(req, res).catch(next); });
  router.post('/employees', (req, res, next) => { employeeController.createEmployee(req, res).catch(next); });
  router.get('/employees/lookup', (req, res, next) => { employeeController.lookupEmployees(req, res).catch(next); });
  
  router.get('/employees/:employeeId', (req, res, next) => { employeeController.getEmployeeById(req, res).catch(next); });
  router.patch('/employees/:employeeId', (req, res, next) => { employeeController.updateEmployee(req, res).catch(next); });
  
  router.post('/employees/:employeeId/deactivate', (req, res, next) => { employeeController.deactivateEmployee(req, res).catch(next); });
  router.post('/employees/:employeeId/reactivate', (req, res, next) => { employeeController.reactivateEmployee(req, res).catch(next); });
  router.post('/employees/:employeeId/terminate', (req, res, next) => { employeeController.terminateEmployee(req, res).catch(next); });
  
  router.get('/employees/:employeeId/assignments', (req, res, next) => { employeeController.getEmployeeAssignments(req, res).catch(next); });
  router.post('/employees/:employeeId/assignments', (req, res, next) => { employeeController.createAssignment(req, res).catch(next); });
  router.get('/employees/:employeeId/assignments/current', (req, res, next) => { employeeController.getCurrentAssignment(req, res).catch(next); });
  
  router.get('/employees/:employeeId/direct-reports', (req, res, next) => { employeeController.getDirectReports(req, res).catch(next); });
  router.get('/employees/:employeeId/manager-chain', (req, res, next) => { employeeController.getManagerChain(req, res).catch(next); });

  // ── Department Routes ──────────────────────────────────────────────────────
  router.get('/departments', (req, res, next) => { employeeController.getDepartments(req, res).catch(next); });
  router.post('/departments', (req, res, next) => { employeeController.createDepartment(req, res).catch(next); });
  
  router.get('/departments/:departmentId', (req, res, next) => { employeeController.getDepartmentById(req, res).catch(next); });
  router.patch('/departments/:departmentId', (req, res, next) => { employeeController.updateDepartment(req, res).catch(next); });
  router.post('/departments/:departmentId/deactivate', (req, res, next) => { employeeController.deactivateDepartment(req, res).catch(next); });
  
  router.get('/departments/:departmentId/teams', (req, res, next) => { employeeController.getDepartmentTeams(req, res).catch(next); });

  // ── Team Routes ────────────────────────────────────────────────────────────
  router.get('/teams', (req, res, next) => { employeeController.getTeams(req, res).catch(next); });
  router.post('/teams', (req, res, next) => { employeeController.createTeam(req, res).catch(next); });
  
  router.get('/teams/:teamId', (req, res, next) => { employeeController.getTeamById(req, res).catch(next); });
  router.patch('/teams/:teamId', (req, res, next) => { employeeController.updateTeam(req, res).catch(next); });
  router.post('/teams/:teamId/deactivate', (req, res, next) => { employeeController.deactivateTeam(req, res).catch(next); });

  // ── Role Routes ────────────────────────────────────────────────────────────
  router.get('/roles', (req, res, next) => { employeeController.getRoles(req, res).catch(next); });
  router.post('/roles', (req, res, next) => { employeeController.createRole(req, res).catch(next); });
  
  router.get('/roles/:roleId', (req, res, next) => { employeeController.getRoleById(req, res).catch(next); });
  router.patch('/roles/:roleId', (req, res, next) => { employeeController.updateRole(req, res).catch(next); });
  router.post('/roles/:roleId/deactivate', (req, res, next) => { employeeController.deactivateRole(req, res).catch(next); });

  // ── Job Level Routes ───────────────────────────────────────────────────────
  router.get('/job-levels', (req, res, next) => { employeeController.getJobLevels(req, res).catch(next); });
  router.post('/job-levels', (req, res, next) => { employeeController.createJobLevel(req, res).catch(next); });
  
  router.get('/job-levels/:jobLevelId', (req, res, next) => { employeeController.getJobLevelById(req, res).catch(next); });
  router.patch('/job-levels/:jobLevelId', (req, res, next) => { employeeController.updateJobLevel(req, res).catch(next); });
  router.post('/job-levels/:jobLevelId/deactivate', (req, res, next) => { employeeController.deactivateJobLevel(req, res).catch(next); });

  // ── Employee Import Routes ─────────────────────────────────────────────────
  router.get('/employee-imports/templates/:version/download', (req, res, next) => { employeeController.downloadImportTemplate(req, res).catch(next); });
  router.post('/employee-imports', (req, res, next) => { employeeController.createImportJob(req, res).catch(next); });
  router.get('/employee-imports', (req, res, next) => { employeeController.getImportJobs(req, res).catch(next); });
  
  router.get('/employee-imports/:importJobId', (req, res, next) => { employeeController.getImportJobById(req, res).catch(next); });
  router.get('/employee-imports/:importJobId/preview', (req, res, next) => { employeeController.previewImportJob(req, res).catch(next); });
  router.post('/employee-imports/:importJobId/confirm', (req, res, next) => { employeeController.confirmImportJob(req, res).catch(next); });

  return router;
}