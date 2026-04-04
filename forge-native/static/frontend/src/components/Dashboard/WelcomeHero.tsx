import type { HomeHeroSignal } from '../../utils/homeDashboard';

export interface WelcomeHeroProps {
  onSubmitHack: () => void;
  onBrowseFeaturedHacks?: () => void;
  onRequestMentor?: () => void;
  onNotify?: () => void;
  signal: HomeHeroSignal;
  ctaDisabled?: boolean;
}

export function WelcomeHero({
  onSubmitHack,
  onBrowseFeaturedHacks,
  onRequestMentor,
  onNotify,
  signal,
  ctaDisabled = false,
}: WelcomeHeroProps): JSX.Element {
  const signalCardClasses = [
    'dashboard-hero-signal-card',
    signal.kind === 'loading' ? 'dashboard-hero-signal-card-loading' : '',
    signal.kind === 'hackday' ? 'dashboard-hero-signal-card-hackday' : '',
    signal.kind === 'hack' ? 'dashboard-hero-signal-card-hack' : '',
    signal.kind === 'notify' ? 'dashboard-hero-signal-card-notify' : '',
    signal.kind === 'notify' && onNotify ? 'dashboard-hero-signal-card-action' : '',
  ]
    .filter(Boolean)
    .join(' ');

  let signalContent: JSX.Element;

  if (signal.kind === 'loading') {
    signalContent = (
      <div className="dashboard-hero-signal-skeleton" aria-label="Loading live signal">
        <span className="hero-skeleton hero-skeleton-line hero-skeleton-line-eyebrow" aria-hidden />
        <span className="hero-skeleton hero-skeleton-value" aria-hidden />
        <span className="hero-skeleton hero-skeleton-line hero-skeleton-line-label" aria-hidden />
      </div>
    );
  } else if (signal.kind === 'hackday') {
    const dayLabel = `${signal.daysUntil} day${signal.daysUntil === 1 ? '' : 's'} until hacking starts`;

    signalContent = (
      <>
        <div className="dashboard-hero-signal-live-row">
          <span className="dashboard-hero-signal-pulse" aria-hidden />
          <p className="dashboard-hero-signal-event-name">{signal.eventName}</p>
        </div>
        <p className="dashboard-hero-signal-value" aria-label={dayLabel}>
          {signal.daysUntil}
        </p>
        <p className="dashboard-hero-signal-label">Days until hacking starts</p>
      </>
    );
  } else if (signal.kind === 'hack') {
    signalContent = (
      <>
        <h2 className="dashboard-hero-signal-title">{signal.title}</h2>
        <p className="dashboard-hero-signal-detail">Submitted by {signal.authorName}</p>
      </>
    );
  } else {
    signalContent = (
      <>
        <div className="dashboard-hero-signal-header">
          <span className="dashboard-hero-signal-icon" aria-hidden>
            {signal.icon}
          </span>
          <div className="dashboard-hero-signal-meta">
            <span className="dashboard-hero-signal-kicker">Live signal</span>
            <h2 className="dashboard-hero-signal-title">{signal.title}</h2>
          </div>
        </div>
      </>
    );
  }

  return (
    <section className="card dashboard-hero-card" aria-label="HackDay Central">
      <div className="dashboard-hero-row">
        <div className="dashboard-hero-content">
          <div className="dashboard-hero-copy">
            <h1 className="dashboard-hero-title">Where AI ideas become products.</h1>
            <p className="dashboard-hero-sub">Submit a pain, form a team, run a hack.</p>
          </div>
          <div className="dashboard-hero-actions">
            <button type="button" className="btn btn-primary" onClick={onSubmitHack} disabled={ctaDisabled}>
              Submit a Hack
            </button>
            {onBrowseFeaturedHacks ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={onBrowseFeaturedHacks}
                disabled={ctaDisabled}
              >
                Browse Featured Hacks
              </button>
            ) : null}
            {onRequestMentor ? (
              <button
                type="button"
                className="text-link dashboard-hero-text-link"
                onClick={onRequestMentor}
                disabled={ctaDisabled}
              >
                Request a Mentor
              </button>
            ) : null}
          </div>
        </div>
        {signal.kind === 'notify' && onNotify ? (
          <button type="button" className={signalCardClasses} onClick={onNotify}>
            {signalContent}
          </button>
        ) : (
          <div className={signalCardClasses}>{signalContent}</div>
        )}
      </div>
    </section>
  );
}
