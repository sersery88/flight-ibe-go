'use client';

import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Plane as PlaneIcon, Search, ArrowRightLeft, Edit2, SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FlightList } from '@/components/flight/flight-list';
import { FilterSidebar, type FlightFilters } from '@/components/flight/filter-sidebar';
import { SortTabs, type SortTabOption, calculateBestScore } from '@/components/flight/sort-tabs';
import { AirportCombobox } from '@/components/flight/airport-combobox';
import { SingleFlightDatePicker, FlightDatePicker, type DateRange } from '@/components/flight/flight-date-picker';
import { PassengerSelector } from '@/components/flight/passenger-selector';
import { CabinClassSelect } from '@/components/flight/cabin-class-select';
import { SearchForm } from '@/components/flight/search-form';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useSearchStore } from '@/stores/search-store';
import { useBookingStore } from '@/stores/booking-store';
import { useFlightSearch, useBodyScrollLock } from '@/hooks';
import type { FlightOffer } from '@/types/flight';
import { cn, parseDuration } from '@/lib/utils';
import { formatAirportName } from '@/lib/airports';

// ============================================================================
// Constants
// ============================================================================

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
// Helpers
// ============================================================================

function formatSearchDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

function getPassengerCount(adults: number, children: number, infants: number): number {
  return adults + children + infants;
}

// ============================================================================
// Filter Logic
// ============================================================================

function applyFilters(offers: FlightOffer[], filters: FlightFilters): FlightOffer[] {
  return offers.filter((offer) => {
    if (filters.stops.length > 0) {
      const stops = offer.itineraries[0].segments.length - 1;
      const cat = stops >= 2 ? 2 : stops;
      if (!filters.stops.includes(cat)) return false;
    }

    if (filters.airlines.length > 0) {
      const mainCarrier = offer.validatingAirlineCodes?.[0] || offer.itineraries[0].segments[0].carrierCode;
      if (!filters.airlines.includes(mainCarrier)) return false;
    }

    const price = parseFloat(offer.price.total);
    if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;

    if (filters.outboundDepartureTime[0] > 0 || filters.outboundDepartureTime[1] < 24) {
      const hour = new Date(offer.itineraries[0].segments[0].departure.at).getHours();
      if (hour < filters.outboundDepartureTime[0] || hour >= filters.outboundDepartureTime[1]) return false;
    }

    if (filters.outboundArrivalTime[0] > 0 || filters.outboundArrivalTime[1] < 24) {
      const segs = offer.itineraries[0].segments;
      const hour = new Date(segs[segs.length - 1].arrival.at).getHours();
      if (hour < filters.outboundArrivalTime[0] || hour >= filters.outboundArrivalTime[1]) return false;
    }

    if (offer.itineraries.length > 1) {
      if (filters.returnDepartureTime[0] > 0 || filters.returnDepartureTime[1] < 24) {
        const hour = new Date(offer.itineraries[1].segments[0].departure.at).getHours();
        if (hour < filters.returnDepartureTime[0] || hour >= filters.returnDepartureTime[1]) return false;
      }
      if (filters.returnArrivalTime[0] > 0 || filters.returnArrivalTime[1] < 24) {
        const segs = offer.itineraries[1].segments;
        const hour = new Date(segs[segs.length - 1].arrival.at).getHours();
        if (hour < filters.returnArrivalTime[0] || hour >= filters.returnArrivalTime[1]) return false;
      }
    }

    if (filters.durationRange[0] > 0 || filters.durationRange[1] < 2880) {
      const duration = parseDuration(offer.itineraries[0].duration);
      if (duration < filters.durationRange[0] || duration > filters.durationRange[1]) return false;
    }

    if (filters.transitAirports.length > 0) {
      const transitCodes = offer.itineraries.flatMap((it) =>
        it.segments.slice(0, -1).map((s) => s.arrival.iataCode)
      );
      if (!filters.transitAirports.some((a) => transitCodes.includes(a))) return false;
    }

    return true;
  });
}

