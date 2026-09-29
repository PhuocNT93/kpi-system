import { describe, expect, it } from 'vitest';
import { humanizeRoleCode, roleLabelKey } from '../role-label';

describe('role-label', () => {
  it('humanizes role codes', () => {
    expect(humanizeRoleCode('SYSTEM_ADMIN')).toBe('System Admin');
    expect(humanizeRoleCode('HR_ADMIN')).toBe('HR Admin');
    expect(humanizeRoleCode('MANAGER')).toBe('Manager');
    expect(humanizeRoleCode('EMPLOYEE')).toBe('Employee');
  });

  it('builds the shared translation key', () => {
    expect(roleLabelKey('HR_ADMIN')).toBe('common.role_label.hr_admin');
  });
});
