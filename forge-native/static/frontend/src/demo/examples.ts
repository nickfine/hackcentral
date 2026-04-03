export interface DemoExampleItem {
  eyebrow?: string;
  title: string;
  description: string;
  meta?: string;
}

export const DEMO_ACTIVITY_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'New hack',
    title: 'Jira Epic Breakdown Copilot published by Delivery Ops',
    description: 'Adopted by two squads this week after speeding backlog prep by 3.4 hours per sprint.',
    meta: '14 minutes ago',
  },
  {
    eyebrow: 'Pipeline movement',
    title: 'Claims triage assistant moved into Validated Prototype',
    description: 'Pilot notes show a 22% drop in repeat triage effort across the service desk.',
    meta: 'Yesterday',
  },
  {
    eyebrow: 'Upcoming HackDay',
    title: 'Retail AI Sprint opens registrations next Tuesday',
    description: 'Twelve challenge statements are already scoped and looking for teammates.',
    meta: 'Next event',
  },
];

export const DEMO_RECOMMENDATION_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Recommended',
    title: 'Prompt QA checklist for release managers',
    description: 'Popular with teams shipping customer-facing automation and scored highly for reuse.',
    meta: '94% match',
  },
  {
    eyebrow: 'Recommended',
    title: 'Guide pathway: From pain intake to first prototype',
    description: 'Best match for analysts and product managers submitting their first hack this month.',
    meta: '91% match',
  },
  {
    eyebrow: 'Recommended',
    title: 'Meeting notes summariser skill pack',
    description: 'Frequently forked by delivery teams working across Confluence and Jira.',
    meta: '88% match',
  },
];

export const DEMO_SHOWCASE_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Prompt',
    title: 'Incident review drafter',
    description: 'Turns Slack threads and ticket history into a first-pass post-incident write-up.',
    meta: '38 reuses',
  },
  {
    eyebrow: 'Skill',
    title: 'Confluence stale-page auditor',
    description: 'Scans space trees, flags stale content, and drafts a remediation summary for owners.',
    meta: '12 teams using',
  },
  {
    eyebrow: 'App',
    title: 'Risk control evidence collector',
    description: 'Bundles screenshots, links, and owner notes into a review-ready evidence pack.',
    meta: 'Featured this week',
  },
];

export const DEMO_SHOWCASE_DETAIL_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Context',
    title: 'Team: Platform Enablement',
    description: 'Shared by Priya S., linked to the March HackDay, and promoted after a live ops pilot.',
  },
  {
    eyebrow: 'Artifacts',
    title: 'Produced a prompt pack, operating guide, and tracking template',
    description: 'Each artifact is reused independently so new teams can adopt without cloning the full project.',
  },
  {
    eyebrow: 'Solved pains',
    title: 'Closed repeat backlog prep and handoff pain points',
    description: 'The hack is mapped to two pains so ROI and reuse stay visible downstream.',
  },
];

export const DEMO_PEOPLE_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Mentor',
    title: 'Priya Shah',
    description: 'Product strategy, prompt design, and governance reviews for customer-facing workflows.',
    meta: '2 mentor slots open',
  },
  {
    eyebrow: 'Builder',
    title: 'Marcus Bell',
    description: 'Automation engineer pairing on Forge apps, workflow orchestration, and evaluation harnesses.',
    meta: 'Recently shipped 3 hacks',
  },
  {
    eyebrow: 'Analyst',
    title: 'Amina Noor',
    description: 'Great partner for domain discovery, requirements shaping, and business impact framing.',
    meta: 'Looking for HackDay teammates',
  },
];

export const DEMO_PROJECT_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Project',
    title: 'Claims triage copilot rollout',
    description: 'An in-flight project linking two hacks, one prompt pack, and a live service workflow.',
    meta: 'Validated Prototype',
  },
  {
    eyebrow: 'Project',
    title: 'Audit evidence collector',
    description: 'A shared project for automating evidence gathering across controls and review cycles.',
    meta: 'Incubating Project',
  },
  {
    eyebrow: 'Project',
    title: 'Weekly status recap assistant',
    description: 'Started from a reused prompt and now tracked as a measurable productivity initiative.',
    meta: 'Hack stage',
  },
];

