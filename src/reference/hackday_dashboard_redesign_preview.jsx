export default function HackDayDashboardRedesignPreview() {
  const painPoints = [
    {
      votes: 12,
      tag: 'UX',
      author: 'Nick Fine',
      time: '11d ago',
      title: 'I cannot test ScriptRunner behaviour without deploying every time',
      detail: 'Need a safe behaviour simulator so iteration is faster and less painful.'
    },
    {
      votes: 8,
      tag: 'ENG',
      author: 'Nick Runner',
      time: '6d ago',
      title: 'Fresh user research is created every time without a standard template',
      detail: 'A reusable structure would improve consistency, clarity and handover.'
    },
    {
      votes: 5,
      tag: 'PM',
      author: 'John Doe',
      time: '11d ago',
      title: 'We lose strong ideas because nobody knows who is looking for what',
      detail: 'A clearer matching system would help people find relevant teammates earlier.'
    }
  ]

  const timeline = [
    { label: 'Pre-Launch', sub: 'Now', active: true },
    { label: 'Registration', sub: 'Opens in 11d', active: false },
    { label: 'Team Formation', sub: 'Opens in 18d', active: false },
    { label: 'Hacking', sub: 'Opens in 25d', active: false },
    { label: 'Submission', sub: 'Opens in 26d', active: false },
    { label: 'Judging', sub: 'Opens in 27d', active: false },
    { label: 'Results', sub: 'Opens in 27d', active: false }
  ]

  const schedule = [
    ['11d 17h', 'Registration opens'],
    ['18d 17h', 'Team formation opens'],
    ['24d 17h', 'Registration closes'],
    ['25d 17h', 'Opening ceremony']
  ]

  const stats = [
    { label: 'Your activity', value: 'Ready', meta: 'Your team setup is complete', accent: '67% complete' },
    { label: 'Participants', value: '3', meta: '2 unassigned', accent: 'Small group so far' },
    { label: 'Teams', value: '1', meta: '1 team active', accent: 'Needs more formation' },
    { label: 'Submissions', value: '0', meta: 'Not open yet', accent: 'Awaiting launch' }
  ]

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-[1600px] px-6 py-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(40,210,255,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(106,91,255,0.10),_transparent_30%),linear-gradient(180deg,#0a1526_0%,#0a1222_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_30px_80px_rgba(0,0,0,0.45)]">

          <header className="border-b border-white/8 px-6 py-4 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-orange-400 text-lg font-bold text-slate-950 shadow-lg shadow-cyan-500/10">
                  a
                </div>
                <div>
                  <div className="text-sm font-medium text-white/70">Nick's HackDay Test Friday 20th</div>
                  <div className="text-xs text-white/40">Dashboard</div>
                </div>
              </div>

              <nav className="hidden items-center gap-2 rounded-2xl border border-white/8 bg-white/4 p-1.5 text-sm text-white/70 lg:flex">
                {['Dashboard', 'New to HackDay?', 'Teams', 'Schedule', 'Rules', 'Results'].map((item, i) => (
                  <button
                    key={item}
                    className={`rounded-xl px-4 py-2 transition ${i === 0 ? 'bg-white/10 text-white shadow-inner' : 'hover:bg-white/6 hover:text-white'}`}
                  >
                    {item}
                  </button>
                ))}
                <button className="rounded-xl border border-violet-400/40 bg-violet-500/10 px-4 py-2 text-violet-200">Admin panel</button>
              </nav>

              <div className="flex items-center gap-3 self-start rounded-2xl border border-white/8 bg-white/4 px-3 py-2 lg:self-auto">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-300">N</div>
                <div>
                  <div className="text-sm font-medium">Nick</div>
                  <div className="text-xs text-white/45">Admin • Team Captain</div>
                </div>
              </div>
            </div>
          </header>

          <main className="px-6 py-6 lg:px-8 lg:py-8">
            <section className="grid gap-6 lg:grid-cols-[1.55fr_0.75fr]">
              <div className="rounded-[28px] border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(58,207,255,0.10),rgba(255,255,255,0.02))] p-8 shadow-[0_0_0_1px_rgba(0,255,255,0.03)]">
                <div className="mb-4 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
                  Pre-launch now
                </div>
                <div className="max-w-4xl">
                  <h1 className="font-serif text-5xl font-semibold tracking-[-0.04em] text-white lg:text-7xl">HackDay 2026</h1>
                  <p className="mt-4 max-w-2xl text-lg leading-8 text-white/80">
                    Turn friction into projects. Post a real problem, attract collaborators, and shape your approach before hacking starts.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01]">
                    Post a pain point
                  </button>
                  <button className="rounded-2xl border border-cyan-400/35 bg-transparent px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/10">
                    Find a team
                  </button>
                  <div className="ml-1 text-sm text-white/45">Registration opens in 11d 17h • 3 participating</div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-8">
                <div className="text-xs uppercase tracking-[0.24em] text-white/45">HackDay starts in</div>
                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  {[
                    ['11', 'Days'],
                    ['17', 'Hrs'],
                    ['16', 'Mins']
                  ].map(([n, l]) => (
                    <div key={l} className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] px-3 py-5">
                      <div className="text-4xl font-semibold tracking-tight text-cyan-300 lg:text-5xl">{n}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/45">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-white/65">
                  <div className="font-medium text-white">What matters now</div>
                  <div className="mt-1">Get a pain point posted early and make your profile team-ready before registration opens.</div>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-[24px] border border-white/8 bg-white/[0.03] px-5 py-5">
              <div className="grid gap-4 md:grid-cols-7">
                {timeline.map((item, i) => (
                  <div key={item.label} className="relative">
                    <div className={`rounded-2xl border px-4 py-4 ${item.active ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/8 bg-white/[0.02]'}`}>
                      <div className={`text-sm font-medium ${item.active ? 'text-cyan-200' : 'text-white/75'}`}>{item.label}</div>
                      <div className="mt-1 text-xs text-white/45">{item.sub}</div>
                    </div>
                    {i < timeline.length - 1 && (
                      <div className="absolute -right-2 top-1/2 hidden h-px w-4 bg-white/12 md:block" />
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">{stat.label}</div>
                  <div className="mt-3 text-4xl font-semibold tracking-tight text-white">{stat.value}</div>
                  <div className="mt-1 text-sm text-white/65">{stat.meta}</div>
                  <div className="mt-4 text-sm font-medium text-cyan-300">{stat.accent}</div>
                </div>
              ))}
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.65fr]">
              <div className="rounded-[28px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(64,212,255,0.06),rgba(255,255,255,0.02))] p-6">
                <div className="flex flex-col gap-4 border-b border-white/8 pb-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-cyan-300">Top pain points</div>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">The live problem feed</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                      Make this the centre of gravity. Capture one meaningful blocker, upvote what matters, and find others who want to solve the same thing.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="rounded-full bg-cyan-400/12 px-4 py-2 text-sm font-medium text-cyan-200">Trending</button>
                    <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/65">Just posted</button>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-white/8 bg-[#0a1628] p-4">
                  <textarea
                    className="min-h-[120px] w-full resize-none rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-white outline-none placeholder:text-white/30"
                    defaultValue={''}
                    placeholder="What is slowing you down? A sentence is enough. Describe the friction, not the solution"
                  />
                  <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <input
                      className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                      placeholder="Your name"
                    />
                    <button className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]">
                      Submit pain point
                    </button>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {painPoints.map((item) => (
                    <div key={item.title} className="flex gap-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 transition hover:border-cyan-400/20 hover:bg-white/[0.045]">
                      <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] px-2 py-3 text-cyan-300">
                        <div className="text-2xl font-semibold leading-none">{item.votes}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45">Up</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
                          <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 font-medium text-cyan-200">{item.tag}</span>
                          <span className="font-medium text-white/75">{item.author}</span>
                          <span>{item.time}</span>
                        </div>
                        <h3 className="mt-2 text-lg font-medium text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/60">{item.detail}</p>
                        <div className="mt-4 flex items-center gap-3">
                          <button className="text-sm text-white/55 hover:text-white">Reply</button>
                          <button className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5">Open</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex justify-center">
                  <button className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-white/70 hover:bg-white/5">See all pain points</button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-6">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">Upcoming schedule</div>
                  <div className="mt-5 space-y-4">
                    {schedule.map(([time, label]) => (
                      <div key={label} className="flex items-start justify-between gap-4 border-b border-white/6 pb-4 last:border-b-0 last:pb-0">
                        <div className="text-sm font-medium text-white/45">{time}</div>
                        <div className="flex-1 text-sm text-white/80">{label}</div>
                      </div>
                    ))}
                  </div>
                  <button className="mt-5 text-sm font-medium text-cyan-300">View full schedule</button>
                </div>

                <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-6">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">New here?</div>
                  <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">You do not have to code</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65">
                    Post a gripe, upvote what rings true, and see who wants to fix it with you. All roles are welcome.
                  </p>
                  <button className="mt-5 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/5">
                    Take the 2-minute tour
                  </button>
                </div>

                <div className="rounded-[26px] border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(64,212,255,0.06),rgba(255,255,255,0.02))] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">Your readiness</div>
                      <div className="mt-2 text-2xl font-semibold text-white">67%</div>
                    </div>
                    <div className="text-sm font-medium text-cyan-300">On track</div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {[
                      ['Team', 'Ready'],
                      ['Submission', 'Not open'],
                      ['Profile', 'Complete']
                    ].map(([label, state], i) => (
                      <div key={label} className={`flex items-center justify-between rounded-2xl px-4 py-3 ${i !== 1 ? 'bg-emerald-400/10 text-emerald-200' : 'bg-white/[0.03] text-white/70'}`}>
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-sm">{state}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full w-[67%] rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" />
                  </div>
                  <button className="mt-5 rounded-2xl border border-cyan-400/20 px-4 py-3 text-sm font-medium text-cyan-200 hover:bg-cyan-400/10">
                    Complete next step
                  </button>
                </div>
              </div>
            </section>

            <footer className="mt-8 flex flex-col gap-3 border-t border-white/8 pt-6 text-xs text-white/35 md:flex-row md:items-center md:justify-between">
              <div>Last updated 22/04/2026, 14:32:27</div>
              <div>HackCentral</div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  )
}
