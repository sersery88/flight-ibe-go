'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Armchair, Luggage, Sparkles } from 'lucide-react';
import { useBookingFlowStore } from '@/stores/booking-flow-store';
import { useSeatSelectionStore } from '@/stores/seat-selection-store';
import { SeatmapModal } from '@/components/seatmap';
import { formatCurrency, getTravelerTypeLabel } from '@/lib/utils';
import type { FlightOffer } from '@/types/flight';

// ============================================================================
// StepExtras — Placeholder (Phase 3 will expand this)
// ============================================================================

export function StepExtras() {
  const { offer, travelers, setStep } = useBookingFlowStore();
  const [seatmapOpen, setSeatmapOpen] = useState(false);
  const [seatmapSegmentIndex, setSeatmapSegmentIndex] = useState(0);

  const seatTotalCost = useSeatSelectionStore((s) => s.totalSeatCost());
  const seatCurrency = useSeatSelectionStore((s) => s.currency());
  const seatHasSelections = useSeatSelectionStore((s) => s.hasSelections());

  // Build travelers for SeatmapModal
  const seatmapTravelers = useMemo(() => {
    return travelers.map((t, idx) => ({
      id: t.id || String(idx + 1),
      name: t.firstName && t.lastName
        ? `${t.firstName} ${t.lastName}`
        : `${t.type === 'ADULT' ? 'Erwachsener' : t.type === 'CHILD' ? 'Kind' : 'Baby'} ${idx + 1}`,
      type: t.type === 'INFANT' ? ('HELD_INFANT' as const) : t.type,
    }));
  }, [travelers]);

  if (!offer) return null;

  const totalPrice = parseFloat(offer.price.grandTotal) + seatTotalCost;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-[900px] px-4 py-3 flex items-center">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Zurück zu Passagierdaten</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-4 py-6 space-y-6">
        {/* Seatmap Section */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <Armchair className="h-5 w-5 text-pink-500" />
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Sitzplatzwahl
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Wähle deinen Lieblingsplatz
                </p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {offer.itineraries.map((itin, idx) => {
                const first = itin.segments[0];
                const last = itin.segments[itin.segments.length - 1];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSeatmapSegmentIndex(
                        idx === 0 ? 0 : offer.itineraries[0].segments.length
                      );
                      setSeatmapOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-700 hover:bg-pink-50/50 dark:hover:bg-pink-950/20 transition-all min-h-[44px]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">✈️</span>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {idx === 0 ? 'Hinflug' : 'Rückflug'}: {first.departure.iataCode} → {last.arrival.iataCode}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {itin.segments.length} Segment{itin.segments.length > 1 ? 'e' : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-pink-600 dark:text-pink-400">
                      Sitzplan öffnen →
                    </span>
                  </button>
                );
              })}

              {seatHasSelections && (
                <div className="rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800/50 px-4 py-3">
                  <p className="text-sm text-pink-700 dark:text-pink-300 font-medium">
                    💺 Sitzplätze gewählt · {formatCurrency(seatTotalCost, seatCurrency || offer.price.currency)}
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                oder: Sitzplatz beim Check-in wählen
              </p>
            </div>
          </div>
        </motion.section>

        {/* Extras Placeholder */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <Luggage className="h-5 w-5 text-pink-500" />
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Zusatzgepäck & Services
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Zusätzliches Gepäck, Priority Boarding & mehr
                </p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Sparkles className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Zusatzgepäck und Services werden in Phase 3 verfügbar.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <button
            type="button"
            onClick={() => {
              setStep(3);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white h-14 rounded-xl text-base font-semibold shadow-lg shadow-pink-500/20 transition-all flex items-center justify-center gap-2"
          >
            Weiter zur Zahlung →
            <span className="opacity-75">
              ({formatCurrency(totalPrice, offer.price.currency)})
            </span>
          </button>
        </motion.div>
      </div>

      {/* Seatmap Modal */}
      <SeatmapModal
        open={seatmapOpen}
        onOpenChange={setSeatmapOpen}
        offer={offer}
        travelers={seatmapTravelers}
        segmentIndex={seatmapSegmentIndex}
      />
    </div>
  );
}
