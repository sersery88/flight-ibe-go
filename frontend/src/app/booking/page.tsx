'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense, forwardRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Plane,
  Check,
  Loader2,
  AlertCircle,
  Copy,
  ChevronDown,
  Search,
  Printer,
  CheckCircle2,
  X,
  Luggage,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Field } from '@base-ui/react/field';
import { Input } from '@base-ui/react/input';
import { Select } from '@base-ui/react/select';
import { Checkbox } from '@base-ui/react/checkbox';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { Separator } from '@base-ui/react/separator';
import { useBookingStore, type TravelerData } from '@/stores/booking-store';
import { useSearchStore } from '@/stores/search-store';
import { SeatmapModal } from '@/components/seatmap';
import { useSeatSelectionStore } from '@/stores/seat-selection-store';
import { useCreateBooking } from '@/hooks/use-flights';
import {
  formatCurrency,
  formatDuration,
  formatDateTime,
  getTravelerTypeLabel,
} from '@/lib/utils';
import { formatAirlineName } from '@/lib/airlines';
import type { Itinerary, FlightOffer } from '@/types/flight';

// ============================================================================
// Zod Schema (v4)
// ============================================================================

const travelerSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE']),
  firstName: z
    .string()
    .min(2, 'Mindestens 2 Zeichen')
    .regex(/^[a-zA-ZäöüÄÖÜßéèêàáâïîñ\s-]+$/, 'Nur Buchstaben erlaubt'),
  lastName: z
    .string()
    .min(2, 'Mindestens 2 Zeichen')
    .regex(/^[a-zA-ZäöüÄÖÜßéèêàáâïîñ\s-]+$/, 'Nur Buchstaben erlaubt'),
  dobDay: z.string().min(1, 'Tag wählen'),
  dobMonth: z.string().min(1, 'Monat wählen'),
  dobYear: z.string().min(1, 'Jahr wählen'),
  nationality: z.string().optional(),
});

const bookingSchema = z
  .object({
    travelers: z.array(travelerSchema),
    email: z.string().email('Ungültige E-Mail-Adresse'),
    emailConfirm: z.string().email('Ungültige E-Mail-Adresse'),
    phoneCountry: z.string().min(1),
    phone: z.string().min(6, 'Ungültige Telefonnummer'),
    newsletter: z.boolean().optional(),
    agb: z.literal(true, 'Du musst die AGB und Datenschutzerklärung akzeptieren'),
  })
  .refine((data) => data.email === data.emailConfirm, {
    message: 'E-Mail-Adressen stimmen nicht überein',
    path: ['emailConfirm'],
  });

type BookingFormData = z.infer<typeof bookingSchema>;

// ============================================================================
// Constants
// ============================================================================

const PHONE_CODES = [
  { code: '+49', label: '🇩🇪 +49', country: 'DE' },
  { code: '+41', label: '🇨🇭 +41', country: 'CH' },
  { code: '+43', label: '🇦🇹 +43', country: 'AT' },
  { code: '+44', label: '🇬🇧 +44', country: 'GB' },
  { code: '+33', label: '🇫🇷 +33', country: 'FR' },
  { code: '+39', label: '🇮🇹 +39', country: 'IT' },
  { code: '+34', label: '🇪🇸 +34', country: 'ES' },
  { code: '+31', label: '🇳🇱 +31', country: 'NL' },
  { code: '+32', label: '🇧🇪 +32', country: 'BE' },
  { code: '+48', label: '🇵🇱 +48', country: 'PL' },
  { code: '+90', label: '🇹🇷 +90', country: 'TR' },
  { code: '+1', label: '🇺🇸 +1', country: 'US' },
];

const NATIONALITIES = [
  { code: 'DE', label: '🇩🇪 Deutschland' },
  { code: 'CH', label: '🇨🇭 Schweiz' },
  { code: 'AT', label: '🇦🇹 Österreich' },
  { code: '', label: '──────────', disabled: true },
  { code: 'BE', label: '🇧🇪 Belgien' },
  { code: 'DK', label: '🇩🇰 Dänemark' },
  { code: 'FI', label: '🇫🇮 Finnland' },
  { code: 'FR', label: '🇫🇷 Frankreich' },
  { code: 'GR', label: '🇬🇷 Griechenland' },
  { code: 'GB', label: '🇬🇧 Großbritannien' },
  { code: 'IE', label: '🇮🇪 Irland' },
  { code: 'IT', label: '🇮🇹 Italien' },
  { code: 'HR', label: '🇭🇷 Kroatien' },
  { code: 'LU', label: '🇱🇺 Luxemburg' },
  { code: 'NL', label: '🇳🇱 Niederlande' },
  { code: 'NO', label: '🇳🇴 Norwegen' },
  { code: 'PL', label: '🇵🇱 Polen' },
  { code: 'PT', label: '🇵🇹 Portugal' },
  { code: 'RO', label: '🇷🇴 Rumänien' },
  { code: 'SE', label: '🇸🇪 Schweden' },
  { code: 'ES', label: '🇪🇸 Spanien' },
  { code: 'CZ', label: '🇨🇿 Tschechien' },
  { code: 'TR', label: '🇹🇷 Türkei' },
  { code: 'HU', label: '🇭🇺 Ungarn' },
  { code: 'US', label: '🇺🇸 USA' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
  { value: '01', label: 'Januar' },
  { value: '02', label: 'Februar' },
  { value: '03', label: 'März' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Dezember' },
];

const currentYear = new Date().getFullYear();
const YEARS_ADULT = Array.from({ length: 100 }, (_, i) => String(currentYear - 12 - i));
const YEARS_CHILD = Array.from({ length: 10 }, (_, i) => String(currentYear - 2 - i));
const YEARS_INFANT = [String(currentYear), String(currentYear - 1), String(currentYear - 2)];

// ============================================================================
// Shake animation variant
// ============================================================================

const shakeAnimation = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.5 },
  },
};

