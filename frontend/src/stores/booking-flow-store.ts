'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import type { FlightOffer } from '@/types/flight';

// ============================================================================
// Types
// ============================================================================

export interface TravelerData {
  id: string;
  type: 'ADULT' | 'CHILD' | 'INFANT';
  gender: 'MALE' | 'FEMALE';
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  nationality: string; // ISO 2-letter
  fqtv?: {
    programOwner: string; // IATA airline code
    memberId: string;
  };
}

export interface ContactData {
  email: string;
  phone: string;
  phoneCountryCode: string;
}

export interface PricingResult {
  totalPrice: number;
  currency: string;
  pricePerTraveler: Record<string, number>;
  ancillaryOptions?: AncillaryOption[];
}

export interface AncillaryOption {
  type: string;
  description: string;
  price: number;
  currency: string;
}

export interface SelectedAncillary {
  type: 'EXTRA_BAG' | 'SPORT_EQUIPMENT' | 'PRIORITY_BOARDING' | 'AIRPORT_CHECKIN';
  travelerId: string;
  segmentId?: string;
  quantity: number;
  price: number;
  currency: string;
}

export interface SelectedSeat {
  number: string;
  cabin: string;
  price?: number;
  currency?: string;
}

// ============================================================================
// State Interface
// ============================================================================

export interface BookingFlowState {
  currentStep: 1 | 2 | 3 | 4;

  // Selected offer from search results
  offer: FlightOffer | null;

  // Step 1
  travelers: TravelerData[];
  contact: ContactData | null;

  // Step 1 → 2 transition
  orderId: string | null;
  pnrReference: string | null;
  pricingResult: PricingResult | null;

  // Step 2
  seatSelections: Record<string, Record<string, SelectedSeat>>;
  ancillaries: SelectedAncillary[];

  // Step 3
  paymentMethod: string | null;
  paymentToken: string | null;

  // Step 4
  confirmed: boolean;
  ticketNumbers: string[];
  voucherUrl: string | null;

  // Actions
  setStep: (step: 1 | 2 | 3 | 4) => void;
  setOffer: (offer: FlightOffer) => void;
  setTravelers: (t: TravelerData[]) => void;
  setContact: (c: ContactData) => void;
  setOrder: (orderId: string, pnr: string) => void;
  setPricing: (p: PricingResult) => void;
  setSeatSelections: (s: Record<string, Record<string, SelectedSeat>>) => void;
  setAncillaries: (a: SelectedAncillary[]) => void;
  setPayment: (method: string, token?: string) => void;
  setConfirmed: (tickets: string[], voucherUrl?: string) => void;
  cancelBooking: () => Promise<void>;
  reset: () => void;

  // Navigation guards
  canGoToStep: (step: number) => boolean;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  currentStep: 1 as const,
  offer: null,
  travelers: [],
  contact: null,
  orderId: null,
  pnrReference: null,
  pricingResult: null,
  seatSelections: {},
  ancillaries: [],
  paymentMethod: null,
  paymentToken: null,
  confirmed: false,
  ticketNumbers: [],
  voucherUrl: null,
};

// ============================================================================
// Store
// ============================================================================

export const useBookingFlowStore = create<BookingFlowState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // --- Actions ---

        setStep: (step) => {
          const state = get();
          if (state.canGoToStep(step)) {
            set({ currentStep: step }, false, 'setStep');
          }
        },

        setOffer: (offer) => {
          // Clear stale data from previous offer
          const prev = get().offer;
          if (prev && prev.id !== offer.id) {
            // Clear seat selections from the seat-selection-store
            try {
              const { clearAll } = require('@/stores/seat-selection-store').useSeatSelectionStore.getState();
              clearAll();
            } catch { /* ignore if store not available */ }
          }
          set({
            offer,
            // Reset downstream state when offer changes
            orderId: prev && prev.id !== offer.id ? null : get().orderId,
            pnrReference: prev && prev.id !== offer.id ? null : get().pnrReference,
            pricingResult: prev && prev.id !== offer.id ? null : get().pricingResult,
            seatSelections: prev && prev.id !== offer.id ? {} : get().seatSelections,
            ancillaries: prev && prev.id !== offer.id ? [] : get().ancillaries,
            currentStep: prev && prev.id !== offer.id ? 1 : get().currentStep,
          }, false, 'setOffer');
        },

        setTravelers: (travelers) => set({ travelers }, false, 'setTravelers'),

        setContact: (contact) => set({ contact }, false, 'setContact'),

        setOrder: (orderId, pnr) =>
          set({ orderId, pnrReference: pnr }, false, 'setOrder'),

        setPricing: (pricingResult) =>
          set({ pricingResult }, false, 'setPricing'),

        setSeatSelections: (seatSelections) =>
          set({ seatSelections }, false, 'setSeatSelections'),

        setAncillaries: (ancillaries) =>
          set({ ancillaries }, false, 'setAncillaries'),

        setPayment: (method, token) =>
          set({ paymentMethod: method, paymentToken: token ?? null }, false, 'setPayment'),

        setConfirmed: (tickets, voucherUrl) =>
          set(
            {
              confirmed: true,
              ticketNumbers: tickets,
              voucherUrl: voucherUrl ?? null,
              currentStep: 4,
            },
            false,
            'setConfirmed'
          ),

        cancelBooking: async () => {
          const { orderId } = get();
          if (orderId) {
            try {
              await fetch(`/api/flights/order/${orderId}`, { method: 'DELETE' });
            } catch {
              // Fire-and-forget fallback via sendBeacon
              if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
                navigator.sendBeacon(
                  `/api/flights/order/${orderId}/cancel`,
                  JSON.stringify({ reason: 'user_cancelled' })
                );
              }
            }
          }
          set(initialState, false, 'cancelBooking');
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('booking-flow');
          }
        },

        reset: () => {
          set(initialState, false, 'reset');
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('booking-flow');
          }
        },

        // --- Navigation Guards ---

        canGoToStep: (step) => {
          const state = get();
          if (step <= 0 || step > 4) return false;
          if (step === 1) return true;

          // Step 2 requires: offer, all travelers filled, contact
          if (step >= 2) {
            if (!state.offer) return false;
            if (state.travelers.length === 0) return false;
            if (!state.contact) return false;
            // Check each traveler has required fields
            const allFilled = state.travelers.every(
              (t) => t.firstName && t.lastName && t.gender && t.dateOfBirth
            );
            if (!allFilled) return false;
          }

          // Step 3 requires: step 2 conditions met (extras are optional)
          if (step >= 3) {
            // Step 2 is always completable (extras are optional)
            // Just need to have passed through step 2
            if (state.currentStep < 2 && step > state.currentStep) return false;
          }

          // Step 4 requires: payment
          if (step >= 4) {
            if (!state.confirmed && step === 4) return false;
          }

          return true;
        },
      }),
      {
        name: 'booking-flow',
        storage: createJSONStorage(() =>
          typeof window !== 'undefined' ? sessionStorage : {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        ),
        partialize: (state) => ({
          currentStep: state.currentStep,
          offer: state.offer,
          travelers: state.travelers,
          contact: state.contact,
          orderId: state.orderId,
          pnrReference: state.pnrReference,
          pricingResult: state.pricingResult,
          seatSelections: state.seatSelections,
          ancillaries: state.ancillaries,
          paymentMethod: state.paymentMethod,
          paymentToken: state.paymentToken,
          confirmed: state.confirmed,
          ticketNumbers: state.ticketNumbers,
          voucherUrl: state.voucherUrl,
        }),
      }
    ),
    { name: 'BookingFlowStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
