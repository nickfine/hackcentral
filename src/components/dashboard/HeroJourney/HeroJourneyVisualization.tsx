import { motion, useReducedMotion } from 'framer-motion';
import { Rocket, Zap, TrendingUp, Sparkles } from 'lucide-react';
import { ParticleEffect } from './ParticleEffect';
import { MilestoneMarker } from './MilestoneMarker';

interface Stage {
  name: string;
  icon: React.ReactNode;
  threshold: number;
  color: string;
  gradient: string;
}

const stages: Stage[] = [
  {
    name: 'Spark',
    icon: <Zap className="h-5 w-5" />,
    threshold: 25,
    color: 'from-amber-400 to-orange-500',
    gradient: 'bg-gradient-to-r from-amber-400/20 to-orange-500/20',
  },
  {
    name: 'Momentum',
    icon: <Rocket className="h-5 w-5" />,
    threshold: 50,
    color: 'from-cyan-400 to-blue-500',
    gradient: 'bg-gradient-to-r from-cyan-400/20 to-blue-500/20',
  },
  {
    name: 'Scale',
    icon: <TrendingUp className="h-5 w-5" />,
    threshold: 75,
    color: 'from-purple-400 to-indigo-600',
    gradient: 'bg-gradient-to-r from-purple-400/20 to-indigo-600/20',
  },
  {
    name: 'Transformation',
    icon: <Sparkles className="h-5 w-5" />,
    threshold: 100,
    color: 'from-emerald-400 to-teal-500',
    gradient: 'bg-gradient-to-r from-emerald-400/20 to-teal-500/20',
  },
];

interface HeroJourneyVisualizationProps {
  currentProgress: number;
  metrics: {
    aiContributorPercentage: number;
    projectsWithAiPercentage: number;
  };
}

export function HeroJourneyVisualization({
  currentProgress,
  metrics,
}: HeroJourneyVisualizationProps) {
  const shouldReduceMotion = useReducedMotion();
  const currentStageIndex =
    stages.findIndex((s) => currentProgress < s.threshold) === -1
      ? stages.length - 1
      : stages.findIndex((s) => currentProgress < s.threshold);
  const currentStage = stages[currentStageIndex] ?? stages[stages.length - 1];
  const nextStage = stages[currentStageIndex + 1];

  const getHeadline = () => {
    if (currentProgress < 25)
      return 'The Spark is Ignited — First pioneers are lighting the path';
    if (currentProgress < 50)
      return "Momentum Building — We've ignited the flywheel";
    if (currentProgress < 75)
      return 'Scaling in Motion — Knowledge is spreading like wildfire';
    return "Transformation Achieved — We're rewriting how we work with AI";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 text-white shadow-2xl sm:p-6 lg:p-8"
    >
      <ParticleEffect progress={currentProgress} />

      <div className="relative z-10">
        <motion.h2
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="mb-2 text-2xl font-bold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent sm:text-3xl"
        >
          {getHeadline()}
        </motion.h2>

        <p className="mb-6 text-slate-300">
          Your organization is in the{' '}
          <span className="font-semibold text-cyan-300">{currentStage.name}</span>{' '}
          stage
        </p>

        <div className="relative mb-8">
          <div className="flex justify-between text-xs mb-2 -mt-1">
            {stages.map((stage, idx) => (
              <MilestoneMarker
                key={stage.name}
                stage={stage}
                isActive={currentProgress >= stage.threshold}
                isCurrent={idx === currentStageIndex}
                position={(stage.threshold / 100) * 100}
              />
            ))}
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-800/50 backdrop-blur">
            <motion.div
              initial={{ width: shouldReduceMotion ? undefined : 0 }}
              animate={{ width: `${Math.min(100, currentProgress)}%` }}
              transition={
                shouldReduceMotion ? { duration: 0 } : { duration: 1.5, ease: 'easeOut' }
              }
              className={`relative h-full bg-gradient-to-r ${currentStage.color}`}
            >
              {!shouldReduceMotion && (
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
              )}
            </motion.div>
          </div>
        </div>

        {nextStage && currentProgress < 100 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className={`${nextStage.gradient} rounded-lg border border-cyan-500/30 p-4`}
          >
            <div className="flex items-center gap-3">
              <div className="text-cyan-400">{nextStage.icon}</div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Next Milestone
                </p>
                <p className="text-xs text-slate-400">
                  {nextStage.threshold}% = {nextStage.name} unlocked ·{' '}
                  <span className="text-cyan-400">
                    {(nextStage.threshold - currentProgress).toFixed(0)}% to go
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">AI Contributors</p>
            <p className="text-2xl font-bold text-cyan-300">
              {metrics.aiContributorPercentage.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-slate-400">Projects with AI</p>
            <p className="text-2xl font-bold text-purple-300">
              {metrics.projectsWithAiPercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
