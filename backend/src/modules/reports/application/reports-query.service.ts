import { IReportsRepository } from '../domain/reports.types.js';
import { AppError } from '../../../api/app-error.js';

export class ReportsQueryService {
  constructor(private reportsRepo: IReportsRepository) {}

  public async getEmployeeReport(employeeId: string, cycleId: string) {
    try {
      return await this.reportsRepo.getEmployeeReport(employeeId, cycleId);
    } catch {
      throw new AppError(404, 'NOT_FOUND', 'Report data not found for this employee and cycle');
    }
  }

  public async getTeamReport(teamId: string, cycleId: string) {
    try {
      return await this.reportsRepo.getTeamReport(teamId, cycleId);
    } catch {
      throw new AppError(404, 'NOT_FOUND', 'Report data not found for this team and cycle');
    }
  }

  public async getOrganizationReport(cycleId: string) {
    const data = await this.reportsRepo.getOrganizationReport(cycleId);
    if (!data || data.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Organization report data not found for this cycle');
    }
    return data;
  }
}
