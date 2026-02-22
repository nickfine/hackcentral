import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, PenLine, Clock, User, Sparkles } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

export interface ImpactStory {
  _id: string;
  _creationTime: number;
  headline: string;
  storyText?: string;
  authorName: string;
  projectTitle?: string;
  assetTitle?: string;
  metrics?: {
    timeSaved?: number;
    errorReduction?: number;
    throughputGain?: number;
  };
}

interface ImpactStoriesCarouselProps {
  stories: ImpactStory[];
  onShareStory: () => void;
}

export function ImpactStoriesCarousel({
  stories,
  onShareStory,
}: ImpactStoriesCarouselProps) {
  const shouldReduceMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(!shouldReduceMotion);

  useEffect(() => {
    if (!autoplay || stories.length <= 1 || shouldReduceMotion) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % stories.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [autoplay, stories.length, shouldReduceMotion]);

  if (stories.length === 0) {
    return (
      <div className="card border-2 border-dashed border-primary/20 p-8 text-center">
        <PenLine className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-xl font-semibold">No impact stories yet</h3>
        <p className="mb-4 text-muted-foreground">
          Be the first to share how AI has helped your work
        </p>
        <button
          type="button"
          onClick={onShareStory}
          className="btn btn-primary"
        >
          <PenLine className="mr-2 h-4 w-4" />
          Share your story
        </button>
      </div>
    );
  }

  const story = stories[currentIndex];

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6 text-primary" />
          Impact Stories
        </h2>
        <button
          type="button"
          onClick={onShareStory}
          className="btn btn-outline btn-sm"
        >
          <PenLine className="mr-2 h-4 w-4" />
          Share your story
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6 lg:p-8">

        <div className="relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={story._id}
              initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -20 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
            >
              <h3 className="mb-3 text-xl font-bold text-foreground sm:text-2xl">
                {story.headline}
              </h3>

              {story.metrics && (
                <div className="mb-4 flex flex-wrap gap-4">
                  {story.metrics.timeSaved != null && (
                    <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      <Clock className="h-4 w-4" />
                      Saved {story.metrics.timeSaved}h/week
                    </div>
                  )}
                  {story.metrics.errorReduction != null && (
                    <div className="flex items-center gap-2 rounded-lg bg-teal-500/10 px-3 py-1.5 text-sm font-medium text-teal-700 dark:text-teal-300">
                      {story.metrics.errorReduction}% fewer errors
                    </div>
                  )}
                </div>
              )}

              {story.storyText && (
                <p className="mb-4 line-clamp-3 text-muted-foreground">
                  {story.storyText}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{story.authorName}</span>
                </div>
                {story.projectTitle && (
                  <>
                    <span>·</span>
                    <span>{story.projectTitle}</span>
                  </>
                )}
                {story.assetTitle && (
                  <>
                    <span>·</span>
                    <span>{story.assetTitle}</span>
                  </>
                )}
                <span>·</span>
                <span>{formatRelativeTime(story._creationTime)}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {stories.length > 1 && (
          <div className="relative z-10 mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setAutoplay(false);
                setCurrentIndex(
                  (prev) => (prev - 1 + stories.length) % stories.length
                );
              }}
              className="btn btn-ghost btn-icon"
              aria-label="Previous story"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex gap-2">
              {stories.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAutoplay(false);
                    setCurrentIndex(idx);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'w-8 bg-primary'
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  aria-label={`Go to story ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setAutoplay(false);
                setCurrentIndex((prev) => (prev + 1) % stories.length);
              }}
              className="btn btn-ghost btn-icon"
              aria-label="Next story"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