export const DEMO_ADOPTION_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'From Platform Enablement',
    title: 'Risk Ops adopted the onboarding evaluator skill',
    description: 'Three reuse events this month after the team localized the scoring rubric.',
    meta: '3 reuses',
  },
  {
    eyebrow: 'From Delivery Ops',
    title: 'Customer Success reused the meeting notes summariser',
    description: 'The workflow now creates action items directly into the weekly account review page.',
    meta: '2 reuses',
  },
  {
    eyebrow: 'From Retail Technology',
    title: 'Service Desk forked the incident review drafter',
    description: 'Adapted with team-specific prompts and linked evidence templates.',
    meta: '4 reuses',
  },
];

export const DEMO_TREND_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'January',
    title: 'Median time to first hack: 7.2 days',
    description: 'Most first-time contributors started by forking an existing prompt or skill.',
  },
  {
    eyebrow: 'February',
    title: 'Median time to first hack: 5.9 days',
    description: 'Guide pathways and mentor pairing reduced the setup time for new builders.',
  },
  {
    eyebrow: 'March',
    title: 'Median time to first hack: 4.8 days',
    description: 'The latest onboarding sprint drove faster submissions across three teams.',
  },
];

export const DEMO_ROI_TREND_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'March',
    title: '28 outputs from £1,320 estimated spend',
    description: 'Spread across 11 completed hacks, 9 artifacts, and 8 pipeline advancements.',
  },
  {
    eyebrow: 'February',
    title: '21 outputs from £1,040 estimated spend',
    description: 'The strongest savings came from reused prompt packs and prebuilt Confluence helpers.',
  },
  {
    eyebrow: 'January',
    title: '16 outputs from £910 estimated spend',
    description: 'Most activity concentrated in experimentation and prototype validation.',
  },
];

export const DEMO_ROI_TEAM_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Team',
    title: 'Platform Enablement',
    description: '11 outputs generated with an estimated £420 spend.',
  },
  {
    eyebrow: 'Team',
    title: 'Risk Ops',
    description: '8 outputs generated with an estimated £310 spend.',
  },
  {
    eyebrow: 'Team',
    title: 'Delivery Ops',
    description: '7 outputs generated with an estimated £270 spend.',
  },
];

export const DEMO_ROI_PERSON_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Person',
    title: 'Priya Shah',
    description: '5 outputs attributed across prompts, skills, and pathway contributions.',
  },
  {
    eyebrow: 'Person',
    title: 'Marcus Bell',
    description: '4 outputs attributed, mostly tied to reusable app scaffolds and evaluations.',
  },
  {
    eyebrow: 'Person',
    title: 'Amina Noor',
    description: '3 outputs attributed with strong adoption in discovery and triage workflows.',
  },
];

export const DEMO_ROI_BUSINESS_UNIT_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Business unit',
    title: 'Operations',
    description: '14 outputs with the strongest conversion from pains to hack prototypes.',
  },
  {
    eyebrow: 'Business unit',
    title: 'Client Delivery',
    description: '9 outputs driven by high reuse of prompt packs and reporting templates.',
  },
  {
    eyebrow: 'Business unit',
    title: 'Risk',
    description: '5 outputs with the highest average spend efficiency this quarter.',
  },
];

export const DEMO_ARTIFACT_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Prompt',
    title: 'Executive meeting recap prompt pack',
    description: 'Summarises meetings, extracts actions, and drafts a shareable follow-up in Confluence.',
    meta: '21 reuses',
  },
  {
    eyebrow: 'Template',
    title: 'HackDay retro template',
    description: 'A ready-made retro page with experiment outcomes, blockers, and next-step prompts.',
    meta: 'Forked 8 times',
  },
  {
    eyebrow: 'Learning',
    title: 'Prompt safety review checklist',
    description: 'A practical governance checklist attached to internal prompt publishing workflows.',
    meta: 'Used by 4 teams',
  },
];

export const DEMO_PAIN_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Pain',
    title: 'Weekly status updates are rebuilt by hand',
    description: 'Three delivery teams spend 2-3 hours each Friday consolidating the same progress notes.',
    meta: '11 votes',
  },
  {
    eyebrow: 'Pain',
    title: 'Control evidence lives in screenshots across six tools',
    description: 'Audits take too long because evidence packs need manual stitching every month.',
    meta: '8 votes',
  },
  {
    eyebrow: 'Pain',
    title: 'Requirements triage is slowed by duplicate Slack questions',
    description: 'Analysts are answering the same questions instead of moving tickets into discovery.',
    meta: '6 votes',
  },
];

