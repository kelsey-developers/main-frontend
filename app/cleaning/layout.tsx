import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';

/**
 * Cleaning section layout: navbar offset, full-height background, Poppins typography.
 * Matches agent hub design system: gray-50 bg, max-w-7xl container, consistent padding.
 */
export default function CleaningLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen bg-gray-50 font-poppins overflow-visible`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
        {children}
      </div>
    </main>
  );
}
