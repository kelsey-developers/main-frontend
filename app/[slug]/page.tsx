'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import { agentProfile } from '@/lib/agentMockData';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { useAgentProfile } from '@/contexts/AgentProfileContext';
import ProfileHeader from './components/ProfileHeader';
import AgentPropertyCard from './components/AgentPropertyCard';

export default function AgentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { isAgent } = useMockAuth();
  const { name, tagline, bio, socialLinks } = useAgentProfile();

  return (
    <div className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen bg-white`}>
      {/* Profile Header */}
      <ProfileHeader
        name={name}
        tagline={tagline}
        bio={bio}
        avatarUrl={agentProfile.avatarUrl}
        location={agentProfile.location}
        socialLinks={socialLinks}
        isAgentView={isAgent}
        slug={slug}
        onEditClick={() => router.push(`/${slug}/edit`)}
      />

      {/* Property Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <h2
            className="text-xl sm:text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'Poppins', fontWeight: 700 }}
          >
            My Properties
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {agentProfile.assignedProperties.map((property) => (
            <AgentPropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>
    </div>
  );
}
