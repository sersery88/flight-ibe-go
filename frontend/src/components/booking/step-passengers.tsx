'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
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
  ChevronDown,
  ChevronUp,
  Search,
  Luggage,
  Plus,
  X,
} from 'lucide-react';
import { Field } from '@base-ui/react/field';
import { Input } from '@base-ui/react/input';
import { Select } from '@base-ui/react/select';
import { Checkbox } from '@base-ui/react/checkbox';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { Separator } from '@base-ui/react/separator';
import { useBookingFlowStore, type TravelerData, type ContactData } from '@/stores/booking-flow-store';
import { useSearchStore } from '@/stores/search-store';
import {
  formatCurrency,
  formatDuration,
  formatDateTime,
  getTravelerTypeLabel,
} from '@/lib/utils';
import { formatAirlineName, AIRLINE_NAMES } from '@/lib/airlines';
import { COUNTRIES, DACH_COUNT, getCountryByCode } from '@/lib/countries';
import { getAllianceName, ALLIANCES } from '@/lib/alliances';
import type { Itinerary, FlightOffer } from '@/types/flight';

// ============================================================================
// Zod Schema
// ============================================================================

const travelerSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE'], { message: 'Bitte Anrede wählen' }),
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
  nationality: z.string().min(1, 'Nationalität wählen'),
  // FQTV (optional)
  fqtvEnabled: z.boolean().optional(),
  fqtvAirline: z.string().optional(),
  fqtvNumber: z.string().optional(),
});

const bookingSchema = z
  .object({
    travelers: z.array(travelerSchema),
    email: z.string().email('Ungültige E-Mail-Adresse'),
    emailConfirm: z.string().email('Ungültige E-Mail-Adresse'),
    phoneCountry: z.string().min(1),
    phone: z.string().min(6, 'Ungültige Telefonnummer'),
    newsletter: z.boolean().optional(),
  })
  .refine((data) => data.email === data.emailConfirm, {
    message: 'E-Mail-Adressen stimmen nicht überein',
    path: ['emailConfirm'],
  });

type BookingFormData = z.infer<typeof bookingSchema>;

// ============================================================================
// Constants
// ============================================================================

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

// FQTV airline list: group by alliance
function buildFQTVAirlines(operatingCarrier?: string): { code: string; name: string }[] {
  const list: { code: string; name: string }[] = [];
  const added = new Set<string>();

  // Operating carrier first
  if (operatingCarrier && AIRLINE_NAMES[operatingCarrier]) {
    list.push({ code: operatingCarrier, name: AIRLINE_NAMES[operatingCarrier] });
    added.add(operatingCarrier);
  }

  // Alliance partners
  if (operatingCarrier) {
    const alliance = getAllianceName(operatingCarrier);
    if (alliance) {
      const partners = ALLIANCES[alliance];
      for (const code of partners) {
        if (!added.has(code) && AIRLINE_NAMES[code]) {
          list.push({ code, name: AIRLINE_NAMES[code] });
          added.add(code);
        }
      }
    }
  }

  // Then remaining major airlines
  const majorAirlines = ['LH', 'TK', 'BA', 'AF', 'EK', 'QR', 'SQ', 'NH', 'DL', 'UA', 'AA', 'QF'];
  for (const code of majorAirlines) {
    if (!added.has(code) && AIRLINE_NAMES[code]) {
      list.push({ code, name: AIRLINE_NAMES[code] });
      added.add(code);
    }
  }

  return list;
}

// ============================================================================
// CSS Helpers
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

const shakeAnimation = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.5 },
  },
};

// ============================================================================
// StepPassengers
// ============================================================================

