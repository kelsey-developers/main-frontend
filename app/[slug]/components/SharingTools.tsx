'use client';

import React from 'react';
import SharePanel from '@/components/SharePanel';

interface SharingToolsProps {
  slug: string;
  isAgentView: boolean;
  referralCode?: string;
}

const SharingTools: React.FC<SharingToolsProps> = ({ slug, isAgentView, referralCode }) => {
  return (
    <SharePanel
      slug={slug}
      referralCode={referralCode}
      showDownload={isAgentView}
      variant="section"
    />
  );
};

export default SharingTools;
