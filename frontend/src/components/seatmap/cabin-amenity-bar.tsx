'use client';

import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { AircraftCabinAmenities } from '@/types/seatmap';

// ============================================================================
// Amenity Mapping
// ============================================================================

interface AmenityPill {
  icon: string;
  label: string;
  /** 'included' = green, 'paid' = gray, 'info' = default */
  variant: 'included' | 'paid' | 'info';
}

function buildAmenityPills(amenities: AircraftCabinAmenities): AmenityPill[] {
  const pills: AmenityPill[] = [];

  // --- Seat: Legspace ---
  if (amenities.seat?.legSpace) {
    const unit = amenities.seat.spaceUnit === 'CENTIMETERS' ? 'cm' : 'Zoll';
    pills.push({
      icon: '🦵',
      label: `${amenities.seat.legSpace} ${unit} Beinfreiheit`,
      variant: 'info',
    });
  }

  // --- Seat: Tilt ---
  if (amenities.seat?.seatTilt) {
    const tiltMap: Record<string, string> = {
      FULL_FLAT: 'Lie-Flat',
      ANGLE_FLAT: 'Angled Flat',
      NORMAL: 'Standard',
    };
    pills.push({
      icon: '📐',
      label: tiltMap[amenities.seat.seatTilt] ?? amenities.seat.seatTilt,
      variant: 'info',
    });
  }

  // --- Power ---
  if (amenities.power) {
    const p = amenities.power;
    let label = 'Strom';

    // Check USB type first for more specific label
    if (p.usbType) {
      const usbMap: Record<string, string> = {
        USB_A: 'USB-A',
        USB_C: 'USB-C',
        USB_A_AND_USB_C: 'USB-A & C',
      };
      label = usbMap[p.usbType] ?? 'USB';
    } else if (p.powerType) {
      const powerMap: Record<string, string> = {
        USB_PORT: 'USB-A',
        PLUG: 'Steckdose',
        PLUG_OR_USB_PORT: 'Steckdose & USB',
        ADAPTOR: 'Adapter',
      };
      label = powerMap[p.powerType] ?? 'Strom';
    }

    pills.push({
      icon: '🔌',
      label,
      variant: p.isChargeable ? 'paid' : 'included',
    });
  }

  // --- WiFi ---
  if (amenities.wifi && amenities.wifi.wifiCoverage && amenities.wifi.wifiCoverage !== 'NONE') {
    const coverageMap: Record<string, string> = {
      FULL: 'WiFi',
      PARTIAL: 'WiFi (teilweise)',
    };
    const base = coverageMap[amenities.wifi.wifiCoverage] ?? 'WiFi';
    const suffix = amenities.wifi.isChargeable ? ' (kostenpfl.)' : ' (inkl.)';
    pills.push({
      icon: '📶',
      label: base + suffix,
      variant: amenities.wifi.isChargeable ? 'paid' : 'included',
    });
  }

  // --- Entertainment ---
  if (amenities.entertainment) {
    const ent = amenities.entertainment;
    const entMap: Record<string, [string, string]> = {
      LIVE_TV: ['📺', 'Live TV'],
      MOVIES: ['📺', 'Filme'],
      AUDIO_VIDEO_ON_DEMAND: ['📺', 'On-Demand'],
      TV_SHOWS: ['📺', 'TV Shows'],
      IP_TV: ['📺', 'IP TV'],
      MOVIE: ['📺', 'Filme'],
      AUDIO: ['🎵', 'Audio'],
      GAMES: ['🎮', 'Spiele'],
      WIFI_ENTERTAINMENT: ['📺', 'WiFi Entertainment'],
    };
    const entType = ent.entertainmentType ?? '';
    const [icon, label] = entMap[entType] ?? ['📺', entType || 'Entertainment'];
    pills.push({
      icon,
      label,
      variant: ent.isChargeable ? 'paid' : 'included',
    });
  }

  // --- Food ---
  if (amenities.food) {
    const foodMap: Record<string, string> = {
      MEAL: 'Mahlzeit',
      FRESH_MEAL: 'Frische Mahlzeit',
      SNACK: 'Snack',
      FRESH_SNACK: 'Frischer Snack',
    };
    const label = foodMap[amenities.food.foodType ?? ''] ?? 'Verpflegung';
    const suffix = amenities.food.isChargeable ? ' (kostenpfl.)' : ' inkl.';
    pills.push({
      icon: '🍽️',
      label: label + suffix,
      variant: amenities.food.isChargeable ? 'paid' : 'included',
    });
  }

  // --- Beverage ---
  if (amenities.beverage) {
    const bevMap: Record<string, string> = {
      ALCOHOLIC_AND_NON_ALCOHOLIC: 'Getränke (auch Alkohol)',
      NON_ALCOHOLIC: 'Getränke',
      ALCOHOLIC: 'Alkohol. Getränke',
    };
    const label = bevMap[amenities.beverage.beverageType ?? ''] ?? 'Getränke';
    const suffix = amenities.beverage.isChargeable ? ' (kostenpfl.)' : ' inkl.';
    pills.push({
      icon: '🍸',
      label: label + suffix,
      variant: amenities.beverage.isChargeable ? 'paid' : 'included',
    });
  }

  return pills;
}

// ============================================================================
// Pill variant styles
// ============================================================================

const VARIANT_STYLES: Record<AmenityPill['variant'], string> = {
  included: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  paid: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
};

// ============================================================================
// Seat Media Overlay
// ============================================================================

function SeatMediaOverlay({
  media,
  onClose,
}: {
  media: { title?: string; href: string };
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-lg w-full bg-background rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {media.title && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">{media.title}</p>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.href}
          alt={media.title ?? 'Sitzplatz'}
          className="w-full max-h-[60vh] object-contain"
        />
        <div className="px-4 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            Schließen
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// CabinAmenityBar Component
// ============================================================================

export interface CabinAmenityBarProps {
  amenities?: AircraftCabinAmenities;
}

export function CabinAmenityBar({ amenities }: CabinAmenityBarProps) {
  const [mediaOverlay, setMediaOverlay] = useState<{ title?: string; href: string } | null>(null);

  const handleMediaClick = useCallback((href: string, title?: string) => {
    setMediaOverlay({ href, title });
  }, []);

  if (!amenities) return null;

  const pills = buildAmenityPills(amenities);
  if (pills.length === 0) return null;

  // Check for seat media
  const seatMedias = amenities.seat?.medias;
  const hasMedia = seatMedias && seatMedias.length > 0 && seatMedias[0].href;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
        {pills.map((pill, i) => (
          <span
            key={i}
            className={[
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
              VARIANT_STYLES[pill.variant],
            ].join(' ')}
          >
            <span className="text-xs">{pill.icon}</span>
            <span>{pill.label}</span>
          </span>
        ))}

        {/* Seat Media Button */}
        {hasMedia && (
          <button
            type="button"
            onClick={() => handleMediaClick(seatMedias![0].href!, seatMedias![0].title)}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-colors cursor-pointer"
          >
            <span className="text-xs">📷</span>
            <span>Sitz ansehen</span>
          </button>
        )}
      </div>

      {/* Media Overlay */}
      <AnimatePresence>
        {mediaOverlay && (
          <SeatMediaOverlay
            media={mediaOverlay}
            onClose={() => setMediaOverlay(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
