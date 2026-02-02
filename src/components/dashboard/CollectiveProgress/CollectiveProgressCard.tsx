/**
 * CollectiveProgressCard - Demoted maturity pod for leaders
 * Compact "Our Collective Progress" card: stage icons, progress bar, short copy
 * Shown on Team pulse tab; Latest Hacks is on Hacks tab. Keeps hero welcoming and value-first.
 * Stage names/thresholds (Spark 25, Momentum 50, Scale 75, Transformation 100) align with HeroJourneyVisualization.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Rocket, Zap, TrendingUp, Sparkles } from 'lucide-react';
import { SectionHeader } from '@/components/shared';

interface Stage {
  name: string;
  icon: React.ReactNode;
  threshold: number;
  color: string;
}

const STAGES: Stage[] = [
  { name: 'Spark', icon: <Zap className="h-4 w-4" />, threshold: 25, color: 'from-amber-400 to-orange-500' },
  { name: 'Momentum', icon: <Rocket className="h-4 w-4" />, threshold: 50, color: 'from-cyan-400 to-blue-500' },
  { name: 'Scale', icon: <TrendingUp className="h-4 w-4" />, threshold: 75, color: 'from-purple-400 to-indigo-600' },
  { name: 'Transformation', icon: <Sparkles className="h-4 w-4" />, threshold: 100, color: 'from-emerald-400 to-teal-500' },
];

export interface CollectiveProgressCardProps {
  currentProgress: number;
  metrics: {
    aiContributorPercentage: number;
    projectsWithAiPercentage: number;
  };
}

export function CollectiveProgressCard({
  currentProgress,
  metrics,
}: CollectiveProgressCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const currentStageIndex =
    STAGES.findIndex((s) => currentProgress < s.threshold) === -1
      ? STAGES.length - 1
      : STAGES.findIndex((s) => currentProgress < s.threshold);
  const currentStage = STAGES[currentStageIndex] ?? STAGES[STAGES.length - 1];
  const nextStage = STAGES[currentStageIndex + 1];
  const pctToNext = nextStage
    ? Math.max(0, (nextStage.threshold - currentProgress)).toFixed(0)
    : '0';
  const nextLabel = nextStage ? `${nextStage.threshold}% = ${nextStage.name}` : null;

  const description = `Knowledge spreading like wildfire — we're in ${currentStage.name}${nextStage ? `, ${pctToNext}% to ${nextStage.name}` : ''}.`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-labelledby="collective-progress-heading"
      className="card overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6"
    >
      <div className="mb-4 space-y-4">
        <SectionHeader
          variant="section"
          title="Our Collective Progress"
          titleId="collective-progress-heading"
          description={description}
        />
      </div>

      {/* Stage icons row — compact */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        {STAGES.map((stage, idx) => {
          const isActive = currentProgress >= stage.threshold;
          const isCurrent = idx === currentStageIndex;
          return (
            <div
              key={stage.name}
              className={`flex flex-col items-center gap-1 ${
                isCurrent ? 'opacity-100' : isActive ? 'opacity-80' : 'opacity-50'
              }`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  isCurrent
                    ? 'bg-primary/20 ring-2 ring-primary text-primary'
                    : isActive
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-muted/60 text-muted-foreground'
                }`}
                aria-hidden
              >
                {stage.icon}
              </div>
              <span className="text-xs font-medium text-muted-foreground">{stage.name}</span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="relative mb-4">
        <div className="h-2 overflow-hidden rounded-full bg-border/50">
          <motion.div
            initial={{ width: shouldReduceMotion ? undefined : 0 }}
            animate={{ width: `${Math.min(100, currentProgress)}%` }}
            transition={
              shouldReduceMotion ? { duration: 0 } : { duration: 1, ease: 'easeOut' }
            }
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-400)]"
          />
        </div>
        {nextStage && currentProgress < 100 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Next: {nextLabel} · {pctToNext}% to go
          </p>
        )}
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">AI Contributors</p>
          <p className="text-lg font-semibold text-foreground">
            {metrics.aiContributorPercentage.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Projects with AI</p>
          <p className="text-lg font-semibold text-foreground">
            {metrics.projectsWithAiPercentage.toFixed(1)}%
          </p>
        </div>
      </div>
    </motion.section>
  );
}
