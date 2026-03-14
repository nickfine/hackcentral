import type { FeaturedHack, PersonSnapshot, ProjectSnapshot } from '../../types';
import { formatLabel, getInitials } from '../../utils/format';

function getHackStatusTooltip(item: FeaturedHack): string {
  if (item.status === 'verified') return item.demoUrl ? 'Active - demo available' : 'Active';
  if (item.status === 'in_progress' || item.status === 'draft') return 'In progress';
  if (item.status === 'deprecated') return 'Blocked';
  return formatLabel(item.status);
}

function getHackStatusDotClass(status: string): string {
  if (status === 'verified') return 'hack-card-status-dot-active';
  if (status === 'in_progress' || status === 'draft') return 'hack-card-status-dot-progress';
  return 'hack-card-status-dot-blocked';
}

export function HackCard({ item }: { item: FeaturedHack }): JSX.Element {
  const statusTooltip = getHackStatusTooltip(item);
  return (
    <div className="hack-card">
      <div className="hack-card-head">
        <div className="hack-card-title-wrap">
          <h3>{item.title}</h3>
        </div>
        <span
          className={`verified-dot hack-card-verified-dot ${getHackStatusDotClass(item.status)}`}
          aria-label={statusTooltip}
          title={statusTooltip}
        />
      </div>
      <p className="hack-card-copy">{item.description || 'No description provided.'}</p>
      <div className="hack-card-foot">
        <span className={`pill pill-${item.assetType} hack-card-type-pill`}>{formatLabel(item.assetType)}s</span>
        <span className="meta hack-card-meta">{item.reuseCount} reuses</span>
      </div>
    </div>
  );
}

export function ProjectCard({ item }: { item: ProjectSnapshot }): JSX.Element {
  return (
    <article className="card project-card">
      <div className="project-card-head">
        <h3>{item.title}</h3>
        <span className="pill pill-outline">{item.statusLabel}</span>
      </div>
      <p className="project-card-copy">{item.description || 'No description provided.'}</p>
      <div className="project-card-foot">
        {item.hackType ? <span className={`pill pill-${item.hackType}`}>{formatLabel(item.hackType)}s</span> : null}
        <span className="meta">{item.attachedHacksCount} hacks</span>
      </div>
    </article>
  );
}

export function PersonCard({ item }: { item: PersonSnapshot }): JSX.Element {
  const hasSlots = item.mentorSlotsRemaining > 0;
  return (
    <article className="card person-card">
      <div className="person-head">
        <div className="avatar">{getInitials(item.fullName)}</div>
        <div className="person-id">
          <h3>{item.fullName}</h3>
          <span className="pill pill-outline">{item.experienceLabel ?? 'AI Learner'}</span>
        </div>
      </div>
      <div className="person-tags">
        {item.capabilities.length > 0
          ? item.capabilities.slice(0, 3).map((capability) => (
              <span key={`${item.id}-${capability}`} className="soft-tag">
                {capability}
              </span>
            ))
          : null}
      </div>
      {hasSlots ? <div className="slot-pill">Available: {item.mentorSlotsRemaining} slots</div> : null}
    </article>
  );
}
