'use client';

import { useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Search, Plus, X, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AirportCombobox } from './airport-combobox';
import { FlightDatePicker, SingleFlightDatePicker, type DateRange } from './flight-date-picker';
import { PassengerSelector } from './passenger-selector';
import { CabinClassSelect } from './cabin-class-select';
import { TripTypeToggle, type TripType } from './trip-type-toggle';
import { useSearchStore } from '@/stores/search-store';
import { useFlightSearch } from '@/hooks/use-flights';
import { cn } from '@/lib/utils';

// ============================================================================
// Premium Search Form — Mobile-first Flight Search
// ============================================================================

interface SearchFormProps {
  onSearch?: () => void;
  onSearchComplete?: () => void;
  className?: string;
}

export function SearchForm({ onSearch, onSearchComplete, className }: SearchFormProps) {
  const store = useSearchStore();
  const router = useRouter();
  const { mutate: searchFlights, isPending } = useFlightSearch();

  const dateRangeValue = useMemo<DateRange | undefined>(() => ({
    from: store.departureDate ?? undefined,
    to: store.returnDate ?? undefined,
  }), [store.departureDate, store.returnDate]);

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    store.setDepartureDate(range?.from);
    store.setReturnDate(range?.to);
  }, [store]);

  const handleSearch = () => {
    const request = store.getSearchRequest();
    if (!request) return;

    onSearch?.();
    router.push('/results');

    searchFlights(request, {
      onSuccess: (data) => {
        store.setSearchResults(data.data);
        onSearchComplete?.();
      },
    });
  };

  const handleSwapLocations = () => {
    store.swapLocations();
  };

  const tripType = store.tripType;
  const additionalLegsCount = store.additionalLegs.length;
  const addLeg = store.addLeg;

  useEffect(() => {
    if (tripType === 'multicity' && additionalLegsCount === 0) {
      addLeg();
    }
  }, [tripType, additionalLegsCount, addLeg]);

  const isSearchDisabled = isPending || !store.origin || !store.destination || !store.departureDate;

  return (
    <div className={cn('space-y-5', className)}>
      {/* Top Row: Trip Type + Passengers + Class */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex justify-center sm:justify-start">
          <TripTypeToggle
            value={store.tripType}
            onChange={(type) => store.setTripType(type as TripType)}
          />
        </div>
        <div className="flex items-center justify-center gap-2 sm:justify-end">
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
          />
          <CabinClassSelect
            value={store.travelClass}
            onChange={(value) => store.setTravelClass(value)}
            compact
          />
        </div>
      </div>

      {/* Main Search Fields */}
      {store.tripType !== 'multicity' ? (
        <div className="space-y-3">
          {/* Airport Fields */}
          <div className="relative flex flex-col gap-2 md:flex-row md:items-center md:gap-0">
            {/* Origin */}
            <div className="flex-1">
              <AirportCombobox
                value={store.origin}
                valueName={store.originName}
                onChange={(code, name) => {
                  store.setOrigin(code);
                  store.setOriginName(name);
                }}
                placeholder="Von wo?"
                icon="departure"
                compact
              />
            </div>

            {/* Swap Button — neutral gray */}
            <div className="flex justify-center md:px-1 md:relative md:z-10">
              <motion.button
                type="button"
                onClick={handleSwapLocations}
                whileTap={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 bg-white shadow-md transition-all hover:border-gray-300 hover:shadow-lg active:scale-95 dark:border-gray-700 dark:bg-background"
                aria-label="Abflug- und Zielflughafen tauschen"
              >
                <ArrowRightLeft className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </motion.button>
            </div>

            {/* Destination */}
            <div className="flex-1">
              <AirportCombobox
                value={store.destination}
                valueName={store.destinationName}
                onChange={(code, name) => {
                  store.setDestination(code);
                  store.setDestinationName(name);
                }}
                placeholder="Wohin?"
                icon="arrival"
                compact
              />
            </div>
          </div>

          {/* Date + Search Row */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex-1">
              <FlightDatePicker
                value={dateRangeValue}
                onChange={handleDateRangeChange}
                tripType={store.tripType as 'roundtrip' | 'oneway'}
                onTripTypeChange={(type) => store.setTripType(type)}
                origin={store.origin}
                destination={store.destination}
                showTripTypeSelector
                compact
              />
            </div>

            {/* Search Button — pink CTA (only pink element) */}
            <motion.button
              type="button"
              onClick={handleSearch}
              disabled={isSearchDisabled}
              whileHover={!isSearchDisabled ? { scale: 1.02 } : {}}
              whileTap={!isSearchDisabled ? { scale: 0.98 } : {}}
              className={cn(
                'flex w-full items-center justify-center gap-2.5 rounded-2xl px-8 py-4 text-base font-semibold transition-all md:w-auto md:min-w-[160px]',
                'min-h-[52px]',
                isSearchDisabled
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                  : 'bg-pink-500 text-white shadow-lg shadow-pink-500/25 hover:bg-pink-600 hover:shadow-xl hover:shadow-pink-500/30'
              )}
              aria-label="Flüge suchen"
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-5 w-5" aria-hidden="true" />
              )}
              <span>Flüge suchen</span>
            </motion.button>
          </div>
        </div>
      ) : (
        /* Multi-City Layout */
        <div className="space-y-3">
          {/* First Segment */}
          <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-800/30">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Flug 1
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="flex-1">
                <AirportCombobox
                  value={store.origin}
                  valueName={store.originName}
                  onChange={(code, name) => {
                    store.setOrigin(code);
                    store.setOriginName(name);
                  }}
                  placeholder="Von wo?"
                  icon="departure"
                  compact
                />
              </div>

              <div className="flex-1">
                <AirportCombobox
                  value={store.destination}
                  valueName={store.destinationName}
                  onChange={(code, name) => {
                    store.setDestination(code);
                    store.setDestinationName(name);
                  }}
                  placeholder="Wohin?"
                  icon="arrival"
                  compact
                />
              </div>

              <div className="md:w-44">
                <SingleFlightDatePicker
                  value={store.departureDate ?? undefined}
                  onChange={(date) => store.setDepartureDate(date)}
                  placeholder="Datum"
                  compact
                />
              </div>
            </div>
          </div>

          {/* Additional Segments */}
          <AnimatePresence>
            {store.additionalLegs.map((leg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative rounded-2xl bg-gray-50 p-3 dark:bg-gray-800/30"
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Flug {index + 2}
                  </span>
                  {store.additionalLegs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => store.removeLeg(index)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700"
                      aria-label={`Flug ${index + 2} entfernen`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="flex-1">
                    <AirportCombobox
                      value={leg.origin}
                      valueName={leg.originName}
                      onChange={(code, name) => store.updateLeg(index, { origin: code, originName: name })}
                      placeholder="Von wo?"
                      icon="departure"
                      compact
                    />
                  </div>

                  <div className="flex-1">
                    <AirportCombobox
                      value={leg.destination}
                      valueName={leg.destinationName}
                      onChange={(code, name) => store.updateLeg(index, { destination: code, destinationName: name })}
                      placeholder="Wohin?"
                      icon="arrival"
                      compact
                    />
                  </div>

                  <div className="md:w-44">
                    <SingleFlightDatePicker
                      value={leg.departureDate ?? undefined}
                      onChange={(date) => store.updateLeg(index, { departureDate: date ?? null })}
                      placeholder="Datum"
                      compact
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add Segment + Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => store.addLeg()}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-dashed border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-500 transition-all hover:border-gray-400 hover:bg-gray-50 active:scale-95 sm:justify-start dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-800/50"
              aria-label="Weiteren Flug hinzufügen"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Flug hinzufügen
            </button>

            <motion.button
              type="button"
              onClick={handleSearch}
              disabled={isSearchDisabled}
              whileHover={!isSearchDisabled ? { scale: 1.02 } : {}}
              whileTap={!isSearchDisabled ? { scale: 0.98 } : {}}
              className={cn(
                'flex w-full items-center justify-center gap-2.5 rounded-2xl px-8 py-4 text-base font-semibold transition-all sm:w-auto sm:min-w-[160px]',
                'min-h-[52px]',
                isSearchDisabled
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                  : 'bg-pink-500 text-white shadow-lg shadow-pink-500/25 hover:bg-pink-600 hover:shadow-xl hover:shadow-pink-500/30'
              )}
              aria-label="Multi-City Flüge suchen"
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-5 w-5" aria-hidden="true" />
              )}
              Suchen
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
