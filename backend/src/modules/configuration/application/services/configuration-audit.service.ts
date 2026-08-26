import { ConfigurationAuditLog } from '../../domain/configuration.types.js';
import { IConfigurationAuditRepository, AuditLogFilter } from '../../domain/repositories.interface.js';
import { NotFound } from '../../../../api/app-error.js';

export class ConfigurationAuditService {
  constructor(private auditRepo: IConfigurationAuditRepository) {}

  async getAuditLogs(filter: AuditLogFilter): Promise<{ items: ConfigurationAuditLog[]; total: number }> {
    return this.auditRepo.findAll(filter);
  }

  async getAuditLogById(id: string): Promise<ConfigurationAuditLog> {
    const log = await this.auditRepo.findById(id);
    if (!log) throw new NotFound('ConfigurationAuditLog');
    return log;
  }
}
