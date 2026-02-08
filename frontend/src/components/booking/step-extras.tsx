'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Armchair,
  Luggage,
  Zap,
  Loader2,
  Check,
  ChevronDown,
  Info,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useBookingFlowStore, type SelectedAncillary } from '@/stores/booking-flow-store';
import { useSeatSelectionStore } from '@/stores/seat-selection-store';
import { SeatmapModal } from '@/components/seatmap';
import { BaggageCounter, type BagOption } from '@/components/booking/baggage-counter';
import { FareRulesAccordion, type FareRuleGroup } from '@/components/booking/fare-rules-accordion';
import { PriceSummary } from '@/components/booking/price-summary';
import { priceOffersWithAncillaries, type PricingResponse, type AncillaryService } from '@/lib/api-client';
import { formatCurrency, getTravelerTypeLabel } from '@/lib/utils';
import type { FlightOffer } from '@/types/flight';

// ============================================================================
// Types
// ============================================================================

interface InferredAmenity {
  type: string; // BAGGAGE, MEAL, LOUNGE, BRANDED_FARES
  description: string;
  included: boolean;
  isChargeable?: boolean;
  price?: number;
  currency?: string;
}

interface CategoryItem {
  description: string;
  included: boolean;
  isChargeable: boolean;
  price?: number;
  currency?: string;
}

interface AmenityCategory {
  key: string;
  icon: string;
  label: string;
  items: CategoryItem[];
}

// ============================================================================
// Smart Fallback / Inference Logic
// ============================================================================

function inferAmenities(offer: FlightOffer): InferredAmenity[] {
  const cabin = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin;
  const brandedFare = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.brandedFare;
  const bags = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags;

  const amenities: InferredAmenity[] = [];

  // Baggage — always show what's included
  if (bags?.weight) {
    amenities.push({
      type: 'BAGGAGE',
      description: `${bags.weight}${bags.weightUnit?.toLowerCase() || 'kg'} Aufgabegepäck inkl.`,
      included: true,
    });
  } else if (bags?.quantity) {
    amenities.push({
      type: 'BAGGAGE',
      description: `${bags.quantity}x Aufgabegepäck inkl.`,
      included: true,
    });
  }

  // Cabin-based inference
  if (cabin === 'BUSINESS' || cabin === 'FIRST') {
    amenities.push({ type: 'MEAL', description: 'Mahlzeiten & Getränke inkl.', included: true });
    amenities.push({ type: 'LOUNGE', description: 'Lounge-Zugang', included: true });
    amenities.push({ type: 'BRANDED_FARES', description: 'Priority Boarding', included: true });
  } else if (cabin === 'PREMIUM_ECONOMY') {
    amenities.push({ type: 'MEAL', description: 'Erweiterte Verpflegung', included: true });
  }

  // Branded fare inference
  if (brandedFare) {
    const bf = brandedFare.toUpperCase();
    if (bf.includes('FLEX') || bf.includes('BUSINESS') || bf.includes('BIZ')) {
      amenities.push({ type: 'BRANDED_FARES', description: 'Umbuchbar', included: true });
    }
    if (bf.includes('PREMIUM') || bf.includes('CLASSIC') || bf.includes('FLEX')) {
      amenities.push({ type: 'BRANDED_FARES', description: 'Sitzplatzwahl inkl.', included: true });
    }
  }

  return amenities;
}

