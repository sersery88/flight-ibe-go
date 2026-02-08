'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Plane, Luggage } from 'lucide-react';
import { formatCurrency, formatDuration, formatDateTime, getTravelerTypeLabel } from '@/lib/utils';
import { formatAirlineName } from '@/lib/airlines';
import type { FlightOffer, Itinerary, FareDetailsBySegment } from '@/types/flight';
import type { TravelerData } from '@/stores/booking-flow-store';
import type { SeatSelections } from '@/stores/seat-selection-store';

// ============================================================================
// Types
// ============================================================================

export interface BookingReviewProps {
  offer: FlightOffer;
  travelers: TravelerData[];
  seatSelections?: SeatSelections;
  compact?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function getFareDetail(offer: FlightOffer, itinIdx: number, segIdx: number): FareDetailsBySegment | undefined {
  const tp = offer.travelerPricings?.[0];
  if (!tp) return undefined;
  // Calculate the absolute segment index
  let absIdx = 0;
  for (let i = 0; i < itinIdx; i++) {
    absIdx += offer.itineraries[i].segments.length;
  }
  absIdx += segIdx;
  return tp.fareDetailsBySegment?.[absIdx];
}

function getBaggageLabel(fd: FareDetailsBySegment | undefined): string {
  if (!fd) return '';
  const bags = fd.includedCheckedBags;
  if (!bags) return '';
  const cabin = (fd.cabin || 'ECONOMY').toUpperCase();
  if (bags.weight && bags.weight > 0) {
    const qty = bags.quantity || 1;
    return qty === 1 ? `${bags.weight}kg` : `${qty}× ${bags.weight}kg`;
  }
  if (bags.quantity && bags.quantity > 0) {
    const wt = cabin.includes('FIRST') || cabin.includes('BUSINESS') ? 32 : 23;
    return bags.quantity === 1 ? `${wt}kg` : `${bags.quantity}× ${wt}kg`;
  }
  return '';
}

function getCabinLabel(cabin: string): string {
  const c = cabin.toUpperCase();
  if (c.includes('FIRST')) return 'First';
  if (c.includes('BUSINESS')) return 'Business';
  if (c.includes('PREMIUM')) return 'Premium Economy';
  return 'Economy';
}

function getGenderLabel(gender: string, type: string): string {
  if (type === 'CHILD') return gender === 'MALE' ? 'Junge' : 'Mädchen';
  if (type === 'INFANT') return 'Baby';
  return gender === 'MALE' ? 'Erwachsener' : 'Erwachsene';
}

// ============================================================================
// BookingReview
// ============================================================================

export function BookingReview({ offer, travelers, seatSelections, compact = false }: BookingReviewProps) {
  // Collect seat labels per itinerary
  const seatLabelsPerItinerary = useMemo(() => {
    if (!seatSelections) return [];
    return offer.itineraries.map((itin) => {
      const labels: string[] = [];
      for (const seg of itin.segments) {
        const segSels = seatSelections[seg.id];
        if (segSels) {
          for (const sel of Object.values(segSels)) {
            if (sel.number) labels.push(sel.number);
          }
        }
      }
      return labels;
    });
  }, [offer, seatSelections]);

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
          Buchungsübersicht
        </h2>
      </div>
      <div className="p-5 space-y-5">
        {/* Flight segments */}
        {offer.itineraries.map((itin, itinIdx) => (
          <ItineraryRow
            key={itinIdx}
            itinerary={itin}
            itinIdx={itinIdx}
            offer={offer}
            seatLabels={seatLabelsPerItinerary[itinIdx] || []}
            compact={compact}
          />
        ))}

        {/* Passengers */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            👤 Passagiere
          </p>
          <div className="space-y-2">
            {travelers.map((t, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400 shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {t.gender === 'MALE' ? 'Herr' : 'Frau'} {t.firstName} {t.lastName}
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-1.5">
                      ({getGenderLabel(t.gender, t.type)})
                    </span>
                  </p>
                  {t.fqtv && !compact && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      🎫 {t.fqtv.programOwner}: {t.fqtv.memberId}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ItineraryRow
// ============================================================================

function ItineraryRow({
  itinerary,
  itinIdx,
  offer,
  seatLabels,
  compact,
}: {
  itinerary: Itinerary;
  itinIdx: number;
  offer: FlightOffer;
  seatLabels: string[];
  compact: boolean;
}) {
  const first = itinerary.segments[0];
  const last = itinerary.segments[itinerary.segments.length - 1];
  const label = itinIdx === 0 ? 'Hinflug' : 'Rückflug';

  // Route string
  const routePoints = itinerary.segments
    .map((s) => s.departure.iataCode)
    .concat(last.arrival.iataCode);
  const routeStr = routePoints.join(' → ');

  // Flight numbers
  const flightNumbers = itinerary.segments
    .map((s) => `${s.carrierCode}${s.number}`)
    .join(' / ');

  // Airline name (from first segment)
  const airlineName = formatAirlineName(
    first.operating?.carrierCode || first.carrierCode
  );

  // Fare details from first segment
  const fareDetail = getFareDetail(offer, itinIdx, 0);
  const cabinLabel = fareDetail ? getCabinLabel(fareDetail.cabin) : 'Economy';
  const bookingClass = fareDetail?.class || '';
  const baggageLabel = getBaggageLabel(fareDetail);

  return (
    <div className={itinIdx > 0 ? 'border-t border-gray-100 dark:border-gray-800 pt-4' : ''}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Plane className={`h-3.5 w-3.5 text-pink-500 ${itinIdx > 0 ? 'rotate-180' : ''}`} />
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label} ·{' '}
          {formatDateTime(first.departure.at, {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Route + Segments */}
      {!compact ? (
        <div className="space-y-2 ml-5">
          {itinerary.segments.map((seg, segIdx) => {
            const nextSeg = itinerary.segments[segIdx + 1];
            let layover = '';
            if (nextSeg) {
              const layoverMs =
                new Date(nextSeg.departure.at).getTime() - new Date(seg.arrival.at).getTime();
              const h = Math.floor(layoverMs / (1000 * 60 * 60));
              const m = Math.floor((layoverMs % (1000 * 60 * 60)) / (1000 * 60));
              layover = `${h}h ${m}m`;
            }

            return (
              <div key={seg.id || segIdx}>
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-[48px]">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">
                      {formatDateTime(seg.departure.at, 'time')}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {seg.departure.iataCode}
                    </p>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {formatDuration(seg.duration)}
                    </span>
                    <div className="w-full flex items-center">
                      <div className="h-[1.5px] flex-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {formatAirlineName(seg.operating?.carrierCode || seg.carrierCode)} · {seg.carrierCode}
                      {seg.number}
                    </span>
                  </div>
                  <div className="text-center min-w-[48px]">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">
                      {formatDateTime(seg.arrival.at, 'time')}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {seg.arrival.iataCode}
                    </p>
                  </div>
                </div>
                {nextSeg && (
                  <div className="flex items-center gap-2 my-1.5 px-2">
                    <div className="flex-1 border-t border-dashed border-amber-300 dark:border-amber-600" />
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {layover} Umstieg in {seg.arrival.iataCode}
                    </span>
                    <div className="flex-1 border-t border-dashed border-amber-300 dark:border-amber-600" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ml-5">
          <p className="text-sm text-gray-800 dark:text-gray-200">
            {routeStr}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {airlineName} · {flightNumbers} · {formatDuration(itinerary.duration)}
          </p>
        </div>
      )}

      {/* Tags */}
      <div className="flex items-center gap-2 flex-wrap mt-2 ml-5">
        <span className="inline-flex items-center text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-0.5">
          {cabinLabel}
          {bookingClass ? ` · Klasse ${bookingClass}` : ''}
        </span>
        {baggageLabel && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-0.5">
            <Luggage className="h-3 w-3" />
            {baggageLabel}
          </span>
        )}
        {seatLabels.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-md px-2 py-0.5">
            💺 {seatLabels.join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}
