'use client';

import { useEffect } from 'react';

/**
 * Hook to lock body scroll when a modal/popup is open.
 * Preserves scroll position and restores it when unlocked.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const scrollY = window.scrollY;
    const body = document.body;
    
    // Save original styles
    const originalStyles = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    // Apply lock styles
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      // Restore original styles
      body.style.position = originalStyles.position;
      body.style.top = originalStyles.top;
      body.style.width = originalStyles.width;
      body.style.overflow = originalStyles.overflow;
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}
