import type { HomeFeedActivityItem } from '../../types';

interface ActivityFeedProps {
  items: HomeFeedActivityItem[];
  loading: boolean;
  onItemClick: (item: HomeFeedActivityItem) => void;
}

const ACTIVITY_TYPE_LABELS: Record<HomeFeedActivityItem['type'], string> = {
  new_hack: 'New hack',
  trending_problem: 'Trending pain',
  new_artifact: 'New artifact',
  pipeline_movement: 'Pipeline',
  upcoming_hackday: 'Upcoming HackDay',
};

const ACTIVITY_TYPE_MOD: Record<HomeFeedActivityItem['type'], string> = {
  new_hack: 'hack',
  trending_problem: 'pain',
  new_artifact: 'artifact',
  pipeline_movement: 'pipeline',
  upcoming_hackday: 'event',
};

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function ActivityFeed({ items, loading, onItemClick }: ActivityFeedProps): JSX.Element {
  const displayed = items.slice(0, 6);

  return (
    <section className="hp-section" aria-label="Recent activity">
      <div className="hp-eyebrow">Activity</div>
      <div className="hp-sec-title">What&rsquo;s happening</div>
      <div className="hp-feed-grid">
        {loading ? (
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="hp-skeleton hp-feed-skeleton" />
          ))
        ) : displayed.length === 0 ? (
          <p className="hp-feed-empty">Activity will appear here as the community builds.</p>
        ) : (
          displayed.map((item) => (
            <button
              key={item.id}
              type="button"
              className="hp-feed-card"
              onClick={() => onItemClick(item)}
            >
              <span className={`hp-feed-pill hp-feed-pill--${ACTIVITY_TYPE_MOD[item.type]}`}>
                {ACTIVITY_TYPE_LABELS[item.type]}
              </span>
              <p className="hp-feed-title">{item.title}</p>
              <div className="hp-feed-meta">
                {item.actorName && <span>{item.actorName}</span>}
                {item.actorName && <span aria-hidden="true">&middot;</span>}
                <span>{formatRelativeTime(item.occurredAt)}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
