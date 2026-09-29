// Readable role names come from i18n (`common.role_label.<code>`); when a code has no
// translation yet, fall back to a humanized code: SYSTEM_ADMIN -> "System Admin", HR_ADMIN -> "HR Admin".
export const roleLabelKey = (roleCode: string): string => `common.role_label.${roleCode.toLowerCase()}`;

export const humanizeRoleCode = (roleCode: string): string =>
  roleCode
    .split('_')
    .filter(Boolean)
    .map((word) => (word.length <= 2 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ');
