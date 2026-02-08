'use client';

import React from 'react';

// ============================================================================
// NoSeatmapFallback Component
// ============================================================================

export function NoSeatmapFallback() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
      {/* Airplane icon */}
      <div className="text-5xl opacity-30 select-none" aria-hidden="true">
        ✈️
      </div>

      <div className="space-y-2 max-w-sm">
        <h3 className="text-base font-semibold text-foreground">
          Sitzplan nicht verfügbar
        </h3>
        <p className="text-sm text-muted-foreground">
          Für diesen Flug ist aktuell keine Sitzplatzwahl möglich. Sie können
          Ihren Sitzplatz beim Online-Check-in oder am Flughafen auswählen.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-xs text-muted-foreground">
        <span>💡</span>
        <span>Sitzplatz beim Check-in wählen</span>
      </div>
    </div>
  );
}
