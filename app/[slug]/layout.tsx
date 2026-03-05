'use client';

import { AgentProfileProvider } from '@/contexts/AgentProfileContext';

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return <AgentProfileProvider>{children}</AgentProfileProvider>;
}
