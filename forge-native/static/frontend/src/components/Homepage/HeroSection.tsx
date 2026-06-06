import type { EventRegistryItem } from '../../types';

interface HeroSectionProps {
  painCount: number | null;
  hacksActive: number;
  prototypes: number;
  eventsComing: number;
  nextEvent?: EventRegistryItem | null;
  onNavigatePainPoints: () => void;
  onNavigateHacks: () => void;
  onNavigateHackdays: () => void;
  onNavigatePipeline: () => void;
}

function formatEventDate(event: EventRegistryItem): string {
  const dateStr = event.hackingStartsAt;
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function eventStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'running' || s === 'hacking') return 'Live now';
  if (s === 'published' || s === 'open') return 'Registration open';
  return 'Coming soon';
}

function eventStatusMod(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'running' || s === 'hacking') return 'live';
  if (s === 'published' || s === 'open') return 'open';
  return 'soon';
}

const PIPELINE_STAGES = [
  { label: 'Pains', desc: 'Real work problems submitted by the team' },
  { label: 'Hacks', desc: 'Teams attempt rapid solutions' },
  { label: 'Validated prototypes', desc: 'Tested with real users' },
  { label: 'Incubating', desc: 'Resourced and developed' },
  { label: 'Product candidates', desc: 'Ready to scale' },
];

export function HeroSection({
  painCount,
  hacksActive,
  prototypes,
  eventsComing,
  nextEvent,
  onNavigatePainPoints,
  onNavigateHacks,
  onNavigateHackdays,
  onNavigatePipeline,
}: HeroSectionProps): JSX.Element {
  const stats = [
    { value: painCount === null ? '—' : String(painCount), label: 'pain points', onClick: onNavigatePainPoints },
    { value: String(hacksActive), label: 'hacks active', onClick: onNavigatePipeline },
    { value: String(prototypes), label: 'prototypes', onClick: onNavigatePipeline },
    { value: String(eventsComing), label: 'events coming', onClick: onNavigateHackdays },
  ];

  const stageCounts = [painCount ?? null, hacksActive, prototypes, null, null];

  return (
    <section className="hp-hero" aria-label="Hero">
      <div>
        <div className="hp-hero-eyebrow">HackDay Central</div>
        <h1 className="hp-hero-title">
          Surface pains.<br />Build prototypes.<br /><em>Ship products.</em>
        </h1>
        <p className="hp-hero-body">
          The home for Adaptavist&rsquo;s innovation culture. Submit a real work pain, join a team,
          build something&nbsp;&mdash; and watch it move through the pipeline.
        </p>
        <div className="hp-hero-actions">
          <button type="button" className="btn btn-primary" onClick={onNavigatePainPoints}>
            Submit a pain
          </button>
          <button type="button" className="btn btn-outline" onClick={onNavigateHacks}>
            Explore what&rsquo;s built
          </button>
          <button type="button" className="hp-hero-text-link" onClick={onNavigateHackdays}>
            Join a HackDay &rsaquo;
          </button>
        </div>
        <div className="hp-hero-stat-row">
          {stats.map((stat) => (
            <button
              key={stat.label}
              type="button"
              className="hp-hero-stat hp-hero-stat--btn"
              onClick={stat.onClick}
              aria-label={`${stat.value} ${stat.label} — click to explore`}
            >
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right column — live event card, or pipeline teaser */}
      <div className="hp-hero-right">
        {nextEvent ? (
          <div className="hp-event-card hp-event-card--hero">
            <div className="hp-event-card-eyebrow">Next HackDay</div>
            <div className="hp-event-card-name">{nextEvent.eventName}</div>
            {nextEvent.tagline && (
              <div className="hp-event-card-tagline">{nextEvent.tagline}</div>
            )}
            <div className="hp-event-card-footer">
              {formatEventDate(nextEvent) && (
                <span className="hp-date-badge">{formatEventDate(nextEvent)}</span>
              )}
              <span className={`hp-status-badge hp-status-${eventStatusMod(nextEvent.lifecycleStatus)}`}>
                {eventStatusLabel(nextEvent.lifecycleStatus)}
              </span>
            </div>
            <button
              type="button"
              className="hp-event-card-cta"
              onClick={onNavigateHackdays}
            >
              View event &rsaquo;
            </button>
          </div>
        ) : (
          <div className="hp-pipeline-teaser" role="list" aria-label="Innovation pipeline">
            <div className="hp-pipeline-teaser-eyebrow">The pipeline</div>
            {PIPELINE_STAGES.map((stage, i) => (
              <button
                key={stage.label}
                type="button"
                role="listitem"
                className="hp-pipeline-teaser-row"
                onClick={onNavigatePipeline}
                aria-label={`${stage.label}: ${stageCounts[i] !== null ? stageCounts[i] : '—'} — view pipeline`}
              >
                <span className="hp-pipeline-teaser-label">{stage.label}</span>
                <span className="hp-pipeline-teaser-count">
                  {stageCounts[i] !== null ? stageCounts[i] : '—'}
                </span>
              </button>
            ))}
            <button type="button" className="hp-pipeline-teaser-link" onClick={onNavigatePipeline}>
              View full pipeline &rsaquo;
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
