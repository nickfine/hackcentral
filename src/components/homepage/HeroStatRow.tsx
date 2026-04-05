/**
 * HeroStatRow — four metric counters below the hero CTA buttons.
 * Pulls from getDashboardMetrics + project/event counts.
 */

interface HeroStatRowProps {
  /** Count of projects with status idea|building */
  hacksActive: number;
  /** Count of projects with status completed */
  prototypes: number;
  /** Count of upcoming hackday events */
  eventsComing: number;
}

export function HeroStatRow({ hacksActive, prototypes, eventsComing }: HeroStatRowProps) {
  const stats = [
    { value: '—', label: 'pain points' },          // No data model yet
    { value: String(hacksActive), label: 'hacks active' },
    { value: String(prototypes), label: 'prototypes' },
    { value: String(eventsComing), label: 'events coming' },
  ];

  return (
    <div className="mt-7 flex border-t border-border pt-5">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`flex-1 px-4 first:pl-0 ${i < stats.length - 1 ? 'border-r border-border' : ''}`}
        >
          <strong className="block font-display text-2xl font-semibold text-foreground">
            {stat.value}
          </strong>
          <span className="text-[11px] text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
