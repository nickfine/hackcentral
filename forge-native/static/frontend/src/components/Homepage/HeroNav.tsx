/**
 * HeroNav — pill-shaped in-page nav for the homepage.
 * Hidden below 961px (mobile uses the global tab bar).
 */

interface HeroNavProps {
  onNavigate: (section: string) => void;
  onCreateHackDay: () => void;
}

export function HeroNav({ onNavigate, onCreateHackDay }: HeroNavProps): JSX.Element {
  return (
    <nav className="hp-nav" aria-label="Page navigation">
      <div className="hp-nav-brand">
        <span className="hp-nav-dot" />
        HackDay Central
      </div>
      <div className="hp-nav-links">
        {['Pain points', 'Events', 'Tools', 'Mentoring'].map((label) => (
          <button
            key={label}
            type="button"
            className="hp-nav-link"
            onClick={() => onNavigate(label.toLowerCase().replace(/\s+/g, '-'))}
          >
            {label}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-primary btn-sm" onClick={onCreateHackDay}>
        + New HackDay
      </button>
    </nav>
  );
}
