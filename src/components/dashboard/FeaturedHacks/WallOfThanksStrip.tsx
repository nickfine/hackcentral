import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Quote } from 'lucide-react';

const SAMPLE_THANKS = [
  { text: 'Saved my team 5 hours with this hack!', author: 'Alex M.' },
  { text: 'The guardrail prevented a costly mistake. Thank you!', author: 'Jamie K.' },
  { text: 'Copy-paste ready. This is gold.', author: 'Taylor R.' },
  { text: 'Finally, a reusable blueprint that actually works.', author: 'Jordan P.' },
];

export function WallOfThanksStrip() {
  const shouldReduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % SAMPLE_THANKS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const item = SAMPLE_THANKS[index];

  return (
    <div
      className="flex h-full min-h-[180px] flex-col rounded-lg border border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-orange-50/80 px-5 py-5 sm:px-6 sm:py-6 dark:border-amber-800/40 dark:from-amber-950/20 dark:to-orange-950/20"
      role="region"
      aria-live="polite"
      aria-label="Wall of thanks"
    >
      <div className="flex flex-1 flex-col justify-center gap-4">
        <Quote
          className="h-6 w-6 shrink-0 font-bold text-amber-600 dark:text-amber-400 sm:h-8 sm:w-8"
          aria-hidden
          strokeWidth={2.5}
        />
        <div className="min-h-[3rem] min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            >
              <p className="text-xl font-bold leading-snug text-foreground sm:text-2xl md:text-3xl">&quot;{item.text}&quot;</p>
              <p className="mt-2 text-sm font-medium text-muted-foreground sm:text-base">— {item.author}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
