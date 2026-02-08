'use client';

import { useState, useMemo, useCallback } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp, Luggage, ArrowRight, X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { cn, formatCurrency, parseDuration, formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import type { FlightOffer } from '@/types/flight';
import { formatAirlineName } from '@/lib/airlines';
import { formatAirportName } from '@/lib/airports';

// ============================================================================
// Types
// ============================================================================

export interface FlightFilters {
  stops: number[];
  airlines: string[];
  priceRange: [number, number];
  outboundDepartureTime: [number, number];
  outboundArrivalTime: [number, number];
  returnDepartureTime: [number, number];
  returnArrivalTime: [number, number];
  durationRange: [number, number];
  transitAirports: string[];
}

const formatHour = (hour: number): string => `${hour.toString().padStart(2, '0')}:00`;

// ============================================================================
// Dual Range Slider
// ============================================================================

interface DualRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
  formatLabel?: (value: number) => string;
}

function DualRangeSlider({ min, max, value, onChange, step = 1, formatLabel = (v) => v.toString() }: DualRangeSliderProps) {
  return (
    <div className="space-y-3">
      <Slider
        value={value}
        onValueChange={(val) => onChange(val as [number, number])}
        min={min}
        max={max}
        step={step}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatLabel(value[0])}</span>
        <span>bis {formatLabel(value[1])}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Checkbox component – styled, large touch target
// ============================================================================

function FilterCheckbox({ checked, onChange, children, trailing }: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <label
      className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60 active:bg-muted"
      onClick={(e) => { e.preventDefault(); onChange(); }}
    >
      <BaseCheckbox.Root
        checked={checked}
        onCheckedChange={onChange}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all',
          checked
            ? 'border-pink-500 bg-pink-500 text-white'
            : 'border-muted-foreground/30 bg-background'
        )}
      >
        <BaseCheckbox.Indicator className="flex items-center justify-center">
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      <span className="flex-1 text-sm">{children}</span>
      {trailing && <span className="shrink-0 text-xs text-muted-foreground">{trailing}</span>}
    </label>
  );
}

// ============================================================================
// Filter Section (collapsible)
// ============================================================================

function FilterSection({ title, children, defaultOpen = true, badge }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-border/50 py-3">
      <button
        className="flex w-full min-h-[44px] items-center justify-between px-1 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {badge}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function hasCheckedBaggage(offer: FlightOffer): boolean {
  const bags = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags;
  return !!(bags?.weight || bags?.quantity);
}

function getMainCarrier(offer: FlightOffer): string {
  return offer.validatingAirlineCodes?.[0] || offer.itineraries[0].segments[0].carrierCode;
}

const DEFAULT_FILTERS: FlightFilters = {
  stops: [],
  airlines: [],
  priceRange: [0, 10000],
  outboundDepartureTime: [0, 24],
  outboundArrivalTime: [0, 24],
  returnDepartureTime: [0, 24],
  returnArrivalTime: [0, 24],
  durationRange: [0, 2880],
  transitAirports: [],
};

// ============================================================================
// Filter Sidebar Component
// ============================================================================

interface FilterSidebarProps {
  offers: FlightOffer[];
  filters: FlightFilters;
  onFiltersChange: (filters: FlightFilters) => void;
  className?: string;
}

