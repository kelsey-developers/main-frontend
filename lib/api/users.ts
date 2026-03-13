import { apiClient } from './client';

export interface UserListItem {
  id: number;
  firstName: string;
  lastName: string;
  fullname: string;
  email: string;
  phone?: string;
  status: string;
  createdAt: string;
  roles: string[];
  bookingCount?: number;
  subAgentCount?: number;
  agentLevel?: number;
  totalCommissions?: number;
}

export interface ListUsersParams {
  role?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListUsersResponse {
  users: UserListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** Admin only. List users with optional role filter. When role=Agent, includes bookingCount, subAgentCount, agentLevel. */
export async function listUsers(params?: ListUsersParams): Promise<ListUsersResponse> {
  const qs = new URLSearchParams();
  if (params?.role) qs.set('role', params.role);
  if (params?.search) qs.set('search', params.search);
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const url = `/api/users${qs.toString() ? `?${qs}` : ''}`;
  return apiClient.get(url);
}

/** Admin only. Update user. Supports status (active|inactive|suspended), firstName, lastName, email, role. */
export async function updateUser(
  userId: string,
  updates: { status?: 'active' | 'inactive' | 'suspended'; firstName?: string; lastName?: string; email?: string; role?: string }
): Promise<UserListItem> {
  const body: Record<string, unknown> = {};
  if (updates.status != null) body.status = updates.status;
  if (updates.firstName != null) body.firstName = updates.firstName;
  if (updates.lastName != null) body.lastName = updates.lastName;
  if (updates.email != null) body.email = updates.email;
  if (updates.role != null) body.role = updates.role;
  return apiClient.patch(`/api/users/${userId}`, body);
}
