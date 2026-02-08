'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Plane, MapPin, TrendingUp, Shield } from 'lucide-react';
import { SearchForm } from '@/components/flight/search-form';
import { cn } from '@/lib/utils';

// ============================================================================
// Popular Routes (grouped by Swiss origin)
// ============================================================================

interface PopularRoute {
  city: string;
  destinationCode: string;
  country: string;
  image: string;
}

interface OriginGroup {
  origin: string;
  originCode: string;
  routes: PopularRoute[];
}

const POPULAR_ROUTES: OriginGroup[] = [
  {
    origin: 'Zürich',
    originCode: 'ZRH',
    routes: [
      { city: 'Barcelona', destinationCode: 'BCN', country: 'Spanien', image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=250&fit=crop' },
      { city: 'London', destinationCode: 'LHR', country: 'Großbritannien', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=250&fit=crop' },
      { city: 'Paris', destinationCode: 'CDG', country: 'Frankreich', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=250&fit=crop' },
      { city: 'New York', destinationCode: 'JFK', country: 'USA', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=250&fit=crop' },
      { city: 'Bangkok', destinationCode: 'BKK', country: 'Thailand', image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&h=250&fit=crop' },
      { city: 'Rom', destinationCode: 'FCO', country: 'Italien', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=250&fit=crop' },
    ],
  },
  {
    origin: 'Basel',
    originCode: 'BSL',
    routes: [
      { city: 'Mallorca', destinationCode: 'PMI', country: 'Spanien', image: 'https://images.unsplash.com/photo-1571057516885-1d865e5a3aae?w=400&h=250&fit=crop' },
      { city: 'London', destinationCode: 'LHR', country: 'Großbritannien', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=250&fit=crop' },
      { city: 'Berlin', destinationCode: 'BER', country: 'Deutschland', image: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=250&fit=crop' },
      { city: 'Amsterdam', destinationCode: 'AMS', country: 'Niederlande', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=250&fit=crop' },
      { city: 'Istanbul', destinationCode: 'IST', country: 'Türkei', image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&h=250&fit=crop' },
      { city: 'Lissabon', destinationCode: 'LIS', country: 'Portugal', image: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&h=250&fit=crop' },
    ],
  },
  {
    origin: 'Genf',
    originCode: 'GVA',
    routes: [
      { city: 'Paris', destinationCode: 'CDG', country: 'Frankreich', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=250&fit=crop' },
      { city: 'Barcelona', destinationCode: 'BCN', country: 'Spanien', image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=250&fit=crop' },
      { city: 'Marrakesch', destinationCode: 'RAK', country: 'Marokko', image: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=400&h=250&fit=crop' },
      { city: 'Dubai', destinationCode: 'DXB', country: 'VAE', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=250&fit=crop' },
      { city: 'Nizza', destinationCode: 'NCE', country: 'Frankreich', image: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=400&h=250&fit=crop' },
      { city: 'Athen', destinationCode: 'ATH', country: 'Griechenland', image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&h=250&fit=crop' },
    ],
  },
];

// ============================================================================
// Trust Features
// ============================================================================

const TRUST_FEATURES = [
  {
    icon: Shield,
    title: 'Sicher buchen',
    description: 'SSL-verschlüsselt & DSGVO-konform',
  },
  {
    icon: TrendingUp,
    title: '400+ Airlines',
    description: 'Weltweit die besten Preise vergleichen',
  },
  {
    icon: Plane,
    title: 'Seit 1994',
    description: '30+ Jahre Erfahrung im Reisemarkt',
  },
];

// ============================================================================
// Homepage
// ============================================================================

export default function HomePage() {
  const router = useRouter();
  const [activeOrigin, setActiveOrigin] = useState(0);

  const handleSearch = () => {
    // Navigation is handled in SearchForm
  };

  const handleSearchComplete = () => {
    // Data loading complete
  };

  const handleRouteClick = (originCode: string, destCode: string) => {
    const departure = new Date();
    departure.setDate(departure.getDate() + 7);
    const returnDate = new Date(departure);
    returnDate.setDate(returnDate.getDate() + 7);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    router.push(
      `/results?origin=${originCode}&destination=${destCode}&departure=${fmt(departure)}&return=${fmt(returnDate)}&adults=1&tripType=roundtrip`
    );
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative w-full overflow-visible">
        {/* Background — clean white/light gray */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-background" />

        {/* Subtle decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gray-100/50 blur-3xl dark:bg-gray-800/20" />
          <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-gray-100/30 blur-3xl dark:bg-gray-800/10" />
        </div>

        <div className="relative mx-auto w-full max-w-5xl px-4 pb-10 pt-10 sm:pb-16 sm:pt-20 md:pb-20 md:pt-28">
          {/* Hero Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 text-center sm:mb-10"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-1.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400 sm:text-sm">
              <Plane className="h-3.5 w-3.5 -rotate-45 sm:h-4 sm:w-4" />
              seit 1994 · Pink Travel AG
            </div>

            <h1 className="mb-3 text-3xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl md:text-5xl lg:text-6xl">
              Finde deinen{' '}
              <span className="text-pink-500">perfekten Flug</span>
            </h1>

            <p className="mx-auto max-w-lg text-sm text-gray-500 dark:text-gray-400 sm:text-base md:text-lg">
              Vergleiche Preise von über 400 Airlines weltweit — schnell, einfach und transparent.
            </p>
          </motion.div>

          {/* Search Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl shadow-gray-200/50 dark:border-gray-800 dark:bg-gray-900/95 dark:shadow-none sm:rounded-3xl sm:p-6"
          >
            <SearchForm
              onSearch={handleSearch}
              onSearchComplete={handleSearchComplete}
            />
          </motion.div>
        </div>
      </section>

      {/* Trust Features */}
      <section className="w-full border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            {TRUST_FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-white/60 dark:hover:bg-gray-800/40"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                  <feature.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{feature.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="w-full px-4 py-10 sm:py-16">
        <div className="mx-auto w-full max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <div className="mb-6 flex items-center gap-2 sm:mb-8">
              <MapPin className="h-5 w-5 text-gray-400" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 sm:text-2xl">
                Beliebte Ziele
              </h2>
            </div>

            {/* Origin Tabs */}
            <div className="mb-6 flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800 sm:mb-8">
              {POPULAR_ROUTES.map((group, index) => (
                <button
                  key={group.originCode}
                  onClick={() => setActiveOrigin(index)}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 sm:text-base',
                    activeOrigin === index
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  )}
                >
                  {index === activeOrigin && (
                    <Plane className="mr-1.5 inline-block h-3.5 w-3.5 -rotate-45 sm:h-4 sm:w-4" />
                  )}
                  Ab {group.origin}
                </button>
              ))}
            </div>

            {/* Destination Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
              {POPULAR_ROUTES[activeOrigin].routes.map((route, index) => (
                <motion.button
                  key={`${POPULAR_ROUTES[activeOrigin].originCode}-${route.destinationCode}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() =>
                    handleRouteClick(
                      POPULAR_ROUTES[activeOrigin].originCode,
                      route.destinationCode
                    )
                  }
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
                  aria-label={`Flüge von ${POPULAR_ROUTES[activeOrigin].origin} nach ${route.city} suchen`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={route.image}
                      alt={route.city}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <span className="text-sm font-bold text-white sm:text-base">
                        {route.city}
                      </span>
                      <span className="block text-xs text-white/80">
                        {route.country}
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
