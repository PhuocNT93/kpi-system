import { getApi, postApi } from '../../../shared/api/api-client';
import type {
  CalibrationSession,
  CalibrationSessionDetail,
  CreateSessionDTO,
  CreateAdjustmentDTO,
} from '../types/calibration-types';

export const calibrationApi = {
  listSessions: async (cycleId: string): Promise<CalibrationSession[]> => {
    return getApi<CalibrationSession[]>(`/api/calibration/sessions?cycle_id=${encodeURIComponent(cycleId)}`);
  },

  getSessionDetail: async (sessionId: string): Promise<CalibrationSessionDetail> => {
    return getApi<CalibrationSessionDetail>(`/api/calibration/sessions/${encodeURIComponent(sessionId)}`);
  },

  createSession: async (data: CreateSessionDTO): Promise<CalibrationSession> => {
    return postApi<CalibrationSession>('/api/calibration/sessions', data);
  },

  adjustScore: async (sessionId: string, data: CreateAdjustmentDTO): Promise<CalibrationSessionDetail> => {
    return postApi<CalibrationSessionDetail>(`/api/calibration/sessions/${encodeURIComponent(sessionId)}/adjustments`, data);
  },

  finalizeSession: async (sessionId: string): Promise<CalibrationSession> => {
    return postApi<CalibrationSession>(`/api/calibration/sessions/${encodeURIComponent(sessionId)}/finalize`, {});
  },
};
