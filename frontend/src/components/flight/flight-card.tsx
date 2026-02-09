'use client';

import { useState, useMemo, memo, useCallback } from 'react';
import { Plane, Clock, Luggage, ChevronRight, ChevronDown, ChevronUp, Check, X, Loader2, Leaf, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { cn, formatCurrency, formatDuration, formatDateTime, getStopsLabel } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useUpsellOffers } from '@/hooks/use-upsell-offers';
import { formatBrandedFareName, translateAmenity, inferFareFeatures, type FareFeatureStatus } from '@/lib/amenities';
import { formatAircraftType } from '@/lib/aircraft';
import { formatAirlineName } from '@/lib/airlines';
import { formatAirportName } from '@/lib/airports';
import type { FlightOffer, Segment } from '@/types/flight';
import { useSearchStore } from '@/stores/search-store';

// ============================================================================
// Baggage Display — Smart Logic
// ============================================================================

/**
 * Formats baggage info smartly:
 * - If weight is given (piece concept): show just "23kg" or "2× 32kg"
 * - If only quantity, infer from cabin class:
 *   ECONOMY: 1pc = 1× 23kg, 2pc = 2× 23kg
 *   PREMIUM_ECONOMY: 2pc = 2× 23kg
 *   BUSINESS: 2pc = 2× 32kg
 *   FIRST: 3pc = 3× 32kg
 * - Returns null if no baggage
 */
function formatBaggage(
  bags: { weight?: number; weightUnit?: string; quantity?: number } | undefined,
  cabin?: string
): { label: string; pieces: number; weightPerPiece: number } | null {
  if (!bags) return null;

  // Piece concept: weight is given directly
  if (bags.weight && bags.weight > 0) {
    // Single piece with weight → just show weight
    const qty = bags.quantity || 1;
    if (qty === 1) return { label: `${bags.weight}kg`, pieces: 1, weightPerPiece: bags.weight };
    return { label: `${qty}× ${bags.weight}kg`, pieces: qty, weightPerPiece: bags.weight };
  }

  // Only quantity given → infer weight from cabin
  if (bags.quantity && bags.quantity > 0) {
    const c = (cabin || 'ECONOMY').toUpperCase();
    let weightPerPiece = 23;
    let defaultQty = bags.quantity;

    if (c.includes('FIRST')) {
      weightPerPiece = 32;
      if (!bags.quantity) defaultQty = 3;
    } else if (c.includes('BUSINESS')) {
      weightPerPiece = 32;
      if (!bags.quantity) defaultQty = 2;
    } else if (c.includes('PREMIUM')) {
      weightPerPiece = 23;
      if (!bags.quantity) defaultQty = 2;
    } else {
      weightPerPiece = 23;
    }

    const qty = defaultQty;
    if (qty === 1) return { label: `${weightPerPiece}kg`, pieces: 1, weightPerPiece };
    return { label: `${qty}× ${weightPerPiece}kg`, pieces: qty, weightPerPiece };
  }

  return null;
}

// ============================================================================
// Airline Logo — coloured circle fallback with IATA code
// ============================================================================

interface AirlineLogoProps {
  carrierCode: string;
  size?: number;
  className?: string;
  showTooltip?: boolean;
}

// Deterministic colour from carrier code
function carrierColor(code: string): string {
  const colours = [
    '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981',
    '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#f97316',
  ];
  const idx = (code.charCodeAt(0) * 31 + (code.charCodeAt(1) || 0)) % colours.length;
  return colours[idx];
}

function AirlineLogo({ carrierCode, size = 32, className, showTooltip = true }: AirlineLogoProps) {
  const [hasError, setHasError] = useState(false);
  const airlineName = formatAirlineName(carrierCode);

  const logoElement = hasError ? (
    <div
      className={cn(
        'flex items-center justify-center rounded-full text-white font-bold',
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: carrierColor(carrierCode),
        fontSize: Math.max(size * 0.35, 9),
      }}
    >
      {carrierCode}
    </div>
  ) : (
    <img
      src={`https://pics.avs.io/al_square/${size}/${size}/${carrierCode}@2x.webp`}
      alt={airlineName}
      width={size}
      height={size}
      className={cn('rounded-full object-contain', className)}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );

  if (!showTooltip) return logoElement;

  return (
    <Tooltip>
      <TooltipTrigger>
        <span className="cursor-help">{logoElement}</span>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>{airlineName}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Stops Indicator — visual dots
// ============================================================================

function StopsIndicator({ stops, hasAirportChange }: { stops: number; hasAirportChange: boolean }) {
  if (stops === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-400 sm:text-xs">
        Direkt
      </span>
    );
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-semibold sm:text-xs',
      hasAirportChange ? 'text-orange-500' : 'text-muted-foreground'
    )}>
      {hasAirportChange && <AlertTriangle className="h-3 w-3" />}
      {getStopsLabel(stops)}
    </span>
  );
}

