import type { Metadata } from 'next';
import AboutPageClient from '@/app/about/AboutPageClient';

export const metadata: Metadata = {
  title: "About | Kelsey's Homestay",
  description: "Learn about Kelsey's Homestay, our mission, and how we help guests find their perfect stay.",
};

export default function AboutPage() {
  return <AboutPageClient />;
}