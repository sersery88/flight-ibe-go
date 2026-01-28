'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getUpsellOffers } from '@/lib/api-client';
import type { FlightOffer } from '@/types/flight';

interface UseUpsellOffersOptions {
  enabled?: boolean;
}

interface UseUpsellOffersResult {
  upsellOffers: FlightOffer[];
  isLoading: boolean;
  hasFailed: boolean;
  hasMultipleFares: boolean;
  allFareOptions: FlightOffer[];
  refetch: () => void;
}

/**
 * Hook to fetch and manage upsell/branded fare offers for a flight.
 * Extracts the upsell logic from FlightCard for better separation of concerns.
 */
export function useUpsellOffers(
  offer: FlightOffer,
  options: UseUpsellOffersOptions = {}
): UseUpsellOffersResult {
  const { enabled = false } = options;
  
  const [upsellOffers, setUpsellOffers] = useState<FlightOffer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const fetchUpsellOffers = useCallback(async () => {
    if (isLoading || hasFailed || upsellOffers.length > 0) return;
    
    setIsLoading(true);
    try {
      const response = await getUpsellOffers([offer]);
      if (response.data && response.data.length > 1) {
        setUpsellOffers(response.data);
      } else {
        setHasFailed(true);
      }
    } catch (error) {
      console.error('Failed to load upsell offers:', error);
      setHasFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, [offer, isLoading, hasFailed, upsellOffers.length]);

  // Auto-fetch when enabled becomes true
  useEffect(() => {
    if (enabled && upsellOffers.length === 0 && !isLoading && !hasFailed) {
      fetchUpsellOffers();
    }
  }, [enabled, fetchUpsellOffers, upsellOffers.length, isLoading, hasFailed]);

  // Combine original offer with upsell offers, deduplicated by fare code
  const allFareOptions = useMemo(() => {
    if (upsellOffers.length === 0) return [offer];

    const fareMap = new Map<string, FlightOffer>();
    const originalFare = offer.travelerPricings[0]?.fareDetailsBySegment[0]?.brandedFare || 'ORIGINAL';
    fareMap.set(originalFare, offer);

    for (const upsellOffer of upsellOffers) {
      const fareCode = upsellOffer.travelerPricings[0]?.fareDetailsBySegment[0]?.brandedFare || upsellOffer.id;
      const existing = fareMap.get(fareCode);

      // Keep the cheaper one if duplicate fare codes
      if (!existing || parseFloat(upsellOffer.price.total) < parseFloat(existing.price.total)) {
        fareMap.set(fareCode, upsellOffer);
      }
    }

    // Sort by price ascending
    return Array.from(fareMap.values()).sort(
      (a, b) => parseFloat(a.price.total) - parseFloat(b.price.total)
    );
  }, [offer, upsellOffers]);

  const hasMultipleFares = upsellOffers.length > 1;

  const refetch = useCallback(() => {
    setUpsellOffers([]);
    setHasFailed(false);
    // Will auto-fetch on next render if enabled
  }, []);

  return {
    upsellOffers,
    isLoading,
    hasFailed,
    hasMultipleFares,
    allFareOptions,
    refetch,
  };
}
