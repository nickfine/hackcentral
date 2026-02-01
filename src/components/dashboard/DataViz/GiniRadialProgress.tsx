import { motion, useReducedMotion } from 'framer-motion';

interface GiniRadialProgressProps {
  gini: number;
  interpretation: string;
}

export function GiniRadialProgress({
  gini,
  interpretation,
}: GiniRadialProgressProps) {
  const shouldReduceMotion = useReducedMotion();
  const healthScore = (1 - gini) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset =
    circumference - (healthScore / 100) * circumference;

  const getColor = () => {
    if (gini < 0.7) return 'var(--color-success)';
    if (gini < 0.8) return 'var(--color-warning)';
    return 'var(--color-destructive)';
  };

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-32 w-32">
        <svg
          className="h-32 w-32 -rotate-90 transform"
          aria-hidden
        >
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted"
          />
          <motion.circle
            cx="64"
            cy="64"
            r="45"
            stroke={getColor()}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={
              shouldReduceMotion ? { duration: 0 } : { duration: 1.5, ease: 'easeOut' }
            }
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold"
            style={{ color: getColor() }}
          >
            {gini.toFixed(2)}
          </span>
          <span className="text-xs text-muted-foreground">Gini</span>
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-lg font-semibold">{interpretation}</h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          {gini < 0.7
            ? "Healthy spread — knowledge isn't siloed. AI adoption is distributed evenly."
            : gini < 0.8
              ? 'Moderate concentration. Consider interventions to spread AI skills wider.'
              : 'High concentration. Escalate: AI expertise is too centralized.'}
        </p>
        <div className="mt-2 text-xs text-muted-foreground">
          Fuller circle = healthier distribution
        </div>
      </div>
    </div>
  );
}
