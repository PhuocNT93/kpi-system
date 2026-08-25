import { Request, Response, NextFunction, Router, RequestHandler } from 'express';
import { sendCollection, sendSuccess } from '../../../api/http-response.js';
import { AuthorizationService, PermissionService, RoleAssignmentService, RoleService } from '../application/services.js';
import { authorize } from './authorize.middleware.js';
import { AuthorizationScope } from '../domain/types.js';

export class IamController {
  constructor(
    private readonly roleService: RoleService,
    private readonly permService: PermissionService,
    private readonly roleAssignmentService: RoleAssignmentService
  ) {}

  getRoles = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await this.roleService.getRoles();
      sendSuccess(res, 200, 'Roles retrieved successfully.', roles);
    } catch (err) {
      next(err);
    }
  };

  getRoleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const role = await this.roleService.getRoleById(id);
      sendSuccess(res, 200, 'Role retrieved successfully.', role);
    } catch (err) {
      next(err);
    }
  };

  createRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = req.actor?.userId;
      const role = await this.roleService.createRole(req.body, actorId);
      sendSuccess(res, 201, 'Role created successfully.', role);
    } catch (err) {
      next(err);
    }
  };

  updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = req.actor?.userId;
      const id = req.params.id as string;
      const role = await this.roleService.updateRole(id, req.body, actorId);
      sendSuccess(res, 200, 'Role updated successfully.', role);
    } catch (err) {
      next(err);
    }
  };

  getPermissions = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const perms = await this.permService.getPermissions();
      sendSuccess(res, 200, 'Permissions retrieved successfully.', perms);
    } catch (err) {
      next(err);
    }
  };

  getPermissionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const perm = await this.permService.getPermissionById(id);
      sendSuccess(res, 200, 'Permission retrieved successfully.', perm);
    } catch (err) {
      next(err);
    }
  };

  getUserRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId as string;
      const roles = await this.roleAssignmentService.getUserRoles(userId);
      sendSuccess(res, 200, 'User roles retrieved successfully.', roles);
    } catch (err) {
      next(err);
    }
  };

  assignRoleToUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = req.actor?.userId;
      const userId = req.params.userId as string;
      const { roleCode } = req.body;
      await this.roleAssignmentService.assignRole(userId, roleCode, actorId);
      sendSuccess(res, 200, `Role '${roleCode}' assigned successfully to user.`, {
        userId,
        roleCode,
      });
    } catch (err) {
      next(err);
    }
  };

  removeRoleFromUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = req.actor?.userId;
      const userId = req.params.userId as string;
      const roleCode = req.params.roleCode as string;
      await this.roleAssignmentService.removeRole(userId, roleCode, actorId);
      sendSuccess(res, 200, `Role '${roleCode}' removed from user.`, { userId, roleCode });
    } catch (err) {
      next(err);
    }
  };

  getRolePermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roleId = req.params.roleId as string;
      const perms = await this.roleAssignmentService.getRolePermissions(roleId);
      sendSuccess(res, 200, 'Role permissions retrieved successfully.', perms);
    } catch (err) {
      next(err);
    }
  };

  assignPermissionToRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = req.actor?.userId;
      const roleId = req.params.roleId as string;
      const { permissionCode, scope } = req.body;
      await this.roleAssignmentService.assignPermissionToRole(
        roleId,
        permissionCode,
        scope as AuthorizationScope,
        actorId
      );
      sendSuccess(res, 200, `Permission '${permissionCode}' assigned to role successfully.`, {
        roleId,
        permissionCode,
        scope,
      });
    } catch (err) {
      next(err);
    }
  };

  removePermissionFromRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = req.actor?.userId;
      const roleId = req.params.roleId as string;
      const permissionCode = req.params.permissionCode as string;
      await this.roleAssignmentService.removePermissionFromRole(roleId, permissionCode, actorId);
      sendSuccess(res, 200, `Permission '${permissionCode}' removed from role.`, { roleId, permissionCode });
    } catch (err) {
      next(err);
    }
  };
}

export function createIamRouter(
  controller: IamController,
  authzService: AuthorizationService,
  jwtMiddleware: RequestHandler
): Router {
  const router = Router();

  router.use(jwtMiddleware);

  router.get('/roles', authorize(authzService, 'role:read'), controller.getRoles);
  router.get('/roles/:id', authorize(authzService, 'role:read'), controller.getRoleById);
  router.post('/roles', authorize(authzService, 'role:create'), controller.createRole);
  router.patch('/roles/:id', authorize(authzService, 'role:update'), controller.updateRole);

  router.get('/permissions', authorize(authzService, 'permission:read'), controller.getPermissions);
  router.get('/permissions/:id', authorize(authzService, 'permission:read'), controller.getPermissionById);

  router.get('/users/:userId/roles', authorize(authzService, 'role:read'), controller.getUserRoles);
  router.post('/users/:userId/roles', authorize(authzService, 'user:assign_role'), controller.assignRoleToUser);
  router.delete('/users/:userId/roles/:roleCode', authorize(authzService, 'user:assign_role'), controller.removeRoleFromUser);

  router.get('/roles/:roleId/permissions', authorize(authzService, 'role:read'), controller.getRolePermissions);
  router.post('/roles/:roleId/permissions', authorize(authzService, 'role:assign_permission'), controller.assignPermissionToRole);
  router.delete('/roles/:roleId/permissions/:permissionCode', authorize(authzService, 'role:assign_permission'), controller.removePermissionFromRole);

  return router;
}
