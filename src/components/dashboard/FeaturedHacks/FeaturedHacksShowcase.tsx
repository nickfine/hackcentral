import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Library, Sparkles } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { FeaturedHackItem } from './HackCard';
import { HackCard } from './HackCard';

const DEFAULT_STARTER_COUNT = 4;
const GRID_CARD_COUNT = 8; // Two rows of four

interface FeaturedHacksShowcaseProps {
  /** Called when user successfully copies a hack/story (e.g. first-copy confetti) */
  onCopySuccess?: () => void;
  /** First N hacks show "Starter" badge (copy in seconds). Default 4. */
  starterCount?: number;
}

const PLACEHOLDER_HACKS: FeaturedHackItem[] = [
  {
    type: 'asset',
    id: 'placeholder-1',
    title: 'Your hack could be here',
    blurb: 'Share a reusable AI hack from Completed Hacks — your peers can copy and adapt it.',
    authorName: '—',
    reuseCount: 0,
    isRisingStar: false,
    _creationTime: 0,
    assetType: 'prompt',
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
  assetType?: 'prompt' | 'skill' | 'app';
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
    assetType: hack.assetType,
  };
}

export function FeaturedHacksShowcase({ onCopySuccess, starterCount = DEFAULT_STARTER_COUNT }: FeaturedHacksShowcaseProps) {
  const featuredHacks = useQuery(api.metrics.getFeaturedHacks, { limit: GRID_CARD_COUNT });
  const hacks: FeaturedHackItem[] =
    featuredHacks === undefined
      ? []
      : featuredHacks.map(mapApiHackToItem);
  const displayHacks = hacks.length > 0 ? hacks : PLACEHOLDER_HACKS;
  const gridHacks = displayHacks.slice(0, GRID_CARD_COUNT);
  const isEmpty = hacks.length === 0;
  const showLowContentNudge = hacks.length >= 1 && hacks.length < 4;

  return (
    <section aria-labelledby="featured-hacks-heading" className="min-w-0 space-y-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2
            id="featured-hacks-heading"
            className="flex min-w-0 items-center gap-2 text-lg font-bold sm:text-xl md:text-2xl"
          >
            <Sparkles className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" aria-hidden />
            <span className="break-words">Latest Hacks - <span className="font-normal">accelerators and pain removers made by us</span></span>
          </h2>
        </div>
        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">
          <Link to="/hacks?tab=completed" className="btn btn-ghost btn-sm">
            <Library className="mr-2 h-4 w-4" aria-hidden />
            Browse All Hacks
          </Link>
        </div>
      </div>

      {/* Two rows of four hack cards — uniform height per row */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch"
        role="list"
        aria-label="Featured hacks"
      >
        {gridHacks.map((hack, index) => (
          <motion.div
            key={hack.id}
            role="listitem"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            className="min-w-0 h-full"
          >
            <HackCard
              hack={hack}
              onCopySuccess={onCopySuccess}
              isStarter={!isEmpty && index < starterCount}
            />
          </motion.div>
        ))}
      </div>

      {showLowContentNudge && (
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center">
          <p className="mb-3 text-sm font-semibold text-foreground">
            Be the first Rising Star this week!
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Submit your hack from Completed Hacks and get spotted.
          </p>
          <Link
            to="/hacks?tab=completed&action=new"
            className="btn btn-primary btn-sm mx-auto min-h-[44px] inline-flex items-center justify-center"
            aria-label="Submit your hack"
          >
            <Library className="mr-2 h-4 w-4" aria-hidden />
            Submit your hack →
          </Link>
        </div>
      )}

      {isEmpty && (
        <div className="rounded-lg border-2 border-dashed border-primary/20 bg-primary/5 p-6 text-center">
          <p className="mb-3 text-sm font-medium text-foreground">
            Be the first to share your hack today!
          </p>
          <Link to="/hacks?tab=completed&action=new" className="btn btn-primary btn-sm inline-flex items-center gap-2">
            <Library className="h-4 w-4" aria-hidden />
            Submit your hack
          </Link>
        </div>
      )}
    </section>
  );
}
