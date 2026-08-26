import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from '../application/organization.service.js';
import { sendSuccess, sendCollection } from '../../../api/http-response.js';
import { parsePaginationQuery } from '../../../api/pagination.js';
import { ValidationError } from '../../../api/app-error.js';

export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // --- Department ---
  getDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit, offset, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
      const [departments, total] = await this.organizationService.getDepartments(offset, limit);
      sendCollection(res, 'Departments retrieved successfully', departments, buildPageMeta(total));
    } catch (err) {
      next(err);
    }
  };

  getDepartmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const department = await this.organizationService.getDepartmentById(id);
      if (!department) {
        res.status(404).json({ success: false, message: `Department with ID ${id} not found` });
        return;
      }
      sendSuccess(res, 200, 'Department retrieved successfully', department);
    } catch (err) {
      next(err);
    }
  };

  createDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, name, active } = req.body;
      if (!code || !name) {
        throw new ValidationError('Request validation failed.', [
          ...(!code ? [{ field: 'code', code: 'REQUIRED', message: 'Code is required' }] : []),
          ...(!name ? [{ field: 'name', code: 'REQUIRED', message: 'Name is required' }] : [])
        ]);
      }
      const department = await this.organizationService.createDepartment({
        code,
        name,
        active: active !== undefined ? active : true,
      });
      sendSuccess(res, 201, 'Department created successfully', department);
    } catch (err) {
      next(err);
    }
  };

  updateDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { name, active } = req.body;
      if (!name) {
        throw new ValidationError('Request validation failed.', [{ field: 'name', code: 'REQUIRED', message: 'Name is required' }]);
      }
      const department = await this.organizationService.updateDepartment(id, { name, active: active !== undefined ? active : true });
      sendSuccess(res, 200, 'Department updated successfully', department);
    } catch (err) {
      next(err);
    }
  };

  // --- JobRole ---
  getJobRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit, offset, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
      const [roles, total] = await this.organizationService.getJobRoles(offset, limit);
      sendCollection(res, 'Job Roles retrieved successfully', roles, buildPageMeta(total));
    } catch (err) {
      next(err);
    }
  };

  getJobRoleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const role = await this.organizationService.getJobRoleById(id);
      if (!role) {
        res.status(404).json({ success: false, message: `Job Role with ID ${id} not found` });
        return;
      }
      sendSuccess(res, 200, 'Job Role retrieved successfully', role);
    } catch (err) {
      next(err);
    }
  };

  createJobRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, name, description, active } = req.body;
      if (!code || !name) {
        throw new ValidationError('Request validation failed.', [
          ...(!code ? [{ field: 'code', code: 'REQUIRED', message: 'Code is required' }] : []),
          ...(!name ? [{ field: 'name', code: 'REQUIRED', message: 'Name is required' }] : [])
        ]);
      }
      const role = await this.organizationService.createJobRole({
        code,
        name,
        description,
        active: active !== undefined ? active : true,
      });
      sendSuccess(res, 201, 'Job Role created successfully', role);
    } catch (err) {
      next(err);
    }
  };

  updateJobRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { name, description, active } = req.body;
      if (!name) {
        throw new ValidationError('Request validation failed.', [{ field: 'name', code: 'REQUIRED', message: 'Name is required' }]);
      }
      const role = await this.organizationService.updateJobRole(id, { name, description, active: active !== undefined ? active : true });
      sendSuccess(res, 200, 'Job Role updated successfully', role);
    } catch (err) {
      next(err);
    }
  };

  // --- JobLevel ---
  getJobLevels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit, offset, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
      const [levels, total] = await this.organizationService.getJobLevels(offset, limit);
      sendCollection(res, 'Job Levels retrieved successfully', levels, buildPageMeta(total));
    } catch (err) {
      next(err);
    }
  };

  getJobLevelById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const level = await this.organizationService.getJobLevelById(id);
      if (!level) {
        res.status(404).json({ success: false, message: `Job Level with ID ${id} not found` });
        return;
      }
      sendSuccess(res, 200, 'Job Level retrieved successfully', level);
    } catch (err) {
      next(err);
    }
  };

  createJobLevel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, name, rank, active } = req.body;
      if (!code || !name || rank === undefined) {
        throw new ValidationError('Request validation failed.', [
          ...(!code ? [{ field: 'code', code: 'REQUIRED', message: 'Code is required' }] : []),
          ...(!name ? [{ field: 'name', code: 'REQUIRED', message: 'Name is required' }] : []),
          ...(rank === undefined ? [{ field: 'rank', code: 'REQUIRED', message: 'Rank is required' }] : [])
        ]);
      }
      const level = await this.organizationService.createJobLevel({
        code,
        name,
        rank: parseInt(rank, 10),
        active: active !== undefined ? active : true,
      });
      sendSuccess(res, 201, 'Job Level created successfully', level);
    } catch (err) {
      next(err);
    }
  };

  updateJobLevel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { name, rank, active } = req.body;
      if (!name || rank === undefined) {
        throw new ValidationError('Request validation failed.', [
          ...(!name ? [{ field: 'name', code: 'REQUIRED', message: 'Name is required' }] : []),
          ...(rank === undefined ? [{ field: 'rank', code: 'REQUIRED', message: 'Rank is required' }] : [])
        ]);
      }
      const level = await this.organizationService.updateJobLevel(id, { name, rank: parseInt(rank, 10), active: active !== undefined ? active : true });
      sendSuccess(res, 200, 'Job Level updated successfully', level);
    } catch (err) {
      next(err);
    }
  };
}
