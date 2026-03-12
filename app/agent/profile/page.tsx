'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyProfile } from '@/lib/api/profile';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import { agentProfile } from '@/lib/agentMockData';
import { AgentProfileProvider, useAgentProfile } from '@/contexts/AgentProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import ProfileHeader from '@/app/[slug]/components/ProfileHeader';
import AgentPropertyCard from '@/app/[slug]/components/AgentPropertyCard';

function AgentProfileContent() {
  const router = useRouter();
  const { isAgent } = useAuth();
  const { name, tagline, bio, socialLinks } = useAgentProfile();
  const slug = agentProfile.slug;

  return (
    <div className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen bg-white`}>
      <ProfileHeader
        name={name}
        tagline={tagline}
        bio={bio}
        avatarUrl={agentProfile.avatarUrl}
        location={agentProfile.location}
        socialLinks={socialLinks}
        isAgentView={isAgent}
        slug={slug}
        referralCode={isAgent ? agentProfile.referralCode : undefined}
        onEditClick={() => router.push(`/${slug}/edit`)}
      />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>
            My Properties
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {agentProfile.assignedProperties.map((property) => (
            <AgentPropertyCard
              key={property.id}
              property={property}
              referralCode={isAgent ? agentProfile.referralCode : undefined}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * /agent/profile — shows the agent's public profile (agentProfile mock data).
 * If user has a real profile from API, redirects to /agent/{username}.
 */
export default function AgentProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasApiProfile, setHasApiProfile] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((res) => {
        if (res.profile) {
          setHasApiProfile(true);
          router.replace(`/agent/${res.profile.username}`);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading || hasApiProfile) {
    return (
      <div className={`${LAYOUT_NAVBAR_OFFSET} flex items-center justify-center min-h-screen bg-gray-50`}>
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <AgentProfileProvider>
      <AgentProfileContent />
    </AgentProfileProvider>
  );
}
