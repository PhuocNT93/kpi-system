import { Action, Actor, IAuthorizer, Resource } from './types.js';

export class RbacAuthorizer implements IAuthorizer {
  authorize(actor: Actor, action: Action, resource?: Resource): boolean {
    if (!actor || !actor.userId) {
      return false;
    }

    if (actor.role === 'SYSTEM_ADMIN' || actor.role === 'HR_ADMIN') {
      return true;
    }

    if (actor.role === 'MANAGER') {
      if (action === 'READ' || action === 'UPDATE' || action === 'APPROVE' || action === 'SUBMIT' || action === 'CALIBRATE') {
        if (!resource) {
          return true;
        }

        if (resource.ownerEmployeeId && actor.employeeId && resource.ownerEmployeeId === actor.employeeId) {
          return true;
        }

        if (resource.teamId && actor.managedTeamIds && actor.managedTeamIds.includes(resource.teamId)) {
          return true;
        }
      }
      return false;
    }

    if (actor.role === 'EMPLOYEE') {
      if (action === 'READ' || action === 'UPDATE' || action === 'SUBMIT') {
        if (!resource) {
          return true;
        }
        if (resource.ownerEmployeeId && actor.employeeId && resource.ownerEmployeeId === actor.employeeId) {
          return true;
        }
      }
      return false;
    }

    return false;
  }
}
