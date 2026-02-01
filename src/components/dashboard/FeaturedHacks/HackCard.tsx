import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, Code, Bot, PenLine, Check } from 'lucide-react';
import { HACK_TYPE_BADGE_COLORS } from '@/constants/project';

const TYPE_LABELS: Record<string, string> = {
  prompt: 'Prompt',
  skill: 'Skill',
  app: 'App',
};

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
  status?: string;
}

interface HackCardProps {
  hack: FeaturedHackItem;
  /** Optional: called when copy to clipboard succeeds (kept for API compatibility) */
  onCopySuccess?: () => void;
  /** Optional: show Starter badge (kept for API compatibility) */
  isStarter?: boolean;
}

export function HackCard({ hack }: HackCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();

  const viewDetailsTo = hack.type === 'asset' && hack.assetId
    ? `/library/${hack.assetId}`
    : '/hacks?tab=completed';

  const handleCardClick = () => {
    navigate(viewDetailsTo);
  };

  const typeIcons: Record<string, React.ReactNode> = {
    prompt: <FileText className="h-4 w-4" />,
    skill: <Code className="h-4 w-4" />,
    app: <Bot className="h-4 w-4" />,
  };
  const typeLabel = hack.type === 'asset' && hack.assetType
    ? (TYPE_LABELS[hack.assetType] ?? hack.assetType)
    : 'Story';

  return (
    <motion.article
      role="button"
      tabIndex={0}
      aria-label={`View details for ${hack.title}`}
      onClick={handleCardClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), handleCardClick())}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.2 }}
      className={`group relative flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:shadow-primary/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${hack.type === 'asset' && hack.status === 'deprecated' ? 'opacity-75' : ''}`}
    >
      {/* Verified badge (theme success) */}
      {hack.type === 'asset' && hack.status === 'verified' && (
        <div
          className="absolute top-3 right-3 size-5 flex items-center justify-center bg-[var(--color-success)] text-white rounded-full p-0.5"
          aria-label="Verified"
        >
          <Check className="h-3 w-3" strokeWidth={2.5} />
        </div>
      )}

      {/* Top row: type icon + title (title flows to two lines) */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="p-1.5 rounded bg-primary/10 text-primary shrink-0">
            {hack.type === 'asset' && hack.assetType
              ? (typeIcons[hack.assetType] ?? <FileText className="h-4 w-4" />)
              : <PenLine className="h-4 w-4 text-secondary" />}
          </div>
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 break-words min-w-0">{hack.title}</h3>
        </div>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
        {hack.blurb}
      </p>

      {/* Bottom row: type badge + reuse count — grid keeps same line on all cards */}
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 pt-1 min-w-0 mt-auto">
        <span className={`badge text-xs border w-fit whitespace-nowrap truncate min-w-0 max-w-full ${hack.type === 'asset' && hack.assetType ? (HACK_TYPE_BADGE_COLORS[hack.assetType] ?? 'bg-muted text-muted-foreground border-border') : 'bg-secondary/10 text-secondary border-secondary/20'}`}>
          {typeLabel}
        </span>
        <span className="text-xs text-muted-foreground whitespace-nowrap text-right">
          {hack.reuseCount} reuse{hack.reuseCount !== 1 ? 's' : ''}
        </span>
      </div>
    </motion.article>
  );
}
