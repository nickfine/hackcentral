<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HackDay 2026 — Wireframe</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0d1117;
    --bg2: #161b22;
    --bg3: #1c2128;
    --border: rgba(255,255,255,0.1);
    --border2: rgba(255,255,255,0.18);
    --text: #e6edf3;
    --muted: #8b949e;
    --faint: #484f58;
    --teal: #1D9E75;
    --teal-light: #E1F5EE;
    --teal-text: #0f6e56;
    --info-bg: rgba(56,139,253,0.12);
    --info-text: #58a6ff;
    --success-bg: rgba(46,160,67,0.15);
    --success-text: #3fb950;
    --radius: 10px;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #111318;
    color: var(--text);
    padding: 20px;
    font-size: 14px;
    line-height: 1.5;
  }
  .wf { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 6px; }
  .card { background: var(--bg2); border: 0.5px solid var(--border); border-radius: var(--radius); }
  .lbl {
    font-size: 10px; font-weight: 600; color: var(--faint);
    text-transform: uppercase; letter-spacing: .08em;
    margin-top: 12px; margin-bottom: 4px;
  }
  .ann {
    font-size: 11px; color: var(--muted); font-style: italic;
    border-left: 2px solid var(--teal); padding-left: 10px;
    margin-bottom: 6px; line-height: 1.6;
  }

  /* TOP BAR */
  .topbar { display: flex; align-items: center; height: 52px; overflow: hidden; }
  .tb-logo {
    width: 52px; height: 52px; flex-shrink: 0;
    background: #085041; display: flex; align-items: center; justify-content: center;
    border-radius: var(--radius) 0 0 var(--radius);
  }
  .tb-logo-inner { width: 28px; height: 28px; border-radius: 7px; background: var(--teal); opacity: .8; }
  .tb-timer {
    flex: 0 0 auto; padding: 0 20px;
    border-right: 0.5px solid var(--border);
    display: flex; flex-direction: column; align-items: center; gap: 1px;
  }
  .timer-val { font-size: 18px; font-weight: 600; color: var(--text); font-variant-numeric: tabular-nums; }
  .timer-lbl { font-size: 10px; color: var(--muted); }
  .tb-nav { flex: 1; display: flex; align-items: center; gap: 3px; padding: 0 14px; }
  .nav-i { font-size: 12px; color: var(--muted); padding: 4px 10px; border-radius: 6px; }
  .nav-i.a { background: var(--bg3); color: var(--text); font-weight: 500; }
  .tb-user {
    flex: 0 0 auto; padding: 0 14px;
    border-left: 0.5px solid var(--border);
    display: flex; align-items: center; gap: 8px;
  }
  .ava {
    width: 28px; height: 28px; border-radius: 50%;
    background: #085041; display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 600; color: #9FE1CB;
  }
  .u-name { font-size: 12px; font-weight: 500; }
  .u-role { font-size: 10px; color: var(--muted); }

  /* HERO */
  .hero {
    border-left: 3px solid var(--teal);
    padding: 16px 20px;
    display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: start;
  }
  .hero-ey { font-size: 10px; color: var(--muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: .06em; }
  .hero-t { font-size: 22px; font-weight: 600; margin-bottom: 5px; }
  .hero-sub { font-size: 13px; color: var(--muted); }
  .cta-row { display: flex; gap: 8px; margin-top: 12px; }
  .btn-p { font-size: 12px; font-weight: 500; padding: 7px 14px; background: var(--teal); color: #fff; border-radius: 8px; border: none; cursor: pointer; }
  .btn-g { font-size: 12px; font-weight: 500; padding: 7px 14px; background: transparent; border: 0.5px solid var(--border2); color: var(--text); border-radius: 8px; cursor: pointer; }
  .phase-pill { font-size: 11px; font-weight: 500; padding: 4px 11px; background: var(--info-bg); color: var(--info-text); border-radius: 20px; }

  /* STEPPER */
  .stepper { display: flex; align-items: center; padding: 11px 18px; }
  .step { display: flex; align-items: center; flex: 1; }
  .sdot { width: 8px; height: 8px; border-radius: 50%; background: var(--faint); flex-shrink: 0; }
  .sdot.done { background: var(--muted); }
  .sdot.now { background: var(--teal); box-shadow: 0 0 0 3px rgba(29,158,117,0.2); }
  .slbl { font-size: 11px; color: var(--muted); margin-left: 5px; }
  .slbl.now { color: var(--teal); font-weight: 500; }
  .sline { flex: 1; height: 0.5px; background: var(--border); margin: 0 6px; }

  /* STATS */
  .stats { display: grid; grid-template-columns: 1fr 1fr 1fr 1.5fr; gap: 6px; }
  .sc { padding: 12px 16px; }
  .sc.pri { border-left: 3px solid var(--teal); background: rgba(29,158,117,0.07); }
  .sc-lbl { font-size: 10px; color: var(--muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: .05em; }
  .sc-val { font-size: 22px; font-weight: 600; }
  .sc-val.g { color: var(--teal); }
  .sc-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .rbar { height: 3px; border-radius: 2px; background: var(--border); margin-top: 8px; }
  .rfill { height: 100%; width: 67%; background: var(--teal); border-radius: 2px; }

  /* MAIN */
  .main { display: grid; grid-template-columns: 1fr 270px; gap: 6px; }

  /* FEED */
  .feed-hd {
    padding: 11px 14px 10px; border-bottom: 0.5px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .feed-t { font-size: 13px; font-weight: 500; }
  .tabs { display: flex; gap: 3px; }
  .tab { font-size: 11px; padding: 3px 8px; border-radius: 5px; color: var(--muted); }
  .tab.a { background: var(--bg3); color: var(--text); font-weight: 500; }
  .compose {
    padding: 11px 14px; border-bottom: 0.5px solid var(--border);
    display: flex; gap: 8px; align-items: center;
  }
  .c-inp {
    flex: 1; border: 0.5px solid var(--border); border-radius: 8px;
    padding: 7px 11px; font-size: 12px; color: var(--muted);
    background: var(--bg3);
  }
  .c-btn { font-size: 11px; font-weight: 500; padding: 7px 12px; background: var(--teal); color: #fff; border-radius: 7px; border: none; white-space: nowrap; }
  .pi {
    padding: 11px 14px; border-bottom: 0.5px solid var(--border);
    display: flex; gap: 10px; align-items: flex-start;
  }
  .vc { display: flex; flex-direction: column; align-items: center; gap: 1px; flex-shrink: 0; width: 20px; }
  .vup { font-size: 11px; color: var(--muted); }
  .vcnt { font-size: 12px; font-weight: 600; }
  .pb { flex: 1; min-width: 0; }
  .pm { font-size: 11px; color: var(--faint); margin-bottom: 3px; display: flex; gap: 6px; }
  .pn { font-weight: 500; color: var(--muted); }
  .pt { font-size: 13px; line-height: 1.5; }
  .ps { font-size: 10px; padding: 2px 8px; border-radius: 10px; flex-shrink: 0; background: var(--success-bg); color: var(--success-text); }

  /* SIDE */
  .rc { display: flex; flex-direction: column; gap: 6px; }
  .side { padding: 13px 15px; }
  .side-t { font-size: 12px; font-weight: 500; margin-bottom: 9px; }
  .si { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 0.5px solid var(--border); }
  .si:last-child { border-bottom: none; }
  .si-n { font-size: 12px; }
  .si-t { font-size: 11px; color: var(--muted); }
  .si-t.now { color: var(--teal); font-weight: 500; }
  .ri { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
  .rid { width: 8px; height: 8px; border-radius: 50%; background: var(--faint); flex-shrink: 0; }
  .rid.done { background: var(--teal); }
  .ri-lbl { font-size: 12px; color: var(--muted); }
  .ri-lbl.done { color: var(--text); }

  h1.page-title {
    font-size: 13px; color: var(--muted); font-weight: 400; margin-bottom: 16px;
    padding-bottom: 10px; border-bottom: 0.5px solid var(--border);
  }
</style>
</head>
<body>
<div class="wf">
  <h1 class="page-title">HackDay 2026 — Wireframe (Mav review improvements)</h1>

  <div class="lbl">Top bar — timer gets visual weight; all env/config/theme controls move into user menu</div>
  <div class="card topbar">
    <div class="tb-logo"><div class="tb-logo-inner"></div></div>
    <div class="tb-timer">
      <span class="timer-val">2h 14m</span>
      <span class="timer-lbl">until hacking opens</span>
    </div>
    <nav class="tb-nav">
      <span class="nav-i a">Dashboard</span>
      <span class="nav-i">Teams</span>
      <span class="nav-i">Schedule</span>
      <span class="nav-i">Rules</span>
      <span class="nav-i">Results</span>
    </nav>
    <div class="tb-user">
      <div class="ava">N</div>
      <div><div class="u-name">Nick</div><div class="u-role">Admin · Team Captain ▾</div></div>
    </div>
  </div>
  <div class="ann">Timer is the most time-sensitive signal — 18px, with a human-readable label ("until hacking opens" not "EVENT COMPLETE"). DEV / CONFIG OFF / theme toggle all collapse into the user menu dropdown. Bell stays, sits right of nav. Logomark moves into the top bar — the event hero no longer needs it.</div>

  <div class="lbl">Event hero — teal left-border, CTAs above the fold, phase pill replaces vague eyebrow copy</div>
  <div class="card hero">
    <div>
      <div class="hero-ey">Nick's HackDay Test · 20 Apr 2026</div>
      <div class="hero-t">HackDay 2026</div>
      <div class="hero-sub">Hacking starts soon — define your problem, align on your approach, fill any open spots.</div>
      <div class="cta-row">
        <button class="btn-p">Post a pain point</button>
        <button class="btn-g">Find a team</button>
      </div>
    </div>
    <div><div class="phase-pill">Pre-Launch</div></div>
  </div>
  <div class="ann">CTAs stay above the fold. "Sign up" appears only before registration; post-registration it's replaced by the readiness summary. Phase pill moves to the hero — no longer buried below the fold in the stepper.</div>

  <div class="lbl">Phase stepper — dot-based, compact, current phase called out in teal</div>
  <div class="card stepper">
    <div class="step"><div class="sdot done"></div><span class="slbl">Pre-Launch</span></div>
    <div class="sline"></div>
    <div class="step"><div class="sdot now"></div><span class="slbl now">Team Formation</span></div>
    <div class="sline"></div>
    <div class="step"><div class="sdot"></div><span class="slbl">Hacking</span></div>
    <div class="sline"></div>
    <div class="step"><div class="sdot"></div><span class="slbl">Submission</span></div>
    <div class="sline"></div>
    <div class="step"><div class="sdot"></div><span class="slbl">Voting</span></div>
    <div class="sline"></div>
    <div class="step"><div class="sdot"></div><span class="slbl">Results</span></div>
  </div>
  <div class="ann">Stepper is orientation only — it tells you where you are in the event arc, nothing more.</div>

  <div class="lbl">Event pulse — your readiness promoted to priority card (wider, accented, progressbar)</div>
  <div class="stats">
    <div class="card sc"><div class="sc-lbl">Participants</div><div class="sc-val">3</div><div class="sc-sub">2 unassigned</div></div>
    <div class="card sc"><div class="sc-lbl">Teams</div><div class="sc-val">1</div><div class="sc-sub">forming</div></div>
    <div class="card sc"><div class="sc-lbl">Submissions</div><div class="sc-val">0</div><div class="sc-sub">opens at hacking phase</div></div>
    <div class="card sc pri"><div class="sc-lbl">Your readiness</div><div class="sc-val g">2 / 3</div><div class="sc-sub">Submission not yet open</div><div class="rbar"><div class="rfill"></div></div></div>
  </div>
  <div class="ann">The three global stats are equal weight — just counts, no noise. "Your Activity: Ready" was visually identical to those counts, which buried the most user-relevant signal. Now it gets a wider accented card with a progress bar. Removes the separate Readiness panel from the sidebar (it moves to a checklist card in the right column).</div>

  <div class="lbl">Main layout — pain point feed is primary; compose moves inside the feed; right column is three focused panels</div>
  <div class="main">
    <div class="card">
      <div class="feed-hd">
        <span class="feed-t">Pain points</span>
        <div class="tabs"><span class="tab a">Trending</span><span class="tab">Just posted</span></div>
      </div>
      <div class="compose">
        <div class="ava">N</div>
        <div class="c-inp">One thing that slows you down...</div>
        <button class="c-btn">Post gripe</button>
      </div>
      <div class="pi">
        <div class="vc"><span class="vup">▲</span><span class="vcnt">6</span></div>
        <div class="pb"><div class="pm"><span class="pn">Nick Fine</span><span>10d ago</span></div><div class="pt">Pain pain pain</div></div>
        <div class="ps">Open</div>
      </div>
      <div class="pi">
        <div class="vc"><span class="vup">▲</span><span class="vcnt">1</span></div>
        <div class="pb"><div class="pm"><span class="pn">Nick Runner</span><span>5d ago</span></div><div class="pt">I can't ever test a SR behaviour without having to deploy it which is a PITA</div></div>
        <div class="ps">Open</div>
      </div>
      <div class="pi">
        <div class="vc"><span class="vup">▲</span><span class="vcnt">1</span></div>
        <div class="pb"><div class="pm"><span class="pn">John Doe</span><span>10d ago</span></div><div class="pt">User research is always created fresh without any templating or standardisation</div></div>
        <div class="ps">Open</div>
      </div>
    </div>
    <div class="rc">
      <div class="card side">
        <div class="side-t">Coming up</div>
        <div class="si"><span class="si-n">Team Formation Opens</span><span class="si-t now">Now</span></div>
        <div class="si"><span class="si-n">Registration Closes</span><span class="si-t">2h 30m</span></div>
        <div class="si"><span class="si-n">Opening Ceremony</span><span class="si-t">Tomorrow 09:00</span></div>
        <div class="si"><span class="si-n">Hacking Starts</span><span class="si-t">Tomorrow 10:00</span></div>
      </div>
      <div class="ann">Only one "Now." Everything else gets a real time delta or timestamp. Four "NOWs" in a row kills the signal — if everything is urgent, nothing is.</div>
      <div class="card side">
        <div class="side-t">Your checklist</div>
        <div class="ri"><div class="rid done"></div><span class="ri-lbl done">Team joined</span></div>
        <div class="ri"><div class="rid done"></div><span class="ri-lbl done">Profile complete</span></div>
        <div class="ri"><div class="rid"></div><span class="ri-lbl">Submission (opens at hacking phase)</span></div>
      </div>
      <div class="card side">
        <div class="side-t">New here?</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:9px">Post a gripe, upvote what rings true, see who wants to fix it with you. All roles welcome.</div>
        <button class="btn-g" style="font-size:12px;width:100%">Take the 2-minute tour</button>
      </div>
    </div>
  </div>
  <div class="ann" style="margin-top:4px">Compose is the first thing inside the feed — removes a redundant card level. The old "Post a quick gripe" card was buried mid-page and felt disconnected from the feed it fed into. Right column is now three focused panels: what's coming, your checklist, onboarding. Readiness checklist moves out of the stats row where it was squeezed.</div>
</div>
</body>
</html>