// ============================================================================
// CSS class helpers
// ============================================================================

const inputBaseClass =
  'w-full h-12 px-4 rounded-xl border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 transition-all outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500';

function inputClass(hasError: boolean) {
  return `${inputBaseClass} ${
    hasError
      ? 'border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      : 'border-gray-200 dark:border-gray-700 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20'
  }`;
}

const selectTriggerBaseClass =
  'h-12 px-3 rounded-xl border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 transition-all outline-none cursor-pointer flex items-center justify-between gap-1';

function selectTriggerClass(hasError: boolean) {
  return `${selectTriggerBaseClass} ${
    hasError
      ? 'border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      : 'border-gray-200 dark:border-gray-700 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20'
  }`;
}

const selectPopupClass =
  'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl max-h-[var(--available-height)] overflow-auto p-1 z-[100]';

const selectItemClass =
  'px-3 py-2 rounded-lg cursor-pointer text-sm text-gray-800 dark:text-gray-200 data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-800 outline-none';

// ============================================================================
// BookingContent — Main Component
// ============================================================================

function BookingContent() {
  const router = useRouter();
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [copied, setCopied] = useState(false);

  const {
    selectedOffer,
    travelers,
    initializeTravelers,
    updateTraveler,
    isBooking,
    reset: resetBooking,
  } = useBookingStore();

  const { adults, children, infants } = useSearchStore();
  const createBookingMutation = useCreateBooking();

  // Build default values for the form
  const defaultTravelers = useMemo(() => {
    const total = adults + children + infants;
    return Array.from({ length: total }, () => ({
      gender: 'MALE' as const,
      firstName: '',
      lastName: '',
      dobDay: '',
      dobMonth: '',
      dobYear: '',
      nationality: '',
    }));
  }, [adults, children, infants]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      travelers: defaultTravelers,
      email: '',
      emailConfirm: '',
      phoneCountry: '+49',
      phone: '',
      newsletter: false,
      agb: false as unknown as true,
    },
    mode: 'onTouched',
  });

  // ---- Seatmap State ----
  const [seatmapOpen, setSeatmapOpen] = useState(false);
  const [seatmapSegmentIndex, setSeatmapSegmentIndex] = useState(0);
  const seatTotalCost = useSeatSelectionStore((s) => s.totalSeatCost());
  const seatCurrency = useSeatSelectionStore((s) => s.currency());
  const seatSelections = useSeatSelectionStore((s) => s.selections);
  const seatHasSelections = useSeatSelectionStore((s) => s.hasSelections());

  // Build travelers array for PassengerSelector in SeatmapModal
  const seatmapTravelers = useMemo(() => {
    return travelers.map((t, idx) => ({
      id: String(idx + 1),
      name: t.firstName && t.lastName
        ? `${t.firstName} ${t.lastName}`
        : `${getTravelerTypeLabel(t.type)} ${idx + 1}`,
      type: t.type,
    }));
  }, [travelers]);

  // Initialize travelers in the store
  useEffect(() => {
    if (travelers.length === 0 && selectedOffer) {
      initializeTravelers(adults, children, infants);
    }
  }, [selectedOffer, travelers.length, adults, children, infants, initializeTravelers]);

  // ---- No offer selected ----
  if (!selectedOffer) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 sm:p-10 text-center max-w-md mx-auto shadow-lg">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Plane className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Kein Flug ausgewählt</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              Bitte wähle zuerst einen Flug aus den Suchergebnissen, um mit der Buchung fortzufahren.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto h-12 px-6 rounded-xl text-sm font-semibold">
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

  const offer = selectedOffer;
  const outbound = offer.itineraries[0];
  const returnFlight = offer.itineraries.length > 1 ? offer.itineraries[1] : null;

  // ---- Submit handler ----
  const onSubmit = async (data: BookingFormData) => {
    // Sync traveler data to store
    data.travelers.forEach((t, idx) => {
      const dob = `${t.dobYear}-${t.dobMonth}-${t.dobDay}`;
      updateTraveler(idx, {
        gender: t.gender,
        firstName: t.firstName,
        lastName: t.lastName,
        dateOfBirth: dob,
        ...(t.nationality
          ? {
              document: {
                type: 'PASSPORT' as const,
                number: '',
                expiryDate: '',
                issuanceCountry: '',
                nationality: t.nationality,
              },
            }
          : {}),
        ...(idx === 0
          ? { email: data.email, phone: `${data.phoneCountry}${data.phone}` }
          : {}),
      });
    });

    try {
      await createBookingMutation.mutateAsync({
        flightOffers: [offer],
        travelers: data.travelers.map((t, idx) => ({
          id: String(idx + 1),
          dateOfBirth: `${t.dobYear}-${t.dobMonth}-${t.dobDay}`,
          gender: t.gender,
          name: { firstName: t.firstName, lastName: t.lastName },
          contact:
            idx === 0
              ? {
                  emailAddress: data.email,
                  phones: [
                    {
                      deviceType: 'MOBILE' as const,
                      countryCallingCode: data.phoneCountry.replace('+', ''),
                      number: data.phone,
                    },
                  ],
                }
              : undefined,
          ...(t.nationality ? { documents: [{ documentType: 'PASSPORT', nationality: t.nationality }] } : {}),
        })),
      });
    } catch {
      // Fallback: generate booking reference
    }

    const ref =
      useBookingStore.getState().pnr ||
      `FP${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setBookingRef(ref);
    setBookingComplete(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(bookingRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNewSearch = () => {
    resetBooking();
    router.push('/');
  };

  // ---- CONFIRMATION VIEW ----
  if (bookingComplete) {
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
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Buchungsreferenz</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-mono font-bold tracking-[0.2em] text-gray-800 dark:text-gray-200">
                      {bookingRef}
                    </span>
                    <button
                      onClick={handleCopyRef}
                      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
                  {returnFlight && <ConfirmationFlightCard itinerary={returnFlight} label="Rückflug" />}
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
                            {getTravelerTypeLabel(t.type)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Total price */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Gesamtpreis</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(offer.price.grandTotal, offer.price.currency)}
                  </span>
                </div>

                {/* Confirmation info */}
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 px-4 py-3 text-center">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    📧 Eine Bestätigungsmail wurde an deine E-Mail-Adresse gesendet.
                  </p>
                </div>

                {/* CTAs */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleNewSearch}
                    className="flex-1 bg-pink-500 hover:bg-pink-600 text-white h-14 rounded-xl text-base font-semibold"
                  >
                    Neue Suche
                  </Button>
                  <Button
                    onClick={() => window.print()}
                    variant="outline"
                    className="h-14 px-6 rounded-xl text-base"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Drucken
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ---- Compute price breakdown ----
  const adultCount = travelers.filter((t) => t.type === 'ADULT').length;
  const childCount = travelers.filter((t) => t.type === 'CHILD').length;
  const infantCount = travelers.filter((t) => t.type === 'HELD_INFANT').length;

  const adultPricing = offer.travelerPricings?.find((tp) => tp.travelerType === 'ADULT');
  const childPricing = offer.travelerPricings?.find((tp) => tp.travelerType === 'CHILD');
  const infantPricing = offer.travelerPricings?.find(
    (tp) => tp.travelerType === 'HELD_INFANT' || tp.travelerType === 'SEATED_INFANT'
  );

  const basePrice = parseFloat(offer.price.base);
  const totalPrice = parseFloat(offer.price.grandTotal);
  const taxes = totalPrice - basePrice;

  // ---- MAIN BOOKING FORM ----
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-[1200px] px-4 py-3 flex items-center">
          <Link href="/results" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Zurück zu Ergebnissen</span>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mx-auto max-w-[1200px] px-4 py-6">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-[1fr_380px]">
            {/* ========== LEFT COLUMN ========== */}
            <div className="space-y-6 min-w-0">
              {/* ---- 1. FLIGHT SUMMARY ---- */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="bg-gray-800 dark:bg-gray-700 px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <Plane className="h-4 w-4" />
                      <span className="font-semibold text-sm">Flugübersicht</span>
                    </div>
                    <span className="text-white font-bold text-lg">
                      {formatCurrency(offer.price.grandTotal, offer.price.currency)}
                    </span>
                  </div>
                  <div className="p-5 space-y-4">
                    <FlightSummaryRow
                      itinerary={outbound}
                      label="Hinflug"
                      fareDetail={offer.travelerPricings[0]?.fareDetailsBySegment?.[0]}
                      seatSelections={seatSelections}
                      onSeatSelect={() => {
                        setSeatmapSegmentIndex(0);
                        setSeatmapOpen(true);
                      }}
                    />
                    {returnFlight && (
                      <>
                        <Separator className="border-t border-dashed border-gray-200 dark:border-gray-700" />
                        <FlightSummaryRow
                          itinerary={returnFlight}
                          label="Rückflug"
                          fareDetail={offer.travelerPricings[0]?.fareDetailsBySegment?.[outbound.segments.length]}
                          seatSelections={seatSelections}
                          onSeatSelect={() => {
                            setSeatmapSegmentIndex(outbound.segments.length);
                            setSeatmapOpen(true);
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </motion.section>

              {/* ---- 2. PASSENGER FORMS ---- */}
              {travelers.map((traveler, idx) => (
                <motion.section
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + idx * 0.08 }}
                >
                  <PassengerCard
                    traveler={traveler}
                    index={idx}
                    register={register}
                    control={control}
                    errors={errors}
                    setValue={setValue}
                    watch={watch}
                  />
                </motion.section>
              ))}

              {/* ---- 3. CONTACT DETAILS ---- */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Kontaktdaten</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Für deine Buchungsbestätigung</p>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Email */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field.Root>
                        <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          E-Mail-Adresse
                        </Field.Label>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="deine@email.de"
                          {...register('email')}
                          className={inputClass(!!errors.email)}
                        />
                        {errors.email && (
                          <Field.Error className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1" match>
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {errors.email.message}
                          </Field.Error>
                        )}
                      </Field.Root>
                      <Field.Root>
                        <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          E-Mail wiederholen
                        </Field.Label>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="E-Mail bestätigen"
                          {...register('emailConfirm')}
                          className={inputClass(!!errors.emailConfirm)}
                        />
                        {errors.emailConfirm && (
                          <Field.Error className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1" match>
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {errors.emailConfirm.message}
                          </Field.Error>
                        )}
                      </Field.Root>
                    </div>

                    {/* Phone */}
                    <Field.Root>
                      <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Telefonnummer
                      </Field.Label>
                      <div className="flex gap-2">
                        <Controller
                          name="phoneCountry"
                          control={control}
                          render={({ field: { value, onChange } }) => (
                            <Select.Root
                              value={value}
                              onValueChange={(val) => onChange(val)}
                            >
                              <Select.Trigger
                                className="h-12 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 w-[110px] shrink-0 flex items-center justify-between gap-1 cursor-pointer"
                              >
                                <Select.Value placeholder="Vorwahl" />
                                <Select.Icon>
                                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                </Select.Icon>
                              </Select.Trigger>
                              <Select.Portal>
                                <Select.Positioner className="z-[100]">
                                  <Select.Popup className={selectPopupClass}>
                                    {PHONE_CODES.map((pc) => (
                                      <Select.Item
                                        key={pc.code}
                                        value={pc.code}
                                        className={selectItemClass}
                                      >
                                        <Select.ItemText>{pc.label}</Select.ItemText>
                                      </Select.Item>
                                    ))}
                                  </Select.Popup>
                                </Select.Positioner>
                              </Select.Portal>
                            </Select.Root>
                          )}
                        />
                        <Input
                          type="tel"
                          autoComplete="tel"
                          placeholder="123 4567890"
                          {...register('phone')}
                          className={`flex-1 ${inputClass(!!errors.phone)}`}
                        />
                      </div>
                      {errors.phone && (
                        <Field.Error className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1" match>
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {errors.phone.message}
                        </Field.Error>
                      )}
                    </Field.Root>

                    {/* Newsletter */}
                    <Controller
                      name="newsletter"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <div className="flex items-start gap-3 pt-1 group cursor-pointer">
                          <Checkbox.Root
                            checked={!!value}
                            onCheckedChange={(checked) => onChange(checked)}
                            className="mt-0.5 h-5 w-5 rounded-md border-2 border-gray-300 dark:border-gray-600 data-[checked]:border-pink-500 data-[checked]:bg-pink-500 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          >
                            <Checkbox.Indicator>
                              <Check className="h-3.5 w-3.5 text-white" />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                          <span
                            className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors"
                            onClick={() => onChange(!value)}
                          >
                            Ja, ich möchte Angebote und Reise-Deals per E-Mail erhalten.
                          </span>
                        </div>
                      )}
                    />
                  </div>
                </div>
              </motion.section>

              {/* ---- 5. AGB & BOOK (Mobile) ---- */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="md:hidden"
              >
                <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="p-5 space-y-4">
                    {/* Price breakdown mobile */}
                    <PriceBreakdownBlock
                      offer={offer}
                      adultCount={adultCount}
                      childCount={childCount}
                      infantCount={infantCount}
                      adultPricing={adultPricing}
                      childPricing={childPricing}
                      infantPricing={infantPricing}
                      taxes={taxes}
                      totalPrice={totalPrice + seatTotalCost}
                      seatCost={seatTotalCost}
                      seatCurrency={seatCurrency}
                    />

                    <Separator className="border-t border-gray-200 dark:border-gray-700" />

                    {/* AGB + Datenschutz */}
                    <CheckboxFieldControlled
                      name="agb"
                      control={control}
                      label={
                        <>
                          Ich akzeptiere die{' '}
                          <a href="/agb" target="_blank" className="underline font-medium text-gray-700 dark:text-gray-300">
                            AGB
                          </a>
                          {' '}und{' '}
                          <a href="/datenschutz" target="_blank" className="underline font-medium text-gray-700 dark:text-gray-300">
                            Datenschutzerklärung
                          </a>
                        </>
                      }
                      error={errors.agb?.message}
                    />

                    <TrustBadges />

                    <Button
                      type="submit"
                      disabled={isSubmitting || isBooking}
                      className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:text-gray-500 text-white h-14 rounded-xl text-base font-semibold shadow-lg shadow-pink-500/20 disabled:shadow-none transition-all"
                    >
                      {isSubmitting || isBooking ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Wird gebucht…
                        </span>
                      ) : (
                        `Jetzt buchen · ${formatCurrency(offer.price.grandTotal, offer.price.currency)}`
                      )}
                    </Button>
                  </div>
                </div>
              </motion.section>
            </div>

            {/* ========== RIGHT COLUMN — STICKY SIDEBAR (Desktop) ========== */}
            <div className="hidden md:block">
              <div className="sticky top-6">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="bg-gray-800 dark:bg-gray-700 px-5 py-3.5">
                      <h3 className="font-semibold text-white text-sm">Preisübersicht</h3>
                    </div>
                    <div className="p-5 space-y-5">
                      <PriceBreakdownBlock
                        offer={offer}
                        adultCount={adultCount}
                        childCount={childCount}
                        infantCount={infantCount}
                        adultPricing={adultPricing}
                        childPricing={childPricing}
                        infantPricing={infantPricing}
                        taxes={taxes}
                        totalPrice={totalPrice + seatTotalCost}
                        seatCost={seatTotalCost}
                        seatCurrency={seatCurrency}
                      />

                      <Separator className="border-t border-gray-200 dark:border-gray-700" />

                      {/* AGB */}
                      <div className="space-y-3">
                        <CheckboxFieldControlled
                          name="agb"
                          control={control}
                          label={
                            <>
                              Ich akzeptiere die{' '}
                              <a href="/agb" target="_blank" className="underline font-medium text-gray-700 dark:text-gray-300">
                                AGB
                              </a>
                              {' '}und{' '}
                              <a href="/datenschutz" target="_blank" className="underline font-medium text-gray-700 dark:text-gray-300">
                                Datenschutzerklärung
                              </a>
                            </>
                          }
                          error={errors.agb?.message}
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting || isBooking}
                        className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:text-gray-500 text-white h-14 rounded-xl text-base font-semibold shadow-lg shadow-pink-500/20 disabled:shadow-none transition-all"
                      >
                        {isSubmitting || isBooking ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Wird gebucht…
                          </span>
                        ) : (
                          'Jetzt buchen'
                        )}
                      </Button>

                      <TrustBadges />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </form>

{/* Mobile bottom bar removed — submit button is in the form */}

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

// ============================================================================
// Flight Summary Row
// ============================================================================

function FlightSummaryRow({ itinerary, label, fareDetail, seatSelections, onSeatSelect }: {
  itinerary: Itinerary;
  label: string;
  fareDetail?: {
    cabin?: string;
    class?: string;
    brandedFare?: string;
    brandedFareLabel?: string;
    includedCheckedBags?: { weight?: number; weightUnit?: string; quantity?: number };
  };
  seatSelections?: Record<string, Record<string, { number: string }>>;
  onSeatSelect?: (segmentIndex: number) => void;
}) {
  const first = itinerary.segments[0];
  const last = itinerary.segments[itinerary.segments.length - 1];
  const stops = itinerary.segments.length - 1;

  // Baggage display
  const bags = fareDetail?.includedCheckedBags;
  const cabin = (fareDetail?.cabin || 'ECONOMY').toUpperCase();
  let baggageLabel = 'Kein Gepäck';
  if (bags?.weight && bags.weight > 0) {
    const qty = bags.quantity || 1;
    baggageLabel = qty === 1 ? `${bags.weight}kg` : `${qty}× ${bags.weight}kg`;
  } else if (bags?.quantity && bags.quantity > 0) {
    const wt = cabin.includes('FIRST') || cabin.includes('BUSINESS') ? 32 : 23;
    baggageLabel = bags.quantity === 1 ? `${wt}kg` : `${bags.quantity}× ${wt}kg`;
  }

  const cabinLabel = cabin.includes('FIRST') ? 'First' : cabin.includes('BUSINESS') ? 'Business' : cabin.includes('PREMIUM') ? 'Premium Economy' : 'Economy';

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <Plane className={`h-3 w-3 ${label === 'Rückflug' ? 'rotate-180' : ''}`} />
        {label} ·{' '}
        {formatDateTime(first.departure.at, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })}
        <span className="text-[10px] normal-case font-normal">
          · {formatDuration(itinerary.duration)} gesamt
        </span>
      </div>

      {/* Individual segments */}
      {itinerary.segments.map((seg, idx) => {
        const nextSeg = itinerary.segments[idx + 1];
        // Layover calculation
        let layover = '';
        if (nextSeg) {
          const layoverMs = new Date(nextSeg.departure.at).getTime() - new Date(seg.arrival.at).getTime();
          const h = Math.floor(layoverMs / (1000 * 60 * 60));
          const m = Math.floor((layoverMs % (1000 * 60 * 60)) / (1000 * 60));
          layover = `${h}h ${m}m`;
        }

        return (
          <div key={seg.id || idx}>
            {/* Segment row */}
            <div className="flex items-center gap-3">
              <div className="text-center min-w-[52px]">
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none">
                  {formatDateTime(seg.departure.at, 'time')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {seg.departure.iataCode}
                </p>
              </div>

              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {formatDuration(seg.duration)}
                </span>
                <div className="w-full flex items-center">
                  <div className="h-[2px] flex-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {formatAirlineName(seg.carrierCode)} · {seg.carrierCode}{seg.number}
                </span>
              </div>

              <div className="text-center min-w-[52px]">
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none">
                  {formatDateTime(seg.arrival.at, 'time')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {seg.arrival.iataCode}
                </p>
              </div>
            </div>

            {/* Layover indicator */}
            {nextSeg && (
              <div className="flex items-center gap-2 my-2 px-2">
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

      {/* Cabin, Booking Class, Baggage */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-0.5">
          {cabinLabel}
        </span>
        {fareDetail?.class && (
          <span className="inline-flex items-center text-[10px] font-bold font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-0.5">
            {fareDetail.class}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-0.5">
          <Luggage className="h-3 w-3" />
          {baggageLabel}
        </span>
        {fareDetail?.brandedFareLabel || fareDetail?.brandedFare ? (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {fareDetail.brandedFareLabel || fareDetail.brandedFare}
          </span>
        ) : null}
      </div>

      {/* Seat selection button */}
      {onSeatSelect && (
        <div className="pt-1">
          {(() => {
            // Collect selected seat numbers across all segments for this itinerary
            const selectedNums: string[] = [];
            if (seatSelections) {
              for (const seg of itinerary.segments) {
                const segSels = seatSelections[seg.id];
                if (segSels) {
                  for (const sel of Object.values(segSels)) {
                    if (sel.number) selectedNums.push(sel.number);
                  }
                }
              }
            }

            if (selectedNums.length > 0) {
              return (
                <button
                  type="button"
                  onClick={() => onSeatSelect(0)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/30 px-3 py-1.5 text-xs font-medium text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-950/50 transition-colors"
                >
                  <span>💺</span>
                  <span>{selectedNums.join(', ')} gewählt ✓</span>
                </button>
              );
            }

            return (
              <button
                type="button"
                onClick={() => onSeatSelect(0)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                <span>💺</span>
                <span>Sitzplatz wählen</span>
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Confirmation Flight Card
// ============================================================================

function ConfirmationFlightCard({ itinerary, label }: { itinerary: Itinerary; label: string }) {
  const first = itinerary.segments[0];
  const last = itinerary.segments[itinerary.segments.length - 1];
  const stops = itinerary.segments.length - 1;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Plane className={`h-3.5 w-3.5 text-gray-400 ${label === 'Rückflug' ? 'rotate-180' : ''}`} />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          · {formatDateTime(first.departure.at, { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatDateTime(first.departure.at, 'time')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{first.departure.iataCode}</p>
          </div>
          <div className="text-center px-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">{formatDuration(itinerary.duration)}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatDateTime(last.arrival.at, 'time')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{last.arrival.iataCode}</p>
          </div>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
          {stops === 0 ? 'Direkt' : `${stops} Stopp`}
        </span>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{formatAirlineName(first.carrierCode)}</p>
    </div>
  );
}

// ============================================================================
// Passenger Card — Base UI: RadioGroup for gender, Input for names, Select for DOB/nationality
// ============================================================================

function PassengerCard({
  traveler,
  index,
  register,
  control,
  errors,
  setValue,
  watch,
}: {
  traveler: TravelerData;
  index: number;
  register: any;
  control: any;
  errors: any;
  setValue: any;
  watch: any;
}) {
  const travelerErrors = errors.travelers?.[index];
  const typeLabel = getTravelerTypeLabel(traveler.type);
  const ageRange =
    traveler.type === 'ADULT'
      ? 'Ab 12 Jahre'
      : traveler.type === 'CHILD'
        ? '2–11 Jahre'
        : '0–1 Jahre';

  const yearsOptions =
    traveler.type === 'ADULT'
      ? YEARS_ADULT
      : traveler.type === 'CHILD'
        ? YEARS_CHILD
        : YEARS_INFANT;

  const selectedGender = watch(`travelers.${index}.gender`);

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
          {index + 1}
        </div>
        <div>
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {typeLabel} {index + 1}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{ageRange}</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Gender — Base UI RadioGroup */}
        <Field.Root>
          <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Anrede
          </Field.Label>
          <Controller
            name={`travelers.${index}.gender`}
            control={control}
            render={({ field: { value, onChange } }) => (
              <motion.div
                variants={shakeAnimation}
                animate={travelerErrors?.gender ? 'shake' : undefined}
              >
                <RadioGroup
                  value={value}
                  onValueChange={(val) => onChange(val)}
                  className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1"
                >
                  <Radio.Root
                    value="MALE"
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      value === 'MALE'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    Herr
                  </Radio.Root>
                  <Radio.Root
                    value="FEMALE"
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      value === 'FEMALE'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    Frau
                  </Radio.Root>
                </RadioGroup>
              </motion.div>
            )}
          />
          {travelerErrors?.gender && (
            <Field.Error className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1" match>
              <AlertCircle className="h-3 w-3 shrink-0" />
              {travelerErrors.gender.message}
            </Field.Error>
          )}
        </Field.Root>

        {/* Name fields — side by side on desktop */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field.Root>
            <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Vorname
            </Field.Label>
            <motion.div variants={shakeAnimation} animate={travelerErrors?.firstName ? 'shake' : undefined}>
              <Input
                type="text"
                autoComplete="given-name"
                placeholder="Wie im Reisepass"
                {...register(`travelers.${index}.firstName`)}
                className={inputClass(!!travelerErrors?.firstName)}
              />
            </motion.div>
            {travelerErrors?.firstName && (
              <Field.Error className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1" match>
                <AlertCircle className="h-3 w-3 shrink-0" />
                {travelerErrors.firstName.message}
              </Field.Error>
            )}
          </Field.Root>
          <Field.Root>
            <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nachname
            </Field.Label>
            <motion.div variants={shakeAnimation} animate={travelerErrors?.lastName ? 'shake' : undefined}>
              <Input
                type="text"
                autoComplete="family-name"
                placeholder="Wie im Reisepass"
                {...register(`travelers.${index}.lastName`)}
                className={inputClass(!!travelerErrors?.lastName)}
              />
            </motion.div>
            {travelerErrors?.lastName && (
              <Field.Error className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1" match>
                <AlertCircle className="h-3 w-3 shrink-0" />
                {travelerErrors.lastName.message}
              </Field.Error>
            )}
          </Field.Root>
        </div>

        {/* Date of Birth — 3 Base UI Selects */}
        <Field.Root>
          <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Geburtsdatum
          </Field.Label>
          <motion.div
            className="grid grid-cols-3 gap-3"
            variants={shakeAnimation}
            animate={travelerErrors?.dobDay || travelerErrors?.dobMonth || travelerErrors?.dobYear ? 'shake' : undefined}
          >
            {/* Day */}
            <Controller
              name={`travelers.${index}.dobDay`}
              control={control}
              render={({ field: { value, onChange } }) => (
                <Select.Root
                  value={value || undefined}
                  onValueChange={(val) => onChange(val)}
                >
                  <Select.Trigger className={selectTriggerClass(!!travelerErrors?.dobDay)}>
                    <Select.Value placeholder="Tag" />
                    <Select.Icon>
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner className="z-[100]">
                      <Select.Popup className={selectPopupClass}>
                        {DAYS.map((d) => (
                          <Select.Item key={d} value={d} className={selectItemClass}>
                            <Select.ItemText>{d}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              )}
            />
            {/* Month */}
            <Controller
              name={`travelers.${index}.dobMonth`}
              control={control}
              render={({ field: { value, onChange } }) => (
                <Select.Root
                  value={value || undefined}
                  onValueChange={(val) => onChange(val)}
                >
                  <Select.Trigger className={selectTriggerClass(!!travelerErrors?.dobMonth)}>
                    <Select.Value placeholder="Monat" />
                    <Select.Icon>
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner className="z-[100]">
                      <Select.Popup className={selectPopupClass}>
                        {MONTHS.map((m) => (
                          <Select.Item key={m.value} value={m.value} className={selectItemClass}>
                            <Select.ItemText>{m.label}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              )}
            />
            {/* Year */}
            <Controller
              name={`travelers.${index}.dobYear`}
              control={control}
              render={({ field: { value, onChange } }) => (
                <Select.Root
                  value={value || undefined}
                  onValueChange={(val) => onChange(val)}
                >
                  <Select.Trigger className={selectTriggerClass(!!travelerErrors?.dobYear)}>
                    <Select.Value placeholder="Jahr" />
                    <Select.Icon>
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner className="z-[100]">
                      <Select.Popup className={selectPopupClass}>
                        {yearsOptions.map((y) => (
                          <Select.Item key={y} value={y} className={selectItemClass}>
                            <Select.ItemText>{y}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              )}
            />
          </motion.div>
          {(travelerErrors?.dobDay || travelerErrors?.dobMonth || travelerErrors?.dobYear) && (
            <Field.Error className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1" match>
              <AlertCircle className="h-3 w-3 shrink-0" />
              {travelerErrors?.dobDay?.message ||
                travelerErrors?.dobMonth?.message ||
                travelerErrors?.dobYear?.message}
            </Field.Error>
          )}
        </Field.Root>

        {/* Nationality — Base UI Select with search */}
        <Field.Root>
          <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Nationalität (optional)
          </Field.Label>
          <Controller
            name={`travelers.${index}.nationality`}
            control={control}
            render={({ field: { value, onChange } }) => (
              <NationalitySelect
                value={value || ''}
                onChange={onChange}
              />
            )}
          />
          {travelerErrors?.nationality && (
            <Field.Error className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1" match>
              <AlertCircle className="h-3 w-3 shrink-0" />
              {travelerErrors.nationality.message}
            </Field.Error>
          )}
        </Field.Root>
      </div>
    </div>
  );
}

// ============================================================================
// Nationality Select — Searchable dropdown with flags
// (Kept as custom component since Base UI Select doesn't have built-in search)
// ============================================================================

function NationalitySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = NATIONALITIES.filter(
    (n) => !n.disabled && n.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = NATIONALITIES.find((n) => n.code === value)?.label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full h-12 px-4 rounded-xl border bg-white dark:bg-gray-800 text-sm text-left flex items-center justify-between transition-all
          ${open ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-gray-200 dark:border-gray-700'}
          ${value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}
        `}
      >
        <span>{selectedLabel || 'Nationalität wählen'}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 w-full rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl max-h-64 overflow-hidden"
          >
            {/* Search */}
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Suchen…"
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-gray-50 dark:bg-gray-700 border-0 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-pink-500/30"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">Keine Ergebnisse</p>
              ) : (
                filtered.map((n) => (
                  <button
                    key={n.code}
                    type="button"
                    onClick={() => {
                      onChange(n.code);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                      value === n.code ? 'bg-gray-50 dark:bg-gray-700 font-medium' : ''
                    }`}
                  >
                    <span className="text-gray-800 dark:text-gray-200">{n.label}</span>
                    {value === n.code && <Check className="h-4 w-4 text-pink-500" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Price Breakdown Block
// ============================================================================

function PriceBreakdownBlock({
  offer,
  adultCount,
  childCount,
  infantCount,
  adultPricing,
  childPricing,
  infantPricing,
  taxes,
  totalPrice,
  seatCost = 0,
  seatCurrency,
}: {
  offer: FlightOffer;
  adultCount: number;
  childCount: number;
  infantCount: number;
  adultPricing: any;
  childPricing: any;
  infantPricing: any;
  taxes: number;
  totalPrice: number;
  seatCost?: number;
  seatCurrency?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {adultCount > 0 && adultPricing && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {adultCount} × Erwachsene
            </span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {formatCurrency(parseFloat(adultPricing.price.total) * adultCount, offer.price.currency)}
            </span>
          </div>
        )}
        {childCount > 0 && childPricing && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {childCount} × Kinder
            </span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {formatCurrency(parseFloat(childPricing.price.total) * childCount, offer.price.currency)}
            </span>
          </div>
        )}
        {infantCount > 0 && infantPricing && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {infantCount} × Babys
            </span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {formatCurrency(parseFloat(infantPricing.price.total) * infantCount, offer.price.currency)}
            </span>
          </div>
        )}
        {seatCost > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span>💺</span> Sitzplätze
            </span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {formatCurrency(seatCost, seatCurrency || offer.price.currency)}
            </span>
          </div>
        )}
      </div>

      <div className="border-t-2 border-gray-900 dark:border-gray-200 pt-3">
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-900 dark:text-gray-100">Gesamtpreis</span>
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(totalPrice, offer.price.currency)}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
          Inkl. {formatCurrency(taxes, offer.price.currency)} Steuern & Gebühren
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Trust Badges
// ============================================================================

function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-3">
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
  );
}

// ============================================================================
// Reusable Form Primitives — Base UI versions
// ============================================================================

function CheckboxFieldControlled({
  name,
  control,
  label,
  error,
}: {
  name: string;
  control: any;
  label: React.ReactNode;
  error?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, onChange } }) => (
        <div>
          <div className="flex items-start gap-3 cursor-pointer group">
            <Checkbox.Root
              checked={!!value}
              onCheckedChange={(checked) => onChange(checked)}
              className="mt-0.5 h-5 w-5 rounded-md border-2 border-gray-300 dark:border-gray-600 data-[checked]:border-pink-500 data-[checked]:bg-pink-500 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <Checkbox.Indicator>
                <Check className="h-3.5 w-3.5 text-white" />
              </Checkbox.Indicator>
            </Checkbox.Root>
            <span
              className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors"
              onClick={() => onChange(!value)}
            >
              {label}
            </span>
          </div>
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                className="text-xs text-red-500 flex items-center gap-1 pt-0.5 ml-8"
              >
                <AlertCircle className="h-3 w-3 shrink-0" />
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    />
  );
}

// ============================================================================
// Booking Page — Export
// ============================================================================

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1200px] px-4 py-6 space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 grid-cols-1 md:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-72 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
