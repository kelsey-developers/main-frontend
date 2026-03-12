'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Agent registration config has been merged into the Agents page.
 * Redirect to /admin/agents (Settings button opens registration fee, referral structure, commission config, per-agent override).
 */
export default function AgentRegistrationRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/agents');
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent mx-auto" />
        <p className="mt-3 text-sm text-gray-500">Redirecting to Agents...</p>
      </div>
    </div>
  );
}
