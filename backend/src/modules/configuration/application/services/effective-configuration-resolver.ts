import {
  EffectiveEvaluationConfiguration,
  ResolvedCriterion,
  EmployeeContext,
} from '../../domain/configuration.types.js';
import {
  ITemplateRepository,
  ITemplateVersionRepository,
  ITemplateCriterionRepository,
  ICriterionRepository,
  ICriterionVersionRepository,
  IScoringRuleRepository,
  IOverrideRepository,
} from '../../domain/repositories.interface.js';
import { NotFound } from '../../../../api/app-error.js';

export class EffectiveConfigurationResolver {
  constructor(
    private templateRepo: ITemplateRepository,
    private versionRepo: ITemplateVersionRepository,
    private templateCriterionRepo: ITemplateCriterionRepository,
    private criterionRepo: ICriterionRepository,
    private criterionVersionRepo: ICriterionVersionRepository,
    private scoringRuleRepo: IScoringRuleRepository,
    private overrideRepo: IOverrideRepository
  ) {}

  public async resolve(
    templateVersionId: string,
    context: EmployeeContext
  ): Promise<EffectiveEvaluationConfiguration> {
    const templateVersion = await this.versionRepo.findById(templateVersionId);
    if (!templateVersion) throw new NotFound('EvaluationTemplateVersion');

    const template = await this.templateRepo.findById(templateVersion.template_id);
    if (!template) throw new NotFound('EvaluationTemplate');

    const templateCriteria = await this.templateCriterionRepo.findByTemplateVersionId(templateVersionId);

    // Load overrides in parallel
    const roleOverrides = context.role_id
      ? await this.overrideRepo.findRoleOverrides(templateVersionId, context.role_id)
      : [];
    const teamOverrides = context.team_id
      ? await this.overrideRepo.findTeamOverrides(templateVersionId, context.team_id)
      : [];
    const templateOverrides = await this.overrideRepo.findTemplateOverrides(templateVersionId);

    const resolvedCriteria: ResolvedCriterion[] = [];

    for (const tc of templateCriteria) {
      if (!tc.enabled) continue;

      const cv = await this.criterionVersionRepo.findById(tc.criterion_version_id);
      if (!cv) continue;

      const criterion = await this.criterionRepo.findById(cv.criterion_id);
      if (!criterion) continue;

      // Find matching overrides for this criterion version
      const roleOvr = roleOverrides.find((o) => o.criterion_version_id === cv.id);
      const teamOvr = teamOverrides.find((o) => o.criterion_version_id === cv.id);
      const templateOvr = templateOverrides.find((o) => o.criterion_version_id === cv.id);

      // Precedence resolution: Template Override > Team Override > Role Override > Criterion Version Default
      let weight = tc.weight;
      let weightSource: ResolvedCriterion['weight_source'] = 'CRITERION_VERSION_DEFAULT';

      if (templateOvr?.override_config?.weight !== undefined) {
        weight = templateOvr.override_config.weight;
        weightSource = 'TEMPLATE_OVERRIDE';
      } else if (teamOvr?.override_config?.weight !== undefined) {
        weight = teamOvr.override_config.weight;
        weightSource = 'TEAM_OVERRIDE';
      } else if (roleOvr?.override_config?.weight !== undefined) {
        weight = roleOvr.override_config.weight;
        weightSource = 'ROLE_OVERRIDE';
      }

      // Resolve scoring rule
      let scoringRuleId = cv.scoring_rule_id;
      if (templateOvr?.override_config?.scoring_rule_id) {
        scoringRuleId = templateOvr.override_config.scoring_rule_id;
      } else if (teamOvr?.override_config?.scoring_rule_id) {
        scoringRuleId = teamOvr.override_config.scoring_rule_id;
      } else if (roleOvr?.override_config?.scoring_rule_id) {
        scoringRuleId = roleOvr.override_config.scoring_rule_id;
      }

      let scoringRuleData: ResolvedCriterion['scoring_rule'] = undefined;
      if (scoringRuleId) {
        const sr = await this.scoringRuleRepo.findById(scoringRuleId);
        if (sr) {
          scoringRuleData = {
            id: sr.id,
            code: sr.code,
            type: sr.rule_type,
            config: sr.config,
          };
        }
      }

      let unit = cv.measurement_unit;
      if (templateOvr?.override_config?.measurement_unit) {
        unit = templateOvr.override_config.measurement_unit;
      } else if (teamOvr?.override_config?.measurement_unit) {
        unit = teamOvr.override_config.measurement_unit;
      } else if (roleOvr?.override_config?.measurement_unit) {
        unit = roleOvr.override_config.measurement_unit;
      }

      resolvedCriteria.push({
        criterion_id: criterion.id,
        criterion_code: criterion.code,
        criterion_name: criterion.name,
        criterion_version_id: cv.id,
        criterion_version_no: cv.version_no,
        weight,
        weight_source: weightSource,
        measurement_unit: unit,
        measurement_source_label: cv.measurement_source_label,
        required: tc.required,
        enabled: tc.enabled,
        display_order: tc.display_order,
        scoring_rule: scoringRuleData,
      });
    }

    return {
      template_id: template.id,
      template_code: template.code,
      template_version_id: templateVersion.id,
      template_version: templateVersion.version_no,
      employee_context: context,
      criteria: resolvedCriteria,
    };
  }
}