export const DEMO_HACKDAY_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Registration',
    title: 'Retail AI Sprint',
    description: 'Theme: store ops productivity. Opens April 18 with 34 people already interested.',
  },
  {
    eyebrow: 'Hacking',
    title: 'Client Delivery Automation Jam',
    description: 'Live this week with 9 teams building proposal, handoff, and reporting accelerators.',
  },
  {
    eyebrow: 'Results',
    title: 'Risk Ops Fix-It Friday',
    description: 'Recently wrapped with five shipped hacks now feeding the shared AI Tooling library.',
  },
];

export const DEMO_SEARCH_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Try searching',
    title: 'Jira breakdown',
    description: 'Find hacks and artifacts related to backlog planning and epic shaping.',
  },
  {
    eyebrow: 'Try searching',
    title: 'Priya Shah',
    description: 'Surface people, projects, and reused hacks connected to a specific contributor.',
  },
  {
    eyebrow: 'Try searching',
    title: 'Risk Ops',
    description: 'See pains, pathways, and active projects connected to a team or domain.',
  },
];

export const DEMO_PATHWAY_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Pathway',
    title: 'Prompt Engineering Foundations',
    description: 'A four-step route through prompt design basics, testing, and safe publishing.',
    meta: '2/4 complete',
  },
  {
    eyebrow: 'Pathway',
    title: 'Pain-to-Prototype Sprint',
    description: 'Helps analysts turn a pain statement into a scoped hack experiment in one afternoon.',
    meta: 'Recommended',
  },
  {
    eyebrow: 'Pathway',
    title: 'Ship Your First Forge Helper',
    description: 'A build-focused pathway for teams moving from prompts into lightweight internal apps.',
    meta: '5 steps',
  },
];

export const DEMO_PATHWAY_DETAIL_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Step 1',
    title: 'Pick a repeated workflow',
    description: 'Start with something your team does every week so the before-and-after value is obvious.',
  },
  {
    eyebrow: 'Step 2',
    title: 'Reuse an existing prompt or skill',
    description: 'Fork a proven starting point instead of designing everything from scratch.',
  },
  {
    eyebrow: 'Step 3',
    title: 'Publish the result with context',
    description: 'Capture limitations, a demo link, and the pain it solves so others can reuse it confidently.',
  },
];

export const DEMO_NOTIFICATION_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Accepted',
    title: 'Priya Shah accepted your mentor pairing request',
    description: 'Suggested next step: share your challenge statement before tomorrow’s working session.',
    meta: '10 minutes ago',
  },
  {
    eyebrow: 'Reuse',
    title: 'Risk Ops reused your evidence collector template',
    description: 'The team forked your artifact and linked it to a live compliance workflow.',
    meta: 'Yesterday',
  },
  {
    eyebrow: 'Results',
    title: 'Retail AI Sprint posted its shortlist',
    description: 'Three hacks you follow are now marked as finalists and ready for showcase review.',
    meta: '2 days ago',
  },
];

export const DEMO_PIPELINE_STAGE_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Pains',
    title: 'Backlog summarisation pain is ready for exploration',
    description: 'High-vote pain statement with clear time-waste data and a team sponsor attached.',
  },
  {
    eyebrow: 'Validated Prototype',
    title: 'Claims triage assistant passed user testing',
    description: 'Now waiting on rollout notes and evidence capture before moving forward.',
  },
  {
    eyebrow: 'Product Candidate',
    title: 'Onboarding evaluator skill is queued for wider adoption',
    description: 'Two teams already reused it, and the owner is preparing an internal launch guide.',
  },
];

export const DEMO_PIPELINE_PAIN_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Pain',
    title: 'Requirements clarification loops',
    description: 'A strong candidate because the team logged repeated delays and a named business owner.',
  },
  {
    eyebrow: 'Pain',
    title: 'Manual audit pack assembly',
    description: 'Worth exploring because the impact is measurable and the evidence sources are known.',
  },
];

export const DEMO_PIPELINE_ITEM_EXAMPLES: DemoExampleItem[] = [
  {
    eyebrow: 'Item',
    title: 'Client recap generator',
    description: 'Owner: Marcus Bell. Next move would be into Validated Prototype after UAT notes land.',
  },
  {
    eyebrow: 'Item',
    title: 'Control evidence collector',
    description: 'Owner: Priya Shah. Close to promotion once governance review comments are resolved.',
  },
];

export const DEMO_SWITCHER_EMPTY_EXAMPLES = 'Examples: Retail AI Sprint, Client Delivery Jam, Risk Ops Fix-It Friday';
