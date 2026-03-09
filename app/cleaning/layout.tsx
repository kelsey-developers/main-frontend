import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';

export default function CleaningLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen bg-gray-50`} style={{ fontFamily: 'var(--font-poppins)' }}>
      {children}
    </main>
  );
}
