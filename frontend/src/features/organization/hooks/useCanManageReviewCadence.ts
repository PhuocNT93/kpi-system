import { useAuth } from '../../../shared/auth/auth-context';

/** UX-only gate: HR/Admin may change the cadence override. The backend remains the authority (403). */
export function useCanManageReviewCadence(): boolean {
  const { user } = useAuth();
  return user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
}
