import { apiClient } from './client';

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface UserInfo {
  id: number;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phone: string | null;
  status: string;
  roles: string[];
  createdAt: string;
}

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/api/auth/login', { email, password });
}

export async function getUserInfoApi(token: string): Promise<UserInfo> {
  return apiClient.get<UserInfo>('/api/auth/userinfo', { token });
}
