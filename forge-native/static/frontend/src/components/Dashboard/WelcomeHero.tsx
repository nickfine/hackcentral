/**
 * WelcomeHero — Compact identity strip: title + primary CTA.
 * ECD: slim bar, no billboard; immediate action.
 */
export interface WelcomeHeroProps {
  onSubmitHack: () => void;
}

export function WelcomeHero({ onSubmitHack }: WelcomeHeroProps): JSX.Element {
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
        </div>
      </div>
    </section>
  );
}
