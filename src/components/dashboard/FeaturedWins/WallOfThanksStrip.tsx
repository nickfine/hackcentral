import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Quote } from 'lucide-react';

const SAMPLE_THANKS = [
  { text: 'Saved my team 5 hours with this prompt template!', author: 'Alex M.' },
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
      className="rounded-lg border border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-orange-50/80 px-4 py-3 dark:border-amber-800/40 dark:from-amber-950/20 dark:to-orange-950/20"
      role="region"
      aria-live="polite"
      aria-label="Wall of thanks"
    >
      <div className="flex items-start gap-3">
        <Quote
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
        <div className="min-h-[2.5rem] min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            >
              <p className="text-sm font-medium text-foreground">&quot;{item.text}&quot;</p>
              <p className="text-xs text-muted-foreground">— {item.author}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
