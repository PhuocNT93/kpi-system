import {
  TemplateSnapshot,
} from '../../domain/configuration.types.js';
import {
  ITemplateRepository,
  ITemplateVersionRepository,
  ITemplateCriterionRepository,
  ICriterionRepository,
  ICriterionVersionRepository,
  IEvaluationLevelRepository,
  IScoringRuleRepository,
  IWorkflowRepository,
} from '../../domain/repositories.interface.js';
import { NotFound } from '../../../../api/app-error.js';

export class ConfigurationSnapshotService {
  constructor(
    private templateRepo: ITemplateRepository,
    private versionRepo: ITemplateVersionRepository,
    private templateCriterionRepo: ITemplateCriterionRepository,
    private criterionRepo: ICriterionRepository,
    private criterionVersionRepo: ICriterionVersionRepository,
    private levelRepo: IEvaluationLevelRepository,
    private scoringRuleRepo: IScoringRuleRepository,
    private workflowRepo: IWorkflowRepository
  ) {}

  public async generateSnapshot(
    templateId: string,
    versionId: string
  ): Promise<TemplateSnapshot> {
    const template = await this.templateRepo.findById(templateId);
    if (!template) throw new NotFound('EvaluationTemplate');

    const templateVersion = await this.versionRepo.findById(versionId);
    if (!templateVersion || templateVersion.template_id !== templateId) {
      throw new NotFound('EvaluationTemplateVersion');
    }

    const levels = await this.levelRepo.findAll();
    const templateCriteria = await this.templateCriterionRepo.findByTemplateVersionId(versionId);

    const snapshotCriteria: TemplateSnapshot['criteria'] = [];

    for (const tc of templateCriteria) {
      const cv = await this.criterionVersionRepo.findById(tc.criterion_version_id);
      if (!cv) continue;

      const criterion = await this.criterionRepo.findById(cv.criterion_id);
      if (!criterion) continue;

      let rule = undefined;
      if (cv.scoring_rule_id) {
        const sr = await this.scoringRuleRepo.findById(cv.scoring_rule_id);
        if (sr) rule = sr;
      }

      snapshotCriteria.push({
        criterion,
        version: cv,
        template_criterion: tc,
        scoring_rule: rule,
      });
    }

    // Attempt to load active workflow definition
    let workflowSnapshot = undefined;
    const workflows = await this.workflowRepo.findAllDefinitions();
    const activeWorkflow = workflows.find((w) => w.status === 'PUBLISHED') || workflows[0];

    if (activeWorkflow) {
      const states = await this.workflowRepo.findStatesByWorkflowId(activeWorkflow.id);
      const transitions = await this.workflowRepo.findTransitionsByWorkflowId(activeWorkflow.id);
      workflowSnapshot = {
        definition: activeWorkflow,
        states,
        transitions,
      };
    }

    return {
      template: {
        id: template.id,
        code: template.code,
        name: template.name,
        version_no: templateVersion.version_no,
        weight_total_policy: templateVersion.weight_total_policy,
      },
      levels,
      criteria: snapshotCriteria,
      workflow: workflowSnapshot,
      snapshot_created_at: new Date().toISOString(),
    };
  }
}
