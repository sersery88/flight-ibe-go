'use client';

import { useQuery } from '@tanstack/react-query';
import { getSeatmaps } from '@/lib/api-client';
import type { FlightOffer } from '@/types/seatmap';

/**
 * Dedicated seatmap React Query hook.
 *
 * Fetches the seatmap for a single offer. The query is only enabled when an
 * offer is provided and uses a 5-minute staleTime to match the backend Redis
 * cache TTL.
 */
export function useSeatmap(offer: FlightOffer | null) {
  return useQuery({
    queryKey: ['seatmap', offer?.id ?? null],
    queryFn: () => getSeatmaps(offer ? [offer] : []),
    enabled: !!offer,
    staleTime: 5 * 60 * 1000, // 5 min — matches backend cache TTL
    gcTime: 10 * 60 * 1000, // 10 min garbage collection
    retry: 1,
  });
}
