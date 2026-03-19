'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type RevealOnViewProps = {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  once?: boolean;
};

function RevealOnView({ children, className = '', delayMs = 0, once = true }: RevealOnViewProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.18 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={`transform-gpu transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}

interface StatItem {
  value: string;
  label: string;
}

interface PillarItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface ServiceItem {
  title: string;
  description: string;
  image: string;
  alt: string;
}

interface StepItem {
  title: string;
  description: string;
}

interface ReviewItem {
  stars: string;
  quote: string;
  name: string;
  subLabel: string;
  avatar: string;
}

const stats: StatItem[] = [
  { value: '500+', label: 'Active Listings' },
  { value: '3,200+', label: 'Happy Guests' },
  { value: '120+', label: 'Verified Owners' },
  { value: '4.8★', label: 'Average Rating' },
  { value: '5 yrs', label: 'In Operation' },
];

const pillars: PillarItem[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 9.75V21h13.5V9.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 21v-6.75h4.5V21" />
      </svg>
    ),
    title: 'Our Mission',
    description:
      'Make every stay feel like home by connecting guests to trusted spaces and dependable service.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.5 2.4 4 5.6 4 9s-1.5 6.6-4 9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-2.5 2.4-4 5.6-4 9s1.5 6.6 4 9" />
      </svg>
    ),
    title: 'Our Vision',
    description:
      'Build a hospitality platform where booking, hosting, and support are simple, transparent, and accessible.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3l7.5 3v6c0 5-3.2 7.8-7.5 9-4.3-1.2-7.5-4-7.5-9V6L12 3z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: 'Our Promise',
    description:
      'Deliver a smooth end-to-end experience for guests, owners, and agents with reliable tools and support.',
  },
];

const services: ServiceItem[] = [
  {
    title: 'Verified Property Listings',
    description:
      'Every listing goes through verification, with clear photos, honest details, and accurate amenities.',
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&q=80',
    alt: 'Verified homestay listing',
  },
  {
    title: 'Seamless Booking Flow',
    description:
      'Search, select, and book in minutes with confirmations, reminders, and clear check-in information.',
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
    alt: 'Condo interior',
  },
  {
    title: 'Dedicated Guest Support',
    description:
      'Our support team is available throughout your stay for booking concerns, updates, and fast issue resolution.',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
    alt: 'Apartment interior',
  },
  {
    title: 'Agent & Owner Tools',
    description:
      'Manage bookings, earnings, and availability from one dashboard with workflows built for daily operations.',
    image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&q=80',
    alt: 'Business dashboard workflow',
  },
];

const steps: StepItem[] = [
  {
    title: 'Browse & Discover',
    description: 'Search by location, property type, amenities, and budget to find your ideal stay.',
  },
  {
    title: 'Book Instantly',
    description: 'Select dates, confirm your booking online, and receive complete stay details right away.',
  },
  {
    title: 'Check In Smoothly',
    description: 'Get timely reminders and clear check-in instructions before your arrival.',
  },
  {
    title: 'Enjoy & Review',
    description: 'Share your stay experience to help future guests and improve listings over time.',
  },
];

const reviews: ReviewItem[] = [
  {
    stars: '★★★★★',
    quote:
      'The apartment was exactly as shown in the photos — clean, comfortable, and well-equipped. Support responded within minutes.',
    name: 'Maria Reyes',
    subLabel: 'Stayed at Avida Tower 1',
    avatar: 'MR',
  },
  {
    stars: '★★★★★',
    quote:
      'As a property owner, bookings are easier to manage and communication is smoother. The platform saves us a lot of time.',
    name: 'Jerome Lim',
    subLabel: 'Property Owner, Davao City',
    avatar: 'JL',
  },
  {
    stars: '★★★★☆',
    quote:
      'The dashboard is clear, commissions are fair, and the team is responsive when issues come up. Great platform to grow with.',
    name: 'Anna Cruz',
    subLabel: 'Verified Agent',
    avatar: 'AC',
  },
];

export default function AboutPageClient() {
  return (
    <div className="min-h-screen bg-[#F7FAF9]" style={{ fontFamily: 'var(--font-poppins)' }}>
      <section className="relative overflow-hidden pt-24 sm:pt-28 lg:pt-32 pb-16 sm:pb-20 bg-gradient-to-br from-[#0D2E27] via-[#0B5858] to-[#177564]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: "url(/mr.jpg)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 80% 20%, rgba(250,204,21,0.16) 0%, transparent 55%), radial-gradient(circle at 10% 80%, rgba(34,197,94,0.16) 0%, transparent 52%)',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnView delayMs={60}>
            <span className="inline-flex items-center rounded-full border border-[#FACC15]/50 bg-[#FACC15]/15 text-[#FACC15] px-3 py-1 text-xs tracking-[0.14em] uppercase font-medium">
              About Kelsey&apos;s Homestay
            </span>
          </RevealOnView>

          <RevealOnView delayMs={140}>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-white max-w-4xl">
              Where Every Stay Feels Like <span className="text-[#FACC15]">Home</span>
            </h1>
          </RevealOnView>

          <RevealOnView delayMs={220}>
            <p className="mt-5 text-base sm:text-lg text-white/80 max-w-2xl leading-7">
              We connect guests with verified, comfortable properties across Davao and empower owners and agents with
              tools that make hosting simple and reliable.
            </p>
          </RevealOnView>

        </div>
      </section>

      <section className="bg-white border-y border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 grid grid-cols-2 md:grid-cols-5 gap-6">
          {stats.map((item, index) => (
            <RevealOnView key={item.label} delayMs={index * 90} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-[#0B5858]">{item.value}</p>
              <p className="mt-1 text-xs sm:text-sm uppercase tracking-[0.08em] text-gray-500">{item.label}</p>
            </RevealOnView>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <RevealOnView>
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#0B5858]">Our Foundation</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#0F2F28]">Guided by Purpose, Driven by People</h2>
          <p className="mt-4 text-gray-600 max-w-3xl leading-7">
            Everything we build traces back to core pillars that shape how we serve guests, owners, and agents every
            day.
          </p>
        </RevealOnView>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {pillars.map((pillar, index) => (
            <RevealOnView key={pillar.title} delayMs={index * 110}>
              <article className="h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-xl bg-[#0B5858]/10 text-[#0B5858] flex items-center justify-center">
                  {pillar.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#0B5858]">{pillar.title}</h3>
                <p className="mt-3 text-gray-600 leading-7 text-sm">{pillar.description}</p>
              </article>
            </RevealOnView>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <RevealOnView>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80"
                alt="Comfortable homestay room"
                className="w-full rounded-2xl object-cover aspect-[4/3] shadow-xl"
              />
              <div className="absolute -bottom-4 -right-3 rounded-xl bg-[#0B5858] text-white px-4 py-3 shadow-lg">
                <p className="text-2xl font-bold leading-tight">2019</p>
                <p className="text-xs text-white/85">Founded in Davao</p>
              </div>
            </div>
          </RevealOnView>

          <RevealOnView delayMs={120}>
            <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#0B5858]">Our Story</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#0F2F28]">
              Started with One Listing. Now We&apos;re a Community.
            </h2>
            <p className="mt-4 text-gray-600 leading-7">
              We started with a simple idea: make it easier to find a place that truly feels like home while traveling.
              Today, Kelsey&apos;s Homestay serves guests, owners, and agents through a trusted, transparent platform.
            </p>
            <p className="mt-3 text-gray-600 leading-7">
              We built this around verified listings, transparent pricing, and responsive support for every booking.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-gray-600">
              {[
                'Properties reviewed before listing',
                'Real-time availability and booking confirmations',
                'Dedicated support 7 days a week',
                'Fair commission model for agents and owners',
                'Secure payment handling and guest protection',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-[#0B5858] font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </RevealOnView>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <RevealOnView>
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#0B5858]">What We Do</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#0F2F28]">Built for Everyone in the Journey</h2>
          <p className="mt-4 text-gray-600 max-w-3xl leading-7">
            From discovery to checkout, we support smooth guest experiences and efficient owner-agent operations.
          </p>
        </RevealOnView>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {services.map((service, index) => (
            <RevealOnView key={service.title} delayMs={index * 80}>
              <article className="h-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all">
                <h3 className="text-base font-semibold text-[#0B5858]">{service.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-6">{service.description}</p>
              </article>
            </RevealOnView>
          ))}
        </div>
      </section>

      <section className="bg-[#0B5858]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <RevealOnView>
            <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#FACC15]">How It Works</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">Simple from Start to Stay</h2>
            <p className="mt-4 text-white/75 max-w-3xl leading-7">
              Whether you&apos;re a guest, owner, or agent, getting started takes only a few easy steps.
            </p>
          </RevealOnView>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((step, index) => (
              <RevealOnView key={step.title} delayMs={index * 100}>
                <article className="h-full rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-5">
                  <p className="text-[#FACC15]/70 text-3xl font-bold">{String(index + 1).padStart(2, '0')}</p>
                  <h3 className="mt-3 text-base font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-white/75 leading-6">{step.description}</p>
                </article>
              </RevealOnView>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <RevealOnView>
            <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#0B5858]">Guest Reviews</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#0F2F28]">What Our Guests Say</h2>
            <p className="mt-4 text-gray-600 max-w-3xl leading-7">
              Real stays and real feedback from guests, property owners, and agents.
            </p>
          </RevealOnView>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
            {reviews.map((review, index) => (
              <RevealOnView key={review.name} delayMs={index * 100}>
                <article className="h-full rounded-2xl border border-gray-200 bg-[#F7FAF9] p-6">
                  <p className="text-[#F59E0B] tracking-[0.18em]">{review.stars}</p>
                  <blockquote className="mt-3 text-sm text-gray-700 leading-7 italic">&ldquo;{review.quote}&rdquo;</blockquote>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0B5858] text-white text-sm font-semibold flex items-center justify-center">
                      {review.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F2F28]">{review.name}</p>
                      <p className="text-xs text-gray-500">{review.subLabel}</p>
                    </div>
                  </div>
                </article>
              </RevealOnView>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}