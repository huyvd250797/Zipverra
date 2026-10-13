'use client';

import { useEffect } from 'react';

/** iOS Safari can still accept native pinch gestures in standalone mode. */
export default function MobileViewportGuard() {
  useEffect(() => {
    const preventGesture = (event) => event.preventDefault();
    const preventMultitouchZoom = (event) => {
      if (event.touches && event.touches.length > 1) event.preventDefault();
    };

    document.addEventListener('gesturestart', preventGesture, { passive: false });
    document.addEventListener('gesturechange', preventGesture, { passive: false });
    document.addEventListener('touchmove', preventMultitouchZoom, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('touchmove', preventMultitouchZoom);
    };
  }, []);
  return null;
}
