/**
 * HeroSection — two-column hero with stats and feature pills.
 */

interface HeroSectionProps {
  painCount: number | null;
  hacksActive: number;
  prototypes: number;
  eventsComing: number;
  onGetStarted: () => void;
  onExploreHacks: () => void;
}

const PILLS = [
  { title: 'Run HackDays', sub: 'Organise events, set challenges, track submissions', bg: 'rgba(47,111,94,0.12)', stroke: 'var(--success)', path: 'M2 7h10M7 2l5 5-5 5' },
  { title: 'Submit pain points', sub: 'Tell us what\u2019s slowing your team down', bg: 'rgba(221,110,66,0.12)', stroke: 'var(--brand)', path: '' },
  { title: 'Discover & vote on ideas', sub: 'Back the problems that matter most to you', bg: 'rgba(221,110,66,0.08)', stroke: 'var(--brand)', path: 'M7 2L8.5 5.5H12L9.3 7.7l1 3.5L7 9.3l-3.3 1.9 1-3.5L2 5.5h3.5L7 2z' },
  { title: 'Get mentoring & support', sub: 'Vibe coding help, pairing and drop-in sessions', bg: 'rgba(20,33,61,0.08)', stroke: 'var(--text)', path: '' },
  { title: 'Access tools & skills', sub: 'Apps and Claude skills built by HackDay teams', bg: 'rgba(47,111,94,0.08)', stroke: 'var(--success)', path: '' },
];

function PillIcon({ pill }: { pill: typeof PILLS[number] }): JSX.Element {
  const style = { background: pill.bg };
  if (pill.title === 'Submit pain points') {
    return (
      <div className="hp-pill-icon" style={style}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="4.5" stroke={pill.stroke} strokeWidth="1.5" />
          <path d="M7 5v3M7 9.5v.5" stroke={pill.stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  if (pill.title === 'Get mentoring & support') {
    return (
      <div className="hp-pill-icon" style={style}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M4 7a3 3 0 106 0 3 3 0 00-6 0z" stroke={pill.stroke} strokeWidth="1.3" />
          <path d="M9.5 4.5L12 2M2 12l2.5-2.5" stroke={pill.stroke} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  if (pill.title === 'Access tools & skills') {
    return (
      <div className="hp-pill-icon" style={style}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="4" width="10" height="7" rx="1.5" stroke={pill.stroke} strokeWidth="1.3" />
          <path d="M5 4V3a2 2 0 014 0v1" stroke={pill.stroke} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  if (pill.title === 'Run HackDays') {
    return (
      <div className="hp-pill-icon" style={style}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d={pill.path} stroke={pill.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="hp-pill-icon" style={style}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d={pill.path} stroke={pill.stroke} strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function HeroSection({
  painCount,
  hacksActive,
  prototypes,
  eventsComing,
  onGetStarted,
  onExploreHacks,
}: HeroSectionProps): JSX.Element {
  const stats = [
    { value: painCount === null ? '\u2014' : String(painCount), label: 'pain points' },
    { value: String(hacksActive), label: 'hacks active' },
    { value: String(prototypes), label: 'prototypes' },
    { value: String(eventsComing), label: 'events coming' },
  ];

  return (
    <section className="hp-hero" aria-label="Hero">
      <div>
        <div className="hp-hero-eyebrow">HackDay Central</div>
        <h1 className="hp-hero-title">
          Where every day<br />is a <em>hack day</em>
        </h1>
        <p className="hp-hero-body">
          The home for Adaptavist&rsquo;s innovation culture. Surface real work
          pains, run HackDays, build tools, and turn the best ideas into
          products&nbsp;&mdash; with support at every step.
        </p>
        <div className="hp-hero-actions">
          <button type="button" className="btn btn-primary" onClick={onGetStarted}>
            Get started
          </button>
          <button type="button" className="btn btn-outline" onClick={onExploreHacks}>
            Explore what&rsquo;s being hacked
          </button>
        </div>
        <div className="hp-hero-stat-row">
          {stats.map((stat, i) => (
            <div key={stat.label} className={`hp-hero-stat${i < stats.length - 1 ? '' : ''}`}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right column — feature pills (shown at desktop via CSS) */}
      <div className="hp-pills">
        {PILLS.map((pill) => (
          <div key={pill.title} className="hp-pill">
            <PillIcon pill={pill} />
            <div>
              <div className="hp-pill-title">{pill.title}</div>
              <div className="hp-pill-sub">{pill.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
