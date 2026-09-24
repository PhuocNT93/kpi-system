/**
 * Single definition of which employees a cycle applies to (LLD §10.3 / Sequence Diagram §3):
 * ACTIVE employees, restricted by each non-empty applicable list (employees AND teams AND roles).
 *
 * `buildApplicableEmployeeConditions` is the SQL form used when opening a batch cycle;
 * `isEmployeeInApplicableScope` is the in-memory form used for employees already loaded in the
 * transaction (e.g. upcoming batch cycle warnings). Both must stay equivalent.
 */
export interface ApplicableEmployeeScope {
  applicableEmployeeIds: string[] | null;
  applicableTeamIds: string[] | null;
  applicableRoleIds: string[] | null;
}

export interface ScopedEmployee {
  employeeId: string;
  teamId: string | null;
  roleId: string | null;
  employmentStatus: string;
}

export const ACTIVE_EMPLOYMENT_STATUS = 'ACTIVE';

export interface ApplicableEmployeeConditions {
  /** SQL conditions over unaliased `employee` columns, to be joined with AND. */
  conditions: string[];
  values: unknown[];
}

export function buildApplicableEmployeeConditions(scope: ApplicableEmployeeScope): ApplicableEmployeeConditions {
  const conditions: string[] = [`employment_status = '${ACTIVE_EMPLOYMENT_STATUS}'`];
  const values: unknown[] = [];
  let idx = 1;

  if (scope.applicableEmployeeIds && scope.applicableEmployeeIds.length > 0) {
    conditions.push(`employee_id = ANY($${idx++}::uuid[])`);
    values.push(scope.applicableEmployeeIds);
  }

  if (scope.applicableTeamIds && scope.applicableTeamIds.length > 0) {
    conditions.push(`team_id = ANY($${idx++}::uuid[])`);
    values.push(scope.applicableTeamIds);
  }

  if (scope.applicableRoleIds && scope.applicableRoleIds.length > 0) {
    conditions.push(`role_id = ANY($${idx++}::uuid[])`);
    values.push(scope.applicableRoleIds);
  }

  return { conditions, values };
}

function matchesList(list: string[] | null, value: string | null): boolean {
  if (!list || list.length === 0) {
    return true;
  }
  return value !== null && list.includes(value);
}

export function isEmployeeInApplicableScope(scope: ApplicableEmployeeScope, employee: ScopedEmployee): boolean {
  return (
    employee.employmentStatus === ACTIVE_EMPLOYMENT_STATUS &&
    matchesList(scope.applicableEmployeeIds, employee.employeeId) &&
    matchesList(scope.applicableTeamIds, employee.teamId) &&
    matchesList(scope.applicableRoleIds, employee.roleId)
  );
}
