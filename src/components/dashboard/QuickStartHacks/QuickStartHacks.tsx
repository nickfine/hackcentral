/**
 * QuickStartHacks - Row of 3–4 curated "Starter Hacks" (newbie-friendly)
 * Fetches featured hacks and shows first N as compact cards with Starter badge.
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Sparkles } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { FeaturedHackItem } from '../FeaturedHacks/HackCard';
import toast from 'react-hot-toast';

const STARTER_LIMIT = 4;

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

function getAssetDetailUrlForCard(assetId: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/library/${assetId}`;
}

export interface QuickStartHacksProps {
  /** Called when user successfully copies (e.g. first-copy confetti) */
  onCopySuccess?: () => void;
}

export function QuickStartHacks({ onCopySuccess }: QuickStartHacksProps) {
  const featuredHacks = useQuery(api.metrics.getFeaturedHacks, { limit: 10 });
  const hacks: FeaturedHackItem[] =
    featuredHacks === undefined ? [] : featuredHacks.map(mapApiHackToItem);
  const starters = hacks.slice(0, STARTER_LIMIT);
  if (starters.length === 0) return null;

  return (
    <section aria-labelledby="quick-start-hacks-heading" className="min-w-0 space-y-3">
      <h2
        id="quick-start-hacks-heading"
        className="flex min-w-0 items-center gap-2 text-base font-semibold text-foreground sm:text-lg"
      >
        <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <span className="truncate">Starter Hacks — copy in seconds</span>
      </h2>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {starters.map((hack, index) => (
          <StarterCard
            key={hack.id}
            hack={hack}
            index={index}
            onCopySuccess={onCopySuccess}
          />
        ))}
      </div>
    </section>
  );
}

function StarterCard({
  hack,
  index,
  onCopySuccess,
}: {
  hack: FeaturedHackItem;
  index: number;
  onCopySuccess?: () => void;
}) {
  const handleCopy = () => {
    const text =
      hack.type === 'asset' && hack.assetId
        ? `${hack.title}\n\n${hack.blurb}\n\nView: ${getAssetDetailUrlForCard(hack.assetId)}`
        : `${hack.title}\n\n${hack.blurb}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => {
          toast.success('Copied!');
          onCopySuccess?.();
        },
        () => toast.error('Failed to copy')
      );
    } else {
      toast.error('Clipboard not available');
    }
  };

  const viewTo = hack.type === 'asset' && hack.assetId ? `/library/${hack.assetId}` : '/hacks?tab=completed';
  // Align with HackCard: show Copy only for story or asset (prompt/skill or missing assetType); app → View only
  const showCopy =
    hack.type === 'story' ||
    (hack.type === 'asset' && (hack.assetType === undefined || hack.assetType === 'prompt' || hack.assetType === 'skill'));

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Starter
        </span>
        {hack.isRisingStar && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
            <Sparkles className="h-3 w-3" aria-hidden />
            Rising Star
          </span>
        )}
      </div>
      <h3 className="mb-1.5 line-clamp-2 text-sm font-semibold text-foreground">{hack.title}</h3>
      <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{hack.blurb}</p>
      <div className="mt-auto flex flex-wrap gap-2">
        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-primary btn-sm min-h-[44px] min-w-[44px] touch-manipulation sm:min-h-0 sm:min-w-0"
            aria-label={`Copy ${hack.title} to clipboard`}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Copy
          </button>
        )}
        <Link
          to={viewTo}
          className={`btn btn-sm min-h-[44px] min-w-[44px] touch-manipulation sm:min-h-0 sm:min-w-0 ${showCopy ? 'btn-outline' : 'btn-primary'}`}
          aria-label={`View details for ${hack.title}`}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          View
        </Link>
      </div>
    </motion.article>
  );
}
