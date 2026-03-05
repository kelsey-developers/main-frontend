'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { agentProfile } from '@/lib/agentMockData';
import type { AgentSocialLinks } from '@/types/agent';

interface AgentProfileState {
  name: string;
  tagline: string;
  bio: string;
  socialLinks: AgentSocialLinks;
}

interface AgentProfileContextValue extends AgentProfileState {
  updateProfile: (data: Partial<AgentProfileState>) => void;
}

const AgentProfileContext = createContext<AgentProfileContextValue | null>(null);

export function AgentProfileProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState(agentProfile.name);
  const [tagline, setTagline] = useState(agentProfile.tagline);
  const [bio, setBio] = useState(agentProfile.bio);
  const [socialLinks, setSocialLinks] = useState<AgentSocialLinks>(agentProfile.socialLinks);

  const updateProfile = useCallback((data: Partial<AgentProfileState>) => {
    if (data.name !== undefined) setName(data.name);
    if (data.tagline !== undefined) setTagline(data.tagline);
    if (data.bio !== undefined) setBio(data.bio);
    if (data.socialLinks !== undefined) setSocialLinks(data.socialLinks);
  }, []);

  const value = useMemo<AgentProfileContextValue>(
    () => ({ name, tagline, bio, socialLinks, updateProfile }),
    [name, tagline, bio, socialLinks, updateProfile]
  );

  return (
    <AgentProfileContext.Provider value={value}>
      {children}
    </AgentProfileContext.Provider>
  );
}

export function useAgentProfile(): AgentProfileContextValue {
  const ctx = useContext(AgentProfileContext);
  if (!ctx) {
    throw new Error('useAgentProfile must be used within AgentProfileProvider');
  }
  return ctx;
}