export function FilterSidebar({ offers, filters, onFiltersChange, className }: FilterSidebarProps) {
  const hasReturnFlight = offers.length > 0 && offers[0].itineraries.length > 1;

  // === Airlines ===
  const airlines = useMemo(() => {
    const map = new Map<string, { ids: Set<string>; minPrice: number }>();
    offers.forEach((o) => {
      const price = parseFloat(o.price.total);
      const carrier = getMainCarrier(o);
      const existing = map.get(carrier);
      if (!existing) {
        map.set(carrier, { ids: new Set([o.id]), minPrice: price });
      } else {
        existing.ids.add(o.id);
        existing.minPrice = Math.min(existing.minPrice, price);
      }
    });
    return Array.from(map.entries())
      .map(([code, data]) => ({ code, count: data.ids.size, minPrice: data.minPrice }))
      .sort((a, b) => a.minPrice - b.minPrice);
  }, [offers]);

  // === Stops ===
  const stopOptions = useMemo(() => {
    const map = new Map<number, number>();
    offers.forEach((o) => {
      const stops = o.itineraries[0].segments.length - 1;
      const cat = stops >= 2 ? 2 : stops;
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [offers]);

  // === Transit airports ===
  const transitAirports = useMemo(() => {
    const map = new Map<string, { ids: Set<string>; minPrice: number }>();
    offers.forEach((o) => {
      const price = parseFloat(o.price.total);
      const codes = new Set<string>();
      o.itineraries.forEach((it) => it.segments.slice(0, -1).forEach((s) => codes.add(s.arrival.iataCode)));
      codes.forEach((code) => {
        const existing = map.get(code);
        if (!existing) {
          map.set(code, { ids: new Set([o.id]), minPrice: price });
        } else {
          existing.ids.add(o.id);
          existing.minPrice = Math.min(existing.minPrice, price);
        }
      });
    });
    return Array.from(map.entries())
      .map(([code, data]) => ({ code, count: data.ids.size, minPrice: data.minPrice }))
      .sort((a, b) => b.count - a.count);
  }, [offers]);

  // === Baggage stats ===
  const baggageStats = useMemo(() => {
    let w = 0, wo = 0;
    offers.forEach((o) => hasCheckedBaggage(o) ? w++ : wo++);
    return { withBaggage: w, withoutBaggage: wo };
  }, [offers]);

  // === Price & Duration stats ===
  const priceStats = useMemo(() => {
    if (!offers.length) return { min: 0, max: 10000, currency: 'EUR' };
    const prices = offers.map((o) => parseFloat(o.price.total));
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)), currency: offers[0]?.price.currency || 'EUR' };
  }, [offers]);

  const durationStats = useMemo(() => {
    if (!offers.length) return { min: 0, max: 2880 };
    const durations = offers.flatMap((o) => o.itineraries.map((it) => parseDuration(it.duration)));
    return { min: Math.floor(Math.min(...durations)), max: Math.ceil(Math.max(...durations)) };
  }, [offers]);

  // === Active filter count ===
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.stops.length > 0) c++;
    if (filters.airlines.length > 0) c++;
    if (filters.transitAirports.length > 0) c++;
    if (filters.priceRange[0] > priceStats.min || filters.priceRange[1] < priceStats.max) c++;
    if (filters.durationRange[0] > durationStats.min || filters.durationRange[1] < durationStats.max) c++;
    if (filters.outboundDepartureTime[0] > 0 || filters.outboundDepartureTime[1] < 24) c++;
    if (filters.outboundArrivalTime[0] > 0 || filters.outboundArrivalTime[1] < 24) c++;
    if (hasReturnFlight && (filters.returnDepartureTime[0] > 0 || filters.returnDepartureTime[1] < 24)) c++;
    if (hasReturnFlight && (filters.returnArrivalTime[0] > 0 || filters.returnArrivalTime[1] < 24)) c++;
    return c;
  }, [filters, priceStats, durationStats, hasReturnFlight]);

  // === Handlers ===
  const clearFilters = useCallback(() => {
    onFiltersChange({
      ...DEFAULT_FILTERS,
      priceRange: [priceStats.min, priceStats.max],
      durationRange: [durationStats.min, durationStats.max],
    });
  }, [onFiltersChange, priceStats, durationStats]);

  const toggleStop = (stop: number) => {
    const newStops = filters.stops.includes(stop) ? filters.stops.filter((s) => s !== stop) : [...filters.stops, stop];
    onFiltersChange({ ...filters, stops: newStops });
  };

  const toggleAirline = (code: string) => {
    const newAirlines = filters.airlines.includes(code) ? filters.airlines.filter((a) => a !== code) : [...filters.airlines, code];
    onFiltersChange({ ...filters, airlines: newAirlines });
  };

  const toggleTransitAirport = (code: string) => {
    const newTransit = filters.transitAirports.includes(code) ? filters.transitAirports.filter((a) => a !== code) : [...filters.transitAirports, code];
    onFiltersChange({ ...filters, transitAirports: newTransit });
  };

  return (
    <div className={cn('rounded-2xl border border-border bg-card p-4 shadow-sm', className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <span className="font-bold text-base">Filter</span>
          {activeFilterCount > 0 && (
            <Badge className="bg-pink-500 text-white border-0 text-[10px] px-1.5 py-0">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
            <RotateCcw className="h-3.5 w-3.5" />
            Zurücksetzen
          </Button>
        )}
      </div>

      {/* Stops */}
      {stopOptions.length > 0 && (
        <FilterSection title="Stopps">
          <div className="space-y-0.5">
            {stopOptions.map(([stop, count]) => (
              <FilterCheckbox
                key={stop}
                checked={filters.stops.includes(stop)}
                onChange={() => toggleStop(stop)}
                trailing={`(${count})`}
              >
                {stop === 0 ? 'Direkt' : stop === 1 ? '1 Stopp' : '2+ Stopps'}
              </FilterCheckbox>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Baggage info */}
      {(baggageStats.withBaggage > 0 || baggageStats.withoutBaggage > 0) && (
        <FilterSection title="Gepäck">
          <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-2">
              <Luggage className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span>{baggageStats.withBaggage} mit Freigepäck</span>
            </div>
            <div className="flex items-center gap-2">
              <Luggage className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              <span>{baggageStats.withoutBaggage} nur Handgepäck</span>
            </div>
          </div>
        </FilterSection>
      )}

      {/* Price Range */}
      {priceStats.max > priceStats.min && (
        <FilterSection title="Preis">
          <div className="px-1 space-y-3">
            <Slider
              min={priceStats.min}
              max={priceStats.max}
              value={[filters.priceRange[1]]}
              onValueChange={(val) => {
                const v = Array.isArray(val) ? val[0] : val;
                onFiltersChange({ ...filters, priceRange: [filters.priceRange[0], v] });
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(filters.priceRange[0], priceStats.currency)}</span>
              <span>max. {formatCurrency(filters.priceRange[1], priceStats.currency)}</span>
            </div>
          </div>
        </FilterSection>
      )}

      {/* Outbound times */}
      <FilterSection title="Hinflug Zeiten" defaultOpen={false}>
        <div className="px-1 space-y-5">
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Abflug</div>
            <DualRangeSlider
              min={0} max={24} step={1}
              value={filters.outboundDepartureTime}
              onChange={(val) => onFiltersChange({ ...filters, outboundDepartureTime: val })}
              formatLabel={formatHour}
            />
          </div>
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Ankunft</div>
            <DualRangeSlider
              min={0} max={24} step={1}
              value={filters.outboundArrivalTime}
              onChange={(val) => onFiltersChange({ ...filters, outboundArrivalTime: val })}
              formatLabel={formatHour}
            />
          </div>
        </div>
      </FilterSection>

      {/* Return times */}
      {hasReturnFlight && (
        <FilterSection title="Rückflug Zeiten" defaultOpen={false}>
          <div className="px-1 space-y-5">
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Abflug</div>
              <DualRangeSlider
                min={0} max={24} step={1}
                value={filters.returnDepartureTime}
                onChange={(val) => onFiltersChange({ ...filters, returnDepartureTime: val })}
                formatLabel={formatHour}
              />
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Ankunft</div>
              <DualRangeSlider
                min={0} max={24} step={1}
                value={filters.returnArrivalTime}
                onChange={(val) => onFiltersChange({ ...filters, returnArrivalTime: val })}
                formatLabel={formatHour}
              />
            </div>
          </div>
        </FilterSection>
      )}

      {/* Duration */}
      {durationStats.max > durationStats.min && (
        <FilterSection title="Flugdauer" defaultOpen={false}>
          <div className="px-1 space-y-3">
            <Slider
              min={durationStats.min}
              max={durationStats.max}
              value={[filters.durationRange[1]]}
              onValueChange={(val) => {
                const v = Array.isArray(val) ? val[0] : val;
                onFiltersChange({ ...filters, durationRange: [filters.durationRange[0], v] });
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatDuration(`PT${Math.floor(filters.durationRange[0] / 60)}H${filters.durationRange[0] % 60}M`)}</span>
              <span>max. {formatDuration(`PT${Math.floor(filters.durationRange[1] / 60)}H${filters.durationRange[1] % 60}M`)}</span>
            </div>
          </div>
        </FilterSection>
      )}

      {/* Transit Airports */}
      {transitAirports.length > 0 && (
        <FilterSection title="Umstieg via" defaultOpen={false}>
          <div className="space-y-0.5">
            {transitAirports.map((airport) => (
              <FilterCheckbox
                key={airport.code}
                checked={filters.transitAirports.includes(airport.code)}
                onChange={() => toggleTransitAirport(airport.code)}
                trailing={`(${airport.count})`}
              >
                <span className="flex items-center gap-1.5">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{airport.code}</span>
                  <span className="text-muted-foreground text-xs">{formatAirportName(airport.code, 'both')}</span>
                </span>
              </FilterCheckbox>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Airlines */}
      {airlines.length > 0 && (
        <FilterSection title="Airlines" defaultOpen={false}>
          <div className="space-y-0.5">
            {airlines.map((airline) => (
              <FilterCheckbox
                key={airline.code}
                checked={filters.airlines.includes(airline.code)}
                onChange={() => toggleAirline(airline.code)}
                trailing={
                  <span className="flex items-center gap-1.5">
                    <span className="text-pink-600 dark:text-pink-400 font-medium">ab {formatCurrency(airline.minPrice, priceStats.currency)}</span>
                    <span>({airline.count})</span>
                  </span>
                }
              >
                {formatAirlineName(airline.code)}
              </FilterCheckbox>
            ))}
          </div>
        </FilterSection>
      )}
    </div>
  );
}
