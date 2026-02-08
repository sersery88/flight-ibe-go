'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Plane, MapPin, TrendingUp, Shield } from 'lucide-react';
import { SearchForm } from '@/components/flight/search-form';

// ============================================================================
// Popular Destinations
// ============================================================================

const POPULAR_DESTINATIONS = [
  { city: 'Barcelona', code: 'BCN', country: 'Spanien', emoji: '🇪🇸' },
  { city: 'London', code: 'LHR', country: 'Großbritannien', emoji: '🇬🇧' },
  { city: 'Paris', code: 'CDG', country: 'Frankreich', emoji: '🇫🇷' },
  { city: 'New York', code: 'JFK', country: 'USA', emoji: '🇺🇸' },
  { city: 'Bangkok', code: 'BKK', country: 'Thailand', emoji: '🇹🇭' },
  { city: 'Rom', code: 'FCO', country: 'Italien', emoji: '🇮🇹' },
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

  const handleSearch = () => {
    // Navigation is handled in SearchForm
  };

  const handleSearchComplete = () => {
    // Data loading complete
  };

  const handleDestinationClick = (code: string) => {
    router.push(`/results?destination=${code}`);
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

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
              {POPULAR_DESTINATIONS.map((dest, index) => (
                <motion.button
                  key={dest.code}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleDestinationClick(dest.code)}
                  className="group relative flex flex-col items-start overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-left transition-all duration-200 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700 sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
                  aria-label={`Flüge nach ${dest.city} suchen`}
                >
                  <span className="relative text-2xl sm:text-3xl transition-transform duration-200 group-hover:scale-110">{dest.emoji}</span>
                  <span className="relative mt-2 text-sm font-bold text-gray-800 dark:text-gray-200 sm:text-base">
                    {dest.city}
                  </span>
                  <span className="relative text-xs text-gray-500 dark:text-gray-400">
                    {dest.country} · {dest.code}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
