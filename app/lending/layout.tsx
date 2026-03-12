import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';

export default function LendingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen bg-gray-50 font-poppins`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
        {children}
      </div>
    </main>
  );
}
