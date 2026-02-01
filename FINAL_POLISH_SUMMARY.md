# Final Polish Round — Dashboard (Feb 2026)

## Summary

Production-ready refinements for the HackDay Central AI Maturity Dashboard: live activity pulse, collective copy, newbie invitation, micro-celebrations, carousel polish, and accessibility/mobile.

---

## 1. Live Activity Pulse

- **Backend:** `convex/metrics.ts` — new `getActivityPulse` query returns `newAssetsThisWeek`, `reusesLast24h`, `weeklyActiveCount`.
- **Component:** `LiveActivityPulse.tsx` — small widget with soft pulsing dot (Framer Motion), copy priority: new assets this week → reuses last 24h → weekly active → fallback "Knowledge spreading — join the wildfire!"
- **Placement:** Hero card, below Next Milestone; light theme override for dark hero (`text-slate-200`, `border-cyan-500/30`, `bg-cyan-500/10`).
- **Rationale:** Real-time freshness drives FOMO and signals momentum without clutter.

---

## 2. Collective Copy & Hero

- **Hero subtitle:** "We're in [Stage] — knowledge spreading like wildfire. Every copy pushes us to Transformation." (when &lt; 100%.)
- **Showcase header:** "Community Wins — reusable magic from your peers."
- **Newbie banner:** When there are wins, line above carousel: "Your first copy could earn Rising Star — start here in under 10 seconds."

---

## 3. Carousel Enhancements

- **Pause on hover:** Carousel container `onMouseEnter` / `onMouseLeave` toggles autoplay.
- **Low-content nudge:** When `1 <= wins.length < 4`, append a CTA card: "Be the first Rising Star this week! Submit your win →" with primary button.
- **Keyboard nav:** Outer carousel wrapper is focusable (`tabIndex={0}`), `ArrowLeft` / `ArrowRight` move to previous/next slide; `aria-label` includes "use arrow keys to navigate."

---

## 4. Newbie Invitation & Stats Micro-copy

- **AI Contributors:** "1 pioneer sparked 33% — add your spark today?" (or N pioneers + same CTA).
- **Weekly Active:** "1 active this week — be #2 and unlock the next milestone!" when count is 1; otherwise "N active this week — every copy counts" or "Be the one this week — contribute to stay active."

---

## 5. Micro-celebrations & Visual Polish

- **Hero progress glow:** When `currentProgress >= 65` and &lt; 100, progress bar gets a soft cyan box-shadow (Framer Motion `animate`).
- **Confetti:** When weekly active count increases vs. last value in `sessionStorage` (`hackcentral_weekly_active`), one restrained burst (30 + 20 particles, cyan/magenta/purple), disabled when `useReducedMotion()`.
- **WinCard hover:** Rising Star cards get `hover:shadow-secondary/30 hover:ring-2 hover:ring-secondary/20`; others `hover:shadow-primary/20`. Rising Star badge gets `group-hover:bg-secondary/20 group-hover:shadow-md group-hover:shadow-secondary/20`.

---

## 6. Accessibility & Mobile

- **Aria-labels:** Copy button: "Copy [asset title] to clipboard" / "Copy story \"[title]\" to clipboard". View Details: "View details for [title]."
- **Carousel:** Focusable region with keyboard hint; dots remain tablist/tab with `aria-selected`.
- **Touch targets:** WinCard CTAs keep `min-h-[44px] min-w-[44px]` on mobile (overridden on `md:`).

---

## 7. Tailwind / CSS

- **globals.css:** `animate-pulse-soft` keyframes (opacity + scale), `.glow-milestone` utility (cyan box-shadow). LiveActivityPulse uses Framer Motion for the dot; pulse-soft available for other uses.

---

## Files Touched

- `convex/metrics.ts` — `getActivityPulse`
- `src/components/dashboard/LiveActivityPulse.tsx` — new
- `src/components/dashboard/index.ts` — export LiveActivityPulse
- `src/components/dashboard/HeroJourney/HeroJourneyVisualization.tsx` — subtitle, LiveActivityPulse, progress glow
- `src/components/dashboard/FeaturedWins/FeaturedWinsShowcase.tsx` — header copy, newbie banner, pause-on-hover, low-content nudge, keyboard nav
- `src/components/dashboard/FeaturedWins/WinCard.tsx` — aria-labels with title, Rising Star hover glow
- `src/pages/Dashboard.tsx` — stat micro-copy, confetti effect (sessionStorage + useReducedMotion)
- `src/styles/globals.css` — pulse-soft, glow-milestone

---

## Rationale (Motivation & Trends)

- **Live pulse:** FOMO and "things are happening" without overwhelming; aligns with real-time insights expectations.
- **Collective language:** "We're in Scale", "Community Wins", "every copy" reinforce belonging and shared progress.
- **Newbie nudges:** Low-friction, time-bound ("under 10 seconds", "be #2") lower barrier and spotlight first-time wins.
- **Micro-celebrations:** Confetti on weekly-active increase and hero glow near milestone reward progress and make the dashboard feel alive; restrained and respectful of `prefers-reduced-motion`.
