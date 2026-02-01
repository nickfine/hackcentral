import { useEffect } from 'react';
import { motion, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface AnimatedCounterProps {
  value: string | number;
  className?: string;
}

export function AnimatedCounter({ value, className }: AnimatedCounterProps) {
  const shouldReduceMotion = useReducedMotion();
  const numericValue =
    typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0 : value;
  const isNaNValue = Number.isNaN(numericValue);

  const spring = useSpring(isNaNValue ? 0 : numericValue, {
    mass: 0.8,
    stiffness: 75,
    damping: 15,
  });
  const display = useTransform(spring, (current) =>
    Number.isNaN(current) ? String(value) : Math.round(current).toLocaleString()
  );

  useEffect(() => {
    if (!isNaNValue) {
      spring.set(numericValue);
    }
  }, [numericValue, isNaNValue, spring]);

  if (isNaNValue || typeof value === 'string') {
    return <span className={className}>{String(value)}</span>;
  }

  if (shouldReduceMotion) {
    return (
      <span className={className} aria-live="polite">
        {numericValue.toLocaleString()}
      </span>
    );
  }

  return (
    <motion.span className={className} aria-live="polite">
      {display}
    </motion.span>
  );
}
