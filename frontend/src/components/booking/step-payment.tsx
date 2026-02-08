'use client';

import { motion } from 'motion/react';
import { ArrowLeft, CreditCard, Lock, Sparkles } from 'lucide-react';
import { useBookingFlowStore } from '@/stores/booking-flow-store';
import { useSeatSelectionStore } from '@/stores/seat-selection-store';
import { formatCurrency } from '@/lib/utils';

// ============================================================================
// StepPayment — Placeholder (Phase 4 will expand this)
// ============================================================================

export function StepPayment() {
  const { offer, travelers, pnrReference, setStep } = useBookingFlowStore();
  const seatTotalCost = useSeatSelectionStore((s) => s.totalSeatCost());

  if (!offer) return null;

  const totalPrice = parseFloat(offer.price.grandTotal) + seatTotalCost;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-[900px] px-4 py-3 flex items-center">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Zurück zu Extras</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-4 py-6 space-y-6">
        {/* Booking Summary */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Buchungsübersicht
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Passengers */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Passagiere
                </p>
                {travelers.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-1.5 text-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400">
                      {idx + 1}
                    </div>
                    <span className="text-gray-800 dark:text-gray-200">
                      {t.gender === 'MALE' ? 'Herr' : 'Frau'} {t.firstName} {t.lastName}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      ({t.type === 'ADULT' ? 'Erwachsener' : t.type === 'CHILD' ? 'Kind' : 'Baby'})
                    </span>
                  </div>
                ))}
              </div>

              {/* Price */}
              <div className="border-t-2 border-gray-900 dark:border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 dark:text-gray-100">Gesamtpreis</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(totalPrice, offer.price.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Payment Placeholder */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-pink-500" />
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Zahlungsmethode
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Wähle deine bevorzugte Zahlungsart
                </p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Sparkles className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Zahlung wird in Phase 4 verfügbar.
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Saferpay Integration (Kreditkarte, TWINT, Apple Pay, Google Pay)
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Submit Button (disabled) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <button
            type="button"
            disabled
            className="w-full bg-gray-300 text-gray-500 h-14 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <Lock className="h-4 w-4" />
            Verbindlich buchen · {formatCurrency(totalPrice, offer.price.currency)}
          </button>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2">
            Kostenpflichtig — Zahlung wird in Phase 4 implementiert
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 py-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="text-emerald-600">🔒</span>
              <span>SSL-verschlüsselt</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="text-emerald-600">✈️</span>
              <span>IATA-zertifiziert</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="text-emerald-600">💳</span>
              <span>Sichere Zahlung</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
