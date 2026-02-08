'use client';

import { useEffect, useState, Suspense } from 'react';
import { redirect } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Plane } from 'lucide-react';
import Link from 'next/link';
import { useBookingFlowStore } from '@/stores/booking-flow-store';
import { useBookingStore } from '@/stores/booking-store';
import { useSearchStore } from '@/stores/search-store';
import { ProgressBar } from '@/components/booking/progress-bar';
import { StepPassengers } from '@/components/booking/step-passengers';
import { StepExtras } from '@/components/booking/step-extras';
import { StepPayment } from '@/components/booking/step-payment';
import { StepConfirmation } from '@/components/booking/step-confirmation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// ============================================================================
// Booking Page — 4-Step Router with Polish (Phase 6)
// ============================================================================

function BookingContent() {
  const { currentStep, offer, orderId, setStep, setOffer } = useBookingFlowStore();
  const prefersReducedMotion = useReducedMotion();

  // Track direction for slide animation
  const [prevStep, setPrevStep] = useState(currentStep);
  const slideDirection = currentStep >= prevStep ? 1 : -1;

  useEffect(() => {
    setPrevStep(currentStep);
  }, [currentStep]);

  // Legacy: import offer from old booking store or search store if not in flow store yet
  const legacyOffer = useBookingStore((s) => s.selectedOffer);
  const searchOffer = useSearchStore((s) => s.selectedOffer);

  useEffect(() => {
    const sourceOffer = legacyOffer || searchOffer;
    if (sourceOffer) {
      // Always update if the source offer differs from current (new search = new offer)
      const isSameOffer = offer?.id === sourceOffer.id
        && offer?.itineraries?.[0]?.segments?.[0]?.number === sourceOffer.itineraries?.[0]?.segments?.[0]?.number
        && offer?.price?.total === sourceOffer.price?.total;
      if (!offer || !isSameOffer) {
        setOffer(sourceOffer);
      }
    }
  }, [offer, legacyOffer, searchOffer, setOffer]);

  // PNR Auto-Cancel on tab/browser close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = useBookingFlowStore.getState();
      if (state.orderId && state.currentStep < 4) {
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(
            `/api/flights/order/${state.orderId}/cancel`,
            JSON.stringify({ reason: 'tab_closed' })
          );
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'instant' : 'smooth' });
  }, [currentStep, prefersReducedMotion]);

  // Screen reader announcement on step change
  useEffect(() => {
    const stepLabels = ['', 'Passagierdaten', 'Extras & Sitzplatz', 'Zahlung', 'Bestätigung'];
    const announcement = document.getElementById('step-announcement');
    if (announcement) {
      announcement.textContent = `Schritt ${currentStep} von 4: ${stepLabels[currentStep]}`;
    }
  }, [currentStep]);

  // No offer → redirect to search
  if (!offer && !legacyOffer && !searchOffer) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 sm:p-10 text-center max-w-md mx-auto shadow-lg">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Plane className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Kein Flug ausgewählt
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              Bitte wähle zuerst einen Flug aus den Suchergebnissen, um mit der
              Buchung fortzufahren.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto h-12 px-6 rounded-xl text-sm font-semibold"
                >
                  Neue Suche
                </Button>
              </Link>
              <Link href="/results">
                <Button className="w-full sm:w-auto bg-pink-500 hover:bg-pink-600 text-white h-12 px-8 rounded-xl text-sm font-semibold shadow-lg shadow-pink-500/20">
                  Zurück zu Ergebnissen
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleStepClick = (step: 1 | 2 | 3 | 4) => {
    setStep(step);
  };

  // Animation variants respecting reduced motion
  const animDuration = prefersReducedMotion ? 0 : 0.25;
  const slideX = prefersReducedMotion ? 0 : 20 * slideDirection;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 print:bg-white scroll-pt-20">
      {/* Screen reader live region for step announcements */}
      <div
        id="step-announcement"
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Progress Bar */}
      <div className="no-print">
        <ProgressBar currentStep={currentStep} onStepClick={handleStepClick} />
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: slideX }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -slideX }}
          transition={{ duration: animDuration, ease: 'easeInOut' }}
        >
          {currentStep === 1 && <StepPassengers />}
          {currentStep === 2 && <StepExtras />}
          {currentStep === 3 && <StepPayment />}
          {currentStep === 4 && <StepConfirmation />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Export with Suspense
// ============================================================================

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[900px] px-4 py-6 space-y-4">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
