/**
 * HeroNav — pill-shaped in-page navigation bar.
 * Sits above the hero section inside the dashboard page content.
 * Hidden below md: (mobile uses the sidebar/hamburger).
 */

import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { label: 'Pain points', href: '#pain-points' },
  { label: 'Events', href: '#events' },
  { label: 'Tools', href: '#tools' },
  { label: 'Mentoring', href: '#mentoring' },
];

export function HeroNav() {
  const location = useLocation();

  const scrollTo = (hash: string) => {
    const el = document.querySelector(hash);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      className="card hidden items-center justify-between px-4 py-2.5 md:flex"
      style={{ boxShadow: 'var(--shadow-section)' }}
      aria-label="Page navigation"
    >
      {/* Brand mark */}
      <div className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <span className="inline-block h-2 w-2 rounded-full bg-primary" />
        HackDay Central
      </div>

      {/* Section links */}
      <div className="flex gap-5">
        {navLinks.map((link) => (
          <button
            key={link.href}
            type="button"
            onClick={() => scrollTo(link.href)}
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </button>
        ))}
      </div>

      {/* CTA */}
      <Link
        to={location.pathname === '/hackdays' ? '/hackdays' : '/hackdays'}
        className="btn btn-primary btn-sm"
      >
        + New HackDay
      </Link>
    </nav>
  );
}
