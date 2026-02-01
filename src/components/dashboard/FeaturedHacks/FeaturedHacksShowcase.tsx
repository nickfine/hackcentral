import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Library, PenLine, Sparkles } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { FeaturedHackItem } from './HackCard';
import { HackCard } from './HackCard';
import { WallOfThanksStrip } from './WallOfThanksStrip';

const DEFAULT_STARTER_COUNT = 4;

interface FeaturedHacksShowcaseProps {
  onShareStory?: () => void;
  /** Called when user successfully copies an asset/story (e.g. first-copy confetti) */
  onCopySuccess?: () => void;
  /** First N hacks show "Starter" badge (copy in seconds). Default 4. */
  starterCount?: number;
}

const PLACEHOLDER_HACKS: FeaturedHackItem[] = [
  {
    type: 'asset',
    id: 'placeholder-1',
    title: 'Your hack could be here',
    blurb: 'Share a reusable AI asset from the Library — your peers can copy and adapt it.',
    authorName: '—',
    reuseCount: 0,
    isRisingStar: false,
    _creationTime: 0,
  },
  {
    type: 'story',
    id: 'placeholder-2',
    title: 'Share how AI helped your work',
    blurb: 'Impact stories inspire others and surface on the Dashboard.',
    authorName: '—',
    reuseCount: 0,
    isRisingStar: false,
    _creationTime: 0,
  },
];

function mapApiHackToItem(hack: {
  type: 'asset' | 'story';
  id: string;
  title: string;
  blurb: string;
  authorName: string;
  authorLevel?: string;
  reuseCount: number;
  isRisingStar: boolean;
  _creationTime: number;
  assetId?: string;
  storyId?: string;
}): FeaturedHackItem {
  return {
    type: hack.type,
    id: hack.id,
    title: hack.title,
    blurb: hack.blurb,
    authorName: hack.authorName,
    authorLevel: hack.authorLevel,
    reuseCount: hack.reuseCount,
    isRisingStar: hack.isRisingStar,
    _creationTime: hack._creationTime,
    assetId: hack.assetId,
    storyId: hack.storyId,
  };
}

