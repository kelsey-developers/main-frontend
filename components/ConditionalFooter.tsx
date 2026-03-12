'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/Footer';

const HIDE_FOOTER_PREFIXES = [
  '/login',
  '/signup',
  '/sales-report/finance',
  '/sales-report/inventory',
  '/cleaning/', // Job detail and cleaning workflow — private dashboard, no marketing footer
];

export default function ConditionalFooter() {
  const pathname = usePathname();
  const hideFooter =
    HIDE_FOOTER_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
  if (hideFooter) return null;
  return <Footer />;
}
