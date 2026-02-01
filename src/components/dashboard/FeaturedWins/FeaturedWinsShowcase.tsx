import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Library, PenLine, Sparkles } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { FeaturedWinItem } from './WinCard';
import { WinCard } from './WinCard';
import { WallOfThanksStrip } from './WallOfThanksStrip';

interface FeaturedWinsShowcaseProps {
  onShareStory?: () => void;
}

const PLACEHOLDER_WINS: FeaturedWinItem[] = [
  {
    type: 'asset',
    id: 'placeholder-1',
    title: 'Your prompt or template could be here',
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

function mapApiWinToItem(win: {
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
}): FeaturedWinItem {
  return {
    type: win.type,
    id: win.id,
    title: win.title,
    blurb: win.blurb,
    authorName: win.authorName,
    authorLevel: win.authorLevel,
    reuseCount: win.reuseCount,
    isRisingStar: win.isRisingStar,
    _creationTime: win._creationTime,
    assetId: win.assetId,
    storyId: win.storyId,
  };
}

export function FeaturedWinsShowcase({ onShareStory }: FeaturedWinsShowcaseProps) {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const featuredWins = useQuery(api.metrics.getFeaturedWins, { limit: 10 });
  const [currentScrollIndex, setCurrentScrollIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(!shouldReduceMotion);

  const wins: FeaturedWinItem[] =
    featuredWins === undefined
      ? []
      : featuredWins.map(mapApiWinToItem);
  const displayWins = wins.length > 0 ? wins : PLACEHOLDER_WINS;
  const isEmpty = wins.length === 0;
  const canScroll = displayWins.length > 1;

  // Keep scroll index in bounds when wins list length changes
  useEffect(() => {
    setCurrentScrollIndex((prev) =>
      displayWins.length > 0 ? Math.min(prev, displayWins.length - 1) : 0
    );
  }, [displayWins.length]);

  useEffect(() => {
    if (!autoplay || !canScroll || shouldReduceMotion) return;
    const interval = setInterval(() => {
      setCurrentScrollIndex((prev) => (prev + 1) % displayWins.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [autoplay, canScroll, displayWins.length, shouldReduceMotion]);

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

  return (
    <section aria-labelledby="featured-wins-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2
          id="featured-wins-heading"
          className="flex items-center gap-2 text-2xl font-bold"
        >
          <Sparkles className="h-6 w-6 text-primary" aria-hidden />
          Featured Wins & Reusable Magic
        </h2>
        <div className="flex items-center gap-2">
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

      {/* Carousel: horizontal scroll on desktop, swipe on mobile */}
      <div className="relative" ref={containerRef}>
        <div
          className="flex gap-4 overflow-x-auto pb-2 scroll-smooth md:snap-x md:snap-mandatory md:overflow-x-auto"
          style={{
            scrollSnapType: 'x mandatory',
            scrollPaddingLeft: '1rem',
          }}
          role="region"
          aria-label="Featured wins carousel"
        >
          {displayWins.map((win, index) => (
            <div
              key={win.id}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="flex shrink-0 snap-center md:min-w-[300px]"
              style={{ scrollSnapAlign: 'start' }}
            >
              <WinCard win={win} />
            </div>
          ))}
        </div>

        {canScroll && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                scrollToIndex(
                  (currentScrollIndex - 1 + displayWins.length) % displayWins.length
                )
              }
              className="btn btn-ghost btn-icon"
              aria-label="Previous win"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <div className="flex gap-2" role="tablist" aria-label="Carousel positions">
              {displayWins.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={idx === currentScrollIndex}
                  aria-label={`Go to win ${idx + 1}`}
                  onClick={() => scrollToIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentScrollIndex
                      ? 'w-8 bg-primary'
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                scrollToIndex((currentScrollIndex + 1) % displayWins.length)
              }
              className="btn btn-ghost btn-icon"
              aria-label="Next win"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {isEmpty && (
        <div className="rounded-lg border-2 border-dashed border-primary/20 bg-primary/5 p-6 text-center">
          <p className="mb-3 text-sm font-medium text-foreground">
            Be the first to share your win today!
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
