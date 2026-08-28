import {
  ValidationResult,
  ValidationErrorDetail,
  WeightPolicy,
  TemplateKpi,
  TemplateKpiCriterion,
  WorkflowState,
  WorkflowTransition,
  WorkflowStateType,
} from '../../domain/configuration.types.js';

export class ConfigurationValidationService {
  /**
   * Validate template criteria weight total against weight policy
   */
  public static validateTemplateStructure(
    kpis: TemplateKpi[],
    criteriaMap: Map<string, TemplateKpiCriterion[]>, // template_kpi_id -> criteria
    policy: WeightPolicy = WeightPolicy.EXACT_100
  ): ValidationResult {
    const errors: ValidationErrorDetail[] = [];
    const warnings: ValidationErrorDetail[] = [];

    if (kpis.length === 0) {
      errors.push({
        code: 'TEMPLATE_EMPTY',
        path: 'kpis',
        message: 'Template must contain at least one KPI.',
      });
      return { valid: false, errors, warnings };
    }

    // 1. Validate total KPI weight
    let totalKpiWeight = 0;
    for (const kpi of kpis) {
      if (typeof kpi.weight !== 'number' || kpi.weight < 0 || kpi.weight > 100) {
        errors.push({
          code: 'INVALID_WEIGHT',
          path: `kpis[${kpi.kpi_id}]`,
          message: `KPI weight (${kpi.weight}) must be between 0 and 100.`,
        });
      }
      totalKpiWeight += kpi.weight;
      
      // 2. Validate criteria within this KPI
      const kpiCriteria = criteriaMap.get(kpi.id) || [];
      const enabledCriteria = kpiCriteria.filter(c => c.enabled);
      
      if (enabledCriteria.length === 0) {
        errors.push({
          code: 'TEMPLATE_KPI_EMPTY',
          path: `kpis[${kpi.kpi_id}].criteria`,
          message: 'KPI must contain at least one enabled criterion.',
        });
      }

      let totalCritWeight = 0;
      for (const crit of enabledCriteria) {
        if (typeof crit.weight !== 'number' || crit.weight < 0 || crit.weight > 100) {
          errors.push({
            code: 'INVALID_WEIGHT',
            path: `kpis[${kpi.kpi_id}].criteria[${crit.criterion_version_id}]`,
            message: `Criterion weight (${crit.weight}) must be between 0 and 100.`,
          });
        }
        totalCritWeight += crit.weight;
      }
      totalCritWeight = Math.round(totalCritWeight * 100) / 100;

      if (policy === WeightPolicy.EXACT_100 && totalCritWeight !== 100) {
        errors.push({
          code: 'INVALID_WEIGHT_TOTAL',
          path: `kpis[${kpi.kpi_id}].criteria`,
          message: 'Enabled criterion weights within a KPI must total 100%.',
          details: { kpi_id: kpi.kpi_id, actual: totalCritWeight, expected: 100 },
        });
      } else if (policy === WeightPolicy.LE_100 && totalCritWeight > 100) {
        errors.push({
          code: 'INVALID_WEIGHT_TOTAL',
          path: `kpis[${kpi.kpi_id}].criteria`,
          message: 'Enabled criterion weights within a KPI cannot exceed 100%.',
          details: { kpi_id: kpi.kpi_id, actual: totalCritWeight, max: 100 },
        });
      }
    }

    totalKpiWeight = Math.round(totalKpiWeight * 100) / 100;

    if (policy === WeightPolicy.EXACT_100 && totalKpiWeight !== 100) {
      errors.push({
        code: 'INVALID_WEIGHT_TOTAL',
        path: 'kpis',
        message: 'KPI weights must total 100%.',
        details: { actual: totalKpiWeight, expected: 100 },
      });
    } else if (policy === WeightPolicy.LE_100 && totalKpiWeight > 100) {
      errors.push({
        code: 'INVALID_WEIGHT_TOTAL',
        path: 'kpis',
        message: 'KPI weights cannot exceed 100%.',
        details: { actual: totalKpiWeight, max: 100 },
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate Workflow Definition graph structure
   */
  public static validateWorkflowGraph(
    states: WorkflowState[],
    transitions: WorkflowTransition[]
  ): ValidationResult {
    const errors: ValidationErrorDetail[] = [];
    const warnings: ValidationErrorDetail[] = [];

    if (!states || states.length === 0) {
      errors.push({
        code: 'INVALID_WORKFLOW',
        path: 'states',
        message: 'Workflow must have at least one state.',
      });
      return { valid: false, errors, warnings };
    }

    const stateCodes = new Set<string>();
    let initialCount = 0;
    let terminalCount = 0;

    for (const state of states) {
      if (stateCodes.has(state.code)) {
        errors.push({
          code: 'DUPLICATE_WORKFLOW_STATE',
          path: `states[${state.code}]`,
          message: `Duplicate state code: ${state.code}`,
        });
      }
      stateCodes.add(state.code);

      if (state.type === WorkflowStateType.INITIAL) {
        initialCount++;
      } else if (state.type === WorkflowStateType.TERMINAL) {
        terminalCount++;
      }
    }

    if (initialCount === 0) {
      errors.push({
        code: 'INVALID_WORKFLOW',
        path: 'states',
        message: 'Workflow must have at least one INITIAL state.',
      });
    }

    if (terminalCount === 0) {
      warnings.push({
        code: 'NO_TERMINAL_STATE',
        path: 'states',
        message: 'Workflow has no state explicitly marked as TERMINAL.',
      });
    }

    // Validate transitions
    const actionMap = new Map<string, Set<string>>(); // from_state -> actions

    for (const tr of transitions) {
      if (!stateCodes.has(tr.from_state)) {
        errors.push({
          code: 'INVALID_WORKFLOW_TRANSITION',
          path: `transitions[${tr.from_state}->${tr.to_state}]`,
          message: `Source state '${tr.from_state}' does not exist in workflow states.`,
        });
      }
      if (!stateCodes.has(tr.to_state)) {
        errors.push({
          code: 'INVALID_WORKFLOW_TRANSITION',
          path: `transitions[${tr.from_state}->${tr.to_state}]`,
          message: `Target state '${tr.to_state}' does not exist in workflow states.`,
        });
      }

      if (!actionMap.has(tr.from_state)) {
        actionMap.set(tr.from_state, new Set());
      }
      const existingActions = actionMap.get(tr.from_state)!;
      if (existingActions.has(tr.action)) {
        errors.push({
          code: 'DUPLICATE_WORKFLOW_ACTION',
          path: `transitions[${tr.from_state}]`,
          message: `Action '${tr.action}' is defined multiple times for state '${tr.from_state}'.`,
        });
      }
      existingActions.add(tr.action);
    }

    // Check reachability from initial state(s)
    const initialStates = states.filter((s) => s.type === WorkflowStateType.INITIAL).map((s) => s.code);
    const reachable = new Set<string>(initialStates);
    const queue = [...initialStates];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const outgoing = transitions.filter((tr) => tr.from_state === current);
      for (const tr of outgoing) {
        if (!reachable.has(tr.to_state)) {
          reachable.add(tr.to_state);
          queue.push(tr.to_state);
        }
      }
    }

    for (const state of states) {
      if (!reachable.has(state.code)) {
        errors.push({
          code: 'UNREACHABLE_WORKFLOW_STATE',
          path: `states[${state.code}]`,
          message: `State '${state.code}' is unreachable from initial state(s).`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
