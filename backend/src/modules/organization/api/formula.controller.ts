import { Request, Response } from 'express';
import { TeamFormulaService } from '../application/formula.service.js';

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export class TeamFormulaController {
  constructor(private service: TeamFormulaService) {}

  getGlobalFormula = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.getEffectiveFormula();
      res.json({
        success: true,
        data: {
          formula: result.formula,
          isInherited: false,
          sourceLevel: 'GLOBAL',
        },
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, message: getErrorMessage(err) });
    }
  };

  getDepartmentFormula = async (req: Request, res: Response): Promise<void> => {
    try {
      const departmentId = String(req.params.departmentId);
      const result = await this.service.getEffectiveFormula({ departmentId });
      res.json({
        success: true,
        data: {
          formula: result.formula,
          isInherited: result.isInherited,
          sourceLevel: result.sourceLevel,
          inheritedFrom: result.inheritedFrom,
        },
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, message: getErrorMessage(err) });
    }
  };

  saveDepartmentFormula = async (req: Request, res: Response): Promise<void> => {
    try {
      const departmentId = String(req.params.departmentId);
      const { components, scaleMax, isCustomOverride, rankMatrix } = req.body;
      const formula = await this.service.saveFormula({
        departmentId,
        teamId: null,
        isCustomOverride: isCustomOverride !== undefined ? isCustomOverride : true,
        scaleMax,
        components,
        rankMatrix,
      });
      res.json({
        success: true,
        data: formula,
        message: 'Lưu công thức cho phòng ban thành công (Áp dụng cho toàn bộ team trong phòng ban)',
      });
    } catch (err: unknown) {
      res.status(400).json({ success: false, message: getErrorMessage(err) });
    }
  };

  resetDepartmentFormula = async (req: Request, res: Response): Promise<void> => {
    try {
      const departmentId = String(req.params.departmentId);
      const result = await this.service.resetDepartmentFormula(departmentId);
      res.json({
        success: true,
        data: {
          formula: result.formula,
          isInherited: true,
          sourceLevel: result.sourceLevel,
        },
        message: 'Đã hoàn tác công thức phòng ban về mặc định của toàn công ty',
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, message: getErrorMessage(err) });
    }
  };

  getTeamFormula = async (req: Request, res: Response): Promise<void> => {
    try {
      const teamId = String(req.params.teamId);
      const result = await this.service.getEffectiveFormula({ teamId });
      res.json({
        success: true,
        data: {
          formula: result.formula,
          isInherited: result.isInherited,
          sourceLevel: result.sourceLevel,
          inheritedFrom: result.inheritedFrom,
          departmentId: result.departmentId,
          departmentName: result.departmentName,
        },
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, message: getErrorMessage(err) });
    }
  };

  saveGlobalFormula = async (req: Request, res: Response): Promise<void> => {
    try {
      const { components, scaleMax, rankMatrix } = req.body;
      const formula = await this.service.saveFormula({
        teamId: null,
        departmentId: null,
        isCustomOverride: false,
        scaleMax,
        components,
        rankMatrix,
      });
      res.json({
        success: true,
        data: formula,
        message: 'Lưu công thức mặc định toàn tổ chức thành công',
      });
    } catch (err: unknown) {
      res.status(400).json({ success: false, message: getErrorMessage(err) });
    }
  };

  saveTeamFormula = async (req: Request, res: Response): Promise<void> => {
    try {
      const teamId = String(req.params.teamId);
      const { components, scaleMax, isCustomOverride, rankMatrix } = req.body;
      const formula = await this.service.saveFormula({
        teamId,
        departmentId: null,
        isCustomOverride: isCustomOverride !== undefined ? isCustomOverride : true,
        scaleMax,
        components,
        rankMatrix,
      });
      res.json({
        success: true,
        data: formula,
        message: 'Lưu công thức cho team thành công (Áp dụng cho toàn bộ thành viên của team)',
      });
    } catch (err: unknown) {
      res.status(400).json({ success: false, message: getErrorMessage(err) });
    }
  };

  resetTeamFormula = async (req: Request, res: Response): Promise<void> => {
    try {
      const teamId = String(req.params.teamId);
      const result = await this.service.resetTeamFormula(teamId);
      res.json({
        success: true,
        data: {
          formula: result.formula,
          isInherited: true,
          sourceLevel: result.sourceLevel,
          inheritedFrom: result.inheritedFrom,
          departmentName: result.departmentName,
        },
        message: 'Đã hoàn tác về công thức kế thừa',
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, message: getErrorMessage(err) });
    }
  };

  simulate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { teamId, departmentId, components, scores, currentSalary } = req.body;
      const result = await this.service.simulate({
        teamId,
        departmentId,
        components,
        scores: scores || {},
        currentSalary: currentSalary ? Number(currentSalary) : undefined,
      });
      res.json({
        success: true,
        data: result,
      });
    } catch (err: unknown) {
      res.status(400).json({ success: false, message: getErrorMessage(err) });
    }
  };

  getAllFormulasSummary = async (_req: Request, res: Response): Promise<void> => {
    try {
      const summary = await this.service.getAllFormulasSummary();
      res.json({
        success: true,
        data: summary,
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, message: getErrorMessage(err) });
    }
  };
}