function sortOffers(offers: FlightOffer[], sortBy: SortTabOption): FlightOffer[] {
  const sorted = [...offers];
  const prices = sorted.map((o) => parseFloat(o.price.total));
  const durations = sorted.map((o) =>
    o.itineraries.reduce((sum, it) => sum + parseDuration(it.duration), 0)
  );
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

  switch (sortBy) {
    case 'cheapest':
      sorted.sort((a, b) => parseFloat(a.price.total) - parseFloat(b.price.total));
      break;
    case 'fastest':
      sorted.sort((a, b) => {
        const dA = a.itineraries.reduce((s, it) => s + parseDuration(it.duration), 0);
        const dB = b.itineraries.reduce((s, it) => s + parseDuration(it.duration), 0);
        return dA - dB;
      });
      break;
    case 'best':
      sorted.sort((a, b) =>
        calculateBestScore(a, minPrice, maxPrice, minDuration, maxDuration) -
        calculateBestScore(b, minPrice, maxPrice, minDuration, maxDuration)
      );
      break;
  }
  return sorted;
}

function countActiveFilters(filters: FlightFilters): number {
  let c = 0;
  if (filters.stops.length > 0) c++;
  if (filters.airlines.length > 0) c++;
  if (filters.transitAirports.length > 0) c++;
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) c++;
  if (filters.durationRange[0] > 0 || filters.durationRange[1] < 2880) c++;
  if (filters.outboundDepartureTime[0] > 0 || filters.outboundDepartureTime[1] < 24) c++;
  if (filters.outboundArrivalTime[0] > 0 || filters.outboundArrivalTime[1] < 24) c++;
  if (filters.returnDepartureTime[0] > 0 || filters.returnDepartureTime[1] < 24) c++;
  if (filters.returnArrivalTime[0] > 0 || filters.returnArrivalTime[1] < 24) c++;
  return c;
}

// ============================================================================
// Mobile Search Popup — Full-screen overlay
// ============================================================================

