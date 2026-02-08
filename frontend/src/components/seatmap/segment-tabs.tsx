'use client';

import React from 'react';
import type { SeatmapData } from '@/types/seatmap';

// ============================================================================
// Types
// ============================================================================

export interface SegmentTabsProps {
  segments: SeatmapData[];
  activeSegmentId: string;
  onSegmentChange: (id: string) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function getSegmentLabel(segment: SeatmapData): string {
  const dep = segment.departure?.iataCode ?? '???';
  const arr = segment.arrival?.iataCode ?? '???';
  return `${dep} → ${arr}`;
}

function getSegmentSubtitle(segment: SeatmapData): string {
  const carrier = segment.carrierCode ?? '';
  const number = segment.number ?? '';
  return `${carrier}${number}`;
}

function isCodeshare(segment: SeatmapData): boolean {
  if (!segment.carrierCode) return false;
  // It's a codeshare if operating carrier differs from marketing carrier
  // The 'operating' field is not directly on SeatmapData in our types,
  // but we check the pattern
  return false; // Will be enhanced when operating carrier data is available
}

// ============================================================================
// SegmentTabs Component
// ============================================================================

export function SegmentTabs({ segments, activeSegmentId, onSegmentChange }: SegmentTabsProps) {
  if (segments.length <= 1) return null;

  return (
    <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/60" role="tablist">
      {segments.map((segment) => {
        const id = segment.segmentId ?? segment.flightOfferId ?? '0';
        const isActive = id === activeSegmentId;
        const label = getSegmentLabel(segment);
        const subtitle = getSegmentSubtitle(segment);

        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSegmentChange(id)}
            className={[
              'flex-1 flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-center transition-all',
              isActive
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            ].join(' ')}
          >
            <span className="text-xs sm:text-sm leading-tight">{label}</span>
            <span className={`text-[10px] leading-tight ${isActive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>{subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
