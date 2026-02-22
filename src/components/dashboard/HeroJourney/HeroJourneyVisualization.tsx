import { motion, useReducedMotion } from 'framer-motion';
import { Rocket, Zap, TrendingUp, Sparkles } from 'lucide-react';
import { ParticleEffect } from './ParticleEffect';
import { MilestoneMarker } from './MilestoneMarker';
import { LiveActivityPulse } from '../LiveActivityPulse';

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
    color: 'bg-teal-500',
    gradient: 'bg-teal-500/20',
  },
  {
    name: 'Momentum',
    icon: <Rocket className="h-5 w-5" />,
    threshold: 50,
    color: 'bg-teal-500',
    gradient: 'bg-teal-500/20',
  },
  {
    name: 'Scale',
    icon: <TrendingUp className="h-5 w-5" />,
    threshold: 75,
    color: 'bg-teal-500',
    gradient: 'bg-teal-500/20',
  },
  {
    name: 'Transformation',
    icon: <Sparkles className="h-5 w-5" />,
    threshold: 100,
    color: 'bg-teal-500',
    gradient: 'bg-teal-500/20',
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
      className="relative overflow-hidden rounded-2xl bg-gray-900 p-4 text-white shadow-xl sm:p-6 lg:p-8"
    >
      <ParticleEffect progress={currentProgress} />

      <div className="relative z-10">
        <motion.h2
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="mb-2 text-2xl font-bold text-teal-300 sm:text-3xl"
        >
          {getHeadline()}
        </motion.h2>

        <p className="mb-6 text-gray-300">
          We&apos;re in {currentStage.name} — knowledge spreading like wildfire.
          {currentProgress < 100 && ' Every copy pushes us to Transformation.'}
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
          <div className="h-3 overflow-hidden rounded-full bg-gray-800/50 backdrop-blur">
            <motion.div
              initial={{ width: shouldReduceMotion ? undefined : 0 }}
              animate={{
                width: `${Math.min(100, currentProgress)}%`,
                boxShadow: currentProgress >= 65 && currentProgress < 100 && !shouldReduceMotion
                  ? '0 0 20px rgba(20, 184, 166, 0.5), 0 0 40px rgba(20, 184, 166, 0.2)'
                  : 'none',
              }}
              transition={
                shouldReduceMotion ? { duration: 0 } : { duration: 1.5, ease: 'easeOut' }
              }
              className={`relative h-full ${currentStage.color}`}
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
            className={`${nextStage.gradient} rounded-lg border border-teal-500/30 p-4`}
          >
            <div className="flex items-center gap-3">
              <div className="text-teal-400">{nextStage.icon}</div>
              <div>
                <p className="text-sm font-semibold text-gray-200">
                  Next Milestone
                </p>
                <p className="text-xs text-gray-400">
                  {nextStage.threshold}% = {nextStage.name} unlocked ·{' '}
                  <span className="text-teal-400">
                    {(nextStage.threshold - currentProgress).toFixed(0)}% to go
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="mt-4 flex justify-end">
          <LiveActivityPulse className="border-teal-500/30 bg-teal-500/10 text-gray-200" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">AI Contributors</p>
            <p className="text-2xl font-bold text-teal-300">
              {metrics.aiContributorPercentage.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-gray-400">Projects with AI</p>
            <p className="text-2xl font-bold text-teal-300">
              {metrics.projectsWithAiPercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
