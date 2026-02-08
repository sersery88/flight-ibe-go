'use client';

import React from 'react';
import type { AircraftCabinAmenities, CabinCode } from '@/types/seatmap';
import { CABIN_LABELS } from '@/types/seatmap';
import { CabinAmenityBar } from './cabin-amenity-bar';

// ============================================================================
// Types
// ============================================================================

export interface CabinHeaderProps {
  cabin: string;
  amenities?: AircraftCabinAmenities;
}

// ============================================================================
// CabinHeader Component
// ============================================================================

export function CabinHeader({ cabin, amenities }: CabinHeaderProps) {
  const label = CABIN_LABELS[cabin as CabinCode] ?? cabin;

  return (
    <div className="px-1 py-2 border-b border-border">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      <CabinAmenityBar amenities={amenities} cabinLabel={label} />
    </div>
  );
}
