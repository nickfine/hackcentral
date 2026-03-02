/**
 * WelcomeHero — Compact identity strip: title + primary CTA.
 * ECD: slim bar, no billboard; immediate action.
 */
export interface WelcomeHeroProps {
  onSubmitHack: () => void;
  onBrowseFeaturedHacks?: () => void;
  onRequestMentor?: () => void;
}

export function WelcomeHero({
  onSubmitHack,
  onBrowseFeaturedHacks,
  onRequestMentor,
}: WelcomeHeroProps): JSX.Element {
  return (
    <section className="card dashboard-hero-card" aria-label="HackDay Central">
      <div className="dashboard-hero-row">
        <div className="dashboard-hero-copy">
          <h1 className="dashboard-hero-title">HackDay Central</h1>
          <p className="dashboard-hero-sub">Your AI hacking community</p>
        </div>
        <div className="dashboard-hero-actions">
          <button type="button" className="btn btn-primary" onClick={onSubmitHack}>
            Submit a Hack
          </button>
          {onBrowseFeaturedHacks ? (
            <button type="button" className="btn btn-outline" onClick={onBrowseFeaturedHacks}>
              Browse Featured Hacks
            </button>
          ) : null}
          {onRequestMentor ? (
            <button type="button" className="btn btn-outline" onClick={onRequestMentor}>
              Request 15-min Mentor
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
