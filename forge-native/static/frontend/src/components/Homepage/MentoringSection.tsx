interface MentoringSectionProps {
  onNavigateGuide: () => void;
  onNavigateMentors: () => void;
}

const cards = [
  {
    title: 'Vibe coding primer',
    desc: 'What it is, what tools to use and how to ship your first app with AI assistance',
    linkText: 'Read the guide →',
    action: 'guide' as const,
  },
  {
    title: 'Find a mentor',
    desc: 'Pair with an experienced hacker who can guide you through your first build. Pairing and drop-in help sessions available.',
    linkText: 'Browse mentors →',
    action: 'mentors' as const,
  },
];

export function MentoringSection({
  onNavigateGuide,
  onNavigateMentors,
}: MentoringSectionProps): JSX.Element {
  const handleClick = (action: 'guide' | 'mentors') => {
    if (action === 'guide') onNavigateGuide();
    else onNavigateMentors();
  };

  return (
    <section className="hp-mentor-section" aria-label="Mentoring and support" id="hp-mentoring">
      <div className="hp-eyebrow">Mentoring &amp; support</div>
      <div className="hp-sec-title">New to vibe coding? You&rsquo;re in the right place.</div>
      <div className="hp-sec-sub">
        HackDay Central is built for everyone, not just engineers. If you&rsquo;ve
        got a problem worth solving but don&rsquo;t know how to build, we&rsquo;ll
        help you get started.
      </div>

      <div className="hp-mentor-grid hp-mentor-grid--two">
        {cards.map((card) => (
          <div key={card.title} className="hp-mentor-card">
            <div className="hp-mc-title">{card.title}</div>
            <div className="hp-mc-desc">{card.desc}</div>
            <button
              type="button"
              className="hp-mc-link"
              onClick={() => handleClick(card.action)}
            >
              {card.linkText}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
