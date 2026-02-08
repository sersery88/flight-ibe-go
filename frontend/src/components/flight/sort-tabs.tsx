'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingDown, Zap, Star } from 'lucide-react';
import { cn, formatCurrency, parseDuration } from '@/lib/utils';
import type { FlightOffer } from '@/types/flight';

// ============================================================================
// Sort Tabs Component — Google Flights / Skyscanner style
// ============================================================================

export type SortTabOption = 'cheapest' | 'best' | 'fastest';

interface SortTabsProps {
  value: SortTabOption;
  onChange: (value: SortTabOption) => void;
  offers: FlightOffer[];
  className?: string;
}

/**
 * Calculate the "Best" score for a flight offer.
 * Lower score = better option.
 */
export function calculateBestScore(
  offer: FlightOffer,
  minPrice: number,
  maxPrice: number,
  minDuration: number,
  maxDuration: number
): number {
  const price = parseFloat(offer.price.total);
  const totalDuration = offer.itineraries.reduce(
    (sum, it) => sum + parseDuration(it.duration),
    0
  );
  const totalStops = offer.itineraries.reduce(
    (sum, it) => sum + (it.segments.length - 1),
    0
  );

  const priceRange = maxPrice - minPrice;
  const priceScore = priceRange > 0 ? ((price - minPrice) / priceRange) * 100 : 0;
  const durationRange = maxDuration - minDuration;
  const durationScore = durationRange > 0 ? ((totalDuration - minDuration) / durationRange) * 100 : 0;
  const stopsScore = totalStops === 0 ? 0 : totalStops === 1 ? 15 : 30;

  return priceScore * 0.45 + durationScore * 0.40 + stopsScore * 0.15;
}

function getPreviewData(offers: FlightOffer[]) {
  if (offers.length === 0) return { cheapest: null, best: null, fastest: null };

  const cheapest = [...offers].sort(
    (a, b) => parseFloat(a.price.total) - parseFloat(b.price.total)
  )[0];

  const fastest = [...offers].sort((a, b) => {
    const dA = a.itineraries.reduce((s, it) => s + parseDuration(it.duration), 0);
    const dB = b.itineraries.reduce((s, it) => s + parseDuration(it.duration), 0);
    return dA - dB;
  })[0];

  const prices = offers.map((o) => parseFloat(o.price.total));
  const durations = offers.map((o) =>
    o.itineraries.reduce((s, it) => s + parseDuration(it.duration), 0)
  );
  const [minP, maxP] = [Math.min(...prices), Math.max(...prices)];
  const [minD, maxD] = [Math.min(...durations), Math.max(...durations)];

  const best = [...offers].sort((a, b) =>
    calculateBestScore(a, minP, maxP, minD, maxD) - calculateBestScore(b, minP, maxP, minD, maxD)
  )[0];

  return { cheapest, best, fastest };
}

function getTotalDurationLabel(offer: FlightOffer): string {
  const totalMinutes = offer.itineraries.reduce(
    (sum, it) => sum + parseDuration(it.duration), 0
  );
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function SortTabs({ value, onChange, offers, className }: SortTabsProps) {
  const { cheapest, best, fastest } = getPreviewData(offers);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view on mobile
  useEffect(() => {
    if (!scrollRef.current) return;
    const active = scrollRef.current.querySelector('[data-active="true"]');
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [value]);

  const tabs: {
    id: SortTabOption;
    label: string;
    icon: React.ReactNode;
    price: string;
    detail: string;
  }[] = [
    {
      id: 'cheapest',
      label: 'Günstigster',
      icon: <TrendingDown className="h-4 w-4" />,
      price: cheapest ? formatCurrency(cheapest.price.total, cheapest.price.currency) : '–',
      detail: cheapest ? getTotalDurationLabel(cheapest) : '',
    },
    {
      id: 'best',
      label: 'Beste',
      icon: <Star className="h-4 w-4" />,
      price: best ? formatCurrency(best.price.total, best.price.currency) : '–',
      detail: best ? getTotalDurationLabel(best) : '',
    },
    {
      id: 'fastest',
      label: 'Schnellster',
      icon: <Zap className="h-4 w-4" />,
      price: fastest ? formatCurrency(fastest.price.total, fastest.price.currency) : '–',
      detail: fastest ? getTotalDurationLabel(fastest) : '',
    },
  ];

  return (
    <div
      ref={scrollRef}
      role="tablist"
      aria-label="Sortierung"
      className={cn(
        'flex overflow-x-auto scrollbar-none snap-x snap-mandatory',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = value === tab.id;
        return (
          <button
            key={tab.id}
            data-active={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex-1 min-w-[110px] snap-center px-2.5 py-2.5 sm:px-3 sm:py-3 text-center transition-all duration-200',
              'hover:bg-gray-50 dark:hover:bg-gray-800/50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 focus-visible:ring-inset',
              'active:bg-gray-100 dark:active:bg-gray-800',
              isActive ? 'bg-gray-50/80 dark:bg-gray-800/50' : ''
            )}
            aria-selected={isActive}
            role="tab"
          >
            {/* Active underline */}
            {isActive && (
              <motion.div
                layoutId="sort-tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-full bg-pink-500"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}

            {/* Icon + Label */}
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
              <span className={cn(
                'transition-colors',
                isActive ? 'text-pink-500' : 'text-muted-foreground'
              )}>
                {tab.icon}
              </span>
              <span className={cn(
                'text-xs font-semibold sm:text-sm transition-colors',
                isActive ? 'text-gray-900 dark:text-gray-100' : 'text-muted-foreground'
              )}>
                {tab.label}
              </span>
            </div>

            {/* Price preview */}
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
              <span className={cn(
                'font-bold transition-colors',
                isActive ? 'text-foreground' : 'text-foreground/80'
              )}>
                {tab.price}
              </span>
              {tab.detail && (
                <>
                  <span className="text-muted-foreground/40 hidden sm:inline">·</span>
                  <span className="hidden sm:inline">{tab.detail}</span>
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
