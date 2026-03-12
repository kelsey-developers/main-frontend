'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { AgentProperty } from '@/types/agent';

interface AgentPropertyCardProps {
  property: AgentProperty;
  referralCode?: string;
}

const AgentPropertyCard: React.FC<AgentPropertyCardProps> = ({ property, referralCode }) => {
  const router = useRouter();

  const buildUrl = (base: string) =>
    referralCode ? `${base}&ref=${referralCode}` : base;

  const handleClick = () => {
    router.push(buildUrl(`/unit-view?id=${property.id}`));
  };

  return (
    <article
      onClick={handleClick}
      className="group cursor-pointer"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
        <div
          className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: `url('${property.image}')` }}
        />
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-sm text-gray-500">
          {property.location}
        </p>
        <h3 className="font-medium text-gray-900 line-clamp-2">
          {property.title}
        </h3>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">
            {property.currency} {property.price.toLocaleString()}
          </span>
          <span className="text-gray-400"> / {property.priceUnit}</span>
        </p>
      </div>
    </article>
  );
};

export default AgentPropertyCard;
