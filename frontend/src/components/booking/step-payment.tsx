'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Lock, Check, Loader2, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@base-ui/react/checkbox';
import { useBookingFlowStore } from '@/stores/booking-flow-store';
import { useSeatSelectionStore } from '@/stores/seat-selection-store';
import { BookingReview } from '@/components/booking/booking-review';
import { PaymentMethods } from '@/components/booking/payment-methods';
import { PriceSummary } from '@/components/booking/price-summary';
import { FareRulesAccordion, type FareRuleGroup } from '@/components/booking/fare-rules-accordion';
import { formatCurrency } from '@/lib/utils';

// ============================================================================
// StepPayment — Full Implementation
// ============================================================================

export function StepPayment() {
  const {
    offer,
    travelers,
    pnrReference,
    ancillaries,
    pricingResult,
    setStep,
    setPayment,
  } = useBookingFlowStore();

  const seatTotalCost = useSeatSelectionStore((s) => s.totalSeatCost());
  const seatSelections = useSeatSelectionStore((s) => s.selections);

  // Local state
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [stornoAccepted, setStornoAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- Price calculations ----
  const basePrice = offer ? parseFloat(offer.price.grandTotal) : 0;
  const currency = offer?.price.currency || 'EUR';

  const taxes = useMemo(() => {
    if (!offer?.price.taxes) return 0;
    return offer.price.taxes.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
  }, [offer]);

  // Bag cost from ancillaries
  const bagCost = useMemo(() => {
    return ancillaries
      .filter((a) => a.type === 'EXTRA_BAG')
      .reduce((sum, a) => sum + a.price, 0);
  }, [ancillaries]);

  // Service cost (priority boarding, etc.)
  const serviceCost = useMemo(() => {
    return ancillaries
      .filter((a) => a.type !== 'EXTRA_BAG')
      .reduce((sum, a) => sum + a.price, 0);
  }, [ancillaries]);

  const grandTotal = basePrice + seatTotalCost + bagCost + serviceCost;

  // Payment fee
  const paymentFee = useMemo(() => {
    if (paymentMethod === 'twint') return (grandTotal * 1.6) / 100;
    return 0;
  }, [paymentMethod, grandTotal]);

  const finalTotal = grandTotal + paymentFee;

  // Fare rules from pricing result
  const fareRules: FareRuleGroup[] = useMemo(() => {
    if (!pricingResult) return [];
    // If pricingResult has ancillaryOptions, build some basic fare rules
    return [];
  }, [pricingResult]);

  // Passenger count labels
  const travelerCounts = useMemo(() => {
    const adults = travelers.filter((t) => t.type === 'ADULT').length;
    const children = travelers.filter((t) => t.type === 'CHILD').length;
    const infants = travelers.filter((t) => t.type === 'INFANT').length;
    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults}× Erw.`);
    if (children > 0) parts.push(`${children}× Kind`);
    if (infants > 0) parts.push(`${infants}× Baby`);
    return parts.join(', ');
  }, [travelers]);

  // Can submit?
  const canSubmit = agbAccepted && stornoAccepted && paymentMethod !== null && !isSubmitting;

  // Handle booking
  const handleSubmit = async () => {
    if (!canSubmit || !paymentMethod) return;
    setIsSubmitting(true);

    // Store payment method
    setPayment(paymentMethod);

    // Phase 5 placeholder: redirect to Saferpay
    setTimeout(() => {
      setIsSubmitting(false);
      // For now, advance to step 4 placeholder
      setStep(4 as any);
    }, 2000);
  };

  if (!offer) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ---- Payment Processing Overlay ---- */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            aria-live="assertive"
            role="alert"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl text-center max-w-sm mx-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="text-4xl mb-4 inline-block"
              >
                💳
              </motion.div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Zahlung wird verarbeitet…
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Bitte schließe dieses Fenster nicht
              </p>
              <div className="mt-4 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-pink-500" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        {/* ======== Buchungsübersicht ======== */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <BookingReview
            offer={offer}
            travelers={travelers}
            seatSelections={seatSelections}
          />
        </motion.section>

        {/* ======== Preisaufstellung ======== */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <DetailedPriceSummary
            basePrice={basePrice}
            seatCost={seatTotalCost}
            bagCost={bagCost}
            serviceCost={serviceCost}
            paymentFee={paymentFee}
            paymentMethodLabel={paymentMethod === 'twint' ? 'TWINT Gebühr' : null}
            currency={currency}
            taxes={taxes}
            travelerCounts={travelerCounts}
          />
        </motion.section>

        {/* ======== Tarifbedingungen ======== */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <FareRulesAccordion fareRules={fareRules} />
        </motion.section>

        {/* ======== Rechtliches / Checkboxen ======== */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                📋 Rechtliches
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {/* AGB */}
              <div className="flex items-start gap-3 group cursor-pointer">
                <Checkbox.Root
                  checked={agbAccepted}
                  onCheckedChange={(checked) => setAgbAccepted(!!checked)}
                  className="mt-0.5 h-5 w-5 rounded-md border-2 border-gray-300 dark:border-gray-600 data-[checked]:border-pink-500 data-[checked]:bg-pink-500 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                >
                  <Checkbox.Indicator>
                    <Check className="h-3.5 w-3.5 text-white" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span
                  className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors"
                  onClick={() => setAgbAccepted(!agbAccepted)}
                >
                  Ich akzeptiere die{' '}
                  <a
                    href="/agb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 dark:text-pink-400 underline hover:no-underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Allgemeinen Geschäftsbedingungen
                  </a>{' '}
                  und die{' '}
                  <a
                    href="/datenschutz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 dark:text-pink-400 underline hover:no-underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Datenschutzerklärung
                  </a>
                  .
                </span>
              </div>

              {/* Stornobedingungen */}
              <div className="flex items-start gap-3 group cursor-pointer">
                <Checkbox.Root
                  checked={stornoAccepted}
                  onCheckedChange={(checked) => setStornoAccepted(!!checked)}
                  className="mt-0.5 h-5 w-5 rounded-md border-2 border-gray-300 dark:border-gray-600 data-[checked]:border-pink-500 data-[checked]:bg-pink-500 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                >
                  <Checkbox.Indicator>
                    <Check className="h-3.5 w-3.5 text-white" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span
                  className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors"
                  onClick={() => setStornoAccepted(!stornoAccepted)}
                >
                  Ich habe die{' '}
                  <span className="font-medium">Tarifbedingungen</span>{' '}
                  gelesen und akzeptiere diese.
                </span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ======== Zahlungsmethode ======== */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <PaymentMethods
            selected={paymentMethod}
            onSelect={setPaymentMethod}
            totalAmount={grandTotal}
            currency={currency}
          />
        </motion.section>

        {/* ======== Trust Badges ======== */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4">
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-x-6 gap-y-3">
                <TrustBadge icon="🔒" label="SSL-verschlüsselt" />
                <TrustBadge icon="✈️" label="IATA-zertifiziert" />
                <TrustBadge icon="💳" label="PCI DSS konform" />
                <TrustBadge icon="🇨🇭" label="Schweizer Unternehmen" />
              </div>
            </div>
          </div>
        </motion.section>

        {/* ======== Verbindlich buchen ======== */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {/* Validation hints */}
          <AnimatePresence>
            {(!agbAccepted || !stornoAccepted || !paymentMethod) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3"
              >
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 px-4 py-2.5">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {!paymentMethod
                      ? '💳 Bitte wähle eine Zahlungsmethode.'
                      : !agbAccepted
                        ? '📋 Bitte akzeptiere die AGB und Datenschutzerklärung.'
                        : '📋 Bitte bestätige die Tarifbedingungen.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`
              w-full h-14 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2
              ${
                canSubmit
                  ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/20 cursor-pointer'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Zahlung wird verarbeitet…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Verbindlich buchen · {formatCurrency(finalTotal, currency)}
              </>
            )}
          </button>

          {/* Legal notice */}
          <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-3 max-w-md mx-auto leading-relaxed">
            Mit Klick auf &quot;Verbindlich buchen&quot; bestätigst du einen kostenpflichtigen
            Kaufvertrag über{' '}
            <span className="font-medium text-gray-500 dark:text-gray-400">
              {formatCurrency(finalTotal, currency)}
            </span>
            .
          </p>

          {/* Trust badges row */}
          <div className="flex flex-wrap items-center justify-center gap-4 py-4 mt-2 pb-[env(safe-area-inset-bottom,0px)]">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Sicher bezahlen</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="text-emerald-600">✈️</span>
              <span>Sofortige Buchungsbestätigung</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// TrustBadge
// ============================================================================

function TrustBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <span className="text-base">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

// ============================================================================
// DetailedPriceSummary — Extended version for step 3
// ============================================================================

function DetailedPriceSummary({
  basePrice,
  seatCost,
  bagCost,
  serviceCost,
  paymentFee,
  paymentMethodLabel,
  currency,
  taxes,
  travelerCounts,
}: {
  basePrice: number;
  seatCost: number;
  bagCost: number;
  serviceCost: number;
  paymentFee: number;
  paymentMethodLabel: string | null;
  currency: string;
  taxes: number;
  travelerCounts: string;
}) {
  const totalExtras = seatCost + bagCost + serviceCost + paymentFee;
  const grandTotal = basePrice + totalExtras;

  const lineItems: { label: string; emoji: string; amount: number; show: boolean }[] = [
    { label: `Flugpreis (${travelerCounts})`, emoji: '✈️', amount: basePrice, show: true },
    { label: 'Sitzplätze', emoji: '💺', amount: seatCost, show: seatCost > 0 },
    { label: 'Zusatzgepäck', emoji: '🧳', amount: bagCost, show: bagCost > 0 },
    { label: 'Services', emoji: '⚡', amount: serviceCost, show: serviceCost > 0 },
    {
      label: paymentMethodLabel || 'Zahlungsgebühr',
      emoji: '💳',
      amount: paymentFee,
      show: paymentFee > 0,
    },
  ];

  const visibleItems = lineItems.filter((item) => item.show);

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
          Preisaufstellung
        </h2>
      </div>
      <div className="px-5 py-4 space-y-2.5">
        {/* Line items */}
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <span className="text-xs">{item.emoji}</span>
                {item.label}
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100 tabular-nums font-medium">
                {formatCurrency(item.amount, currency)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Divider */}
        <div className="border-t-2 border-gray-900 dark:border-gray-200 pt-2" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-gray-900 dark:text-gray-100">
            Gesamtpreis
          </span>
          <motion.span
            key={grandTotal}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums"
          >
            {formatCurrency(grandTotal, currency)}
          </motion.span>
        </div>

        {/* Tax hint */}
        {taxes > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Inkl. {formatCurrency(taxes, currency)} Steuern & Gebühren
          </p>
        )}
      </div>
    </div>
  );
}
