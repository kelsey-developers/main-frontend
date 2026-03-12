'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PropertyCard from '@/components/PropertyCard';
import type { ListingView } from '@/types/listing';
import { listUnits } from '@/lib/api/units';

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

const RevealOnScroll: React.FC<RevealProps> = ({ children, className = '', delay = 0 }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-700 ease-out will-change-transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};


export default function Homepage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [featuredStays, setFeaturedStays] = useState<ListingView[]>([]);

  useEffect(() => {
    listUnits({ featured: true, limit: 3 })
      .then(setFeaturedStays)
      .catch(() => setFeaturedStays([]))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-30 pb-8 md:pt-30 md:pb-12 space-y-12">
          {/* Hero skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-4">
              <div className="h-10 sm:h-12 bg-gray-200 rounded-lg w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
              <div className="flex gap-3 mt-4">
                <div className="h-11 w-28 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-11 w-32 bg-gray-200 rounded-lg animate-pulse" />
              </div>
              <div className="mt-6 h-20 bg-gray-100 border border-gray-200 rounded-xl animate-pulse" />
            </div>
            <div className="h-64 md:h-80 lg:h-[22rem] bg-gray-200 rounded-2xl animate-pulse" />
          </div>

          {/* Categories skeleton */}
          <div className="space-y-6">
            <div className="h-8 bg-gray-200 rounded w-56 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-52 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>

          {/* Featured stays skeleton */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                  <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                    <div className="h-8 bg-gray-200 rounded-lg w-16 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-30 pb-8 md:pt-30 md:pb-12">
        <RevealOnScroll>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Image first on mobile, second on desktop */}
            <div className="order-1 lg:order-2 relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-200">
              <img
                src="/heroimage.png"
                alt="Modern living space with city view"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white/80" aria-hidden />
                <span className="w-2 h-2 rounded-full bg-white" aria-hidden />
                <span className="w-2 h-2 rounded-full bg-white/80" aria-hidden />
              </div>
            </div>
            {/* Text second on mobile, first on desktop */}
            <div className="order-2 lg:order-1">
              <h1
                className="text-4xl sm:text-3xl lg:text-5xl md:text-4xl font-bold text-[#0B5858] leading-tight mb-4"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Travel Made Simple Comfort Made Certain
              </h1>
              <p
                className="text-lg text-gray-600 mb-8 max-w-xl"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Finding the perfect stay made effortless. Trusted listings, comfort that feels like home.
              </p>
              <div className="flex flex-wrap gap-3 mb-10">
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-lg font-semibold text-black transition-all hover:opacity-90"
                  style={{ fontFamily: 'var(--font-poppins)', backgroundColor: '#FACC15' }}
                >
                  Get Started
                  <span aria-hidden> →</span>
                </Link>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>
    

      {/* Explore By Category */}
      <section className="max-w-7xl mx-auto px-4 sm:px-10 lg:px-8  py-16 pb-25 relative">
        <RevealOnScroll>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#0B5858] mb-2"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Explore By Category
              </h2>
              <p className="text-gray-600" style={{ fontFamily: 'var(--font-poppins)' }}>
                Discover the stays our guests love most.
              </p>
            </div>
          </div>
        </RevealOnScroll>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { title: 'Penthouse', image: '/penthouse.jpeg', href: '/listings?type=Penthouse' },
            { title: 'Condo', image: '/condo.jpeg', href: '/listings?type=condo' },
            { title: 'Apartment', image: '/apartment.jpeg', href: '/listings?type=Apartment' },
          ].map((cat, index) => (
            <RevealOnScroll key={cat.title} delay={index * 120}>
              <Link
                href={cat.href}
                className="group relative block aspect-[3/4] rounded-2xl overflow-hidden bg-gray-200 shadow-md hover:shadow-xl transition-shadow"
              >
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span
                  className="absolute bottom-4 left-4 text-xl font-bold text-white"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {cat.title}
                </span>
              </Link>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* Discover. Connect. Stay. */}
      <section className="w-full bg-gray-100 mx-auto py-16 border-y border-gray-200" style={{ boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)' }}>
        <RevealOnScroll className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#0B5858] mb-2"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Discover. Connect. Stay.
              </h2>
              <p className="text-gray-600" style={{ fontFamily: 'var(--font-poppins)' }}>
                Search, book, or be part of our community.
              </p>
            </div>
            
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { title: 'Find Properties', desc: 'Lorem ipsum dolor sit amet, item nobis neque ea autem.' },
              { title: 'Leave a Review', desc: 'Lorem ipsum dolor sit amet, item nobis neque ea autem.' },
              { title: 'Book a Stay', desc: 'Lorem ipsum dolor sit amet, item nobis neque ea autem.' },
              { title: 'Be Our Agent', desc: 'Lorem ipsum dolor sit amet, item nobis neque ea autem.' },
              { title: 'Be Our Guest', desc: 'Lorem ipsum dolor sit amet, item nobis neque ea autem.' },
            ].map((f, index) => (
              <RevealOnScroll key={f.title} delay={index * 120}>
                <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-[#0B5858]/10 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-[#0B5858]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-poppins)' }}>
                    {f.desc}
                  </p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </RevealOnScroll>
      </section>

      {/* Featured Stays */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pb-25">
        <RevealOnScroll>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#0B5858] mb-2"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Featured Stays
              </h2>
              <p className="text-gray-600" style={{ fontFamily: 'var(--font-poppins)' }}>
                Discover the stays our guests love most.
              </p>
            </div>
            <div className="flex justify-end bg-teal-800 px-5 py-2.5 rounded-lg hover:bg-teal-700 transition-all duration-300">
              <Link
                href="/listings"
                className="text-white font-medium"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                See All Listing
              </Link>
            </div>
          </div>
        </RevealOnScroll>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredStays.map((stay, i) => (
            <RevealOnScroll key={stay.id} delay={i * 120}>
              <PropertyCard
                apartment={stay}
                onApartmentClick={() => router.push(`/unit/${stay.id}`)}
              />
            </RevealOnScroll>
          ))}
        </div>
      </section>
    </div>
  );
}
