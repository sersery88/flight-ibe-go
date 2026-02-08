'use client';

import React from 'react';
import type { AircraftCabinAmenities, CabinCode } from '@/types/seatmap';
import { CABIN_LABELS } from '@/types/seatmap';

// ============================================================================
// Types
// ============================================================================

export interface CabinHeaderProps {
  cabin: string;
  amenities?: AircraftCabinAmenities;
}

// ============================================================================
// Amenity badge helpers
// ============================================================================

interface AmenityBadge {
  icon: string;
  label: string;
}

function getAmenityBadges(amenities?: AircraftCabinAmenities): AmenityBadge[] {
  if (!amenities) return [];
  const badges: AmenityBadge[] = [];

  // Legspace
  if (amenities.seat?.legSpace) {
    const unit = amenities.seat.spaceUnit === 'CENTIMETERS' ? 'cm' : '"';
    badges.push({ icon: '🦵', label: `${amenities.seat.legSpace}${unit}` });
  }

  // Seat Tilt
  if (amenities.seat?.seatTilt) {
    const tiltLabels: Record<string, string> = {
      FULL_FLAT: 'Lie-Flat',
      ANGLE_FLAT: 'Angle-Flat',
      NORMAL: 'Standard',
    };
    badges.push({ icon: '💺', label: tiltLabels[amenities.seat.seatTilt] ?? amenities.seat.seatTilt });
  }

  // WiFi
  if (amenities.wifi) {
    const wifiLabels: Record<string, string> = {
      FULL: 'WLAN',
      PARTIAL: 'WLAN (eingeschr.)',
    };
    if (amenities.wifi.wifiCoverage && amenities.wifi.wifiCoverage !== 'NONE') {
      badges.push({
        icon: '📶',
        label: wifiLabels[amenities.wifi.wifiCoverage] ?? 'WLAN',
      });
    }
  }

  // Power
  if (amenities.power) {
    const powerLabels: Record<string, string> = {
      PLUG: 'Steckdose',
      USB_PORT: 'USB',
      ADAPTOR: 'Adapter',
      PLUG_OR_USB_PORT: 'Steckdose/USB',
    };
    badges.push({
      icon: '🔌',
      label: powerLabels[amenities.power.powerType ?? ''] ?? 'Strom',
    });
  }

  // Entertainment
  if (amenities.entertainment) {
    const entLabels: Record<string, string> = {
      LIVE_TV: 'Live TV',
      MOVIES: 'Filme',
      AUDIO_VIDEO_ON_DEMAND: 'On-Demand',
      TV_SHOWS: 'TV Shows',
      IP_TV: 'IP TV',
    };
    badges.push({
      icon: '🎬',
      label: entLabels[amenities.entertainment.entertainmentType ?? ''] ?? 'Entertainment',
    });
  }

  // Food
  if (amenities.food) {
    const foodLabels: Record<string, string> = {
      MEAL: 'Mahlzeit',
      FRESH_MEAL: 'Frische Mahlzeit',
      SNACK: 'Snack',
      FRESH_SNACK: 'Frischer Snack',
    };
    badges.push({
      icon: '🍽️',
      label: foodLabels[amenities.food.foodType ?? ''] ?? 'Verpflegung',
    });
  }

  return badges;
}

// ============================================================================
// CabinHeader Component
// ============================================================================

export function CabinHeader({ cabin, amenities }: CabinHeaderProps) {
  const label = CABIN_LABELS[cabin as CabinCode] ?? cabin;
  const badges = getAmenityBadges(amenities);

  return (
    <div className="flex flex-wrap items-center gap-2 px-1 py-2 border-b border-border">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {badges.map((b, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              <span>{b.icon}</span>
              <span>{b.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
