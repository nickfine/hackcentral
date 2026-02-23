/**
 * WelcomeHero — Compact identity strip: title + primary CTA.
 * ECD: slim bar, no billboard; immediate action.
 */
export interface WelcomeHeroProps {
  onSubmitHack: () => void;
}

export function WelcomeHero({ onSubmitHack }: WelcomeHeroProps): JSX.Element {
  return (
    <section className="dash-intro" aria-label="HackDay Central">
      <div>
        <h1 className="dash-intro-title">HackDay Central</h1>
        <p className="dash-intro-sub">Your AI hacking community</p>
      </div>
      <button type="button" className="btn btn-primary" onClick={onSubmitHack}>
        Submit a Hack
      </button>
    </section>
  );
}
