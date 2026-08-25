import { postApi } from './api-client';
import type { LoginRequest, LoginResponse, SignupRequest, WireUser } from './auth-types';

export const authApi = {
  login: (body: LoginRequest): Promise<LoginResponse> =>
    postApi<LoginResponse>('/api/auth/login', body),

  signup: (body: SignupRequest): Promise<WireUser> =>
    postApi<WireUser>('/api/auth/signup', body),
};
