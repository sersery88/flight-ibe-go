'use client';

import { useEffect } from 'react';

export default function BookingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Booking page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 p-8 text-center max-w-md mx-auto">
        <h2 className="text-xl font-bold text-red-600 mb-2">Fehler beim Laden</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-mono break-all">
          {error.message}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6 font-mono break-all">
          {error.stack?.split('\n').slice(0, 3).join('\n')}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-pink-500 text-white rounded-xl text-sm font-semibold"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
