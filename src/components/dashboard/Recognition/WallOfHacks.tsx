import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote } from 'lucide-react';

const sampleHacks = [
  {
    text: "Saved my team 5 hours with Sarah's hack!",
    author: 'Alex M.',
  },
  {
    text: 'The guardrail prevented a costly mistake. Thank you!',
    author: 'Jamie K.',
  },
  {
    text: 'Copy-paste ready. This is gold.',
    author: 'Taylor R.',
  },
  {
    text: 'Finally, a reusable blueprint that actually works.',
    author: 'Jordan P.',
  },
];

export function WallOfHacks() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sampleHacks.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const hack = sampleHacks[currentIndex];

  return (
    <div className="card border-border p-5">
      <div className="flex items-start gap-3">
        <Quote className="mt-1 h-5 w-5 shrink-0 text-teal-500" />
        <div className="min-h-[60px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <p className="mb-1 text-sm font-medium text-foreground">
                &quot;{hack.text}&quot;
              </p>
              <p className="text-xs text-muted-foreground">— {hack.author}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
