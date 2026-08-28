export interface EmployeeAssignmentSnapshot {
  employeeId: string;
  teamId: string;
  roleId: string;
  jobLevelId: string | null;
  managerId: string | null;
}

export interface TemplateCriterionSnapshotInfo {
  templateCriterionId: string;
  applicableRoleIds?: string[] | null;
  applicableTeamIds?: string[] | null;
  isDisabled: boolean;
}

export class CriterionApplicabilityResolver {
  public static isDisabledForEmployee(
    criterion: TemplateCriterionSnapshotInfo,
    employee: EmployeeAssignmentSnapshot
  ): boolean {
    if (criterion.isDisabled) {
      return true;
    }

    if (
      criterion.applicableRoleIds &&
      criterion.applicableRoleIds.length > 0 &&
      !criterion.applicableRoleIds.includes(employee.roleId)
    ) {
      return true;
    }

    if (
      criterion.applicableTeamIds &&
      criterion.applicableTeamIds.length > 0 &&
      !criterion.applicableTeamIds.includes(employee.teamId)
    ) {
      return true;
    }

    return false;
  }
}