export function StepPassengers() {
  const { offer, setTravelers, setContact, setStep } = useBookingFlowStore();
  const { adults, children, infants } = useSearchStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flightSummaryOpen, setFlightSummaryOpen] = useState(true);

  // Build passenger type list
  const travelerTypes = useMemo(() => {
    const types: ('ADULT' | 'CHILD' | 'INFANT')[] = [];
    for (let i = 0; i < adults; i++) types.push('ADULT');
    for (let i = 0; i < children; i++) types.push('CHILD');
    for (let i = 0; i < infants; i++) types.push('INFANT');
    return types;
  }, [adults, children, infants]);

  // Restore from store
  const existingTravelers = useBookingFlowStore((s) => s.travelers);
  const existingContact = useBookingFlowStore((s) => s.contact);

  // Default values for the form
  const defaultTravelers = useMemo(() => {
    return travelerTypes.map((type, idx) => {
      const existing = existingTravelers[idx];
      if (existing) {
        const [year, month, day] = existing.dateOfBirth ? existing.dateOfBirth.split('-') : ['', '', ''];
        return {
          gender: existing.gender as 'MALE' | 'FEMALE',
          firstName: existing.firstName,
          lastName: existing.lastName,
          dobDay: day || '',
          dobMonth: month || '',
          dobYear: year || '',
          nationality: existing.nationality || '',
          fqtvEnabled: !!existing.fqtv,
          fqtvAirline: existing.fqtv?.programOwner || '',
          fqtvNumber: existing.fqtv?.memberId || '',
        };
      }
      return {
        gender: 'MALE' as const,
        firstName: '',
        lastName: '',
        dobDay: '',
        dobMonth: '',
        dobYear: '',
        nationality: '',
        fqtvEnabled: false,
        fqtvAirline: '',
        fqtvNumber: '',
      };
    });
  }, [travelerTypes, existingTravelers]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      travelers: defaultTravelers,
      email: existingContact?.email || '',
      emailConfirm: existingContact?.email || '',
      phoneCountry: existingContact?.phoneCountryCode || '+49',
      phone: existingContact?.phone || '',
      newsletter: false,
    },
    mode: 'onTouched',
  });

  // Get operating carrier for FQTV defaults
  const operatingCarrier = useMemo(() => {
    if (!offer) return undefined;
    return offer.itineraries[0]?.segments[0]?.operating?.carrierCode ||
      offer.itineraries[0]?.segments[0]?.carrierCode;
  }, [offer]);

  // ---- Submit ----
  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    try {
      // Map form data to TravelerData
      const travelers: TravelerData[] = data.travelers.map((t, idx) => ({
        id: String(idx + 1),
        type: travelerTypes[idx],
        gender: t.gender,
        firstName: t.firstName,
        lastName: t.lastName,
        dateOfBirth: `${t.dobYear}-${t.dobMonth}-${t.dobDay}`,
        nationality: t.nationality || '',
        ...(t.fqtvEnabled && t.fqtvAirline && t.fqtvNumber
          ? {
              fqtv: {
                programOwner: t.fqtvAirline,
                memberId: t.fqtvNumber,
              },
            }
          : {}),
      }));

      const contact: ContactData = {
        email: data.email,
        phone: data.phone,
        phoneCountryCode: data.phoneCountry,
      };

      setTravelers(travelers);
      setContact(contact);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!offer) return null;

  const outbound = offer.itineraries[0];
  const returnFlight = offer.itineraries.length > 1 ? offer.itineraries[1] : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-[900px] px-4 py-3 flex items-center">
          <Link
            href="/results"
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Zurück zu Ergebnissen</span>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mx-auto max-w-[900px] px-4 py-6 space-y-6">
          {/* ---- Flight Summary (collapsible) ---- */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setFlightSummaryOpen(!flightSummaryOpen)}
                className="w-full bg-gray-800 dark:bg-gray-700 px-5 py-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-white">
                  <Plane className="h-4 w-4" />
                  <span className="font-semibold text-sm">Flugübersicht</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold text-lg">
                    {formatCurrency(offer.price.grandTotal, offer.price.currency)}
                  </span>
                  {flightSummaryOpen ? (
                    <ChevronUp className="h-4 w-4 text-white/60" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-white/60" />
                  )}
                </div>
              </button>
              <AnimatePresence initial={false}>
                {flightSummaryOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 space-y-4">
                      <FlightSummaryRow itinerary={outbound} label="Hinflug" offer={offer} />
                      {returnFlight && (
                        <>
                          <Separator className="border-t border-dashed border-gray-200 dark:border-gray-700" />
                          <FlightSummaryRow itinerary={returnFlight} label="Rückflug" offer={offer} />
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* ---- Passenger Forms ---- */}
          {travelerTypes.map((type, idx) => (
            <motion.section
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + idx * 0.08 }}
            >
              <PassengerCard
                index={idx}
                type={type}
                register={register}
                control={control}
                errors={errors}
                setValue={setValue}
                watch={watch}
                operatingCarrier={operatingCarrier}
              />
            </motion.section>
          ))}

          {/* ---- Contact Details ---- */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Kontaktdaten
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Für deine Buchungsbestätigung und Reisedokumente
                </p>
              </div>
              <div className="p-5 space-y-4">
                {/* Email */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field.Root>
                    <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      E-Mail-Adresse *
                    </Field.Label>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="deine@email.de"
                      {...register('email')}
                      className={inputClass(!!errors.email)}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {errors.email.message}
                      </p>
                    )}
                  </Field.Root>
                  <Field.Root>
                    <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      E-Mail wiederholen *
                    </Field.Label>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="E-Mail bestätigen"
                      {...register('emailConfirm')}
                      className={inputClass(!!errors.emailConfirm)}
                    />
                    {errors.emailConfirm && (
                      <p className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {errors.emailConfirm.message}
                      </p>
                    )}
                  </Field.Root>
                </div>

                {/* Phone */}
                <Field.Root>
                  <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Telefonnummer *
                  </Field.Label>
                  <div className="flex gap-2">
                    <Controller
                      name="phoneCountry"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Select.Root value={value} onValueChange={(val) => onChange(val)}>
                          <Select.Trigger className="h-12 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 w-[110px] shrink-0 flex items-center justify-between gap-1 cursor-pointer">
                            <Select.Value placeholder="Vorwahl" />
                            <Select.Icon>
                              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                            </Select.Icon>
                          </Select.Trigger>
                          <Select.Portal>
                            <Select.Positioner className="z-[100]">
                              <Select.Popup className={selectPopupClass}>
                                {COUNTRIES.slice(0, DACH_COUNT).map((c) => (
                                  <Select.Item key={c.code} value={c.phone} className={selectItemClass}>
                                    <Select.ItemText>{c.flag} {c.phone}</Select.ItemText>
                                  </Select.Item>
                                ))}
                                <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                                {COUNTRIES.slice(DACH_COUNT).map((c) => (
                                  <Select.Item key={c.code} value={c.phone} className={selectItemClass}>
                                    <Select.ItemText>{c.flag} {c.phone}</Select.ItemText>
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
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="123 4567890"
                      {...register('phone')}
                      className={`flex-1 ${inputClass(!!errors.phone)}`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors.phone.message}
                    </p>
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

          {/* ---- Submit Button ---- */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:text-gray-500 text-white h-14 rounded-xl text-base font-semibold shadow-lg shadow-pink-500/20 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Wird verarbeitet…
                </>
              ) : (
                <>
                  Weiter zu Extras →
                  <span className="opacity-75">
                    ({formatCurrency(offer.price.grandTotal, offer.price.currency)})
                  </span>
                </>
              )}
            </button>

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
      </form>
    </div>
  );
}