function buildCategories(
  ancillaryServices: AncillaryService[],
  inferred: InferredAmenity[],
  serviceOptions: Array<{ type: string; price: number; currency: string }>,
): AmenityCategory[] {
  const cats: Record<string, CategoryItem[]> = {
    BAGGAGE: [],
    MEAL: [],
    LOUNGE: [],
    EXTRAS: [],
  };

  const seen = new Set<string>();

  // 1. Add API ancillary services
  for (const svc of ancillaryServices) {
    const dedup = `${svc.type}:${svc.description}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);

    const bucket = svc.type === 'BAGGAGE' ? 'BAGGAGE'
      : svc.type === 'MEAL' ? 'MEAL'
      : svc.type === 'LOUNGE' ? 'LOUNGE'
      : 'EXTRAS';

    cats[bucket].push({
      description: svc.description,
      included: !svc.isChargeable,
      isChargeable: svc.isChargeable,
      price: svc.price,
      currency: svc.currency,
    });
  }

  // 2. Add inferred amenities (only if not already present from API)
  for (const inf of inferred) {
    const dedup = `${inf.type}:${inf.description}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);

    const bucket = inf.type === 'BAGGAGE' ? 'BAGGAGE'
      : inf.type === 'MEAL' ? 'MEAL'
      : inf.type === 'LOUNGE' ? 'LOUNGE'
      : 'EXTRAS';

    cats[bucket].push({
      description: inf.description,
      included: inf.included,
      isChargeable: !inf.included,
      price: inf.price,
      currency: inf.currency,
    });
  }

  // 3. Add service options (purchasable services)
  for (const svc of serviceOptions) {
    const label = SERVICE_LABELS[svc.type] || svc.type;
    const dedup = `SERVICE:${svc.type}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);

    cats['EXTRAS'].push({
      description: label,
      included: false,
      isChargeable: true,
      price: svc.price,
      currency: svc.currency,
    });
  }

  const categoryConfig: Array<{ key: string; icon: string; label: string }> = [
    { key: 'BAGGAGE', icon: '🧳', label: 'Gepäck' },
    { key: 'MEAL', icon: '🍽️', label: 'Verpflegung' },
    { key: 'LOUNGE', icon: '🛋️', label: 'Lounge' },
    { key: 'EXTRAS', icon: '✨', label: 'Extras' },
  ];

  return categoryConfig
    .map((cfg) => ({
      ...cfg,
      items: cats[cfg.key] || [],
    }))
    .filter((c) => c.items.length > 0);
}

// ============================================================================
// Skeleton Components
// ============================================================================

function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-3 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="p-5 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CategorySection — Collapsible category card
// ============================================================================

function CategorySection({ category }: { category: AmenityCategory }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 min-h-[56px]"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{category.icon}</span>
          <div className="text-left">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {category.label}
            </h3>
            {!open && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {category.items.length} {category.items.length === 1 ? 'Leistung' : 'Leistungen'}
              </p>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-5 w-5 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-2">
              {category.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                >
                  {/* Status icon */}
                  <span className="shrink-0 text-base">
                    {item.included ? (
                      <span className="text-emerald-600 dark:text-emerald-400">✅</span>
                    ) : item.isChargeable && item.price && item.price > 0 ? (
                      <span className="text-amber-500 dark:text-amber-400">💰</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">❌</span>
                    )}
                  </span>

                  {/* Description */}
                  <span
                    className={`flex-1 text-sm ${
                      item.included
                        ? 'text-gray-900 dark:text-gray-100'
                        : item.isChargeable && item.price
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-400 dark:text-gray-500 line-through'
                    }`}
                  >
                    {item.description}
                  </span>

                  {/* Price badge */}
                  {item.included && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      Inkl.
                    </span>
                  )}
                  {!item.included && item.isChargeable && item.price != null && item.price > 0 && (
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      +{formatCurrency(item.price, item.currency || 'EUR')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// StepExtras
// ============================================================================

export function StepExtras() {
  const {
    offer,
    travelers,
    orderId,
    pricingResult,
    setStep,
    setAncillaries,
  } = useBookingFlowStore();

  const [seatmapOpen, setSeatmapOpen] = useState(false);
  const [seatmapSegmentIndex, setSeatmapSegmentIndex] = useState(0);

  // Seat store
  const seatTotalCost = useSeatSelectionStore((s) => s.totalSeatCost());
  const seatCurrency = useSeatSelectionStore((s) => s.currency());
  const seatHasSelections = useSeatSelectionStore((s) => s.hasSelections());
  const seatSelections = useSeatSelectionStore((s) => s.selections);

  // Local ancillary state
  const [bagSelections, setBagSelections] = useState<
    Record<string, Record<string, number>>
  >({}); // travelerId → type → quantity
  const [serviceSelections, setServiceSelections] = useState<
    Record<string, boolean>
  >({}); // serviceType → checked

  // ---- Load ancillary pricing ----
  const {
    data: pricingData,
    isLoading: pricingLoading,
    isError: pricingError,
  } = useQuery({
    queryKey: ['ancillaries', offer?.id],
    queryFn: () =>
      priceOffersWithAncillaries(
        offer ? [offer] : [],
        ['bags', 'other-services', 'detailed-fare-rules']
      ),
    enabled: !!offer,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // ---- Parse pricing response ----
  const bagOptions: BagOption[] = useMemo(() => {
    if (!pricingData?.bagOptions || pricingData.bagOptions.length === 0) return [];
    // Group by type & weight, deduplicate
    const seen = new Set<string>();
    const opts: BagOption[] = [];
    for (const opt of pricingData.bagOptions) {
      const key = `${opt.type}-${opt.weight}`;
      if (seen.has(key)) continue;
      seen.add(key);
      opts.push({
        weight: opt.weight,
        weightUnit: opt.weightUnit || 'KG',
        maxQuantity: opt.maxQuantity || 3,
        price: opt.price,
        currency: opt.currency,
        type: opt.type || 'CHECKED_BAG',
      });
    }
    return opts;
  }, [pricingData]);

  const serviceOptions = useMemo(() => {
    if (!pricingData?.serviceOptions || pricingData.serviceOptions.length === 0) return [];
    return pricingData.serviceOptions;
  }, [pricingData]);

  // Fare rules: prefer from pricing API, fallback to cached in store
  const fareRules: FareRuleGroup[] = useMemo(() => {
    const apiRules = pricingData?.fareRules;
    const cachedRules = pricingResult?.fareRules;
    const rules = (apiRules && apiRules.length > 0) ? apiRules : cachedRules;
    if (!rules || rules.length === 0) return [];
    return rules.map((group) => ({
      segmentId: group.segmentId,
      rules: group.rules.map((r) => ({
        category: r.category,
        notApplicable: r.notApplicable,
        maxPenalty: r.maxPenalty,
        currency: r.currency,
        description: r.description,
      })),
    }));
  }, [pricingData, pricingResult]);

  // ---- Build 4 categories ----
  const amenityCategories = useMemo(() => {
    const ancillaryServices = pricingData?.ancillaryServices || [];
    const inferred = offer ? inferAmenities(offer) : [];
    return buildCategories(ancillaryServices, inferred, serviceOptions);
  }, [pricingData, offer, serviceOptions]);

  // ---- Included baggage from fare (for the baggage counter header) ----
  const includedBaggage = useMemo(() => {
    if (!offer) return '';
    const fd = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0];
    const bags = fd?.includedCheckedBags;
    if (!bags) return 'Gepäck laut Tarif';
    const cabin = (fd?.cabin || 'ECONOMY').toUpperCase();
    if (bags.weight && bags.weight > 0) {
      const qty = bags.quantity || 1;
      return qty === 1 ? `${bags.weight}${bags.weightUnit?.toLowerCase() || 'kg'}` : `${qty}× ${bags.weight}${bags.weightUnit?.toLowerCase() || 'kg'}`;
    }
    if (bags.quantity && bags.quantity > 0) {
      const wt = cabin.includes('FIRST') || cabin.includes('BUSINESS') ? 32 : 23;
      return bags.quantity === 1 ? `${wt}kg` : `${bags.quantity}× ${wt}kg`;
    }
    return 'Gepäck laut Tarif';
  }, [offer]);

  // ---- Branded fare label ----
  const brandedFareLabel = useMemo(() => {
    if (pricingData?.brandedFareLabel) return pricingData.brandedFareLabel;
    if (pricingData?.brandedFare) return pricingData.brandedFare;
    const bf = offer?.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.brandedFare;
    const bfl = offer?.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.brandedFareLabel;
    return bfl || bf || null;
  }, [pricingData, offer]);

  // ---- Travelers for seatmap ----
  const seatmapTravelers = useMemo(() => {
    return travelers.map((t, idx) => ({
      id: t.id || String(idx + 1),
      name:
        t.firstName && t.lastName
          ? `${t.firstName} ${t.lastName}`
          : `${t.type === 'ADULT' ? 'Erwachsener' : t.type === 'CHILD' ? 'Kind' : 'Baby'} ${idx + 1}`,
      type: t.type === 'INFANT' ? ('HELD_INFANT' as const) : t.type,
    }));
  }, [travelers]);

  // ---- Selected seat labels per itinerary ----
  const seatLabelsPerItinerary = useMemo(() => {
    if (!offer) return [];
    return offer.itineraries.map((itin, itinIdx) => {
      const labels: string[] = [];
      for (const seg of itin.segments) {
        const segId = seg.id;
        const segSels = seatSelections[segId];
        if (segSels) {
          for (const [, sel] of Object.entries(segSels)) {
            labels.push(sel.number);
          }
        }
      }
      return labels;
    });
  }, [offer, seatSelections]);

  // ---- Cost calculations ----
  const bagTotalCost = useMemo(() => {
    let total = 0;
    for (const traveler of Object.values(bagSelections)) {
      for (const [type, qty] of Object.entries(traveler)) {
        const opt = bagOptions.find((o) => o.type === type);
        if (opt) total += opt.price * qty;
      }
    }
    return total;
  }, [bagSelections, bagOptions]);

  const serviceTotalCost = useMemo(() => {
    let total = 0;
    for (const [type, checked] of Object.entries(serviceSelections)) {
      if (checked) {
        const opt = serviceOptions.find((s) => s.type === type);
        if (opt) total += opt.price;
      }
    }
    return total;
  }, [serviceSelections, serviceOptions]);

  const basePrice = offer ? parseFloat(offer.price.grandTotal) : 0;
  const taxes = offer
    ? offer.price.taxes?.reduce(
        (sum, t) => sum + parseFloat(t.amount || '0'),
        0
      ) || 0
    : 0;
  const currency = offer?.price.currency || 'EUR';
  const totalPrice = basePrice + seatTotalCost + bagTotalCost + serviceTotalCost;

  // ---- Handlers ----
  const handleBagChange = useCallback(
    (travelerId: string, type: string, quantity: number) => {
      setBagSelections((prev) => ({
        ...prev,
        [travelerId]: {
          ...prev[travelerId],
          [type]: quantity,
        },
      }));
    },
    []
  );

  const handleContinue = useCallback(() => {
    // Build ancillary selections for store
    const ancillaries: SelectedAncillary[] = [];

    // Bags
    for (const [travelerId, types] of Object.entries(bagSelections)) {
      for (const [type, qty] of Object.entries(types)) {
        if (qty > 0) {
          const opt = bagOptions.find((o) => o.type === type);
          if (opt) {
            ancillaries.push({
              type: 'EXTRA_BAG',
              travelerId,
              quantity: qty,
              price: opt.price * qty,
              currency: opt.currency,
            });
          }
        }
      }
    }

    setAncillaries(ancillaries);
    setStep(3);
  }, [bagSelections, bagOptions, setAncillaries, setStep]);

  if (!offer) return null;

  const hasBagOptions = bagOptions.length > 0;

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
        {/* ======== Branded Fare Badge ======== */}
        {brandedFareLabel && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <span className="text-sm">🏷️</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Tarif: {brandedFareLabel}
            </span>
          </motion.div>
        )}

        {/* ======== 💺 Sitzplatzwahl ======== */}
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
                  💺 Sitzplatzwahl
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Wähle deinen Lieblingsplatz
                </p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {offer.itineraries.map((itin, idx) => {
                const routePoints = itin.segments
                  .map((s) => s.departure.iataCode)
                  .concat(itin.segments[itin.segments.length - 1].arrival.iataCode);
                const routeLabel = routePoints.join(' → ');
                const labels = seatLabelsPerItinerary[idx] || [];

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
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-700 hover:bg-pink-50/50 dark:hover:bg-pink-950/20 transition-all min-h-[56px]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">✈️</span>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {idx === 0 ? 'Hinflug' : 'Rückflug'}: {routeLabel}
                        </p>
                        {labels.length > 0 ? (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            💺 {labels.join(', ')} gewählt
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {itin.segments.length} Segment{itin.segments.length > 1 ? 'e' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-pink-600 dark:text-pink-400 whitespace-nowrap">
                      Sitzplan öffnen →
                    </span>
                  </button>
                );
              })}

              {/* Seat cost indicator */}
              {seatHasSelections && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800/50 px-4 py-3"
                >
                  <p className="text-sm text-pink-700 dark:text-pink-300 font-medium">
                    💺 Sitzplätze gewählt ·{' '}
                    {formatCurrency(seatTotalCost, seatCurrency || currency)}
                  </p>
                </motion.div>
              )}

              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Kein Sitzplatz? Beim Check-in kostenlos wählen.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ======== 🧳 Zusatzleistungen — 4 Categories ======== */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {pricingLoading ? (
            <div className="space-y-4">
              <SkeletonCard lines={3} />
              <SkeletonCard lines={2} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Section header */}
              <div className="flex items-center gap-3 px-1">
                <Luggage className="h-5 w-5 text-pink-500" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Zusatzleistungen
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Gepäck, Verpflegung, Lounge & Extras
                  </p>
                </div>
              </div>

              {/* Category cards */}
              {amenityCategories.map((cat) => (
                <CategorySection key={cat.key} category={cat} />
              ))}

              {/* Extra Baggage Counter (purchasable bags) */}
              {hasBagOptions && (
                <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                    <span className="text-lg">🧳</span>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                        Zusatzgepäck buchen
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Inkl: {includedBaggage} pro Person
                      </p>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    {travelers
                      .filter((t) => t.type !== 'INFANT')
                      .map((t, idx) => {
                        const tName =
                          t.firstName && t.lastName
                            ? `${t.firstName} ${t.lastName}`
                            : `${getTravelerTypeLabel(t.type)} ${idx + 1}`;
                        return (
                          <BaggageCounter
                            key={t.id}
                            travelerName={tName}
                            travelerId={t.id}
                            bagOptions={bagOptions}
                            selected={bagSelections[t.id] || {}}
                            onChange={handleBagChange}
                          />
                        );
                      })}
                  </div>
                </div>
              )}

              {/* No amenities at all? Show a minimal message */}
              {amenityCategories.length === 0 && !hasBagOptions && (
                <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-5">
                  <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                    <span>✅</span>
                    <span>Inkl: {includedBaggage} pro Person</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Keine zusätzlichen Leistungen verfügbar für diesen Tarif.
                  </p>
                </div>
              )}

              {/* Info note */}
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <Info className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Verfügbare Zusatzleistungen hängen von der Airline und dem Tarif ab.
                  Nicht alle Leistungen können online gebucht werden.
                </p>
              </div>
            </div>
          )}
        </motion.section>

        {/* ======== 📋 Tarifbedingungen ======== */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {pricingLoading ? (
            <SkeletonCard lines={1} />
          ) : (
            <FareRulesAccordion fareRules={fareRules} />
          )}
        </motion.section>

        {/* ======== Preisübersicht ======== */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <PriceSummary
            basePrice={basePrice}
            seatCost={seatTotalCost}
            bagCost={bagTotalCost}
            serviceCost={serviceTotalCost}
            currency={currency}
            taxes={taxes}
          />
        </motion.section>

        {/* ======== Weiter zur Zahlung ======== */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <button
            type="button"
            onClick={handleContinue}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white h-14 rounded-xl text-base font-semibold shadow-lg shadow-pink-500/20 transition-all flex items-center justify-center gap-2"
          >
            Weiter zur Zahlung →
            <span className="opacity-75">
              ({formatCurrency(totalPrice, currency)})
            </span>
          </button>

          {/* Trust badges — 2×2 grid on mobile */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-3 sm:gap-4 py-4 pb-[env(safe-area-inset-bottom,0px)]">
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="text-emerald-600">🔒</span>
              <span>SSL-verschlüsselt</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="text-emerald-600">✈️</span>
              <span>IATA-zertifiziert</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="text-emerald-600">💳</span>
              <span>Sichere Zahlung</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="text-emerald-600">🇨🇭</span>
              <span>Schweizer Firma</span>
            </div>
          </div>
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

// ============================================================================
// Service Label Map
// ============================================================================

const SERVICE_LABELS: Record<string, string> = {
  PRIORITY_BOARDING: 'Priority Boarding',
  AIRPORT_CHECKIN: 'Airport Check-in',
  LOUNGE_ACCESS: 'Lounge-Zugang',
  FAST_TRACK: 'Fast Track Security',
  MEAL: 'Mahlzeit',
  WIFI: 'WLAN an Bord',
};
