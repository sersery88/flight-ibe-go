'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  CheckCircle2,
  Copy,
  Check,
  Printer,
  FileText,
  Plane,
  Search,
  Shield,
  Luggage,
  Clock,
  Mail,
  Phone,
  HelpCircle,
} from 'lucide-react';
import { useBookingFlowStore } from '@/stores/booking-flow-store';
import { useSeatSelectionStore } from '@/stores/seat-selection-store';
import type { SeatSelections } from '@/stores/seat-selection-store';
import { BookingReview } from './booking-review';
import { PriceSummary } from './price-summary';
import { formatCurrency } from '@/lib/utils';

// ============================================================================
// StepConfirmation — Full Implementation (Phase 5)
// ============================================================================

// ============================================================================
// Confetti Particles — Subtle celebration effect
// ============================================================================

const CONFETTI_COLORS = ['#ec4899', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#14b8a6'];

function ConfettiParticle({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const x = Math.random() * 300 - 150;
  const rotation = Math.random() * 720 - 360;
  const size = 4 + Math.random() * 6;
  const delay = Math.random() * 0.5;

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: 0, rotate: 0, scale: 1 }}
      animate={{
        opacity: 0,
        y: -(80 + Math.random() * 120),
        x: x,
        rotate: rotation,
        scale: 0.3,
      }}
      transition={{ duration: 1.5 + Math.random(), delay, ease: 'easeOut' }}
      className="absolute pointer-events-none"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        left: '50%',
        top: '50%',
      }}
    />
  );
}

// ============================================================================
// StepConfirmation — Full Implementation (Phase 5 + Phase 6 Polish)
// ============================================================================

