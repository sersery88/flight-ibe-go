'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { CheckCircle2, Copy, Check, Printer, Plane, ExternalLink } from 'lucide-react';
import { useBookingFlowStore } from '@/stores/booking-flow-store';
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/utils';
import { formatAirlineName } from '@/lib/airlines';
import type { Itinerary } from '@/types/flight';

// ============================================================================
// StepConfirmation — Placeholder (Phase 5 will expand this)
// ============================================================================

export function StepConfirmation() {
  const router = useRouter();
  const { offer, travelers, pnrReference, contact, reset } = useBookingFlowStore();
  const [copied, setCopied] = useState(false);

  const bookingRef = pnrReference || 'DEMO01';

  const handleCopyRef = () => {
    navigator.clipboard.writeText(bookingRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNewSearch = () => {
    reset();
    router.push('/');
  };

  if (!offer) return null;

  const outbound = offer.itineraries[0];
  const returnFlight = offer.itineraries.length > 1 ? offer.itineraries[1] : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-2xl px-4 py-8 md:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
            {/* Green success header */}
            <div className="bg-emerald-600 px-6 py-8 text-center text-white">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20"
              >
                <CheckCircle2 className="h-10 w-10" />
              </motion.div>
              <h1 className="text-2xl font-bold mb-1">Buchung bestätigt!</h1>
              <p className="text-emerald-100">Dein Flug wurde erfolgreich gebucht</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Booking reference */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-xl bg-gray-50 dark:bg-gray-800 p-5 text-center"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Buchungsreferenz
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl font-mono font-bold tracking-[0.2em] text-gray-800 dark:text-gray-200">
                    {bookingRef}
                  </span>
                  <button
                    onClick={handleCopyRef}
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Kopieren"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Flight details */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-3"
              >
                <ConfirmationFlightCard itinerary={outbound} label="Hinflug" />
                {returnFlight && (
                  <ConfirmationFlightCard itinerary={returnFlight} label="Rückflug" />
                )}
              </motion.div>

              {/* Passengers */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4"
              >
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Passagiere
                </p>
                <div className="space-y-2">
                  {travelers.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {t.gender === 'MALE' ? 'Herr' : 'Frau'} {t.firstName} {t.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t.type === 'ADULT'
                            ? 'Erwachsener'
                            : t.type === 'CHILD'
                              ? 'Kind'
                              : 'Baby'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Total price */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  Gesamtpreis
                </span>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(offer.price.grandTotal, offer.price.currency)}
                </span>
              </div>

              {/* Confirmation info */}
              {contact && (
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 px-4 py-3 text-center">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    📧 Eine Bestätigungsmail wird an {contact.email} gesendet.
                  </p>
                </div>
              )}

              {/* Next steps */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Nächste Schritte
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Online Check-in ab 24h vor Abflug</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Reisepass nicht vergessen!</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Gepäck gemäss den Tarifinformationen inklusive</span>
                  </li>
                </ul>
              </div>

              {/* CTAs */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleNewSearch}
                  className="flex-1 bg-pink-500 hover:bg-pink-600 text-white h-14 rounded-xl text-base font-semibold transition-all"
                >
                  Neue Suche
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-14 px-6 rounded-xl text-base border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-300"
                >
                  <Printer className="h-4 w-4" />
                  Drucken
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// Confirmation Flight Card
// ============================================================================

function ConfirmationFlightCard({
  itinerary,
  label,
}: {
  itinerary: Itinerary;
  label: string;
}) {
  const first = itinerary.segments[0];
  const last = itinerary.segments[itinerary.segments.length - 1];
  const stops = itinerary.segments.length - 1;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Plane
          className={`h-3.5 w-3.5 text-gray-400 ${label === 'Rückflug' ? 'rotate-180' : ''}`}
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          ·{' '}
          {formatDateTime(first.departure.at, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatDateTime(first.departure.at, 'time')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {first.departure.iataCode}
            </p>
          </div>
          <div className="text-center px-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {formatDuration(itinerary.duration)}
            </p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatDateTime(last.arrival.at, 'time')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {last.arrival.iataCode}
            </p>
          </div>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
          {stops === 0 ? 'Direkt' : `${stops} Stopp`}
        </span>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        {formatAirlineName(first.operating?.carrierCode || first.carrierCode)}
      </p>
    </div>
  );
}
