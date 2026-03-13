import { apiClient } from './client';

export interface PendingRegistration {
  id: string;
  fullname: string;
  email: string;
  contactNumber: string;
  recruitedById?: string;
  recruitedByName?: string;
  registrationFeeStatus: 'unpaid' | 'paid';
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  notes?: string;
  proofOfPaymentUrl?: string;
}

/** Admin only. Get all agent registrations from agent_registration table. */
export async function getAdminRegistrations(): Promise<PendingRegistration[]> {
  return apiClient.get('/api/agents/register/pending');
}

/** Admin only. Approve a pending registration. */
export async function approveAdminRegistration(registrationId: string): Promise<void> {
  await apiClient.patch(`/api/agents/register/${registrationId}/approve`, {});
}

/** Admin only. Reject a pending registration. */
export async function rejectAdminRegistration(registrationId: string, reason: string): Promise<void> {
  await apiClient.patch(`/api/agents/register/${registrationId}/reject`, { reason });
}
