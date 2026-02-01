/**
 * WelcomeHero - Bold, minimal gateway.
 * Big title and one clear proposition. No buttons, no maturity/Spark info.
 */

import { motion, useReducedMotion } from 'framer-motion';

export interface WelcomeHeroProps {
  /** Reserved for future use (e.g. optional scroll target) */
  onScrollToHacks?: () => void;
  /** Reserved for future use */
  onShareStory?: () => void;
  /** Not displayed; kept for API compatibility */
  currentProgress?: number;
  /** Not displayed; kept for API compatibility */
  currentStageName?: string;
  /** Not displayed; kept for API compatibility */
  nextMilestoneCopy?: string;
}

export function WelcomeHero(_props: WelcomeHeroProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      aria-label="HackDay Central"
      className="relative w-full min-w-0 overflow-hidden pt-6 pb-2 sm:pb-3 md:pb-4 lg:pb-5"
    >
      <div className="relative z-10 w-full min-w-0 max-w-3xl text-left">
        <motion.h1
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="break-words text-2xl font-bold tracking-tight sm:text-3xl md:text-5xl lg:text-6xl"
        >
          HackDay Central
        </motion.h1>
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="mt-3 break-words text-base font-semibold text-muted-foreground sm:mt-4 sm:text-lg md:mt-6 md:text-xl lg:text-2xl"
        >
          Our clubhouse for all things AI, vibecoding and hacking
        </motion.p>
      </div>
    </section>
  );
}
