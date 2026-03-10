'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { agentProfile } from '@/lib/agentMockData';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';

/**
 * /agent/profile — redirects the logged-in agent to their public profile page.
 * When connected to a real backend, replace agentProfile.slug with the
 * authenticated user's slug from your auth context.
 */
export default function AgentProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${agentProfile.slug}`);
  }, [router]);

  return (
    <div className={`${LAYOUT_NAVBAR_OFFSET} flex items-center justify-center min-h-screen bg-gray-50`}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
    </div>
  );
}