export function FeaturedHacksShowcase({ onShareStory, onCopySuccess, starterCount = DEFAULT_STARTER_COUNT }: FeaturedHacksShowcaseProps) {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const featuredHacks = useQuery(api.metrics.getFeaturedHacks, { limit: 10 });
  const pulse = useQuery(api.metrics.getActivityPulse);
  const [currentScrollIndex, setCurrentScrollIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(!shouldReduceMotion);

  const hacks: FeaturedHackItem[] =
    featuredHacks === undefined
      ? []
      : featuredHacks.map(mapApiHackToItem);
  const displayHacks = hacks.length > 0 ? hacks : PLACEHOLDER_HACKS;
  const isEmpty = hacks.length === 0;
  const canScroll = displayHacks.length > 1;

  // Keep scroll index in bounds when hacks list length changes
  useEffect(() => {
    setCurrentScrollIndex((prev) =>
      displayHacks.length > 0 ? Math.min(prev, displayHacks.length - 1) : 0
    );
  }, [displayHacks.length]);

  useEffect(() => {
    if (!autoplay || !canScroll || shouldReduceMotion) return;
    const interval = setInterval(() => {
      setCurrentScrollIndex((prev) => (prev + 1) % displayHacks.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [autoplay, canScroll, displayHacks.length, shouldReduceMotion]);

  useEffect(() => {
    if (!canScroll || !containerRef.current) return;
    const el = cardRefs.current[currentScrollIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  }, [currentScrollIndex, canScroll]);

  const scrollToIndex = (index: number) => {
    setAutoplay(false);
    setCurrentScrollIndex(index);
    setTimeout(() => setAutoplay(true), 8000);
  };

  const showLowContentNudge = hacks.length >= 1 && hacks.length < 4;
  const showNewbieBanner = hacks.length > 0;

  const risingStarCount = hacks.filter((h) => h.isRisingStar).length;
  const liveBadgeCopy =
    pulse?.newAssetsThisWeek != null && pulse.newAssetsThisWeek > 0
      ? `Live: ${pulse.newAssetsThisWeek} new hack${pulse.newAssetsThisWeek !== 1 ? 's' : ''} this week`
      : risingStarCount > 0
        ? `${risingStarCount} Rising Star${risingStarCount !== 1 ? 's' : ''}`
        : null;

  return (
    <section aria-labelledby="featured-hacks-heading" className="min-w-0 space-y-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {liveBadgeCopy && (
            <motion.span
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
              role="status"
              aria-label={liveBadgeCopy}
            >
              {!shouldReduceMotion && (
                <motion.span
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                  aria-hidden
                />
              )}
              {liveBadgeCopy}
            </motion.span>
          )}
          <h2
            id="featured-hacks-heading"
            className="flex min-w-0 items-center gap-2 text-lg font-bold sm:text-xl md:text-2xl"
          >
            <Sparkles className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" aria-hidden />
            <span className="break-words">Community Hacks — reusable magic from your peers</span>
          </h2>
        </div>
        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">
          {onShareStory && (
            <button
              type="button"
              onClick={onShareStory}
              className="btn btn-outline btn-sm"
              aria-label="Share your impact story"
            >
              <PenLine className="mr-2 h-4 w-4" aria-hidden />
              Share your story
            </button>
          )}
          <Link to="/library" className="btn btn-ghost btn-sm">
            <Library className="mr-2 h-4 w-4" aria-hidden />
            Browse Library
          </Link>
        </div>
      </div>

      {showNewbieBanner && (
        <p className="text-sm text-muted-foreground">
          Your first copy could earn Rising Star — start here in under 10 seconds.
        </p>
      )}

      {/* Carousel: horizontal scroll on desktop, swipe on mobile; pause on hover; keyboard nav */}
      <div
        className="relative"
        ref={containerRef}
        onMouseEnter={() => setAutoplay(false)}
        onMouseLeave={() => setAutoplay(true)}
        onKeyDown={(e) => {
          if (!canScroll) return;
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            scrollToIndex((currentScrollIndex - 1 + displayHacks.length) % displayHacks.length);
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            scrollToIndex((currentScrollIndex + 1) % displayHacks.length);
          }
        }}
        tabIndex={canScroll ? 0 : undefined}
        role="region"
        aria-label="Featured hacks carousel — use arrow keys to navigate"
      >
        <div
          className="flex gap-4 overflow-x-auto pb-2 scroll-smooth md:snap-x md:snap-mandatory md:overflow-x-auto [scrollbar-width:thin]"
          style={{
            scrollSnapType: 'x mandatory',
            scrollPaddingLeft: '1rem',
          }}
        >
          {displayHacks.map((hack, index) => (
            <div
              key={hack.id}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="flex min-w-[min(300px,calc(100vw-2rem))] shrink-0 snap-center sm:min-w-[300px]"
              style={{ scrollSnapAlign: 'start' }}
            >
              <HackCard
                hack={hack}
                onCopySuccess={onCopySuccess}
                isStarter={!isEmpty && index < starterCount}
              />
            </div>
          ))}
          {showLowContentNudge && onShareStory && (
            <div
              className="flex min-w-[280px] max-w-[320px] shrink-0 snap-center flex-col justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center"
              style={{ scrollSnapAlign: 'start' }}
            >
              <p className="mb-3 text-sm font-semibold text-foreground">
                Be the first Rising Star this week!
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Submit your hack and get spotted.
              </p>
              <button
                type="button"
                onClick={onShareStory}
                className="btn btn-primary btn-sm mx-auto min-h-[44px]"
                aria-label="Submit your hack"
              >
                <PenLine className="mr-2 h-4 w-4" aria-hidden />
                Submit your hack →
              </button>
            </div>
          )}
        </div>

        {canScroll && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                scrollToIndex(
                  (currentScrollIndex - 1 + displayHacks.length) % displayHacks.length
                )
              }
              className="btn btn-ghost btn-icon min-h-[44px] min-w-[44px] touch-manipulation sm:min-h-0 sm:min-w-0"
              aria-label="Previous hack"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <div className="flex gap-1 sm:gap-2" role="tablist" aria-label="Carousel positions">
              {displayHacks.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={idx === currentScrollIndex}
                  aria-label={`Go to hack ${idx + 1}`}
                  onClick={() => scrollToIndex(idx)}
                  className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full sm:min-h-[1.5rem] sm:min-w-[1.5rem]"
                >
                  <span
                    className={`block rounded-full ${
                      idx === currentScrollIndex
                        ? 'h-2 w-8 bg-primary'
                        : 'h-2 w-2 bg-muted-foreground/70'
                    }`}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                scrollToIndex((currentScrollIndex + 1) % displayHacks.length)
              }
              className="btn btn-ghost btn-icon min-h-[44px] min-w-[44px] touch-manipulation sm:min-h-0 sm:min-w-0"
              aria-label="Next hack"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {isEmpty && (
        <div className="rounded-lg border-2 border-dashed border-primary/20 bg-primary/5 p-6 text-center">
          <p className="mb-3 text-sm font-medium text-foreground">
            Be the first to share your hack today!
          </p>
          {onShareStory && (
            <button
              type="button"
              onClick={onShareStory}
              className="btn btn-primary btn-sm"
            >
              <PenLine className="mr-2 h-4 w-4" aria-hidden />
              Share your story
            </button>
          )}
        </div>
      )}

      <WallOfThanksStrip />
    </section>
  );
}
