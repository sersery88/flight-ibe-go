'use client';

import { useState, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Plane as PlaneIcon, Search, ArrowRightLeft, Edit2, SlidersHorizontal, X } from 'lucide-react';
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
// Filter Logic (extracted for testability)
// ============================================================================

function applyFilters(offers: FlightOffer[], filters: FlightFilters): FlightOffer[] {
  return offers.filter((offer) => {
    // Filter by stops
    if (filters.stops.length > 0) {
      const stops = offer.itineraries[0].segments.length - 1;
      const stopCategory = stops >= 2 ? 2 : stops;
      if (!filters.stops.includes(stopCategory)) return false;
    }

    // Filter by airlines (main carrier)
    if (filters.airlines.length > 0) {
      const mainCarrier = offer.validatingAirlineCodes?.[0] || offer.itineraries[0].segments[0].carrierCode;
      if (!filters.airlines.includes(mainCarrier)) return false;
    }

    // Filter by price
    const price = parseFloat(offer.price.total);
    if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;

    // Filter by outbound departure time
    if (filters.outboundDepartureTime[0] > 0 || filters.outboundDepartureTime[1] < 24) {
      const depTime = new Date(offer.itineraries[0].segments[0].departure.at);
      const hour = depTime.getHours();
      if (hour < filters.outboundDepartureTime[0] || hour >= filters.outboundDepartureTime[1]) {
        return false;
      }
    }

    // Filter by outbound arrival time
    if (filters.outboundArrivalTime[0] > 0 || filters.outboundArrivalTime[1] < 24) {
      const lastSegment = offer.itineraries[0].segments[offer.itineraries[0].segments.length - 1];
      const arrTime = new Date(lastSegment.arrival.at);
      const hour = arrTime.getHours();
      if (hour < filters.outboundArrivalTime[0] || hour >= filters.outboundArrivalTime[1]) {
        return false;
      }
    }

    // Filter by return departure time
    if (offer.itineraries.length > 1 && (filters.returnDepartureTime[0] > 0 || filters.returnDepartureTime[1] < 24)) {
      const depTime = new Date(offer.itineraries[1].segments[0].departure.at);
      const hour = depTime.getHours();
      if (hour < filters.returnDepartureTime[0] || hour >= filters.returnDepartureTime[1]) {
        return false;
      }
    }

    // Filter by return arrival time
    if (offer.itineraries.length > 1 && (filters.returnArrivalTime[0] > 0 || filters.returnArrivalTime[1] < 24)) {
      const lastSegment = offer.itineraries[1].segments[offer.itineraries[1].segments.length - 1];
      const arrTime = new Date(lastSegment.arrival.at);
      const hour = arrTime.getHours();
      if (hour < filters.returnArrivalTime[0] || hour >= filters.returnArrivalTime[1]) {
        return false;
      }
    }

    // Filter by duration
    if (filters.durationRange[0] > 0 || filters.durationRange[1] < 2880) {
      const duration = parseDuration(offer.itineraries[0].duration);
      if (duration < filters.durationRange[0] || duration > filters.durationRange[1]) {
        return false;
      }
    }

    // Filter by transit airports
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

  // Calculate min/max for "best" score normalization
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
        const durationA = a.itineraries.reduce((sum, it) => sum + parseDuration(it.duration), 0);
        const durationB = b.itineraries.reduce((sum, it) => sum + parseDuration(it.duration), 0);
        return durationA - durationB;
      });
      break;
    case 'best':
      sorted.sort((a, b) => {
        const scoreA = calculateBestScore(a, minPrice, maxPrice, minDuration, maxDuration);
        const scoreB = calculateBestScore(b, minPrice, maxPrice, minDuration, maxDuration);
        return scoreA - scoreB;
      });
      break;
  }

  return sorted;
}

function countActiveFilters(filters: FlightFilters): number {
  let count = 0;
  if (filters.stops.length > 0) count++;
  if (filters.airlines.length > 0) count++;
  if (filters.transitAirports.length > 0) count++;
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) count++;
  if (filters.durationRange[0] > 0 || filters.durationRange[1] < 2880) count++;
  if (filters.outboundDepartureTime[0] > 0 || filters.outboundDepartureTime[1] < 24) count++;
  if (filters.outboundArrivalTime[0] > 0 || filters.outboundArrivalTime[1] < 24) count++;
  if (filters.returnDepartureTime[0] > 0 || filters.returnDepartureTime[1] < 24) count++;
  if (filters.returnArrivalTime[0] > 0 || filters.returnArrivalTime[1] < 24) count++;
  return count;
}

// ============================================================================
// Mobile Search Popup Component
// ============================================================================

interface MobileSearchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: () => void;
}

