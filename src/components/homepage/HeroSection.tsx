/**
 * HeroSection — two-column hero for the homepage.
 * Left: eyebrow, display title, body copy, CTA buttons, stat row.
 * Right: feature pills (hidden below lg).
 */

import { Link } from 'react-router-dom';
import { FeaturePills } from './FeaturePills';
import { HeroStatRow } from './HeroStatRow';

interface HeroSectionProps {
  hacksActive: number;
  prototypes: number;
  eventsComing: number;
}

export function HeroSection({ hacksActive, prototypes, eventsComing }: HeroSectionProps) {
  return (
    <section
      className="card p-8 lg:p-10"
      style={{ boxShadow: 'var(--shadow-section)' }}
      aria-label="Hero"
    >
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        {/* Left column */}
        <div>
          <div className="section-label mb-2.5 text-primary">
            HackDay Central
          </div>

          <h1 className="font-display text-4xl font-semibold leading-[1.15] text-foreground">
            Where every day
            <br />
            is a <span className="text-primary">hack day</span>
          </h1>

          <p className="mt-3.5 text-sm leading-[1.7] text-muted-foreground">
            The home for Adaptavist&rsquo;s innovation culture. Surface real
            work pains, run HackDays, build tools, and turn the best ideas into
            products&nbsp;&mdash; with support at every step.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link to="/onboarding" className="btn btn-primary">
              Get started
            </Link>
            <Link to="/hacks" className="btn btn-secondary">
              Explore what&rsquo;s being hacked
            </Link>
          </div>

          <HeroStatRow
            hacksActive={hacksActive}
            prototypes={prototypes}
            eventsComing={eventsComing}
          />
        </div>

        {/* Right column — feature pills (hidden on mobile) */}
        <div className="hidden lg:block">
          <FeaturePills />
        </div>
      </div>
    </section>
  );
}
