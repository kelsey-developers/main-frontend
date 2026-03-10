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
  // Server actions run server-side and hit the backend directly via API_URL.
  // Browser calls go through the Next.js proxy route at /api/login.
  const endpoint = typeof window === 'undefined' ? '/api/auth/login' : '/api/login';
  return apiClient.post<LoginResponse>(endpoint, { email, password });
}

export interface SignupPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  street?: string;
  barangay?: string;
  city?: string;
  zipCode?: string;
}

export async function signupApi(payload: SignupPayload): Promise<{ message: string }> {
  const endpoint = typeof window === 'undefined' ? '/api/auth/register' : '/api/signup';
  return apiClient.post<{ message: string }>(endpoint, payload);
}

export async function getUserInfoApi(token: string): Promise<UserInfo> {
  return apiClient.get<UserInfo>('/api/auth/userinfo', { token });
}
