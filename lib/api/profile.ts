import { apiClient } from './client';

export interface SocialLinks {
  facebook?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  whatsapp?: string | null;
}

export interface UserProfile {
  id: number;
  userId: number;
  username: string;
  aboutMe: string;
  contactInfo?: string;
  socialLinks?: SocialLinks;
  profilePhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface ProfileResponse {
  profile: UserProfile | null;
}

export interface PublicProfile {
  id: number;
  userId: number;
  username: string;
  aboutMe: string;
  contactInfo?: string;
  socialLinks?: SocialLinks;
  profilePhotoUrl: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  location: string;
}

export async function getMyProfile(): Promise<ProfileResponse> {
  return apiClient.get<ProfileResponse>('/api/profile/me');
}

export async function getProfileByUsername(username: string): Promise<PublicProfile> {
  return apiClient.get<PublicProfile>(`/api/agents/${encodeURIComponent(username)}`);
}

export async function setupProfile(data: {
  username: string;
  aboutMe?: string;
  socialLinks?: SocialLinks;
}): Promise<{ message: string; username: string }> {
  return apiClient.post<{ message: string; username: string }>('/api/profile/setup', data);
}

export async function updateProfile(data: {
  aboutMe?: string;
  socialLinks?: SocialLinks;
}): Promise<{ message: string }> {
  return apiClient.patch<{ message: string }>('/api/profile/me', data);
}
