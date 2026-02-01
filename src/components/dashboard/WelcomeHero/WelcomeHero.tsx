/**
 * WelcomeHero - Inviting community gateway for HackDay Central
 * Welcoming headline, value-first copy, CTAs, and slim maturity hint (non-dominant)
 */

import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FileCode, Copy, Check, Sparkles, PenLine } from 'lucide-react';

export interface WelcomeHeroProps {
  /** Scroll to Community Wins section (e.g. #community-wins) */
  onScrollToWins?: () => void;
  /** Optional: open share story modal */
  onShareStory?: () => void;
  /** Maturity progress 0–100 for slim hint */
  currentProgress?: number;
  /** Current stage name for slim hint copy */
  currentStageName?: string;
  /** Next milestone % for slim hint (e.g. "33% to Transformation") */
  nextMilestoneCopy?: string;
}

const STAGES = [
  { name: 'Spark', threshold: 25 },
  { name: 'Momentum', threshold: 50 },
  { name: 'Scale', threshold: 75 },
  { name: 'Transformation', threshold: 100 },
];

function getStageName(progress: number): string {
  const stage = STAGES.find((s) => progress < s.threshold) ?? STAGES[STAGES.length - 1];
  return stage.name;
}

export function WelcomeHero({
  onScrollToWins,
  onShareStory,
  currentProgress = 50,
  currentStageName,
  nextMilestoneCopy,
}: WelcomeHeroProps) {
  const shouldReduceMotion = useReducedMotion();
  const stageName = currentStageName ?? getStageName(currentProgress);

  const scrollToWins = useCallback(() => {
    if (onScrollToWins) {
      onScrollToWins();
      return;
    }
    const el = document.getElementById('community-wins');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [onScrollToWins]);

  return (
    <section
      aria-label="Welcome to HackDay Central"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/90 via-indigo-700/85 to-cyan-700/90 p-5 text-white shadow-xl sm:p-8 md:p-10 min-h-0"
    >
      {/* Subtle grid / noise for depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 flex flex-col gap-6 sm:gap-8">
        {/* Headline + sub — stack on all sizes */}
        <div className="space-y-3 text-center sm:text-left">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-[2.5rem]"
          >
            Welcome to HackDay Central — Your AI Superpower Hub
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="max-w-2xl text-base text-indigo-100 sm:text-lg md:text-xl"
          >
            Discover, copy & adapt battle-tested AI prompts, agents and workflows built by
            your colleagues. Start experimenting safely in minutes — no judgment, just wins.
          </motion.p>
        </div>

        {/* Gentle loop: snippet → copy → checkmark */}
        {!shouldReduceMotion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center sm:justify-start"
            aria-hidden
          >
            <LoopCopyWinAnimation />
          </motion.div>
        )}

        {/* CTAs — stack on mobile, row on sm+ */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <motion.button
            type="button"
            onClick={scrollToWins}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="btn-hero-primary order-1 min-h-[44px] min-w-[44px] touch-manipulation rounded-xl px-6 py-3 text-base font-semibold shadow-lg transition-all hover:shadow-primary/30 focus-visible:ring-2 focus-visible:ring-white/50 sm:order-1"
            aria-label="Browse Community Wins — scroll to featured wins"
          >
            <Sparkles className="mr-2 inline-block h-5 w-5" aria-hidden />
            Browse Community Wins
          </motion.button>
          {onShareStory ? (
            <motion.button
              type="button"
              onClick={onShareStory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="btn-hero-secondary order-2 min-h-[44px] min-w-[44px] touch-manipulation rounded-xl border-2 border-white/30 bg-white/10 px-6 py-3 text-base font-medium backdrop-blur-sm transition-all hover:bg-white/20 hover:border-white/50 focus-visible:ring-2 focus-visible:ring-white/50 sm:order-2"
              aria-label="Submit your magic — share your impact story"
            >
              <PenLine className="mr-2 inline-block h-5 w-5" aria-hidden />
              Submit Your Magic
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="order-2"
            >
              <Link
                to="/library"
                className="btn-hero-secondary inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center rounded-xl border-2 border-white/30 bg-white/10 px-6 py-3 text-base font-medium backdrop-blur-sm transition-all hover:bg-white/20 hover:border-white/50 focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="Copy your first asset — go to Library"
              >
                <Copy className="mr-2 h-5 w-5" aria-hidden />
                Copy Your First Asset
              </Link>
            </motion.div>
          )}
        </div>

        {/* Slim maturity hint — pill + tiny progress */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
        >
          <div
            className="flex flex-wrap items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-indigo-100 backdrop-blur-sm"
            role="status"
            aria-label={`Collective progress: we're in ${stageName}. ${nextMilestoneCopy ?? ''}`}
          >
            <span className="font-medium">We&apos;re in {stageName}</span>
            <span className="text-white/80">— join the momentum</span>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[200px]">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, currentProgress)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-indigo-300"
                aria-hidden
              />
            </div>
            {nextMilestoneCopy && (
              <span className="shrink-0 text-xs text-white/70" aria-hidden>
                {nextMilestoneCopy}
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/** Looping animation: code snippet → copy → checkmark win */
function LoopCopyWinAnimation() {
  return (
    <motion.div
      className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        animate={{
          opacity: [1, 0.4, 1],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 0.5,
          times: [0, 0.33, 0.66],
        }}
        className="flex items-center gap-2"
      >
        <FileCode className="h-5 w-5 text-cyan-200" aria-hidden />
        <span className="text-sm font-medium text-white/90">Snippet</span>
      </motion.div>
      <span className="text-white/50" aria-hidden>→</span>
      <motion.div
        animate={{
          opacity: [0.4, 1, 0.4],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 0.5,
          times: [0.33, 0.5, 0.66],
        }}
        className="flex items-center gap-2"
      >
        <Copy className="h-5 w-5 text-cyan-200" aria-hidden />
        <span className="text-sm font-medium text-white/90">Copy</span>
      </motion.div>
      <span className="text-white/50" aria-hidden>→</span>
      <motion.div
        animate={{
          opacity: [0.4, 0.4, 1],
          scale: [1, 1, 1.1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 0.5,
          times: [0.66, 0.8, 1],
        }}
        className="flex items-center gap-2"
      >
        <Check className="h-5 w-5 text-emerald-300" aria-hidden />
        <span className="text-sm font-medium text-white/90">Win</span>
      </motion.div>
    </motion.div>
  );
}
