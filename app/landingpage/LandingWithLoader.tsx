'use client';

import { useState, useEffect } from 'react';
import Landingpage from '@/app/landingpage/page';

/** Shows a loading screen then the landing page. Used when logged out at root (/). */
export default function LandingWithLoader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent mb-4" />
          <p className="text-gray-600" style={{ fontFamily: 'var(--font-poppins)' }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return <Landingpage />;
}