export function StepConfirmation() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const {
    offer,
    travelers,
    pnrReference,
    contact,
    ancillaries,
    reset,
  } = useBookingFlowStore();
  const globalSeatSelections = useSeatSelectionStore((s) => s.selections);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(!prefersReducedMotion);

  const bookingRef = pnrReference || 'DEMO01';

  // Turn off confetti after animation
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  // Clear sessionStorage on confirmation — user has paid, flow is done
  useEffect(() => {
    // Small delay to ensure render is complete before clearing
    const timer = setTimeout(() => {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('booking-flow');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleCopyRef = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bookingRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = bookingRef;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [bookingRef]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleNewSearch = useCallback(() => {
    reset();
    router.push('/');
  }, [reset, router]);

  if (!offer) return null;

  // Calculate prices for PriceSummary
  const basePrice = parseFloat(offer.price.grandTotal);
  const seatCost = ancillaries
    .filter((a) => a.type === 'EXTRA_BAG')
    .reduce((sum, a) => sum + a.price * a.quantity, 0);
  const bagCost = 0;
  const serviceCost = ancillaries
    .filter((a) => a.type !== 'EXTRA_BAG')
    .reduce((sum, a) => sum + a.price * a.quantity, 0);
  const taxes = parseFloat(offer.price.fees?.[0]?.amount || '0');

  // Use seat selections from the global seat selection store
  // (the flow store has a simplified SelectedSeat type, the global store is canonical)
  const mergedSeatSelections: SeatSelections = globalSeatSelections;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 print:bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8 md:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* ── Success Header ─────────────────────────────────────── */}
          <div className="rounded-t-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-10 text-center text-white shadow-xl print:rounded-none print:shadow-none print:bg-emerald-600 relative overflow-hidden">
            {/* Confetti */}
            {showConfetti && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {Array.from({ length: 24 }).map((_, i) => (
                  <ConfettiParticle key={i} index={i} />
                ))}
              </div>
            )}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
              className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm relative z-10"
            >
              <CheckCircle2 className="h-12 w-12" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-bold mb-1"
            >
              Buchung bestätigt!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-emerald-100"
            >
              Vielen Dank für deine Buchung.
            </motion.p>
          </div>

          {/* ── Main Content ───────────────────────────────────────── */}
          <div className="rounded-b-2xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden border border-t-0 border-gray-200 dark:border-gray-800 print:shadow-none print:border-gray-300">
            <div className="p-6 space-y-6">

              {/* ── Booking Reference (PNR) ──────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5"
              >
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 text-center">
                  Buchungscode
                </p>
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span className="text-3xl font-mono font-bold tracking-[0.25em] text-gray-900 dark:text-gray-100">
                    {bookingRef}
                  </span>
                  <button
                    onClick={handleCopyRef}
                    className="no-print relative p-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Buchungscode kopieren"
                    aria-label="Buchungscode kopieren"
                  >
                    {copied ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <Check className="h-5 w-5 text-emerald-600" />
                      </motion.div>
                    ) : (
                      <Copy className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {copied && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium no-print"
                    >
                      ✓ In die Zwischenablage kopiert!
                    </motion.p>
                  )}
                </AnimatePresence>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                  Diesen Code benötigst du für den Online Check-in und am Flughafen.
                </p>
              </motion.div>

              {/* ── Email Confirmation ────────────────────────────── */}
              {contact && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 px-4 py-3 text-center"
                >
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium flex items-center justify-center gap-2">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>
                      Bestätigung gesendet an{' '}
                      <span className="font-semibold">{contact.email}</span>
                    </span>
                  </p>
                </motion.div>
              )}

              {/* ── Booking Details ───────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <BookingReview
                  offer={offer}
                  travelers={travelers}
                  seatSelections={mergedSeatSelections}
                  compact={false}
                />
              </motion.div>

              {/* ── Price Summary ─────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
              >
                <PriceSummary
                  basePrice={basePrice}
                  seatCost={seatCost}
                  bagCost={bagCost}
                  serviceCost={serviceCost}
                  currency={offer.price.currency}
                  taxes={taxes}
                />
              </motion.div>

              {/* ── Documents ─────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 no-print"
              >
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Dokumente
                </p>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex-1 h-12 px-4 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300"
                  >
                    <Printer className="h-4 w-4" />
                    Buchung drucken
                  </button>
                  <button
                    type="button"
                    disabled
                    className="flex-1 h-12 px-4 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed flex items-center justify-center gap-2"
                    title="PDF-Download wird bald verfügbar sein"
                  >
                    <FileText className="h-4 w-4" />
                    PDF Voucher (bald verfügbar)
                  </button>
                </div>
              </motion.div>

              {/* ── Next Steps ─────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5"
              >
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Nächste Schritte
                </p>
                <div className="space-y-4">
                  <NextStepItem
                    icon="✈️"
                    title="Online Check-in"
                    description="Ab 24 Stunden vor Abflug auf der Website der Airline möglich."
                    delay={1.3}
                  />
                  <NextStepItem
                    icon="🛂"
                    title="Reisedokumente"
                    description="Gültigen Reisepass oder Personalausweis nicht vergessen!"
                    delay={1.4}
                  />
                  <NextStepItem
                    icon="🧳"
                    title="Gepäck"
                    description="Inkl. 1× 23kg Aufgabegepäck (je nach gebuchtem Tarif)."
                    delay={1.5}
                  />
                  <NextStepItem
                    icon="⏰"
                    title="Am Flughafen"
                    description="Mind. 2h vor Abflug (international 3h) am Flughafen sein."
                    delay={1.6}
                  />
                </div>
              </motion.div>

              {/* ── New Search CTA ─────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.7 }}
                className="no-print"
              >
                <button
                  type="button"
                  onClick={handleNewSearch}
                  className="w-full h-14 bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20"
                >
                  <Search className="h-5 w-5" />
                  Neue Suche starten
                </button>
              </motion.div>

              {/* ── Support / Help ──────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 }}
                className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-5 py-4 text-center"
              >
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  💬 Hilfe & Kontakt
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Fragen zu deiner Buchung?
                </p>
                <div className="mt-2 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <a
                    href="mailto:support@pinktravel.ch"
                    className="flex items-center gap-1.5 hover:text-pink-500 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    support@pinktravel.ch
                  </a>
                  <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                  <a
                    href="tel:+41XXXXXXXX"
                    className="flex items-center gap-1.5 hover:text-pink-500 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    +41 XX XXX XX XX
                  </a>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// NextStepItem
// ============================================================================

function NextStepItem({
  icon,
  title,
  description,
  delay,
}: {
  icon: string;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-start gap-3"
    >
      <span className="text-lg mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
