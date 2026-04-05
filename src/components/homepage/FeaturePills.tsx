/**
 * FeaturePills — right column of the hero section.
 * Five stacked pills describing HackDay Central capabilities.
 * Static content — no data dependencies.
 */

const pills = [
  {
    title: 'Run HackDays',
    sub: 'Organise events, set challenges, track submissions',
    iconBg: 'bg-[rgba(47,111,94,0.12)]',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7h10M7 2l5 5-5 5" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Submit pain points',
    sub: 'Tell us what\u2019s slowing your team down',
    iconBg: 'bg-[rgba(221,110,66,0.12)]',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="4.5" stroke="var(--color-primary)" strokeWidth="1.5" />
        <path d="M7 5v3M7 9.5v.5" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Discover & vote on ideas',
    sub: 'Back the problems that matter most to you',
    iconBg: 'bg-[rgba(221,110,66,0.08)]',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2L8.5 5.5H12L9.3 7.7l1 3.5L7 9.3l-3.3 1.9 1-3.5L2 5.5h3.5L7 2z" stroke="var(--color-primary)" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Get mentoring & support',
    sub: 'Vibe coding help, pairing and drop-in sessions',
    iconBg: 'bg-[rgba(20,33,61,0.08)]',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M4 7a3 3 0 106 0 3 3 0 00-6 0z" stroke="var(--color-foreground)" strokeWidth="1.3" />
        <path d="M9.5 4.5L12 2M2 12l2.5-2.5" stroke="var(--color-foreground)" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Access tools & skills',
    sub: 'Apps and Claude skills built by HackDay teams',
    iconBg: 'bg-[rgba(47,111,94,0.08)]',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="4" width="10" height="7" rx="1.5" stroke="var(--color-success)" strokeWidth="1.3" />
        <path d="M5 4V3a2 2 0 014 0v1" stroke="var(--color-success)" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function FeaturePills() {
  return (
    <div className="flex flex-col gap-2">
      {pills.map((pill) => (
        <div
          key={pill.title}
          className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3.5 py-2.5"
        >
          <div
            className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] ${pill.iconBg}`}
          >
            {pill.icon}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-foreground">
              {pill.title}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {pill.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
