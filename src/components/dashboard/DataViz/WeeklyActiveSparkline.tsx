import { motion, useReducedMotion } from 'framer-motion';

interface WeeklyActiveSparklineProps {
  data: number[];
}

export function WeeklyActiveSparkline({ data }: WeeklyActiveSparklineProps) {
  const shouldReduceMotion = useReducedMotion();
  if (data.length === 0) return null;

  const max = Math.max(...data, 1);
  const points = data
    .map((value, index) => {
      const x = data.length === 1 ? 0 : (index / (data.length - 1)) * 100;
      const y = 100 - (value / max) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      className="h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <motion.polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
        initial={{ pathLength: shouldReduceMotion ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={
          shouldReduceMotion ? { duration: 0 } : { duration: 1, ease: 'easeOut' }
        }
      />
    </svg>
  );
}