function MobileSearchPopup({ isOpen, onClose, onSearch }: {
  isOpen: boolean;
  onClose: () => void;
  onSearch: () => void;
}) {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-50 overflow-y-auto lg:hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
          <div className="w-full max-w-4xl rounded-2xl bg-background shadow-2xl my-8">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border px-6 py-4 rounded-t-2xl bg-background">
              <h2 className="text-lg font-bold">Suche anpassen</h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 pb-48">
              <SearchForm onSearch={onSearch} />
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ============================================================================
// Mobile Filter Bottom Sheet
// ============================================================================

function MobileFilterSheet({ isOpen, onClose, offers, filters, onFiltersChange, resultCount, activeFilterCount }: {
  isOpen: boolean;
  onClose: () => void;
  offers: FlightOffer[];
  filters: FlightFilters;
  onFiltersChange: (filters: FlightFilters) => void;
  resultCount: number;
  activeFilterCount: number;
}) {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex max-h-[90vh] flex-col rounded-t-3xl bg-background shadow-2xl">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="font-bold text-base">Filter</span>
              {activeFilterCount > 0 && (
                <Badge className="bg-pink-500 text-white border-0 text-[10px]">{activeFilterCount}</Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <FilterSidebar
              offers={offers}
              filters={filters}
              onFiltersChange={onFiltersChange}
              className="border-0 shadow-none p-0"
              hideHeader
            />
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-background">
            <Button
              className="w-full h-12 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-base shadow-lg shadow-pink-500/20"
              onClick={onClose}
            >
              {resultCount} {resultCount === 1 ? 'Ergebnis' : 'Ergebnisse'} anzeigen
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ============================================================================
// Desktop Inline Search Bar
// ============================================================================

function DesktopSearchBar({ onSearch, isSearchPending }: {
  onSearch: () => void;
  isSearchPending: boolean;
}) {
  const store = useSearchStore();

  const dateRangeValue = useMemo<DateRange | undefined>(() => ({
    from: store.departureDate ?? undefined,
    to: store.returnDate ?? undefined,
  }), [store.departureDate, store.returnDate]);

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    store.setDepartureDate(range?.from);
    store.setReturnDate(range?.to);
  }, [store]);

  const isDisabled = isSearchPending || !store.origin || !store.destination || !store.departureDate;

  return (
    <div className="hidden lg:flex flex-1 items-center rounded-2xl border border-border bg-card shadow-sm p-1.5 gap-1">
      <AirportCombobox
        value={store.origin}
        valueName={store.originName}
        onChange={(code, name) => { store.setOrigin(code); store.setOriginName(name); }}
        placeholder="Von"
        compact
        className="flex-1"
      />
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-7 w-7 rounded-full"
        onClick={() => store.swapLocations()}
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
      </Button>
      <AirportCombobox
        value={store.destination}
        valueName={store.destinationName}
        onChange={(code, name) => { store.setDestination(code); store.setDestinationName(name); }}
        placeholder="Nach"
        compact
        className="flex-1"
      />
      <div className="h-7 w-px bg-border shrink-0" />
      {store.tripType === 'oneway' ? (
        <SingleFlightDatePicker
          value={store.departureDate ?? undefined}
          onChange={(date) => store.setDepartureDate(date)}
          placeholder="Datum"
          compact
          className="flex-1"
        />
      ) : (
        <FlightDatePicker
          value={dateRangeValue}
          onChange={handleDateRangeChange}
          origin={store.origin}
          destination={store.destination}
          compact
          className="flex-1"
        />
      )}
      <div className="h-7 w-px bg-border shrink-0" />
      <PassengerSelector
        value={{ adults: store.adults, children: store.children, infants: store.infants }}
        onChange={(p) => { store.setAdults(p.adults); store.setChildren(p.children); store.setInfants(p.infants); }}
        compact
        className="shrink-0"
      />
      <div className="h-7 w-px bg-border shrink-0" />
      <CabinClassSelect
        value={store.travelClass}
        onChange={(v) => store.setTravelClass(v)}
        compact
        className="shrink-0"
      />
      <Button
        size="sm"
        className="shrink-0 gap-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white"
        onClick={onSearch}
        disabled={isDisabled}
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// Mobile Search Summary — compact, tappable
// ============================================================================

function MobileSearchSummary({ onClick }: { onClick: () => void }) {
  const { origin, destination, originName, destinationName, departureDate, returnDate, adults, children, infants, travelClass } = useSearchStore();
  const passengerCount = getPassengerCount(adults, children, infants);
  const cabinLabel = travelClass?.toLowerCase() || 'economy';

  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col gap-1.5 rounded-2xl border border-border bg-card px-4 py-2.5 text-left transition-all hover:shadow-md active:scale-[0.99] lg:hidden overflow-hidden"
    >
      {/* Route */}
      <div className="flex items-center gap-2 w-full">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <PlaneIcon className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="text-sm font-bold truncate">
            {originName || formatAirportName(origin) || '???'} → {destinationName || formatAirportName(destination) || '???'}
          </span>
        </div>
        <Edit2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {departureDate && (
          <>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {formatSearchDate(departureDate)}
                {returnDate && ` – ${formatSearchDate(returnDate)}`}
              </span>
            </div>
            <div className="h-3 w-px bg-border" />
          </>
        )}
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          <span>{passengerCount}</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <span className="capitalize">{cabinLabel}</span>
      </div>
    </button>
  );
}

// ============================================================================
// Results Content
// ============================================================================

function ResultsContent() {
  const router = useRouter();
  const store = useSearchStore();
  const { searchResults, isSearching } = store;
  const { setSelectedOffer: setBookingOffer, reset: resetBooking } = useBookingStore();
  const { mutate: searchFlights, isPending: isSearchPending } = useFlightSearch();

  const [showSearchForm, setShowSearchForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const autoSearchTriggered = useRef(false);

  // Auto-search when navigating from homepage with store data but no results
  useEffect(() => {
    if (autoSearchTriggered.current) return;
    if (searchResults.length > 0) return;
    if (isSearchPending) return;
    const request = store.getSearchRequest();
    if (!request) return;
    autoSearchTriggered.current = true;
    searchFlights(request, {
      onSuccess: (data) => store.setSearchResults(data.data),
    });
  }, [store, searchResults, isSearchPending, searchFlights]);
  const [sortBy, setSortBy] = useState<SortTabOption>('best');
  const [filters, setFilters] = useState<FlightFilters>(DEFAULT_FILTERS);
  const [selectedOfferId, setSelectedOfferId] = useState<string>();

  const filteredOffers = useMemo(() => applyFilters(searchResults, filters), [searchResults, filters]);
  const sortedOffers = useMemo(() => sortOffers(filteredOffers, sortBy), [filteredOffers, sortBy]);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const handleSearch = useCallback(() => {
    const request = store.getSearchRequest();
    if (!request) return;
    searchFlights(request, {
      onSuccess: (data) => store.setSearchResults(data.data),
    });
    setShowSearchForm(false);
  }, [store, searchFlights]);

  const handleSelectOffer = useCallback((offer: FlightOffer) => {
    setSelectedOfferId(offer.id);
    resetBooking();
    setBookingOffer(offer);
    store.setSelectedOffer(offer);
    router.push('/booking');
  }, [router, store, setBookingOffer, resetBooking]);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Skip link */}
      <a href="#results-main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-4">
        Zum Hauptinhalt springen
      </a>

      {/* === STICKY SEARCH HEADER === */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm" role="search" aria-label="Flugsuche">
        <div className="mx-auto max-w-7xl px-4 py-2">
          <div className="flex items-center gap-3">
            <MobileSearchSummary onClick={() => setShowSearchForm(true)} />
            <DesktopSearchBar onSearch={handleSearch} isSearchPending={isSearchPending} />
          </div>
        </div>
      </header>

      {/* Mobile Search Popup */}
      <AnimatePresence>
        {showSearchForm && (
          <MobileSearchPopup
            isOpen={showSearchForm}
            onClose={() => setShowSearchForm(false)}
            onSearch={handleSearch}
          />
        )}
      </AnimatePresence>

      {/* === MAIN CONTENT === */}
      <div className="flex justify-center">
        <div className="w-full max-w-7xl px-4 py-4 sm:py-6">
          <div className="flex gap-6">
            {/* Desktop Sidebar */}
            <aside className="hidden w-72 shrink-0 lg:block" aria-label="Filter">
              <FilterSidebar
                offers={searchResults}
                filters={filters}
                onFiltersChange={setFilters}
              />
            </aside>

            {/* Results Column */}
            <main id="results-main" className="flex-1 min-w-0" aria-label="Suchergebnisse">
              {/* Sort Tabs — sticky below header */}
              <div className="sticky top-[53px] sm:top-[57px] z-30 -mx-4 px-4 pt-1 pb-3 bg-muted/30 backdrop-blur-sm">
                <SortTabs
                  value={sortBy}
                  onChange={setSortBy}
                  offers={filteredOffers}
                  className="rounded-xl bg-card border border-border shadow-sm overflow-hidden"
                />

                {/* Mobile Filter Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(true)}
                  className="lg:hidden mt-3 w-full gap-2 rounded-xl h-11 font-semibold border-border hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.99] transition-all"
                >
                  <SlidersHorizontal className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span>Filter</span>
                  {activeFilterCount > 0 && (
                    <Badge className="bg-pink-500 text-white border-0 text-[10px] px-1.5">{activeFilterCount}</Badge>
                  )}
                  {filteredOffers.length > 0 && activeFilterCount === 0 && (
                    <span className="text-xs text-muted-foreground ml-auto">{filteredOffers.length} Ergebnisse</span>
                  )}
                </Button>
              </div>

              {/* Flight List */}
              <FlightList
                offers={sortedOffers}
                isLoading={isSearching}
                selectedOfferId={selectedOfferId}
                onSelectOffer={handleSelectOffer}
              />
            </main>
          </div>
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <AnimatePresence>
        {showFilters && (
          <MobileFilterSheet
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
            offers={searchResults}
            filters={filters}
            onFiltersChange={setFilters}
            resultCount={filteredOffers.length}
            activeFilterCount={activeFilterCount}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Page Export
// ============================================================================

export default function ResultsPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <div className="flex gap-6">
              <Skeleton className="hidden lg:block w-72 h-96 shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        }
      >
        <ResultsContent />
      </Suspense>
    </ErrorBoundary>
  );
}
