/**
 * WelcomeHero - Slim inviting gateway (target 25–35% viewport)
 * Short headline, one-line sub, CTAs horizontal desktop / vertical mobile, maturity pill inside hero.
 */

import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FileCode, Copy, Check, Sparkles, PenLine } from 'lucide-react';

export interface WelcomeHeroProps {
  /** Scroll to Community Hacks section (e.g. #community-hacks) */
  onScrollToHacks?: () => void;
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
  onScrollToHacks,
  onShareStory,
  currentProgress = 50,
  currentStageName,
  nextMilestoneCopy,
}: WelcomeHeroProps) {
  const shouldReduceMotion = useReducedMotion();
  const stageName = currentStageName ?? getStageName(currentProgress);

  const scrollToHacks = useCallback(() => {
    if (onScrollToHacks) {
      onScrollToHacks();
      return;
    }
    const el = document.getElementById('community-hacks');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [onScrollToHacks]);

  return (
    <section
      aria-label="Welcome to HackDay Central"
      className="relative min-h-0 max-h-[35vh] overflow-x-hidden overflow-y-auto rounded-2xl bg-gradient-to-br from-indigo-600/90 via-indigo-700/85 to-cyan-700/90 p-4 text-white shadow-xl sm:p-5 md:p-6 [@media (max-height:400px)]:max-h-[50vh]"
    >
      {/* Subtle grid + faint floating asset icons */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '20px 20px',
        }}
      />
      {!shouldReduceMotion && <FloatingAssetIcons />}

      <div className="relative z-10 flex flex-col gap-3 sm:gap-4">
        {/* Headline + sub — single column, tight */}
        <div className="space-y-1.5 text-center sm:text-left">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl"
          >
            Welcome to HackDay Central
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="max-w-xl break-words text-sm text-indigo-100 sm:text-base"
          >
            Copy a hack, use it, share yours.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="max-w-xl break-words text-xs text-indigo-200/90 sm:text-sm"
          >
            Prompts, apps, extensions, skills — copy one, share yours.
          </motion.p>
        </div>

        {/* Mini icon row: snippet → copy → hack (compact) */}
        {!shouldReduceMotion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center justify-center gap-1.5 sm:justify-start"
            aria-hidden
          >
            <MiniSnippetCopyHack />
          </motion.div>
        )}

        {/* CTAs — horizontal desktop, vertical mobile; primary larger */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <motion.button
            type="button"
            onClick={scrollToHacks}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="btn-hero-primary order-1 min-h-[44px] min-w-[44px] touch-manipulation rounded-xl px-5 py-2.5 text-base font-semibold shadow-lg transition-all hover:shadow-primary/30 focus-visible:ring-2 focus-visible:ring-white/50 sm:order-1 sm:px-6 sm:py-3"
            aria-label="Browse Community Hacks — scroll to featured hacks"
          >
            <Sparkles className="mr-2 inline-block h-5 w-5" aria-hidden />
            Browse Community Hacks
          </motion.button>
          {onShareStory ? (
            <motion.button
              type="button"
              onClick={onShareStory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="btn-hero-secondary order-2 min-h-[44px] min-w-[44px] touch-manipulation rounded-xl border-2 border-white/30 bg-white/10 px-4 py-2.5 text-sm font-medium backdrop-blur-sm transition-all hover:bg-white/20 hover:border-white/50 focus-visible:ring-2 focus-visible:ring-white/50 sm:order-2"
              aria-label="Submit your magic — share your impact story"
            >
              <PenLine className="mr-2 inline-block h-4 w-4" aria-hidden />
              Submit Your Magic
            </motion.button>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="order-2">
              <Link
                to="/library"
                className="btn-hero-secondary inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center rounded-xl border-2 border-white/30 bg-white/10 px-4 py-2.5 text-sm font-medium backdrop-blur-sm transition-all hover:bg-white/20 hover:border-white/50 focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="Copy your first asset — go to Library"
              >
                <Copy className="mr-2 h-4 w-4" aria-hidden />
                Copy Your First Asset
              </Link>
            </motion.div>
          )}
        </div>

        {/* Slim maturity — single row: pill + tiny progress (visually secondary) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2"
        >
          <div
            className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-indigo-100/90 backdrop-blur-sm"
            role="status"
            aria-label={`Collective progress: we're in ${stageName}. ${nextMilestoneCopy ?? ''}`}
          >
            <span className="font-medium">We&apos;re in {stageName}</span>
            <span className="text-white/70">— join the momentum</span>
            {nextMilestoneCopy && (
              <span className="text-white/60" aria-hidden>
                {nextMilestoneCopy}
              </span>
            )}
          </div>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/20 sm:w-24">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, currentProgress)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-indigo-300"
              aria-hidden
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/** Faint floating asset icons (gentle float-in); hidden on narrow viewports to avoid overlap */
function FloatingAssetIcons() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden sm:block" aria-hidden>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 0.15, y: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute right-6 top-1/4 md:right-8"
      >
        <FileCode className="h-5 w-5 text-cyan-200 md:h-6 md:w-6" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 0.12, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="absolute right-12 top-1/2 md:right-16"
      >
        <Copy className="h-4 w-4 text-white/80 md:h-5 md:w-5" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 0.15, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="absolute right-8 top-2/3 md:right-10"
      >
        <Check className="h-4 w-4 text-emerald-300/90 md:h-5 md:w-5" />
      </motion.div>
    </div>
  );
}

/** Compact snippet → copy → hack icon row */
function MiniSnippetCopyHack() {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5">
      <FileCode className="h-3.5 w-3.5 text-cyan-200" aria-hidden />
      <span className="text-white/50 text-xs" aria-hidden>→</span>
      <Copy className="h-3.5 w-3.5 text-cyan-200" aria-hidden />
      <span className="text-white/50 text-xs" aria-hidden>→</span>
      <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
    </div>
  );
}
