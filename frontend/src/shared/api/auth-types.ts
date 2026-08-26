// Auth wire types (snake_case — matches backend contract)
export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  id_token: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface WireUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  user: WireUser;
}
