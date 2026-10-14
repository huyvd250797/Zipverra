'use client';

import { useEffect, useState } from 'react';

/**
 * Rendered in initial HTML so the brand splash appears before hydration.
 * Wait briefly for the initial session check, but never block the screen indefinitely.
 */
export default function SplashScreen({ loading }) {
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const minimum = window.setTimeout(() => setMinimumElapsed(true), 650);
    const failsafe = window.setTimeout(() => setTimedOut(true), 5500);
    return () => {
      window.clearTimeout(minimum);
      window.clearTimeout(failsafe);
    };
  }, []);

  const hidden = timedOut || (minimumElapsed && !loading);

  return (
    <div className={`app-splash${hidden ? ' app-splash--hidden' : ''}`} role="status" aria-label="Zipverra is loading" aria-hidden={hidden}>
      <div className="app-splash__glow" />
      <div className="app-splash__content">
        <div className="app-splash__logo">
          <img src="/icon.svg" width="84" height="84" alt="" />
        </div>
        <div className="app-splash__name">Zip<span>verra</span></div>
        <p className="app-splash__tagline">Push to GitHub from Mobile</p>
        <div className="app-splash__loader" aria-label="Loading" />
        <p className="app-splash__status">Preparing your workspace...</p>
      </div>
      <div className="app-splash__footer">ZIPVERRA PRO · GITHUB WORKSPACE</div>
    </div>
  );
}
