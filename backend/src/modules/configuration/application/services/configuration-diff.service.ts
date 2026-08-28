import {
  DiffResult,
  CriterionDiffItem,
  PropertyChange,
} from '../../domain/configuration.types.js';
import {
  ITemplateVersionRepository,
  ITemplateKpiRepository,
  ITemplateKpiCriterionRepository,
  ICriterionVersionRepository,
  ICriterionRepository,
} from '../../domain/repositories.interface.js';
import { NotFound } from '../../../../api/app-error.js';

export class ConfigurationDiffService {
  constructor(
    private versionRepo: ITemplateVersionRepository,
    private templateKpiRepo: ITemplateKpiRepository,
    private templateKpiCriterionRepo: ITemplateKpiCriterionRepository,
    private criterionVersionRepo: ICriterionVersionRepository,
    private criterionRepo: ICriterionRepository
  ) {}

  public async diff(
    templateId: string,
    fromVersionNo: number,
    toVersionNo: number
  ): Promise<DiffResult> {
    const fromVersion = await this.versionRepo.findByTemplateIdAndVersion(templateId, fromVersionNo);
    if (!fromVersion) throw new NotFound(`TemplateVersion v${fromVersionNo}`);

    const toVersion = await this.versionRepo.findByTemplateIdAndVersion(templateId, toVersionNo);
    if (!toVersion) throw new NotFound(`TemplateVersion v${toVersionNo}`);

    const fromCriteria = await this.templateKpiCriterionRepo.findByTemplateVersionIdWithDetails(fromVersion.id);
    const toCriteria = await this.templateKpiCriterionRepo.findByTemplateVersionIdWithDetails(toVersion.id);

    // Map criterion_code -> item
    const getCodeMap = (items: any[]) => {
      const map = new Map<string, { code: string; name: string; tc: any }>();
      for (const item of items) {
        if (item.criterion) {
          map.set(item.criterion.code, { code: item.criterion.code, name: item.criterion.name, tc: item });
        }
      }
      return map;
    };

    const fromMap = getCodeMap(fromCriteria);
    const toMap = getCodeMap(toCriteria);

    const added: CriterionDiffItem[] = [];
    const removed: CriterionDiffItem[] = [];
    const changed: CriterionDiffItem[] = [];

    // Identify added and changed
    for (const [code, toItem] of toMap.entries()) {
      if (!fromMap.has(code)) {
        added.push({ criterion_code: code, criterion_name: toItem.name });
      } else {
        const fromItem = fromMap.get(code)!;
        const changes: Record<string, PropertyChange> = {};

        if (fromItem.tc.weight !== toItem.tc.weight) {
          changes.weight = { from: fromItem.tc.weight, to: toItem.tc.weight };
        }
        if (fromItem.tc.required !== toItem.tc.required) {
          changes.required = { from: fromItem.tc.required, to: toItem.tc.required };
        }
        if (fromItem.tc.enabled !== toItem.tc.enabled) {
          changes.enabled = { from: fromItem.tc.enabled, to: toItem.tc.enabled };
        }

        if (Object.keys(changes).length > 0) {
          changed.push({ criterion_code: code, criterion_name: toItem.name, changes });
        }
      }
    }

    // Identify removed
    for (const [code, fromItem] of fromMap.entries()) {
      if (!toMap.has(code)) {
        removed.push({ criterion_code: code, criterion_name: fromItem.name });
      }
    }

    return { added, removed, changed };
  }
}
