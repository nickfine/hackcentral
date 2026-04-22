import { useState, useEffect } from 'react';

/**
 * Animate a number from 0 to `target` over `duration` ms using ease-out cubic.
 * Returns the current animated value. Target changes restart the animation.
 *
 * @param {number} target - Final value
 * @param {number} [duration=900] - Animation duration in ms
 * @returns {number}
 */
export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}
