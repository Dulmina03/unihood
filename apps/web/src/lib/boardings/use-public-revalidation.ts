'use client';
import { useEffect } from 'react';

// Match the map layer's bounded consent refresh. No geometry is persisted.
export function usePublicRevalidation(active: boolean, refresh: () => void) {
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(refresh, 5000);
    const events = ['focus', 'online', 'offline', 'pageshow'] as const;
    for (const event of events) window.addEventListener(event, refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      for (const event of events) window.removeEventListener(event, refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [active, refresh]);
}
