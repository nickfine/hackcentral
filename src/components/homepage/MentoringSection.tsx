/**
 * MentoringSection — full-width card with terracotta left border accent.
 * Three inner cards: vibe coding primer, find a mentor, drop-in sessions.
 * All content is static — links to existing pages.
 */

import { Link } from 'react-router-dom';

const cards = [
  {
    title: 'Vibe coding primer',
    desc: 'What it is, what tools to use and how to ship your first app with AI assistance',
    link: '/guide',
    linkText: 'Read the guide →',
  },
  {
    title: 'Find a mentor',
    desc: 'Pair with an experienced hacker who can guide you through your first build',
    link: '/people',
    linkText: 'Browse mentors →',
  },
  {
    title: 'Drop-in sessions',
    desc: 'Weekly open calls \u2014 bring your half-built thing and we\u2019ll help you unstick it',
    link: '/people',
    linkText: 'See schedule →',
  },
];

export function MentoringSection() {
  return (
    <section
      className="card border-l-[3px] border-l-primary p-7 lg:p-8"
      style={{ boxShadow: 'var(--shadow-section)' }}
      aria-label="Mentoring and support"
      id="mentoring"
    >
      <div className="section-label mb-1.5 text-primary">
        Mentoring &amp; support
      </div>
      <h2 className="font-display text-[22px] font-semibold text-foreground">
        New to vibe coding? You&rsquo;re in the right place.
      </h2>
      <p className="mb-5 mt-1 text-[13px] leading-relaxed text-muted-foreground">
        HackDay Central is built for everyone, not just engineers. If you&rsquo;ve
        got a problem worth solving but don&rsquo;t know how to build, we&rsquo;ll
        help you get started.
      </p>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="soft-panel flex flex-col"
          >
            <div className="text-[13px] font-bold text-foreground">
              {card.title}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {card.desc}
            </p>
            <Link
              to={card.link}
              className="mt-2 text-[11px] font-semibold text-primary transition-colors hover:text-primary-600"
            >
              {card.linkText}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
