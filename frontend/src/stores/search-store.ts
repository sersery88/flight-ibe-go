'use client';

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import type { FlightSearchRequest, FlightOffer, TravelClass } from '@/types/flight';

// ============================================================================
// Search Store - Flight Search State Management
// ============================================================================

export type TripType = 'roundtrip' | 'oneway' | 'multicity';

interface SearchState {
  // Trip type
  tripType: TripType;

  // Search parameters
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  departureDate: Date | null;
  returnDate: Date | null;

  // Passengers
  adults: number;
  children: number;
  infants: number;

  // Options
  travelClass: TravelClass;
  nonStop: boolean;

  // Multi-city legs
  additionalLegs: Array<{
    origin: string;
    originName: string;
    destination: string;
    destinationName: string;
    departureDate: Date | null;
  }>;

  // Results
  searchResults: FlightOffer[];
  selectedOffer: FlightOffer | null;
  isSearching: boolean;

  // Actions
  setTripType: (type: TripType) => void;
  setOrigin: (code: string) => void;
  setOriginName: (name: string) => void;
  setDestination: (code: string) => void;
  setDestinationName: (name: string) => void;
  setDepartureDate: (date: Date | undefined) => void;
  setReturnDate: (date: Date | undefined) => void;
  setAdults: (adults: number) => void;
  setChildren: (children: number) => void;
  setInfants: (infants: number) => void;
  setTravelClass: (travelClass: TravelClass) => void;
  setNonStop: (nonStop: boolean) => void;
  swapLocations: () => void;
  addLeg: () => void;
  removeLeg: (index: number) => void;
  updateLeg: (index: number, leg: Partial<SearchState['additionalLegs'][0]>) => void;
  setSearchResults: (results: FlightOffer[]) => void;
  setSelectedOffer: (offer: FlightOffer | null) => void;
  setIsSearching: (isSearching: boolean) => void;
  updateOfferPricing: (offerId: string, updatedOffer: FlightOffer) => void;
  reset: () => void;
  getSearchRequest: () => FlightSearchRequest | null;
}

const initialState = {
  tripType: 'roundtrip' as TripType,
  origin: '',
  originName: '',
  destination: '',
  destinationName: '',
  departureDate: null,
  returnDate: null,
  adults: 1,
  children: 0,
  infants: 0,
  travelClass: 'ECONOMY' as TravelClass,
  nonStop: false,
  additionalLegs: [],
  searchResults: [],
  selectedOffer: null,
  isSearching: false,
};

export const useSearchStore = create<SearchState>()(
  devtools(
    persist(
      (set, get) => ({
      ...initialState,

      setTripType: (tripType) => set({ tripType }),

      setOrigin: (code) => set({ origin: code }),
      setOriginName: (name) => set({ originName: name }),

      setDestination: (code) => set({ destination: code }),
      setDestinationName: (name) => set({ destinationName: name }),

      setDepartureDate: (date) => set({ departureDate: date ?? null }),

      setReturnDate: (date) => set({ returnDate: date ?? null }),

      setAdults: (adults) => set({ adults }),
      setChildren: (children) => set({ children }),
      setInfants: (infants) => set({ infants }),

      setTravelClass: (travelClass) => set({ travelClass }),

      setNonStop: (nonStop) => set({ nonStop }),

      swapLocations: () => {
        const { origin, originName, destination, destinationName } = get();
        set({
          origin: destination,
          originName: destinationName,
          destination: origin,
          destinationName: originName,
        });
      },

      addLeg: () => set((state) => ({
        additionalLegs: [
          ...state.additionalLegs,
          { origin: '', originName: '', destination: '', destinationName: '', departureDate: null },
        ],
      })),

      removeLeg: (index) => set((state) => ({
        additionalLegs: state.additionalLegs.filter((_, i) => i !== index),
      })),

      updateLeg: (index, leg) => set((state) => ({
        additionalLegs: state.additionalLegs.map((l, i) => i === index ? { ...l, ...leg } : l),
      })),

      setSearchResults: (results) => set({ searchResults: results }),

      setSelectedOffer: (offer) => set({ selectedOffer: offer }),

      setIsSearching: (isSearching) => set({ isSearching }),

      updateOfferPricing: (offerId, updatedOffer) => set((state) => ({
        searchResults: state.searchResults.map((offer) =>
          offer.id === offerId ? updatedOffer : offer
        ),
      })),

      reset: () => set(initialState),

      getSearchRequest: () => {
        const state = get();
        if (!state.origin || !state.destination || !state.departureDate) return null;

        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        return {
          origin: state.origin,
          destination: state.destination,
          departureDate: formatDate(state.departureDate),
          returnDate: state.tripType === 'roundtrip' && state.returnDate
            ? formatDate(state.returnDate)
            : undefined,
          adults: state.adults,
          children: state.children,
          infants: state.infants,
          travelClass: state.travelClass,
          nonStop: state.nonStop,
          additionalLegs: state.tripType === 'multicity'
            ? state.additionalLegs.filter(l => l.origin && l.destination && l.departureDate)
                .map(l => ({
                  origin: l.origin,
                  destination: l.destination,
                  departureDate: formatDate(l.departureDate!),
                }))
            : undefined,
        };
      },
    }),
      {
        name: 'flight-search',
        storage: {
          getItem: (name) => {
            try {
              const raw = localStorage.getItem(name);
              if (!raw) return null;
              const parsed = JSON.parse(raw);
              // Convert timestamps back to Date objects
              if (parsed?.state) {
                const s = parsed.state;
                if (s.departureDate != null) s.departureDate = new Date(s.departureDate);
                if (s.returnDate != null) s.returnDate = new Date(s.returnDate);
              }
              return parsed;
            } catch {
              return null;
            }
          },
          setItem: (name, value) => {
            try {
              // Convert Dates to timestamps before JSON serialization
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const v = value as any;
              if (v?.state) {
                const s = v.state;
                if (s.departureDate instanceof Date) s.departureDate = s.departureDate.getTime();
                if (s.returnDate instanceof Date) s.returnDate = s.returnDate.getTime();
              }
              localStorage.setItem(name, JSON.stringify(value));
            } catch { /* quota exceeded etc */ }
          },
          removeItem: (name) => { try { localStorage.removeItem(name); } catch {} },
        },
        skipHydration: true,
        partialize: (state) => ({
          tripType: state.tripType,
          origin: state.origin,
          originName: state.originName,
          destination: state.destination,
          destinationName: state.destinationName,
          departureDate: state.departureDate,
          returnDate: state.returnDate,
          adults: state.adults,
          children: state.children,
          infants: state.infants,
          travelClass: state.travelClass,
        }) as unknown as SearchState,
      }
    ),
    { name: 'SearchStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// ============================================================================
// Hydration Hook - Must be called in a client component to rehydrate store
// ============================================================================

/**
 * Hook to handle Zustand store hydration for Next.js SSR compatibility.
 * Call this in your root layout or a provider component.
 * 
 * @example
 * ```tsx
 * // In a client component:
 * function StoreHydration() {
 *   useSearchStoreHydration();
 *   return null;
 * }
 * ```
 */
export function useSearchStoreHydration() {
  useEffect(() => {
    useSearchStore.persist.rehydrate();
  }, []);
}

/**
 * Check if the store has been hydrated from localStorage.
 * Useful for preventing hydration mismatches.
 */
export function useIsSearchStoreHydrated() {
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    // Check if already hydrated
    const unsubFinishHydration = useSearchStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });
    
    // Trigger hydration
    useSearchStore.persist.rehydrate();
    
    return () => {
      unsubFinishHydration();
    };
  }, []);
  
  return isHydrated;
}