// ============================================================================
// Flight Card Component
// ============================================================================

interface FlightCardProps {
  offer: FlightOffer;
  onSelect: (offer: FlightOffer) => void;
  isSelected?: boolean;
  className?: string;
}

export const FlightCard = memo(function FlightCard({ offer, onSelect, isSelected, className }: FlightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFareSelection, setShowFareSelection] = useState(false);
  const [selectedFareOffer, setSelectedFareOffer] = useState<FlightOffer>(offer);
  const [showAllFares, setShowAllFares] = useState(false);

  const { travelClass: searchedCabinClass } = useSearchStore();

  const {
    isLoading: isLoadingUpsell,
    hasFailed: upsellFailed,
    hasMultipleFares,
    allFareOptions: allFareOptionsRaw
  } = useUpsellOffers(offer, { enabled: showFareSelection });

  // Filter fare options by the searched cabin class
  const { filteredFareOptions, allFareOptions, hasHiddenFares } = useMemo(() => {
    const filtered = allFareOptionsRaw.filter((fareOffer) => {
      const cabin = fareOffer.travelerPricings[0]?.fareDetailsBySegment?.[0]?.cabin;
      return cabin === searchedCabinClass;
    });
    return {
      filteredFareOptions: filtered.length > 0 ? filtered : allFareOptionsRaw,
      allFareOptions: allFareOptionsRaw,
      hasHiddenFares: filtered.length > 0 && filtered.length < allFareOptionsRaw.length,
    };
  }, [allFareOptionsRaw, searchedCabinClass]);

  const displayedFareOptions = showAllFares ? allFareOptions : filteredFareOptions;

  const outbound = offer.itineraries[0];
  const returnFlight = offer.itineraries[1];

  const formattedDepartureDate = useMemo(() =>
    new Date(outbound.segments[0]?.departure.at).toLocaleDateString('de-DE', {
      weekday: 'short', day: 'numeric', month: 'short'
    }), [outbound.segments]);

  const totalJourneyCo2 = useMemo(() => {
    const all = [...outbound.segments, ...(returnFlight?.segments || [])];
    return all.reduce((sum, seg) =>
      sum + (seg.co2Emissions?.reduce((s, e) => s + e.weight, 0) || 0), 0
    );
  }, [outbound.segments, returnFlight?.segments]);

  const outboundSegmentCount = outbound.segments.length;

  const selectedTravelerPricing = selectedFareOffer.travelerPricings[0];
  const selectedFareDetail = selectedTravelerPricing?.fareDetailsBySegment?.[0];
  const brandedFareName = selectedFareDetail?.brandedFareLabel || selectedFareDetail?.brandedFare;
  const cabinClass = selectedFareDetail?.cabin || 'ECONOMY';

  // Price calculations
  const { pricePerPerson, totalPrice, currency, passengerCount } = useMemo(() => {
    const adultPricing = selectedFareOffer.travelerPricings.find(tp => tp.travelerType === 'ADULT');
    const pp = adultPricing?.price?.total
      ? parseFloat(adultPricing.price.total)
      : parseFloat(selectedFareOffer.price.total) / selectedFareOffer.travelerPricings.length;
    return {
      pricePerPerson: pp,
      totalPrice: parseFloat(selectedFareOffer.price.total),
      currency: selectedFareOffer.price.currency,
      passengerCount: selectedFareOffer.travelerPricings.length,
    };
  }, [selectedFareOffer]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('[data-fare-tile]') ||
      (e.target as HTMLElement).closest('[data-fare-section]') ||
      (e.target as HTMLElement).closest('[data-footer-section]')
    ) return;
    setIsExpanded(prev => !prev);
  }, []);

  const handleSelectFare = useCallback((fareOffer: FlightOffer) => {
    setSelectedFareOffer(fareOffer);
  }, []);

  const handleConfirmSelection = useCallback(() => {
    onSelect(selectedFareOffer);
  }, [onSelect, selectedFareOffer]);

  const handleOpenFareSelection = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFareSelection(prev => !prev);
  }, []);

  return (
    <div className="w-full">
      <motion.div
        layout
        className={cn(
          'group w-full cursor-pointer rounded-2xl border bg-card shadow-sm transition-all',
          'hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700',
          isSelected && 'ring-2 ring-pink-500 border-pink-300',
          isExpanded && 'ring-1 ring-gray-300 dark:ring-gray-700 shadow-lg',
          className
        )}
        onClick={handleCardClick}
      >
        <div className="p-3 sm:p-4">
          {/* === COMPACT FLIGHT ROW: Outbound === */}
          <CompactFlightRow
            segments={outbound.segments}
            duration={outbound.duration}
            label="Hin"
            fareDetails={selectedTravelerPricing?.fareDetailsBySegment?.slice(0, outboundSegmentCount)}
          />

          {/* === Return Flight === */}
          {returnFlight && (
            <>
              <div className="my-2.5 border-t border-dashed border-border/60" />
              <CompactFlightRow
                segments={returnFlight.segments}
                duration={returnFlight.duration}
                label="Rück"
                fareDetails={selectedTravelerPricing?.fareDetailsBySegment?.slice(outboundSegmentCount)}
              />
            </>
          )}

          {/* === EXPANDED DETAILS === */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-4 rounded-xl bg-muted/40 p-3 sm:p-4 border border-border/30">
                  {/* Outbound Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Plane className="h-3.5 w-3.5" />
                      Hinflug · {formattedDepartureDate}
                    </div>
                    <FlightDetailsSection
                      segments={outbound.segments}
                      fareDetails={selectedTravelerPricing?.fareDetailsBySegment?.slice(0, outboundSegmentCount)}
                    />
                  </div>

                  {/* Return Details */}
                  {returnFlight && (
                    <div className="space-y-3 border-t border-border/30 pt-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <Plane className="h-3.5 w-3.5 rotate-180" />
                        Rückflug · {new Date(returnFlight.segments[0].departure.at).toLocaleDateString('de-DE', {
                          weekday: 'short', day: 'numeric', month: 'short'
                        })}
                      </div>
                      <FlightDetailsSection
                        segments={returnFlight.segments}
                        fareDetails={selectedTravelerPricing?.fareDetailsBySegment?.slice(outboundSegmentCount)}
                      />
                    </div>
                  )}

                  {/* CO2 */}
                  {totalJourneyCo2 > 0 && (
                    <div className="flex items-center gap-2 border-t border-border/30 pt-3">
                      <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 text-[10px]">
                        <Leaf className="mr-1 h-3 w-3" />
                        Gesamt {totalJourneyCo2.toFixed(0)} kg CO₂
                      </Badge>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* === FOOTER: Fare + Price + CTA === */}
          <div
            data-footer-section
            className="mt-3 flex flex-col gap-2 border-t border-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between"
          >
            {/* Left: Fare info & Tarife toggle */}
            <button
              onClick={handleOpenFareSelection}
              className="flex flex-wrap items-center gap-1.5 text-left hover:opacity-80 transition-opacity"
            >
              {/* Cabin badge — always visible */}
              <Badge variant="outline" className="text-[10px] sm:text-xs font-semibold">
                {getCabinLabel(cabinClass)}
              </Badge>
              {/* Branded fare name — if different from cabin */}
              {brandedFareName && (
                <Badge variant="secondary" className="text-[10px] font-medium sm:text-xs bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                  {formatBrandedFareName(brandedFareName)}
                </Badge>
              )}
{/* Baggage removed from footer per Chef request */}
              {totalJourneyCo2 > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 sm:text-xs">
                  <Leaf className="h-3 w-3" />
                  {totalJourneyCo2.toFixed(0)} kg
                </span>
              )}
              {!upsellFailed && (
                <span className="flex items-center gap-0.5 text-[10px] text-gray-500 font-medium sm:text-xs">
                  Tarife
                  {showFareSelection ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </span>
              )}
            </button>

            {/* Right: Price + Select Button */}
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <div className="text-right">
                <div className="text-lg font-bold sm:text-xl text-gray-900 dark:text-gray-100">
                  {formatCurrency(pricePerPerson, currency)}
                </div>
                <div className="text-[10px] text-muted-foreground sm:text-xs">
                  p.P.{passengerCount > 1 && ` · Gesamt ${formatCurrency(totalPrice, currency)}`}
                </div>
              </div>
              <Button
                size="sm"
                className="shrink-0 gap-1 rounded-xl bg-pink-500 hover:bg-pink-600 text-white shadow-md shadow-pink-500/20 h-10 px-5 text-sm font-semibold"
                onClick={(e) => { e.stopPropagation(); handleConfirmSelection(); }}
              >
                <span className="hidden sm:inline">Auswählen</span>
                <span className="sm:hidden">Wählen</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* === FARE SELECTION === */}
          <AnimatePresence>
            {showFareSelection && (
              <motion.div
                data-fare-section
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-3 border-t border-border/50 pt-3">
                  <h4 className="mb-2.5 text-xs font-bold sm:text-sm">Tarif wählen</h4>

                  {isLoadingUpsell ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      <span className="ml-2 text-xs text-muted-foreground">Tarife werden geladen...</span>
                    </div>
                  ) : hasMultipleFares ? (
                    <>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {displayedFareOptions.map((fareOffer) => (
                          <FareTile
                            key={fareOffer.id}
                            offer={fareOffer}
                            isSelected={selectedFareOffer.id === fareOffer.id}
                            onSelect={() => handleSelectFare(fareOffer)}
                          />
                        ))}
                      </div>
                      {hasHiddenFares && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowAllFares(prev => !prev); }}
                          className="mt-2 flex items-center gap-1 text-[11px] font-medium text-pink-500 hover:text-pink-600 transition-colors"
                        >
                          {showAllFares ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              Nur {getCabinLabel(searchedCabinClass)}-Tarife anzeigen
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              Alle Kabinen anzeigen (Upgrade-Optionen)
                            </>
                          )}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="py-2 text-xs text-muted-foreground">
                      Keine weiteren Tarife verfügbar.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
});

// ============================================================================
// Compact Flight Row — the main scannable row
// ============================================================================

interface FareDetailsBySegment {
  segmentId: string;
  cabin?: string;
  fareBasis?: string;
  brandedFare?: string;
  brandedFareLabel?: string;
  class?: string;
  includedCheckedBags?: {
    weight?: number;
    weightUnit?: string;
    quantity?: number;
  };
}

interface CompactFlightRowProps {
  segments: Segment[];
  duration: string;
  label?: string;
  fareDetails?: FareDetailsBySegment[];
}

const CompactFlightRow = memo(function CompactFlightRow({ segments, duration, label, fareDetails }: CompactFlightRowProps) {
  const first = segments[0];
  const last = segments[segments.length - 1];
  const stops = segments.length - 1;

  const firstFareDetail = fareDetails?.[0];
  const checkedBags = firstFareDetail?.includedCheckedBags;

  const stopInfo = segments.slice(0, -1).map((seg, idx) => {
    const nextSeg = segments[idx + 1];
    const layoverMs = new Date(nextSeg.departure.at).getTime() - new Date(seg.arrival.at).getTime();
    const hours = Math.floor(layoverMs / (1000 * 60 * 60));
    const minutes = Math.floor((layoverMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      airport: seg.arrival.iataCode,
      nextAirport: nextSeg.departure.iataCode,
      layover: `${hours}h ${minutes}m`,
      hasAirportChange: seg.arrival.iataCode !== nextSeg.departure.iataCode,
    };
  });

  const hasAnyAirportChange = stopInfo.some(s => s.hasAirportChange);

  const departureDate = new Date(first.departure.at);
  const arrivalDate = new Date(last.arrival.at);
  const isDifferentDay = departureDate.toDateString() !== arrivalDate.toDateString();

  // Unique carriers
  const carriers = [...new Set(segments.map(s => s.carrierCode))];

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Airline Logos — stacked if multiple */}
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        {carriers.slice(0, 2).map((code) => (
          <AirlineLogo key={code} carrierCode={code} size={28} showTooltip={true} />
        ))}
        {carriers.length > 2 && (
          <span className="text-[8px] text-muted-foreground">+{carriers.length - 2}</span>
        )}
      </div>

      {/* Times & Route */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {/* Departure */}
        <div className="shrink-0 w-[52px] sm:w-[60px]">
          <div className="text-base font-bold sm:text-lg leading-tight">
            {formatDateTime(first.departure.at, 'time')}
          </div>
          <div className="text-[10px] text-muted-foreground sm:text-xs">{first.departure.iataCode}</div>
        </div>

        {/* Flight Path Visualization — neutral gray */}
        <div className="flex min-w-0 flex-1 flex-col items-center">
          {/* Duration */}
          <div className="mb-1 text-[10px] text-muted-foreground sm:text-xs">
            {formatDuration(duration)}
          </div>

          {/* Line with dots — gray, not pink */}
          <div className="flex w-full items-center">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
            <div className="relative h-[2px] min-w-0 flex-1 bg-gradient-to-r from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700">
              {/* Stop dots */}
              {stops > 0 && Array.from({ length: Math.min(stops, 3) }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full border-2 border-card',
                    hasAnyAirportChange ? 'bg-orange-400' : 'bg-gray-400'
                  )}
                  style={{ left: `${((i + 1) / (stops + 1)) * 100}%`, transform: 'translate(-50%, -50%)' }}
                />
              ))}
            </div>
            <Plane className="h-3.5 w-3.5 shrink-0 -rotate-45 text-gray-400" />
          </div>

          {/* Stops label + layover info */}
          <div className="mt-1 flex items-center gap-1 text-[9px] sm:text-[10px]">
            <StopsIndicator stops={stops} hasAirportChange={hasAnyAirportChange} />
            {stops > 0 && (
              <span className={cn(
                'truncate text-muted-foreground',
                hasAnyAirportChange && 'text-orange-500'
              )}>
                · {stopInfo.map(s =>
                  s.hasAirportChange ? `${s.airport}→${s.nextAirport}` : s.airport
                ).join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Arrival */}
        <div className="shrink-0 w-[52px] sm:w-[60px]">
          <div className="flex items-baseline gap-0.5 leading-tight">
            <span className="text-base font-bold sm:text-lg">
              {formatDateTime(last.arrival.at, 'time')}
            </span>
            {isDifferentDay && (
              <span className="text-[9px] font-bold text-orange-500">+1</span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground sm:text-xs">{last.arrival.iataCode}</div>
        </div>
      </div>

      {/* Class + Baggage badges — visible on all screens */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        {firstFareDetail?.class && (
          <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 whitespace-nowrap font-mono">
            {firstFareDetail.class}
          </Badge>
        )}
        {(() => {
          const bag = formatBaggage(checkedBags, firstFareDetail?.cabin);
          return bag ? (
            <Badge variant="secondary" className="gap-0.5 text-[9px] px-1.5 py-0 whitespace-nowrap">
              <Luggage className="h-2.5 w-2.5" />
              {bag.label}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-0.5 text-[9px] px-1.5 py-0 text-muted-foreground whitespace-nowrap">
              <X className="h-2.5 w-2.5" />
              0kg
            </Badge>
          );
        })()}
      </div>
    </div>
  );
});

// ============================================================================
// Fare Tile
// ============================================================================

interface FareTileProps {
  offer: FlightOffer;
  isSelected: boolean;
  onSelect: () => void;
}

const FareTile = memo(function FareTile({ offer, isSelected, onSelect }: FareTileProps) {
  const fareDetails = offer.travelerPricings[0]?.fareDetailsBySegment[0];
  const brandedFare = fareDetails?.brandedFareLabel || fareDetails?.brandedFare;
  const cabin = fareDetails?.cabin || 'ECONOMY';
  const checkedBags = fareDetails?.includedCheckedBags;
  const amenities = fareDetails?.amenities || [];

  const getAmenityStatus = (keywords: string[]): { available: boolean; chargeable: boolean } => {
    const amenity = amenities.find((a) =>
      keywords.some((kw) => a.description?.toUpperCase().includes(kw.toUpperCase()))
    );
    if (!amenity) return { available: false, chargeable: false };
    return { available: true, chargeable: amenity.isChargeable };
  };

  const baggageInfo = formatBaggage(checkedBags, cabin);
  const hasBaggage = !!baggageInfo;
  
  // Use real amenities if available, otherwise infer from fare name
  const hasRealAmenities = amenities.length > 0;
  const inferred = !hasRealAmenities ? inferFareFeatures(brandedFare || '') : null;
  
  // Convert amenity lookup to FareFeatureStatus
  const toFeatureStatus = (lookup: { available: boolean; chargeable: boolean }): FareFeatureStatus => {
    if (!lookup.available) return 'not-available';
    return lookup.chargeable ? 'chargeable' : 'included';
  };
  
  const seatFeature: FareFeatureStatus = hasRealAmenities 
    ? toFeatureStatus(getAmenityStatus(['SEAT', 'PRE RESERVED']))
    : inferred!.seatSelection;
  const changeFeature: FareFeatureStatus = hasRealAmenities
    ? toFeatureStatus(getAmenityStatus(['CHANGEABLE', 'CHANGE', 'REBOOKING', 'REBOOK']))
    : inferred!.changeable;
  const refundFeature: FareFeatureStatus = hasRealAmenities
    ? toFeatureStatus(getAmenityStatus(['REFUNDABLE', 'REFUND', 'CANCELLATION']))
    : inferred!.refundable;

  const getFareName = () => brandedFare ? formatBrandedFareName(brandedFare) : getCabinLabel(cabin);

  const adultPricing = offer.travelerPricings.find(tp => tp.travelerType === 'ADULT');
  const pricePerPerson = adultPricing?.price?.total
    ? parseFloat(adultPricing.price.total)
    : parseFloat(offer.price.total) / offer.travelerPricings.length;

  return (
    <div
      data-fare-tile
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={cn(
        'group relative w-full cursor-pointer rounded-xl border-2 p-3 transition-all duration-200 active:scale-[0.98]',
        isSelected
          ? 'border-pink-500 bg-pink-50/50 dark:bg-pink-950/20 shadow-md shadow-pink-500/10'
          : 'border-border hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-sm'
      )}
    >
      {/* Fare Name + Cabin */}
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold sm:text-sm">{getFareName()}</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">
            {getCabinLabel(cabin)}
          </Badge>
          {fareDetails?.class && (
            <span className="text-[9px] font-mono text-muted-foreground font-bold">{fareDetails.class}</span>
          )}
        </div>
        {isSelected && (
          <div className="flex items-center gap-1 rounded-full bg-pink-500 px-2 py-0.5 text-[9px] font-bold text-white shrink-0">
            <Check className="h-2.5 w-2.5" />
          </div>
        )}
      </div>

      {/* Price */}
      <div className={cn(
        'mb-2 text-base font-bold sm:text-lg',
        isSelected ? 'text-pink-600 dark:text-pink-400' : ''
      )}>
        {formatCurrency(pricePerPerson, offer.price.currency)}
        <span className="ml-1 text-[10px] font-normal text-muted-foreground">p.P.</span>
      </div>

      {/* Features */}
      <div className="space-y-1 text-[10px] sm:text-xs">
        <FeatureItem
          status={hasBaggage ? 'included' : 'not-available'}
          label={hasBaggage ? `${baggageInfo!.label} Gepäck` : 'Kein Gepäck'}
        />
        <FeatureItem
          status={seatFeature}
          label="Sitzplatzwahl"
        />
        <FeatureItem
          status={changeFeature}
          label="Umbuchbar"
        />
        <FeatureItem
          status={refundFeature}
          label="Erstattbar"
        />
      </div>

      {/* Bottom accent */}
      {isSelected && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-pink-500" />
      )}
    </div>
  );
});

// ============================================================================
// Feature Item
// ============================================================================

type FeatureStatus = 'included' | 'chargeable' | 'not-available';

const FeatureItem = memo(function FeatureItem({ status, label }: { status: FeatureStatus; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0">
        {status === 'included' && (
          <Check className="h-3 w-3 text-green-500" />
        )}
        {status === 'chargeable' && (
          <span className="flex h-3 w-3 items-center justify-center text-[8px] font-bold text-amber-500">€</span>
        )}
        {status === 'not-available' && (
          <X className="h-3 w-3 text-muted-foreground/30" />
        )}
      </span>
      <span className={cn(
        'min-w-0 truncate',
        status === 'not-available' && 'text-muted-foreground/50 line-through',
        status === 'chargeable' && 'text-foreground/70',
        status === 'included' && 'text-foreground/90 font-medium'
      )}>
        {label}
      </span>
      {status === 'chargeable' && (
        <span className="shrink-0 rounded bg-amber-100 px-1 py-px text-[8px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Gebühr
        </span>
      )}
    </div>
  );
});

// ============================================================================
// Flight Details Section — Timeline view for expanded state
// ============================================================================

interface FlightDetailsSectionProps {
  segments: Segment[];
  fareDetails?: FareDetailsBySegment[];
}

const FlightDetailsSection = memo(function FlightDetailsSection({ segments, fareDetails }: FlightDetailsSectionProps) {
  return (
    <div className="space-y-3">
      {segments.map((seg, idx) => (
        <div key={seg.id} className="relative">
          {/* Segment Header */}
          <div className="flex items-start gap-2 mb-1.5">
            <AirlineLogo carrierCode={seg.carrierCode} size={24} showTooltip={false} />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium leading-tight truncate">
                {formatAirlineName(seg.carrierCode)} · {seg.carrierCode}{seg.number}
              </span>
              <span className="text-[10px] text-muted-foreground sm:text-xs">
                {formatAircraftType(seg.aircraft.code) || seg.aircraft.code}
                {fareDetails?.[idx] && (
                  <> · {getCabinLabel(fareDetails[idx].cabin || 'ECONOMY')} ({fareDetails[idx].class})</>
                )}
                {' · '}{formatDuration(seg.duration)}
                {seg.co2Emissions?.[0] && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {' · '}{seg.co2Emissions[0].weight} {seg.co2Emissions[0].weightUnit} CO₂
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Timeline — gray instead of pink */}
          <div className="relative ml-3 border-l-2 border-gray-200 dark:border-gray-700 pl-5 py-0.5 space-y-2.5">
            {/* Departure */}
            <div className="relative">
              <div className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-gray-500" />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-semibold">{formatDateTime(seg.departure.at, 'time')}</span>
                <span className="text-sm font-bold">{seg.departure.iataCode}</span>
                <span className="text-xs text-muted-foreground">{formatAirportName(seg.departure.iataCode, 'full')}</span>
                {seg.departure.terminal && (
                  <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">T{seg.departure.terminal}</span>
                )}
              </div>
            </div>

            {/* Arrival */}
            <div className="relative">
              <div className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-gray-400" />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-semibold">{formatDateTime(seg.arrival.at, 'time')}</span>
                <span className="text-sm font-bold">{seg.arrival.iataCode}</span>
                <span className="text-xs text-muted-foreground">{formatAirportName(seg.arrival.iataCode, 'full')}</span>
                {seg.arrival.terminal && (
                  <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">T{seg.arrival.terminal}</span>
                )}
              </div>
            </div>
          </div>

          {/* Operating info */}
          {seg.operating && seg.operating.carrierCode !== seg.carrierCode && (
            <div className="ml-3 pl-5 mt-0.5 text-[10px] text-muted-foreground italic">
              Durchgeführt von {formatAirlineName(seg.operating.carrierCode)}
            </div>
          )}

          {/* Connection / Layover */}
          {idx < segments.length - 1 && (() => {
            const nextSeg = segments[idx + 1];
            const hasAirportChange = seg.arrival.iataCode !== nextSeg.departure.iataCode;
            const layoverMs = new Date(nextSeg.departure.at).getTime() - new Date(seg.arrival.at).getTime();
            const hours = Math.floor(layoverMs / (1000 * 60 * 60));
            const minutes = Math.floor((layoverMs % (1000 * 60 * 60)) / (1000 * 60));

            return (
              <div className="ml-3 border-l-2 border-dashed border-muted-foreground/20 pl-5 py-2 my-1">
                <div className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium',
                  hasAirportChange
                    ? 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {hasAirportChange ? (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Wechsel {formatAirportName(seg.arrival.iataCode)} → {formatAirportName(nextSeg.departure.iataCode)} ({hours}h {minutes}m)
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5" />
                      {hours}h {minutes}m in {formatAirportName(seg.arrival.iataCode)}
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      ))}
    </div>
  );
});

// ============================================================================
// Helpers
// ============================================================================

const getCabinLabel = (cabin: string) => {
  const labels: Record<string, string> = {
    ECONOMY: 'Economy',
    PREMIUM_ECONOMY: 'Premium Economy',
    BUSINESS: 'Business',
    FIRST: 'First',
  };
  return labels[cabin] || cabin;
};
