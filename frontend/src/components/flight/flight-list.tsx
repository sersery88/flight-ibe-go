'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Plane, AlertCircle, SearchX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { FlightCard } from './flight-card';
import type { FlightOffer } from '@/types/flight';

// ============================================================================
// Skeleton Flight Card — shimmer loading placeholder
// ============================================================================

function SkeletonFlightCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 animate-pulse">
      {/* Outbound row */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-14" />
            <div className="flex-1 flex items-center gap-1">
              <Skeleton className="h-1.5 w-1.5 rounded-full shrink-0" />
              <Skeleton className="h-[2px] flex-1" />
              <Skeleton className="h-3 w-3 shrink-0" />
            </div>
            <Skeleton className="h-5 w-14" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-8" />
            <div className="flex-1 flex justify-center">
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
        <Skeleton className="h-5 w-14 rounded-full shrink-0" />
      </div>

      {/* Dashed separator */}
      <div className="my-2.5 border-t border-dashed border-border/40" />

      {/* Return row */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-14" />
            <div className="flex-1 flex items-center gap-1">
              <Skeleton className="h-1.5 w-1.5 rounded-full shrink-0" />
              <Skeleton className="h-[2px] flex-1" />
              <Skeleton className="h-3 w-3 shrink-0" />
            </div>
            <Skeleton className="h-5 w-14" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-8" />
            <div className="flex-1 flex justify-center">
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
        <Skeleton className="h-5 w-14 rounded-full shrink-0" />
      </div>

      {/* Footer: fare + price + CTA */}
      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-12 rounded hidden sm:block" />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right space-y-1">
            <Skeleton className="h-6 w-20 ml-auto" />
            <Skeleton className="h-3 w-10 ml-auto" />
          </div>
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Flight List Component
// ============================================================================

interface FlightListProps {
  offers: FlightOffer[];
  isLoading?: boolean;
  error?: Error | null;
  selectedOfferId?: string;
  onSelectOffer: (offer: FlightOffer) => void;
  showPriceCalendar?: boolean;
  onTogglePriceCalendar?: () => void;
  priceCalendarContent?: React.ReactNode;
  className?: string;
}

export function FlightList({
  offers,
  isLoading,
  error,
  selectedOfferId,
  onSelectOffer,
  className,
}: FlightListProps) {
  // Loading State
  if (isLoading) {
    return (
      <div className={className}>
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3">
          <motion.div
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Plane className="h-4 w-4 -rotate-45 text-pink-500" />
          </motion.div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">Suche läuft…</span>
            <span className="text-xs text-muted-foreground">Wir finden die besten Flüge für dich</span>
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
            >
              <SkeletonFlightCard />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={className}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/20 p-8 sm:p-12 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">Fehler bei der Suche</h3>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            {error.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.'}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Tipp: Prüfe deine Internetverbindung und versuche es nochmal.
          </p>
        </motion.div>
      </div>
    );
  }

  // Empty State
  if (offers.length === 0) {
    return (
      <div className={className}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center rounded-2xl border border-border bg-card p-8 sm:p-12 text-center"
        >
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <SearchX className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">Keine Flüge gefunden</h3>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            Für diese Strecke und Daten sind leider keine Flüge verfügbar.
          </p>
          <div className="mt-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 px-5 py-4 text-left max-w-xs w-full">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Tipps:</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-pink-500 mt-0.5">•</span>
                <span>Andere Reisedaten ausprobieren</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-500 mt-0.5">•</span>
                <span>Umliegende Flughäfen prüfen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-500 mt-0.5">•</span>
                <span>Filter zurücksetzen</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    );
  }

  // Results
  return (
    <div className={className}>
      {/* Flight count */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground sm:text-sm">
          <span className="font-bold text-foreground">{offers.length}</span> {offers.length === 1 ? 'Flug' : 'Flüge'} gefunden
        </span>
      </div>

      {/* Flight cards with staggered animation */}
      <AnimatePresence mode="popLayout">
        <div className="w-full space-y-3">
          {offers.map((offer, index) => (
            <motion.div
              key={offer.id}
              layout
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                delay: Math.min(index * 0.04, 0.3),
                duration: 0.3,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="w-full"
            >
              <FlightCard
                offer={offer}
                onSelect={onSelectOffer}
                isSelected={offer.id === selectedOfferId}
              />
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}
