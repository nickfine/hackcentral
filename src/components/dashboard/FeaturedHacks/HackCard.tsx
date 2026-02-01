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
  return `${base}/library?asset=${assetId}`;
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
    ? `/library?asset=${hack.assetId}`
    : '/library';

  const copyLabel =
    hack.type === 'asset'
      ? `Copy ${hack.title} to clipboard`
      : `Copy story "${hack.title}" to clipboard`;
  const viewLabel = `View details for ${hack.title}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`group relative flex min-w-0 shrink-0 snap-start flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-lg md:min-w-[280px] md:max-w-[320px] ${
        hack.isRisingStar
          ? 'hover:shadow-secondary/30 hover:ring-2 hover:ring-secondary/20'
          : 'hover:shadow-primary/20'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 shrink-0 items-center gap-2 rounded-lg bg-muted/80 p-2" aria-hidden>
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

      <h3 className="mb-2 min-w-0 line-clamp-2 break-words text-base font-semibold text-foreground">
        {hack.title}
      </h3>
      <p className="mb-4 min-w-0 line-clamp-3 break-words text-sm text-muted-foreground">{hack.blurb}</p>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <User className="h-3.5 w-3" aria-hidden />
          {hack.authorName}
        </span>
        {hack.reuseCount > 0 && (
          <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
            Reused {hack.reuseCount}×
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-primary btn-sm inline-flex min-h-[44px] min-w-[44px] items-center gap-2 md:min-h-0 md:min-w-0"
          aria-label={copyLabel}
        >
          <Copy className="h-4 w-4 shrink-0" aria-hidden />
          Copy {hack.type === 'asset' ? 'Asset' : 'Story'}
        </button>
        <Link
          to={viewDetailsTo}
          className="btn btn-outline btn-sm inline-flex min-h-[44px] min-w-[44px] items-center gap-2 md:min-h-0 md:min-w-0"
          aria-label={viewLabel}
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          View Details
        </Link>
      </div>
    </motion.article>
  );
}
