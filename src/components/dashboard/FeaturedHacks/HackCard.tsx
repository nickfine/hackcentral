import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, FileCode, PenLine, Sparkles, User } from 'lucide-react';
import toast from 'react-hot-toast';

export interface FeaturedHackItem {
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
}

interface HackCardProps {
  hack: FeaturedHackItem;
  /** Called when copy to clipboard succeeds (e.g. for first-copy confetti) */
  onCopySuccess?: () => void;
  /** Show "Starter" badge (copy in seconds) for newbie-friendly hacks */
  isStarter?: boolean;
}

function getAssetDetailUrl(assetId: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/library/${assetId}`;
}

export function HackCard({ hack, onCopySuccess, isStarter }: HackCardProps) {
  const shouldReduceMotion = useReducedMotion();

  const handleCopy = () => {
    const text =
      hack.type === 'asset' && hack.assetId
        ? `${hack.title}\n\n${hack.blurb}\n\nView: ${getAssetDetailUrl(hack.assetId)}`
        : `${hack.title}\n\n${hack.blurb}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => {
          toast.success('Copied to clipboard!');
          onCopySuccess?.();
        },
        () => toast.error('Failed to copy')
      );
    } else {
      toast.error('Clipboard not available');
    }
  };

  const viewDetailsTo = hack.type === 'asset' && hack.assetId
    ? `/library/${hack.assetId}`
    : '/hacks?tab=completed';

  // Show Copy for stories, and for assets that are prompt/skill (or when assetType missing for backwards compatibility)
  const showCopy =
    hack.type === 'story' ||
    (hack.type === 'asset' && (hack.assetType === undefined || hack.assetType === 'prompt' || hack.assetType === 'skill'));
  const copyLabel =
    hack.type === 'asset'
      ? `Copy ${hack.title} to clipboard`
      : `Copy story "${hack.title}" to clipboard`;
  const viewLabel = `View details for ${hack.title}`;

  {/* 8pt card: p-6 padding, rounded-xl, subtle lift on hover (Linear-like) */}
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.2 }}
      className={`group relative flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
        hack.isRisingStar
          ? 'hover:shadow-secondary/30 hover:ring-2 hover:ring-secondary/20'
          : 'hover:shadow-primary/20'
      }`}
    >
      {/* 8pt internal: mb-4 badge row, generous icon padding */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 shrink-0 items-center gap-2 rounded-lg bg-muted/60 p-2.5" aria-hidden>
          {hack.type === 'asset' ? (
            <FileCode className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          ) : (
            <PenLine className="h-5 w-5 shrink-0 text-secondary" aria-hidden />
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {isStarter && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
              title="Copy in seconds"
            >
              Starter
            </span>
          )}
          {hack.isRisingStar ? (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary group-hover:bg-secondary/20 group-hover:shadow-md group-hover:shadow-secondary/20"
              title="First-time or frontline contributor"
            >
              <Sparkles className="h-3 w-3" aria-hidden />
              Rising Star
            </span>
          ) : null}
        </div>
      </div>

      <h3 className="mb-3 min-w-0 line-clamp-2 break-words text-lg font-semibold leading-snug text-foreground">
        {hack.title}
      </h3>
      <div className="min-h-0 flex-1 mb-4">
        <p className="line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground">{hack.blurb}</p>
      </div>

      {/* Metadata pushed to bottom with mt-auto for uniform card height */}
      <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" aria-hidden />
          {hack.authorName}
        </span>
        {hack.reuseCount > 0 && (
          <span className="rounded-md bg-muted px-2 py-0.5 font-medium">
            Reused {hack.reuseCount}×
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-primary btn-sm inline-flex min-h-[44px] min-w-[44px] items-center gap-2 md:min-h-0 md:min-w-0"
            aria-label={copyLabel}
          >
            <Copy className="h-4 w-4 shrink-0" aria-hidden />
            Copy {hack.type === 'asset' ? 'Hack' : 'Story'}
          </button>
        )}
        <Link
          to={viewDetailsTo}
          className={`btn btn-sm inline-flex min-h-[44px] min-w-[44px] items-center gap-2 md:min-h-0 md:min-w-0 ${showCopy ? 'btn-outline' : 'btn-primary'}`}
          aria-label={viewLabel}
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          View Details
        </Link>
      </div>
    </motion.article>
  );
}