// ============================================================================
// Flight Summary Row
// ============================================================================

function FlightSummaryRow({
  itinerary,
  label,
  offer,
}: {
  itinerary: Itinerary;
  label: string;
  offer: FlightOffer;
}) {
  const first = itinerary.segments[0];
  const last = itinerary.segments[itinerary.segments.length - 1];
  const stops = itinerary.segments.length - 1;

  const fareDetail = label === 'Hinflug'
    ? offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]
    : offer.travelerPricings?.[0]?.fareDetailsBySegment?.[offer.itineraries[0].segments.length];

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

  return (
    <div className="space-y-3">
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

      {itinerary.segments.map((seg, idx) => {
        const nextSeg = itinerary.segments[idx + 1];
        let layover = '';
        if (nextSeg) {
          const layoverMs =
            new Date(nextSeg.departure.at).getTime() - new Date(seg.arrival.at).getTime();
          const h = Math.floor(layoverMs / (1000 * 60 * 60));
          const m = Math.floor((layoverMs % (1000 * 60 * 60)) / (1000 * 60));
          layover = `${h}h ${m}m`;
        }

        return (
          <div key={seg.id || idx}>
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
                  {formatAirlineName(seg.operating?.carrierCode || seg.carrierCode)} ·{' '}
                  {seg.carrierCode}{seg.number}
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

      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-0.5">
          {cabin.includes('FIRST')
            ? 'First'
            : cabin.includes('BUSINESS')
              ? 'Business'
              : cabin.includes('PREMIUM')
                ? 'Premium Economy'
                : 'Economy'}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-0.5">
          <Luggage className="h-3 w-3" />
          {baggageLabel}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Passenger Card
// ============================================================================

function PassengerCard({
  index,
  type,
  register,
  control,
  errors,
  setValue,
  watch,
  operatingCarrier,
}: {
  index: number;
  type: 'ADULT' | 'CHILD' | 'INFANT';
  register: any;
  control: any;
  errors: any;
  setValue: any;
  watch: any;
  operatingCarrier?: string;
}) {
  const travelerErrors = errors.travelers?.[index];
  const typeLabel = type === 'ADULT' ? 'Erwachsener' : type === 'CHILD' ? 'Kind' : 'Baby';
  const ageRange =
    type === 'ADULT' ? 'Ab 12 Jahre' : type === 'CHILD' ? '2–11 Jahre' : '0–1 Jahre';

  const yearsOptions = type === 'ADULT' ? YEARS_ADULT : type === 'CHILD' ? YEARS_CHILD : YEARS_INFANT;

  const fqtvEnabled = watch(`travelers.${index}.fqtvEnabled`);
  const selectedGender = watch(`travelers.${index}.gender`);

  // FQTV airlines list
  const fqtvAirlines = useMemo(() => buildFQTVAirlines(operatingCarrier), [operatingCarrier]);

  // Set default FQTV airline when enabled
  useEffect(() => {
    if (fqtvEnabled && operatingCarrier) {
      const currentAirline = watch(`travelers.${index}.fqtvAirline`);
      if (!currentAirline) {
        setValue(`travelers.${index}.fqtvAirline`, operatingCarrier);
      }
    }
  }, [fqtvEnabled, operatingCarrier, index, setValue, watch]);

  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
          {index + 1}
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {typeLabel} {index + 1}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{ageRange}</p>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5 space-y-5">
              {/* Gender */}
              <Field.Root>
                <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Anrede *
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
                          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer min-h-[44px] flex items-center ${
                            value === 'MALE'
                              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                        >
                          Herr
                        </Radio.Root>
                        <Radio.Root
                          value="FEMALE"
                          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer min-h-[44px] flex items-center ${
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
                  <p className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {travelerErrors.gender.message}
                  </p>
                )}
              </Field.Root>

              {/* Name fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field.Root>
                  <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Vorname *
                  </Field.Label>
                  <motion.div
                    variants={shakeAnimation}
                    animate={travelerErrors?.firstName ? 'shake' : undefined}
                  >
                    <Input
                      type="text"
                      autoComplete="given-name"
                      placeholder="Wie im Reisepass"
                      {...register(`travelers.${index}.firstName`)}
                      className={inputClass(!!travelerErrors?.firstName)}
                    />
                  </motion.div>
                  {travelerErrors?.firstName && (
                    <p className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {travelerErrors.firstName.message}
                    </p>
                  )}
                </Field.Root>
                <Field.Root>
                  <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Nachname *
                  </Field.Label>
                  <motion.div
                    variants={shakeAnimation}
                    animate={travelerErrors?.lastName ? 'shake' : undefined}
                  >
                    <Input
                      type="text"
                      autoComplete="family-name"
                      placeholder="Wie im Reisepass"
                      {...register(`travelers.${index}.lastName`)}
                      className={inputClass(!!travelerErrors?.lastName)}
                    />
                  </motion.div>
                  {travelerErrors?.lastName && (
                    <p className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {travelerErrors.lastName.message}
                    </p>
                  )}
                </Field.Root>
              </div>

              {/* Date of Birth */}
              <Field.Root>
                <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Geburtsdatum *
                </Field.Label>
                <motion.div
                  className="grid grid-cols-3 gap-3"
                  variants={shakeAnimation}
                  animate={
                    travelerErrors?.dobDay || travelerErrors?.dobMonth || travelerErrors?.dobYear
                      ? 'shake'
                      : undefined
                  }
                >
                  {/* Day */}
                  <Controller
                    name={`travelers.${index}.dobDay`}
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Select.Root value={value || undefined} onValueChange={(val) => onChange(val)}>
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
                      <Select.Root value={value || undefined} onValueChange={(val) => onChange(val)}>
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
                      <Select.Root value={value || undefined} onValueChange={(val) => onChange(val)}>
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
                  <p className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {travelerErrors?.dobDay?.message ||
                      travelerErrors?.dobMonth?.message ||
                      travelerErrors?.dobYear?.message}
                  </p>
                )}
              </Field.Root>

              {/* Nationality */}
              <Field.Root>
                <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nationalität *
                </Field.Label>
                <Controller
                  name={`travelers.${index}.nationality`}
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <NationalitySelect
                      value={value || ''}
                      onChange={onChange}
                      hasError={!!travelerErrors?.nationality}
                    />
                  )}
                />
                {travelerErrors?.nationality && (
                  <p className="text-xs text-red-500 flex items-center gap-1 pt-0.5 mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {travelerErrors.nationality.message}
                  </p>
                )}
              </Field.Root>

              {/* FQTV Section */}
              {type !== 'INFANT' && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <Controller
                    name={`travelers.${index}.fqtvEnabled`}
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <>
                        <button
                          type="button"
                          onClick={() => onChange(!value)}
                          className="flex items-center gap-2 text-sm text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 font-medium transition-colors"
                        >
                          {value ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          {value ? 'Vielfliegerprogramm entfernen' : 'Vielfliegerprogramm hinzufügen'}
                        </button>

                        <AnimatePresence>
                          {value && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="grid gap-4 sm:grid-cols-2 pt-4">
                                {/* Airline */}
                                <Field.Root>
                                  <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Airline
                                  </Field.Label>
                                  <Controller
                                    name={`travelers.${index}.fqtvAirline`}
                                    control={control}
                                    render={({ field: { value: val, onChange: onChg } }) => (
                                      <Select.Root
                                        value={val || undefined}
                                        onValueChange={(v) => onChg(v)}
                                      >
                                        <Select.Trigger className={selectTriggerClass(false)}>
                                          <Select.Value placeholder="Airline wählen" />
                                          <Select.Icon>
                                            <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                          </Select.Icon>
                                        </Select.Trigger>
                                        <Select.Portal>
                                          <Select.Positioner className="z-[100]">
                                            <Select.Popup className={selectPopupClass}>
                                              {fqtvAirlines.map((a) => (
                                                <Select.Item
                                                  key={a.code}
                                                  value={a.code}
                                                  className={selectItemClass}
                                                >
                                                  <Select.ItemText>
                                                    {a.code} — {a.name}
                                                  </Select.ItemText>
                                                </Select.Item>
                                              ))}
                                            </Select.Popup>
                                          </Select.Positioner>
                                        </Select.Portal>
                                      </Select.Root>
                                    )}
                                  />
                                  {operatingCarrier && (
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                      {getAllianceName(operatingCarrier)
                                        ? `${getAllianceName(operatingCarrier)} Partner akzeptiert`
                                        : ''}
                                    </p>
                                  )}
                                </Field.Root>

                                {/* Number */}
                                <Field.Root>
                                  <Field.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Vielfliegernummer
                                  </Field.Label>
                                  <Input
                                    type="text"
                                    placeholder="z.B. 1234567890"
                                    {...register(`travelers.${index}.fqtvNumber`)}
                                    className={inputClass(false)}
                                  />
                                </Field.Root>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Nationality Select — Searchable dropdown with flags
// ============================================================================

function NationalitySelect({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

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

  const filtered = useMemo(() => {
    if (!search) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [search]);

  const selected = value ? getCountryByCode(value) : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full h-12 px-4 rounded-xl border bg-white dark:bg-gray-800 text-sm text-left flex items-center justify-between transition-all min-h-[44px] ${
          open
            ? 'border-pink-500 ring-2 ring-pink-500/20'
            : hasError
              ? 'border-red-400 dark:border-red-500'
              : 'border-gray-200 dark:border-gray-700'
        } ${value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
      >
        <span>
          {selected ? `${selected.flag} ${selected.name}` : 'Nationalität wählen'}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
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
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Suchen…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-gray-50 dark:bg-gray-700 border-0 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-pink-500/30"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">Keine Ergebnisse</p>
              ) : (
                <>
                  {/* DACH separator */}
                  {!search && (
                    <>
                      {filtered.slice(0, DACH_COUNT).map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            onChange(c.code);
                            setOpen(false);
                            setSearch('');
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between min-h-[44px] ${
                            value === c.code ? 'bg-gray-50 dark:bg-gray-700 font-medium' : ''
                          }`}
                        >
                          <span className="text-gray-800 dark:text-gray-200">
                            {c.flag} {c.name}
                          </span>
                          {value === c.code && <Check className="h-4 w-4 text-pink-500" />}
                        </button>
                      ))}
                      <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                      {filtered.slice(DACH_COUNT).map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            onChange(c.code);
                            setOpen(false);
                            setSearch('');
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between min-h-[44px] ${
                            value === c.code ? 'bg-gray-50 dark:bg-gray-700 font-medium' : ''
                          }`}
                        >
                          <span className="text-gray-800 dark:text-gray-200">
                            {c.flag} {c.name}
                          </span>
                          {value === c.code && <Check className="h-4 w-4 text-pink-500" />}
                        </button>
                      ))}
                    </>
                  )}
                  {/* With search: flat list */}
                  {search &&
                    filtered.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          onChange(c.code);
                          setOpen(false);
                          setSearch('');
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between min-h-[44px] ${
                          value === c.code ? 'bg-gray-50 dark:bg-gray-700 font-medium' : ''
                        }`}
                      >
                        <span className="text-gray-800 dark:text-gray-200">
                          {c.flag} {c.name}
                        </span>
                        {value === c.code && <Check className="h-4 w-4 text-pink-500" />}
                      </button>
                    ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
