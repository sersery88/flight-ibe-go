'use client';

import { useQuery } from '@tanstack/react-query';
import { getSeatmaps, getSeatmapByOrder } from '@/lib/api-client';
import type { FlightOffer } from '@/types/seatmap';

/**
 * Dedicated seatmap React Query hook.
 *
 * Fetches the seatmap for a single offer. The query is only enabled when an
 * offer is provided and uses a 5-minute staleTime to match the backend Redis
 * cache TTL.
 */
export function useSeatmap(offer: FlightOffer | null) {
  // Build a unique cache key from offer content, not just ID (Amadeus reuses "1", "2" etc.)
  const cacheKey = offer
    ? `${offer.id}-${offer.itineraries?.[0]?.segments?.[0]?.carrierCode ?? ''}-${offer.itineraries?.[0]?.segments?.[0]?.number ?? ''}-${offer.price?.total ?? ''}`
    : null;

  return useQuery({
    queryKey: ['seatmap', cacheKey],
    queryFn: () => getSeatmaps(offer ? [offer] : []),
    enabled: !!offer,
    staleTime: 2 * 60 * 1000, // 2 min — shorter to avoid stale data
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Seatmap hook that uses PNR-based loading (order ID).
 * Falls back to offer-based loading if no orderId is provided.
 */
export function useSeatmapByOrder(
  orderId: string | null,
  offer: FlightOffer | null
) {
  // PNR-based seatmap (preferred when we have an order)
  const orderQuery = useQuery({
    queryKey: ['seatmap-order', orderId],
    queryFn: () => getSeatmapByOrder(orderId!),
    enabled: !!orderId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Offer-based fallback
  const offerQuery = useQuery({
    queryKey: ['seatmap', offer?.id ?? null],
    queryFn: () => getSeatmaps(offer ? [offer] : []),
    enabled: !!offer && !orderId, // Only if no orderId
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Return order query if we have orderId, otherwise offer query
  return orderId ? orderQuery : offerQuery;
}