function MobileSearchPopup({ isOpen, onClose, onSearch }: MobileSearchPopupProps) {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />

      {/* Popup Container */}
      <div 
        className="fixed inset-0 z-50 overflow-y-auto lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-dialog-title"
      >
        <div className="flex min-h-full items-start justify-center p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-4xl rounded-2xl bg-background shadow-2xl my-8">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border px-6 py-4 rounded-t-2xl">
              <h2 id="search-dialog-title" className="text-lg font-semibold">
                Suche anpassen
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Suche schließen"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Search Form */}
            <div className="p-6 pb-48">
              <SearchForm onSearch={onSearch} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Mobile Filter Sheet Component
// ============================================================================

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  offers: FlightOffer[];
  filters: FlightFilters;
  onFiltersChange: (filters: FlightFilters) => void;
  resultCount: number;
  activeFilterCount: number;
}

function MobileFilterSheet({
  isOpen,
  onClose,
  offers,
  filters,
  onFiltersChange,
  resultCount,
  activeFilterCount,
}: MobileFilterSheetProps) {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />

      {/* Filter Sheet */}
      <div 
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-dialog-title"
      >
        <div className="flex max-h-[85vh] flex-col rounded-t-2xl bg-background shadow-2xl">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <span id="filter-dialog-title" className="font-semibold">Filter</span>
              {activeFilterCount > 0 && (
                <Badge variant="default">{activeFilterCount}</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Filter schließen"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <FilterSidebar
              offers={offers}
              filters={filters}
              onFiltersChange={onFiltersChange}
              className="border-0 p-0"
            />
          </div>

          {/* Footer with Apply Button */}
          <div className="shrink-0 border-t border-border p-4">
            <Button
              className="w-full"
              onClick={onClose}
            >
              {resultCount} Ergebnisse anzeigen
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Desktop Search Bar Component
// ============================================================================

interface DesktopSearchBarProps {
  onSearch: () => void;
  isSearchPending: boolean;
}

function DesktopSearchBar({ onSearch, isSearchPending }: DesktopSearchBarProps) {
  const store = useSearchStore();
  
  const dateRangeValue = useMemo<DateRange | undefined>(() => ({
    from: store.departureDate ?? undefined,
    to: store.returnDate ?? undefined,
  }), [store.departureDate, store.returnDate]);

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    store.setDepartureDate(range?.from);
    store.setReturnDate(range?.to);
  }, [store]);

  const handleSwapLocations = useCallback(() => {
    store.swapLocations();
  }, [store]);

  const isSearchDisabled = isSearchPending || !store.origin || !store.destination || !store.departureDate;

  return (
    <div className="hidden lg:flex flex-1 items-center rounded-xl border border-border bg-muted/50 p-1.5 gap-1">
      {/* Origin */}
      <AirportCombobox
        value={store.origin}
        valueName={store.originName}
        onChange={(code, name) => {
          store.setOrigin(code);
          store.setOriginName(name);
        }}
        placeholder="Von"
        compact
        className="flex-1"
      />

      {/* Swap button */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-7 w-7 rounded-full hover:bg-background transition-all"
        onClick={handleSwapLocations}
        aria-label="Abflug- und Zielflughafen tauschen"
      >
        <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>

      {/* Destination */}
      <AirportCombobox
        value={store.destination}
        valueName={store.destinationName}
        onChange={(code, name) => {
          store.setDestination(code);
          store.setDestinationName(name);
        }}
        placeholder="Nach"
        compact
        className="flex-1"
      />

      {/* Divider */}
      <div className="h-7 w-px bg-border shrink-0" aria-hidden="true" />

      {/* Date Range */}
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

      {/* Divider */}
      <div className="h-7 w-px bg-border shrink-0" aria-hidden="true" />

      {/* Passengers */}
      <PassengerSelector
        value={{
          adults: store.adults,
          children: store.children,
          infants: store.infants,
        }}
        onChange={(passengers) => {
          store.setAdults(passengers.adults);
          store.setChildren(passengers.children);
          store.setInfants(passengers.infants);
        }}
        compact
        className="shrink-0"
      />

      {/* Divider */}
      <div className="h-7 w-px bg-border shrink-0" aria-hidden="true" />

      {/* Cabin Class */}
      <CabinClassSelect
        value={store.travelClass}
        onChange={(value) => store.setTravelClass(value)}
        compact
        className="shrink-0"
      />

      {/* Search button */}
      <Button
        size="sm"
        className="shrink-0 gap-1.5 rounded-lg"
        onClick={onSearch}
        disabled={isSearchDisabled}
        aria-label="Flüge suchen"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

// ============================================================================
// Mobile Search Summary Component
// ============================================================================

interface MobileSearchSummaryProps {
  onClick: () => void;
}

function MobileSearchSummary({ onClick }: MobileSearchSummaryProps) {
  const { origin, destination, originName, destinationName, departureDate, returnDate, adults, children, infants, travelClass } = useSearchStore();
  
  const passengerCount = getPassengerCount(adults, children, infants);
  const cabinLabel = travelClass?.toLowerCase() || 'economy';

  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col gap-1.5 rounded-xl border border-border bg-muted/50 px-3 py-2 text-left transition-all hover:bg-muted lg:hidden overflow-hidden"
      aria-label="Suche anpassen"
    >
      {/* Top Row: Route and Edit Icon */}
      <div className="flex items-center gap-2 w-full">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <PlaneIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium truncate">
            {originName || formatAirportName(origin) || '???'} → {destinationName || formatAirportName(destination) || '???'}
          </span>
        </div>
        <Edit2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* Bottom Row: Dates, Passengers, and Cabin Class */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {departureDate && (
          <>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {formatSearchDate(departureDate)}
                {returnDate && ` - ${formatSearchDate(returnDate)}`}
              </span>
            </div>
            <div className="h-3 w-px bg-border" aria-hidden="true" />
          </>
        )}
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{passengerCount}</span>
        </div>
        <div className="h-3 w-px bg-border" aria-hidden="true" />
        <span className="capitalize">{cabinLabel}</span>
      </div>
    </button>
  );
}

// ============================================================================
// Results Page Content
// ============================================================================

function ResultsContent() {
  const router = useRouter();
  const store = useSearchStore();
  const { searchResults, isSearching } = store;
  const { setSelectedOffer: setBookingOffer, reset: resetBooking } = useBookingStore();
  const { mutate: searchFlights, isPending: isSearchPending } = useFlightSearch();

  // UI State
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortTabOption>('best');
  const [filters, setFilters] = useState<FlightFilters>(DEFAULT_FILTERS);
  const [selectedOfferId, setSelectedOfferId] = useState<string>();

  // Memoized calculations
  const filteredOffers = useMemo(() => applyFilters(searchResults, filters), [searchResults, filters]);
  const sortedOffers = useMemo(() => sortOffers(filteredOffers, sortBy), [filteredOffers, sortBy]);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  // Handlers
  const handleSearch = useCallback(() => {
    const request = store.getSearchRequest();
    if (!request) return;
    searchFlights(request, {
      onSuccess: (data) => {
        store.setSearchResults(data.data);
      },
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

  const handleOpenSearchForm = useCallback(() => setShowSearchForm(true), []);
  const handleCloseSearchForm = useCallback(() => setShowSearchForm(false), []);
  const handleOpenFilters = useCallback(() => setShowFilters(true), []);
  const handleCloseFilters = useCallback(() => setShowFilters(false), []);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Skip to main content link for accessibility */}
      <a
        href="#results-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-4 focus:text-foreground"
      >
        Zum Hauptinhalt springen
      </a>

      {/* Compact Search Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Mobile: Search Summary */}
            <MobileSearchSummary onClick={handleOpenSearchForm} />

            {/* Desktop: Inline Search Bar */}
            <DesktopSearchBar onSearch={handleSearch} isSearchPending={isSearchPending} />
          </div>
        </div>
      </header>

      {/* Mobile Search Popup */}
      <MobileSearchPopup
        isOpen={showSearchForm}
        onClose={handleCloseSearchForm}
        onSearch={handleSearch}
      />

      {/* Content */}
      <div className="flex justify-center">
        <div className="w-full max-w-7xl px-4 py-6">
          <div className="flex gap-6">
            {/* Sidebar */}
            <aside className="hidden w-72 shrink-0 lg:block" aria-label="Filter">
              <FilterSidebar
                offers={searchResults}
                filters={filters}
                onFiltersChange={setFilters}
              />
            </aside>

            {/* Results */}
            <main id="results-main" className="flex-1" aria-label="Suchergebnisse">
              {/* Sort Tabs */}
              <SortTabs
                value={sortBy}
                onChange={setSortBy}
                offers={filteredOffers}
                className="mb-4 rounded-lg bg-card border border-border overflow-hidden"
              />

              {/* Mobile Filter Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenFilters}
                className="lg:hidden mb-4 w-full gap-2"
                aria-label={`Filter öffnen${activeFilterCount > 0 ? `, ${activeFilterCount} aktive Filter` : ''}`}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="ml-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>

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
      <MobileFilterSheet
        isOpen={showFilters}
        onClose={handleCloseFilters}
        offers={searchResults}
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={filteredOffers.length}
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
}

// ============================================================================
// Results Page
// ============================================================================

export default function ResultsPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
            <Skeleton className="h-14 w-full" />
            <div className="flex gap-6">
              <Skeleton className="hidden lg:block w-72 h-96 shrink-0" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
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
