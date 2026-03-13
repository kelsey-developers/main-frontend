import { apiClient } from './client';

/** Upload a proof file (image or PDF) for payout. Returns the public URL. */
export async function uploadProofFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('proof', file);
  const res = await apiClient.post<{ url: string }>('/api/upload/proof', formData);
  if (!res?.url) throw new Error('Upload failed: no URL returned');
  return res.url;
}
