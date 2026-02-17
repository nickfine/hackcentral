import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BootstrapData,
  CreateHackInput,
  CreateProjectInput,
  Defs,
  FeaturedHack,
  PersonSnapshot,
  ProjectSnapshot,
  UpdateMentorProfileInput,
} from './types';
import {
  buildConfluencePagePath,
  buildSwitcherSections,
  isNavigableConfluencePageId,
  readSwitcherRegistryCache,
  runSwitcherNavigation,
  switcherRowMetaText,
  writeSwitcherRegistryCache,
} from './appSwitcher';

const BOOTSTRAP_TIMEOUT_MS = 15000;
const LOCAL_PREVIEW_HOSTS = new Set(['localhost', '127.0.0.1']);
const HACKS_SCOPE_NOTE = 'Forge currently shows Featured Hacks in this tab (full Completed Hacks parity is pending).';
const TEAM_PULSE_PLACEHOLDER_NOTE =
  'Team Pulse is placeholder mode for now: values are estimated for layout/testing, not official analytics.';

type View = 'dashboard' | 'hacks' | 'team_up' | 'team_pulse';
type HackTab = 'completed' | 'in_progress';
type HackTypeFilter = 'all' | 'prompt' | 'skill' | 'app';
type HackStatusFilter = 'all' | 'draft' | 'in_progress' | 'verified' | 'deprecated';
type MentorFilter = 'hackers' | 'available';
type ModalView = 'none' | 'submit_hack' | 'create_project' | 'mentor_profile';
type RecognitionTab = 'recent' | 'contributors' | 'mentors' | 'reused';

interface NavItem {
  id: View;
  label: string;
  icon: string;
}

interface BulletinPost {
  id: string;
  tag: string;
  title: string;
  description: string;
  author: string;
  time: string;
}

interface Badge {
  id: string;
  label: string;
  count?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◻' },
  { id: 'hacks', label: 'Hacks', icon: '▣' },
  { id: 'team_up', label: 'Team Up', icon: '⚉' },
  { id: 'team_pulse', label: 'Team pulse', icon: '⌁' },
];

const BULLETIN_POSTS: BulletinPost[] = [
  {
    id: 'b1',
    tag: 'Technical Help',
    title: 'Need help making skills',
    description: 'I\'m trying to make a skill to do X, can you help?',
    author: 'Nick Fine',
    time: '1 week ago',
  },
  {
    id: 'b2',
    tag: 'Guidance & Advice',
    title: 'Help teach me token efficiency in Cursor',
    description: 'Can someone help me optimize my token spend in Cursor?',
    author: 'Nick Fine',
    time: '1 week ago',
  },
];

const BADGES: Badge[] = [
  { id: 'b-rising', label: 'Rising Star' },
  { id: 'b-mentor', label: 'Mentor Champion', count: 3 },
  { id: 'b-verify', label: 'Verifier', count: 5 },
  { id: 'b-reused', label: 'Most Reused', count: 12 },
  { id: 'b-early', label: 'Early Adopter' },
];

const LOCAL_PREVIEW_DATA: BootstrapData = {
  viewer: {
    accountId: 'local-preview-user',
    siteUrl: 'localhost',
    timezone: 'America/Los_Angeles',
  },
  source: {
    provider: 'supabase',
    deploymentUrl: 'local-preview',
    schema: 'public',
  },
  summary: {
    totalPeople: 12,
    totalHacks: 38,
    featuredHacks: 8,
    inProgressProjects: 7,
    completedProjects: 3,
    activeMentors: 5,
  },
  featuredHacks: [
    {
      id: 'local-hack-1',
      title: 'Meeting Notes Summarizer',
      description: 'Extract action items, decisions, and key points from meeting notes.',
      assetType: 'prompt',
      status: 'verified',
      reuseCount: 2,
      authorName: 'Alex M',
      visibility: 'org',
      intendedUser: 'Team leads',
      context: 'Weekly standups and retro notes',
      limitations: 'Needs source notes with speaker labels',
      riskNotes: 'Double-check assigned owners before sharing',
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'local-hack-2',
      title: 'Code Review Prompt - Security Focus',
      description: 'Comprehensive code review prompt that focuses on security vulnerabilities.',
      assetType: 'prompt',
      status: 'verified',
      reuseCount: 1,
      authorName: 'Nick Fine',
      visibility: 'org',
      intendedUser: 'Engineers',
      context: 'PR review quality gate',
      limitations: 'Requires full diff context',
      riskNotes: 'Output is advisory only',
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'local-hack-3',
      title: 'Technical Documentation Generator',
      description: 'Generate clear comprehensive docs for APIs and functions.',
      assetType: 'prompt',
      status: 'verified',
      reuseCount: 0,
      authorName: 'Taylor',
      visibility: 'org',
      intendedUser: null,
      context: null,
      limitations: null,
      riskNotes: null,
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'local-hack-4',
      title: 'User Story Expander',
      description: 'Turn brief feature requests into detailed user stories with acceptance criteria.',
      assetType: 'prompt',
      status: 'verified',
      reuseCount: 0,
      authorName: 'Sam',
      visibility: 'org',
      intendedUser: null,
      context: null,
      limitations: null,
      riskNotes: null,
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'local-hack-5',
      title: 'Prompt Engineering Checklist',
      description: 'Checklist to improve prompt quality and reduce hallucinations.',
      assetType: 'skill',
      status: 'verified',
      reuseCount: 0,
      authorName: 'Casey',
      visibility: 'org',
      intendedUser: null,
      context: null,
      limitations: null,
      riskNotes: null,
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'local-hack-6',
      title: 'Customer Support Triage',
      description: 'AI-powered triage for customer support tickets.',
      assetType: 'app',
      status: 'verified',
      reuseCount: 0,
      authorName: 'Jordan',
      visibility: 'org',
      intendedUser: null,
      context: null,
      limitations: null,
      riskNotes: null,
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'local-hack-7',
      title: 'Prompt Injection Defense',
      description: 'Detect and prevent prompt injection in user inputs.',
      assetType: 'skill',
      status: 'in_progress',
      reuseCount: 0,
      authorName: 'Avery',
      visibility: 'org',
      intendedUser: null,
      context: null,
      limitations: null,
      riskNotes: null,
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'local-hack-8',
      title: 'Output Validation Guardrail',
      description: 'Validate AI outputs before sharing with users.',
      assetType: 'skill',
      status: 'deprecated',
      reuseCount: 0,
      authorName: 'Morgan',
      visibility: 'org',
      intendedUser: null,
      context: null,
      limitations: null,
      riskNotes: null,
      sourceRepoUrl: null,
      demoUrl: null,
    },
  ],
  recentProjects: [
    {
      id: 'local-project-1',
      title: 'Confluence release notes template',
      description: 'Auto-draft release notes from merged ticket metadata.',
      status: 'idea',
      statusLabel: 'Idea',
      hackType: 'app',
      ownerName: 'Alex Rivera',
      attachedHacksCount: 2,
      commentCount: 4,
      visibility: 'org',
      workflowTransformed: true,
      aiImpactHypothesis: 'Reduce release-note prep by 40%',
      aiToolsUsed: ['Confluence API', 'Jira API'],
      timeSavedEstimate: 8,
      failuresAndLessons: 'Need better title normalization.',
    },
    {
      id: 'local-project-2',
      title: 'Onboarding copilot',
      description: 'Role-specific onboarding and FAQ assistant.',
      status: 'building',
      statusLabel: 'Building',
      hackType: 'prompt',
      ownerName: 'Sam Chen',
      attachedHacksCount: 4,
      commentCount: 8,
      visibility: 'org',
      workflowTransformed: true,
      aiImpactHypothesis: 'Lower onboarding support requests by 30%',
      aiToolsUsed: ['ChatGPT'],
      timeSavedEstimate: 18,
      failuresAndLessons: 'Prompt tuning helped reduce hallucinations.',
    },
    {
      id: 'local-project-3',
      title: 'Token usage monitor',
      description: 'Track and optimize model usage by workflow.',
      status: 'incubation',
      statusLabel: 'Incubation',
      hackType: 'skill',
      ownerName: 'Jordan Taylor',
      attachedHacksCount: 1,
      commentCount: 2,
      visibility: 'org',
      workflowTransformed: false,
      aiImpactHypothesis: 'Drop token cost by 20%',
      aiToolsUsed: ['Cursor'],
      timeSavedEstimate: 6,
      failuresAndLessons: null,
    },
  ],
  people: [
    {
      id: 'p1',
      fullName: 'Nick Test',
      email: 'nick@nickster.com',
      experienceLevel: 'curious',
      experienceLabel: 'AI Curious',
      mentorCapacity: 0,
      mentorSessionsUsed: 0,
      mentorSlotsRemaining: 0,
      capabilities: ['Happy to Mentor'],
    },
    {
      id: 'p2',
      fullName: 'Nick Fine',
      email: 'nick.fine@example.com',
      experienceLevel: 'curious',
      experienceLabel: 'AI Curious',
      mentorCapacity: 3,
      mentorSessionsUsed: 1,
      mentorSlotsRemaining: 2,
      capabilities: ['AI Experimenter', 'Seeking Mentor', 'ChatGPT User'],
    },
    {
      id: 'p3',
      fullName: 'Alex Rivera',
      email: 'alex@example.com',
      experienceLevel: 'newbie',
      experienceLabel: 'AI Newbie',
      mentorCapacity: 2,
      mentorSessionsUsed: 0,
      mentorSlotsRemaining: 2,
      capabilities: [],
    },
    {
      id: 'p4',
      fullName: 'Sam Chen',
      email: 'sam@example.com',
      experienceLevel: 'curious',
      experienceLabel: 'AI Curious',
      mentorCapacity: 2,
      mentorSessionsUsed: 0,
      mentorSlotsRemaining: 2,
      capabilities: [],
    },
    {
      id: 'p5',
      fullName: 'Jordan Taylor',
      email: 'jordan@example.com',
      experienceLevel: 'comfortable',
      experienceLabel: 'AI Comfortable',
      mentorCapacity: 2,
      mentorSessionsUsed: 0,
      mentorSlotsRemaining: 2,
      capabilities: [],
    },
    {
      id: 'p6',
      fullName: 'Casey Morgan',
      email: 'casey@example.com',
      experienceLevel: 'power_user',
      experienceLabel: 'AI Power User',
      mentorCapacity: 2,
      mentorSessionsUsed: 0,
      mentorSlotsRemaining: 2,
      capabilities: [],
    },
  ],
  registry: [
    {
      id: 'evt-1',
      eventName: 'HackDay 2026',
      icon: '🚀',
      tagline: 'Annual innovation sprint',
      lifecycleStatus: 'hacking',
      confluencePageId: 'local-event-page-1',
      confluenceParentPageId: null,
      schedule: {
        timezone: 'Europe/London',
        hackingStartsAt: '2026-02-10T09:00:00.000Z',
        submissionDeadlineAt: '2026-02-25T17:00:00.000Z',
      },
      hackingStartsAt: '2026-02-10T09:00:00.000Z',
      submissionDeadlineAt: '2026-02-25T17:00:00.000Z',
      rules: {
        allowCrossTeamMentoring: true,
        maxTeamSize: 6,
        requireDemoLink: false,
        judgingModel: 'hybrid',
      },
      branding: {
        accentColor: '#0f766e',
      },
    },
    {
      id: 'evt-2',
      eventName: 'Q2 Innovation Sprint',
      icon: '⚡',
      tagline: 'Quarterly build challenge',
      lifecycleStatus: 'registration',
      confluencePageId: 'local-event-page-2',
      confluenceParentPageId: null,
      schedule: {
        timezone: 'Europe/London',
      },
      hackingStartsAt: null,
      submissionDeadlineAt: null,
      rules: {
        allowCrossTeamMentoring: true,
        maxTeamSize: 5,
        requireDemoLink: false,
        judgingModel: 'panel',
      },
      branding: {
        accentColor: '#0f766e',
      },
    },
  ],
};

function shouldFallbackToPreviewOnBootstrapError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  if (message.includes('permission denied for schema public')) return true;
  if (message.includes('supabase permission error')) return true;
  return message.includes('supabase') && message.includes('(403)');
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

function computeGini(values: number[]): number {
  const cleaned = values.filter((value) => Number.isFinite(value) && value >= 0);
  if (cleaned.length === 0) return 0;

  const sorted = [...cleaned].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((acc, value) => acc + value, 0);

  if (sum === 0) return 0;

  let weighted = 0;
  for (let index = 0; index < n; index += 1) {
    weighted += (index + 1) * sorted[index];
  }

  return (2 * weighted) / (n * sum) - (n + 1) / n;
}

function classifyExperience(level: string | null): 'frontline' | 'leader' | 'other' {
  if (level === 'newbie' || level === 'curious' || level === 'comfortable') {
    return 'frontline';
  }
  if (level === 'power_user' || level === 'expert') {
    return 'leader';
  }
  return 'other';
}

function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isDeprecated(status: string): boolean {
  return status.toLowerCase() === 'deprecated';
}

async function invokeTyped<K extends keyof Defs>(
  name: K,
  payload?: Parameters<Defs[K]>[0]
): Promise<ReturnType<Defs[K]>> {
  const bridge = await import('@forge/bridge');
  return bridge.invoke(name as string, payload) as Promise<ReturnType<Defs[K]>>;
}

function HackCard({ item }: { item: FeaturedHack }): JSX.Element {
  return (
    <article className="card hack-card">
      <div className="hack-card-head">
        <h3>{item.title}</h3>
        {item.status === 'verified' ? <span className="verified-dot" aria-label="Verified" /> : null}
      </div>
      <p className="hack-card-copy">{item.description || 'No description provided.'}</p>
      <div className="hack-card-foot">
        <span className={`pill pill-${item.assetType}`}>{formatLabel(item.assetType)}s</span>
        <span className="meta">{item.reuseCount} reuses</span>
      </div>
    </article>
  );
}

function ProjectCard({ item }: { item: ProjectSnapshot }): JSX.Element {
  return (
    <article className="card project-card">
      <div className="project-card-head">
        <h3>{item.title}</h3>
        <span className="pill pill-outline">{item.statusLabel}</span>
      </div>
      <p className="project-card-copy">{item.description || 'No description provided.'}</p>
      <div className="project-card-foot">
        {item.hackType ? <span className={`pill pill-${item.hackType}`}>{formatLabel(item.hackType)}s</span> : null}
        <span className="meta">{item.attachedHacksCount} hacks</span>
      </div>
    </article>
  );
}

function PersonCard({ item }: { item: PersonSnapshot }): JSX.Element {
  const hasSlots = item.mentorSlotsRemaining > 0;
  return (
    <article className="card person-card">
      <div className="person-head">
        <div className="avatar">{getInitials(item.fullName)}</div>
        <div className="person-id">
          <h3>{item.fullName}</h3>
          <span className="pill pill-outline">{item.experienceLabel ?? 'AI Learner'}</span>
        </div>
      </div>
      <div className="person-tags">
        {item.capabilities.length > 0
          ? item.capabilities.slice(0, 3).map((capability) => (
              <span key={`${item.id}-${capability}`} className="soft-tag">
                {capability}
              </span>
            ))
          : null}
      </div>
      {hasSlots ? <div className="slot-pill">Available: {item.mentorSlotsRemaining} slots</div> : null}
    </article>
  );
}

export function App(): JSX.Element {
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherWarning, setSwitcherWarning] = useState('');
  const switcherRef = useRef<HTMLDivElement | null>(null);
  const switcherMenuRef = useRef<HTMLDivElement | null>(null);

  const [view, setView] = useState<View>('dashboard');
  const [modalView, setModalView] = useState<ModalView>('none');
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [recognitionTab, setRecognitionTab] = useState<RecognitionTab>('recent');

  const [globalSearch, setGlobalSearch] = useState('');

  const [hackTab, setHackTab] = useState<HackTab>('completed');
  const [hackSearch, setHackSearch] = useState('');
  const [hackTypeFilter, setHackTypeFilter] = useState<HackTypeFilter>('all');
  const [hackStatusFilter, setHackStatusFilter] = useState<HackStatusFilter>('all');
  const [showDeprecated, setShowDeprecated] = useState(false);

  const [projectSearch, setProjectSearch] = useState('');

  const [teamSearch, setTeamSearch] = useState('');
  const [teamExperienceFilter, setTeamExperienceFilter] = useState('all');
  const [teamMentorFilter, setTeamMentorFilter] = useState<MentorFilter>('hackers');

  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);

  const [hackTitle, setHackTitle] = useState('');
  const [hackDescription, setHackDescription] = useState('');
  const [hackContent, setHackContent] = useState('');
  const [hackAssetType, setHackAssetType] = useState<'prompt' | 'skill' | 'app'>('prompt');
  const [hackVisibility, setHackVisibility] = useState<'private' | 'org' | 'public'>('org');

  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectHackType, setProjectHackType] = useState<'prompt' | 'skill' | 'app'>('prompt');
  const [projectVisibility, setProjectVisibility] = useState<'private' | 'org' | 'public'>('org');

  const [mentorCapacity, setMentorCapacity] = useState('0');
  const [happyToMentor, setHappyToMentor] = useState(false);
  const [seekingMentor, setSeekingMentor] = useState(false);

  const isLocalPreview =
    typeof window !== 'undefined' && LOCAL_PREVIEW_HOSTS.has(window.location.hostname);

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    let siteUrlForCache: string | null = null;

    try {
      if (isLocalPreview) {
        setBootstrap(LOCAL_PREVIEW_DATA);
        setPreviewMode(true);
        setSwitcherWarning('');
        return;
      }

      const data = await Promise.race([
        invokeTyped('getBootstrapData'),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Bootstrap request timed out.')), BOOTSTRAP_TIMEOUT_MS);
        }),
      ]);

      siteUrlForCache = data.viewer.siteUrl;
      writeSwitcherRegistryCache(data.viewer.siteUrl, data.registry ?? []);
      setBootstrap(data);
      setPreviewMode(false);
      setSwitcherWarning('');
    } catch (error) {
      if (shouldFallbackToPreviewOnBootstrapError(error)) {
        setBootstrap(LOCAL_PREVIEW_DATA);
        setPreviewMode(true);
        setErrorMessage(
          'Live data is temporarily unavailable due to a Supabase permission issue (403). Showing fallback preview data.'
        );
      } else {
        if (siteUrlForCache) {
          const cachedRegistry = readSwitcherRegistryCache(siteUrlForCache);
          if (cachedRegistry) {
            setBootstrap((current) => (current ? { ...current, registry: cachedRegistry } : current));
            setSwitcherWarning('Using cached app switcher entries; live refresh failed.');
          }
        }
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load bootstrap data.');
      }
    } finally {
      setLoading(false);
    }
  }, [isLocalPreview]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  const featuredHacks = bootstrap?.featuredHacks ?? [];
  const allProjects = bootstrap?.recentProjects ?? [];
  const allPeople = bootstrap?.people ?? [];
  const registry = bootstrap?.registry ?? [];
  const switcherSections = useMemo(() => buildSwitcherSections(registry), [registry]);
  const hasNonNavigableSwitcherItems = useMemo(
    () => registry.some((item) => !isNavigableConfluencePageId(item.confluencePageId)),
    [registry]
  );
  const switcherGroups = [
    { title: 'Live Events', items: switcherSections.live },
    { title: 'Upcoming', items: switcherSections.upcoming },
    { title: 'Recent', items: switcherSections.recent },
  ];

  useEffect(() => {
    if (!switcherOpen) return;

    const handlePointerDown = (event: MouseEvent): void => {
      if (switcherRef.current && event.target instanceof Node && !switcherRef.current.contains(event.target)) {
        setSwitcherOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setSwitcherOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [switcherOpen]);

  useEffect(() => {
    if (!switcherOpen || !switcherMenuRef.current) return;
    const firstOption = switcherMenuRef.current.querySelector<HTMLButtonElement>(
      'button[data-switcher-option="true"]:not(:disabled)'
    );
    firstOption?.focus();
  }, [switcherOpen]);

  const filteredHacks = useMemo(() => {
    return featuredHacks.filter((hack) => {
      const search = hackSearch.trim().toLowerCase();
      if (search && !`${hack.title} ${hack.description}`.toLowerCase().includes(search)) return false;
      if (hackTypeFilter !== 'all' && hack.assetType !== hackTypeFilter) return false;
      if (hackStatusFilter !== 'all' && hack.status !== hackStatusFilter) return false;
      if (!showDeprecated && isDeprecated(hack.status)) return false;
      return true;
    });
  }, [featuredHacks, hackSearch, hackStatusFilter, hackTypeFilter, showDeprecated]);

  const featuredTop = filteredHacks.slice(0, 4);

  const filteredProjects = useMemo(() => {
    const search = projectSearch.trim().toLowerCase();
    return allProjects.filter((project) => {
      if (!search) return true;
      return `${project.title} ${project.description}`.toLowerCase().includes(search);
    });
  }, [allProjects, projectSearch]);

  const filteredPeople = useMemo(() => {
    const search = teamSearch.trim().toLowerCase();
    return allPeople.filter((person) => {
      if (teamExperienceFilter !== 'all' && person.experienceLevel !== teamExperienceFilter) return false;
      if (teamMentorFilter === 'available' && person.mentorSlotsRemaining <= 0) return false;
      if (
        search &&
        !`${person.fullName} ${person.email} ${person.capabilities.join(' ')}`.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });
  }, [allPeople, teamExperienceFilter, teamMentorFilter, teamSearch]);

  const helpers = filteredPeople.filter(
    (person) => person.mentorSlotsRemaining > 0 || person.capabilities.length > 0
  );
  const hackers = filteredPeople;

  const aiContributors = bootstrap?.summary.activeMentors ?? 0;
  const totalPeople = bootstrap?.summary.totalPeople ?? 0;
  const aiContributorPct = percent(aiContributors, totalPeople);

  const projectsWithAiCount = (bootstrap?.summary.inProgressProjects ?? 0) + (bootstrap?.summary.completedProjects ?? 0);
  const projectsWithAiPct = percent(projectsWithAiCount, Math.max(projectsWithAiCount + 25, 1));

  const completedHacks = bootstrap?.summary.totalHacks ?? 0;
  const weeklyActive = Math.max(0, (bootstrap?.summary.activeMentors ?? 0) - 5);

  const maturityValue = Math.min(100, (aiContributorPct + projectsWithAiPct) / 2 + 35);
  const nextMilestone = Math.max(0, Math.round(50 - maturityValue));

  const gini = computeGini(featuredHacks.map((hack) => hack.reuseCount));

  const frontline = allPeople.filter((person) => classifyExperience(person.experienceLevel) === 'frontline').length;
  const leaders = allPeople.filter((person) => classifyExperience(person.experienceLevel) === 'leader').length;
  const others = Math.max(0, allPeople.length - frontline - leaders);

  const recentRecognitionRows = featuredHacks
    .slice(0, 2)
    .map((hack) => `${bootstrap?.viewer.accountId} — Library Asset (${hack.title})`);
  const contributorRows = helpers.slice(0, 3).map((person) => `${person.fullName} — ${person.capabilities[0] ?? 'Contributor'}`);
  const mentorRows = helpers
    .filter((person) => person.mentorSlotsRemaining > 0)
    .slice(0, 3)
    .map((person) => `${person.fullName} — ${person.mentorSlotsRemaining} slots`);
  const reusedRows = [...featuredHacks]
    .sort((a, b) => b.reuseCount - a.reuseCount)
    .slice(0, 3)
    .map((hack) => `${hack.title} — ${hack.reuseCount} reuses`);

  const recognitionRows: Record<RecognitionTab, string[]> = {
    recent: recentRecognitionRows,
    contributors: contributorRows,
    mentors: mentorRows,
    reused: reusedRows,
  };

  const recognitionTabLabel: Record<RecognitionTab, string> = {
    recent: 'Recent Activity',
    contributors: 'Top Contributors',
    mentors: 'Top Mentors',
    reused: 'Most Reused Hacks',
  };

  const closeModal = (): void => setModalView('none');

  const handlePostHelpRequest = useCallback(() => {
    setActionError('');
    setActionMessage('Bulletin Board posting is placeholder-only right now; no project was created.');
  }, []);

  const handleCreateHack = useCallback(async () => {
    if (!hackTitle.trim()) {
      setActionError('Hack title is required.');
      return;
    }

    if (previewMode) {
      setActionError('');
      setActionMessage(`Local preview: simulated hack submit for "${hackTitle.trim()}"`);
      setHackTitle('');
      setHackDescription('');
      setHackContent('');
      closeModal();
      return;
    }

    setSaving(true);
    setActionError('');
    setActionMessage('');

    const payload: CreateHackInput = {
      title: hackTitle.trim(),
      description: hackDescription.trim() || undefined,
      assetType: hackAssetType,
      visibility: hackVisibility,
      content: hackContent.trim() || undefined,
    };

    try {
      await invokeTyped('createHack', payload);
      setActionMessage(`Hack submitted: ${payload.title}`);
      setHackTitle('');
      setHackDescription('');
      setHackContent('');
      closeModal();
      await loadBootstrap();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to submit hack.');
    } finally {
      setSaving(false);
    }
  }, [hackAssetType, hackContent, hackDescription, hackTitle, hackVisibility, loadBootstrap, previewMode]);

  const handleCreateProject = useCallback(async () => {
    if (!projectTitle.trim()) {
      setActionError('Project title is required.');
      return;
    }

    if (previewMode) {
      setActionError('');
      setActionMessage(`Local preview: simulated project creation for "${projectTitle.trim()}"`);
      setProjectTitle('');
      setProjectDescription('');
      closeModal();
      return;
    }

    setSaving(true);
    setActionError('');
    setActionMessage('');

    const payload: CreateProjectInput = {
      title: projectTitle.trim(),
      description: projectDescription.trim() || undefined,
      visibility: projectVisibility,
      hackType: projectHackType,
    };

    try {
      await invokeTyped('createProject', payload);
      setActionMessage(`Project created: ${payload.title}`);
      setProjectTitle('');
      setProjectDescription('');
      closeModal();
      await loadBootstrap();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to create project.');
    } finally {
      setSaving(false);
    }
  }, [loadBootstrap, previewMode, projectDescription, projectHackType, projectTitle, projectVisibility]);

  const handleUpdateMentorProfile = useCallback(async () => {
    const capacity = Number(mentorCapacity);
    if (!Number.isFinite(capacity) || capacity < 0) {
      setActionError('Mentor capacity must be a non-negative number.');
      return;
    }

    if (previewMode) {
      setActionError('');
      setActionMessage('Local preview: simulated mentor profile update.');
      closeModal();
      return;
    }

    setSaving(true);
    setActionError('');
    setActionMessage('');

    const payload: UpdateMentorProfileInput = {
      mentorCapacity: Math.floor(capacity),
      happyToMentor,
      seekingMentor,
    };

    try {
      await invokeTyped('updateMentorProfile', payload);
      setActionMessage('Mentor profile updated.');
      closeModal();
      await loadBootstrap();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to update mentor profile.');
    } finally {
      setSaving(false);
    }
  }, [happyToMentor, loadBootstrap, mentorCapacity, previewMode, seekingMentor]);

  const exportTeamPulse = (): void => {
    downloadJson(`team-pulse-${new Date().toISOString().slice(0, 10)}.json`, {
      exportedAt: new Date().toISOString(),
      placeholderMetrics: true,
      placeholderNote: TEAM_PULSE_PLACEHOLDER_NOTE,
      summary: bootstrap?.summary ?? null,
      aiContributorPct,
      projectsWithAiPct,
      gini,
      frontline,
      leaders,
      others,
    });
  };

  const navigateToSwitcherPage = useCallback(async (targetPageId: string) => {
    if (!targetPageId) return;
    const targetPath = buildConfluencePagePath(targetPageId);
    const absoluteTarget =
      typeof window !== 'undefined' ? `${window.location.origin}${targetPath}` : targetPath;
    setSwitcherOpen(false);

    if (previewMode) {
      setActionMessage(`Local preview mode: would navigate to ${targetPath}`);
      return;
    }

    try {
      const bridge = await import('@forge/bridge');
      await bridge.router.navigate(absoluteTarget);
    } catch {
      if (typeof window !== 'undefined') {
        window.location.assign(absoluteTarget);
      }
    }
  }, [previewMode]);

  const onSwitcherMenuKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!switcherMenuRef.current) return;
    const options = Array.from(
      switcherMenuRef.current.querySelectorAll<HTMLButtonElement>('button[data-switcher-option=\"true\"]')
    ).filter((option) => !option.disabled);
    if (options.length === 0) return;

    const currentIndex = options.findIndex((option) => option === document.activeElement);
    const firstIndex = 0;
    const lastIndex = options.length - 1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = currentIndex < 0 || currentIndex >= lastIndex ? firstIndex : currentIndex + 1;
      options[nextIndex]?.focus();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = currentIndex <= firstIndex ? lastIndex : currentIndex - 1;
      options[nextIndex]?.focus();
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      options[firstIndex]?.focus();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      options[lastIndex]?.focus();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setSwitcherOpen(false);
    }
  }, []);

  if (loading) {
    return (
      <main className="state-shell">
        <section className="state-card">Loading HackDay Central...</section>
      </main>
    );
  }

  if (!bootstrap) {
    return (
      <main className="state-shell">
        <section className="state-card state-error">{errorMessage || 'No data returned from backend.'}</section>
      </main>
    );
  }

  const profileInitial = getInitials(bootstrap.viewer.accountId);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <span className="brand-mark" aria-hidden>
            ✦
          </span>
          <span className="brand-name">HackDay Central</span>
        </div>

        <div className="top-search">
          <span className="search-icon" aria-hidden>
            🔍
          </span>
          <input
            type="search"
            placeholder="Search Completed Hacks and people..."
            aria-label="Search Completed Hacks and people"
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
          />
        </div>

        <div className="top-actions">
          <div className="app-switcher" ref={switcherRef}>
            <button
              type="button"
              className="switcher-trigger"
              aria-expanded={switcherOpen}
              aria-haspopup="menu"
              aria-controls="global-app-switcher-menu"
              onClick={() => setSwitcherOpen((open) => !open)}
              onKeyDown={(event) => {
                if (!switcherOpen && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')) {
                  event.preventDefault();
                  setSwitcherOpen(true);
                }
              }}
            >
              <span className="switcher-trigger-icon" aria-hidden>
                🏠
              </span>
              <span className="switcher-trigger-label">HackDay Central</span>
              <span className="switcher-trigger-caret" aria-hidden>
                ▾
              </span>
            </button>

            {switcherOpen ? (
              <>
                <button
                  type="button"
                  className="switcher-overlay"
                  aria-label="Close app switcher"
                  onClick={() => setSwitcherOpen(false)}
                />
                <div
                  id="global-app-switcher-menu"
                  className="switcher-menu"
                  role="menu"
                  aria-label="HackDay app switcher"
                  ref={switcherMenuRef}
                  onKeyDown={onSwitcherMenuKeyDown}
                >
                  <section className="switcher-section" aria-label="Home">
                    <p className="switcher-section-title">Home</p>
                    <button type="button" data-switcher-option="true" className="switcher-row current" disabled>
                      <span className="switcher-row-main">
                        <span className="switcher-row-title">🏠 HackDay Central</span>
                        <span className="switcher-row-meta">Current page</span>
                      </span>
                      <span className="switcher-row-status">Home</span>
                    </button>
                  </section>

                  {switcherGroups.map((group) => (
                    <section key={group.title} className="switcher-section" aria-label={group.title}>
                      <p className="switcher-section-title">{group.title}</p>
                      {group.items.length === 0 ? (
                        <p className="switcher-empty">No events</p>
                      ) : (
                        group.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            data-switcher-option="true"
                            className="switcher-row"
                            disabled={!isNavigableConfluencePageId(item.confluencePageId)}
                            onClick={() => {
                              runSwitcherNavigation(item.confluencePageId, (targetPageId) => {
                                void navigateToSwitcherPage(targetPageId);
                              });
                            }}
                          >
                            <span className="switcher-row-main">
                              <span className="switcher-row-title">
                                {item.icon || '🚀'} {item.eventName}
                              </span>
                              <span className="switcher-row-meta">{switcherRowMetaText(item)}</span>
                            </span>
                            <span className="switcher-row-status">{item.lifecycleStatus.replace('_', ' ')}</span>
                          </button>
                        ))
                      )}
                    </section>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <button type="button" className="icon-btn" aria-label="Notifications">
            ⌁
          </button>
          <button type="button" className="icon-btn" aria-label="Messages">
            ◻
          </button>
          <span className="profile-chip" title={bootstrap.viewer.accountId}>
            {profileInitial}
          </span>
        </div>
      </header>

      <div className="frame">
        <aside className="sidebar">
          <nav className="side-nav" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`side-link ${view === item.id ? 'side-link-active' : ''}`}
                onClick={() => setView(item.id)}
              >
                <span className="side-icon" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>

          <section className="get-started card">
            <h3>Get Started</h3>
            <p>Explore Featured Hacks to find proven prompts, skills, and apps.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setView('hacks');
                setHackTab('completed');
              }}
            >
              Explore Hacks
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setView('dashboard')}>
              All get-started options
            </button>
          </section>
        </aside>

        <main className="content">
          {switcherWarning ? <section className="message message-preview">{switcherWarning}</section> : null}
          {hasNonNavigableSwitcherItems ? (
            <section className="message message-preview">
              Some switcher entries are unavailable until their Confluence pages are provisioned.
            </section>
          ) : null}
          {errorMessage ? <section className="message message-error">{errorMessage}</section> : null}
          {previewMode ? (
            <section className="message message-preview">
              Local preview mode: mock data is shown and write actions are simulated.
            </section>
          ) : null}
          {actionMessage ? <section className="message message-success">{actionMessage}</section> : null}
          {actionError ? <section className="message message-error">{actionError}</section> : null}

          {view === 'dashboard' ? (
            <section className="page-stack">
              <section className="hero-head">
                <h1>HackDay Central</h1>
                <p>Our clubhouse for all things AI, vibecoding and hacking</p>
              </section>

              <section className="section-head-row">
                <div>
                  <h2>Latest Hacks</h2>
                  <p>accelerators and pain removers made by us</p>
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setView('hacks');
                    setHackTab('completed');
                  }}
                >
                  Browse Featured Hacks
                </button>
              </section>

              <section className="grid hacks-grid">
                {featuredHacks.slice(0, 8).map((hack) => (
                  <HackCard key={hack.id} item={hack} />
                ))}
              </section>

              <section className="grid dashboard-pods">
                <article className="card quote-card">
                  <p className="quote-mark">❞</p>
                  <p className="quote-body">"Saved my team 5 hours with this hack!"</p>
                  <p className="quote-meta">Alex M.</p>
                </article>

                <article className="card recognition-card">
                  <h3>Your recognition</h3>
                  <p>Complete mentor sessions, verify hacks, or get reuses to earn badges.</p>
                  <div className="badge-wrap">
                    {BADGES.map((badge) => (
                      <span key={badge.id} className="badge-pill">
                        {badge.label}
                        {badge.count ? <span className="badge-count">x{badge.count}</span> : null}
                      </span>
                    ))}
                  </div>
                </article>
              </section>

              <button
                type="button"
                className="fab"
                aria-label={quickActionsOpen ? 'Close quick actions' : 'Open quick actions'}
                onClick={() => setQuickActionsOpen((open) => !open)}
              >
                {quickActionsOpen ? '×' : '+'}
              </button>

              {quickActionsOpen ? (
                <section className="card quick-actions">
                  <h3>Quick Actions</h3>
                  <button type="button" className="btn btn-outline" onClick={() => setModalView('submit_hack')}>
                    Submit your first hack
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setModalView('mentor_profile')}>
                    Request a 15-min mentor
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setView('hacks');
                      setHackTab('completed');
                      setQuickActionsOpen(false);
                    }}
                  >
                    Browse Featured Hacks
                  </button>
                </section>
              ) : null}
            </section>
          ) : null}

          {view === 'hacks' ? (
            <section className="page-stack">
              <section className="title-row">
                <h1>Featured Hacks & Projects</h1>
                <button type="button" className="btn btn-primary" onClick={() => setModalView('submit_hack')}>
                  + Submit Hack
                </button>
              </section>

              {hackTab === 'completed' ? <section className="message message-preview">{HACKS_SCOPE_NOTE}</section> : null}

              <section className="filter-row">
                <input
                  type="search"
                  placeholder={hackTab === 'completed' ? 'Search featured hacks...' : 'Search hacks in progress...'}
                  value={hackTab === 'completed' ? hackSearch : projectSearch}
                  onChange={(event) => {
                    if (hackTab === 'completed') {
                      setHackSearch(event.target.value);
                    } else {
                      setProjectSearch(event.target.value);
                    }
                  }}
                />

                {hackTab === 'completed' ? (
                  <>
                    <select
                      value={hackTypeFilter}
                      onChange={(event) => setHackTypeFilter(event.target.value as HackTypeFilter)}
                    >
                      <option value="all">All Types</option>
                      <option value="prompt">Prompts</option>
                      <option value="skill">Skills</option>
                      <option value="app">Apps</option>
                    </select>
                    <select
                      value={hackStatusFilter}
                      onChange={(event) => setHackStatusFilter(event.target.value as HackStatusFilter)}
                    >
                      <option value="all">All Status</option>
                      <option value="in_progress">In progress</option>
                      <option value="verified">Verified</option>
                      <option value="deprecated">Deprecated</option>
                    </select>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={showDeprecated}
                        onChange={(event) => setShowDeprecated(event.target.checked)}
                      />
                      Show Deprecated
                    </label>
                  </>
                ) : null}
              </section>

              <section className="tab-row" aria-label="Hacks tabs">
                <button
                  type="button"
                  className={`tab-btn ${hackTab === 'completed' ? 'tab-active' : ''}`}
                  onClick={() => setHackTab('completed')}
                >
                  Completed
                </button>
                <button
                  type="button"
                  className={`tab-btn ${hackTab === 'in_progress' ? 'tab-active' : ''}`}
                  onClick={() => setHackTab('in_progress')}
                >
                  In progress
                </button>
              </section>

              {hackTab === 'completed' ? (
                <>
                  <article className="card featured-block">
                    <h2>Featured Hacks</h2>
                    <p>High-trust, curated collection of proven AI hacks</p>
                    <div className="grid featured-grid">
                      {featuredTop.map((hack) => (
                        <HackCard key={`featured-${hack.id}`} item={hack} />
                      ))}
                    </div>
                  </article>

                  <section className="grid hacks-grid">
                    {filteredHacks.map((hack) => (
                      <HackCard key={hack.id} item={hack} />
                    ))}
                    {filteredHacks.length === 0 ? <p className="empty-copy">No featured hacks match your filters.</p> : null}
                  </section>
                </>
              ) : (
                <section className="grid hacks-grid">
                  {filteredProjects.map((project) => (
                    <ProjectCard key={project.id} item={project} />
                  ))}
                  {filteredProjects.length === 0 ? <p className="empty-copy">No projects match your search.</p> : null}
                </section>
              )}
            </section>
          ) : null}

          {view === 'team_up' ? (
            <section className="page-stack">
              <section className="title-row">
                <div>
                  <h1>Team Up</h1>
                  <p className="subtitle">Connect with HackCentral Helpers, find teammates, and get help</p>
                </div>
                <button type="button" className="btn btn-primary" onClick={() => setModalView('mentor_profile')}>
                  Get Paired with Mentor
                </button>
              </section>

              <article className="section-head-row">
                <div>
                  <h2>Bulletin Board</h2>
                  <p>Ask for help or offer to help others</p>
                </div>
                <button type="button" className="btn btn-outline" onClick={handlePostHelpRequest}>
                  + Post Help Request
                </button>
              </article>

              <section className="filter-row compact">
                <select defaultValue="open">
                  <option value="open">Open</option>
                </select>
                <select defaultValue="all">
                  <option value="all">All Categories</option>
                </select>
              </section>

              <section className="grid bulletin-grid">
                {BULLETIN_POSTS.map((post) => (
                  <article key={post.id} className="card bulletin-card">
                    <div className="bulletin-top">
                      <span className="pill pill-outline">{post.tag}</span>
                    </div>
                    <h3>{post.title}</h3>
                    <p>{post.description}</p>
                    <div className="bulletin-meta">
                      <span>{post.author}</span>
                      <span>{post.time}</span>
                    </div>
                    <button type="button" className="btn btn-ghost">
                      Mark as Resolved
                    </button>
                  </article>
                ))}
              </section>

              <section className="filter-row">
                <input
                  type="search"
                  placeholder="Search people..."
                  value={teamSearch}
                  onChange={(event) => setTeamSearch(event.target.value)}
                />
                <select
                  value={teamExperienceFilter}
                  onChange={(event) => setTeamExperienceFilter(event.target.value)}
                >
                  <option value="all">All Experience Levels</option>
                  <option value="newbie">AI Newbie</option>
                  <option value="curious">AI Curious</option>
                  <option value="comfortable">AI Comfortable</option>
                  <option value="power_user">AI Power User</option>
                  <option value="expert">AI Expert</option>
                </select>
                <select
                  value={teamMentorFilter}
                  onChange={(event) => setTeamMentorFilter(event.target.value as MentorFilter)}
                >
                  <option value="hackers">Hackers</option>
                  <option value="available">Available Mentors</option>
                </select>
              </section>

              <section>
                <h2 className="list-title">HackCentral Helpers <span>({helpers.length})</span></h2>
                <div className="grid people-grid">
                  {helpers.slice(0, 6).map((person) => (
                    <PersonCard key={`helper-${person.id}`} item={person} />
                  ))}
                </div>
              </section>

              <section>
                <h2 className="list-title">Hackers <span>({hackers.length})</span></h2>
                <div className="grid people-grid">
                  {hackers.map((person) => (
                    <PersonCard key={person.id} item={person} />
                  ))}
                  {hackers.length === 0 ? <p className="empty-copy">No people match your filters.</p> : null}
                </div>
              </section>
            </section>
          ) : null}

          {view === 'team_pulse' ? (
            <section className="page-stack">
              <section className="title-row">
                <h1>Team Pulse</h1>
                <button type="button" className="btn btn-outline" onClick={exportTeamPulse}>
                  Export metrics (placeholder)
                </button>
              </section>
              <section className="message message-preview">{TEAM_PULSE_PLACEHOLDER_NOTE}</section>

              <article className="card collective-card">
                <h2>Our Collective Progress</h2>
                <p>Estimated progress for layout testing — Spark, {nextMilestone}% to Momentum.</p>

                <div className="stage-row" aria-label="Maturity stages">
                  <span className="stage active">Spark</span>
                  <span className="stage">Momentum</span>
                  <span className="stage">Scale</span>
                  <span className="stage">Transformation</span>
                </div>

                <div className="progress-track" role="progressbar" aria-valuenow={Math.round(maturityValue)}>
                  <span className="progress-fill" style={{ width: `${Math.max(6, Math.min(100, maturityValue))}%` }} />
                </div>

                <div className="collective-meta">
                  <div>
                    <span className="meta-label">AI Contributors</span>
                    <strong>{aiContributorPct.toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span className="meta-label">Projects with AI</span>
                    <strong>{projectsWithAiPct.toFixed(1)}%</strong>
                  </div>
                </div>
              </article>

              <section className="grid metric-grid">
                <article className="card metric-tile">
                  <h3>AI CONTRIBUTORS</h3>
                  <p>{aiContributors}</p>
                  <small>Estimated: {aiContributorPct.toFixed(1)}% of employees with AI contributions</small>
                </article>
                <article className="card metric-tile">
                  <h3>PROJECTS WITH AI</h3>
                  <p>{projectsWithAiCount}</p>
                  <small>Estimated: {projectsWithAiPct.toFixed(1)}% of projects using AI hacks</small>
                </article>
                <article className="card metric-tile">
                  <h3>COMPLETED HACKS</h3>
                  <p>{completedHacks}</p>
                  <small>Estimated total reusable AI hacks</small>
                </article>
                <article className="card metric-tile">
                  <h3>WEEKLY ACTIVE</h3>
                  <p>{weeklyActive}</p>
                  <small>Estimated active AI contributors this week</small>
                </article>
              </section>

              <section className="grid pulse-grid">
                <article className="card pulse-card">
                  <h2>Knowledge Distribution</h2>
                  <div className="gini-wrap">
                    <div className="gini-circle">
                      <strong>{gini.toFixed(2)}</strong>
                      <span>Gini</span>
                    </div>
                    <div>
                      <h3>{gini >= 0.8 ? 'High concentration' : gini >= 0.7 ? 'Moderate concentration' : 'Low concentration'}</h3>
                      <p>
                        {gini >= 0.8
                          ? 'High concentration. Escalate: AI expertise is too centralized.'
                          : 'Fuller circle = healthier distribution.'}
                      </p>
                    </div>
                  </div>
                </article>

                <article className="card pulse-card">
                  <h2>Frontline vs leader contributions</h2>
                  <p className="caption">
                    Estimated split by experience level (frontline = newbie/curious/comfortable; leader = power user/expert).
                  </p>
                  <div className="split-grid">
                    <div>
                      <h3>Frontline</h3>
                      <p>{frontline} contributions from {Math.max(frontline, 1)} active user{frontline === 1 ? '' : 's'}</p>
                    </div>
                    <div>
                      <h3>Leader</h3>
                      <p>{leaders} contributions from {Math.max(leaders, 0)} active user{leaders === 1 ? '' : 's'}</p>
                    </div>
                    <div>
                      <h3>Other</h3>
                      <p>{others} contributions from {Math.max(others, 0)} active user{others === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                </article>
              </section>

              <article className="card recognition-tabs">
                <div className="tab-row">
                  {(Object.keys(recognitionTabLabel) as RecognitionTab[]).map((tabKey) => (
                    <button
                      key={tabKey}
                      type="button"
                      className={`tab-btn ${recognitionTab === tabKey ? 'tab-active' : ''}`}
                      onClick={() => setRecognitionTab(tabKey)}
                    >
                      {recognitionTabLabel[tabKey]}
                    </button>
                  ))}
                </div>
                <div className="tab-list">
                  {recognitionRows[recognitionTab].length > 0 ? (
                    recognitionRows[recognitionTab].map((row, index) => (
                      <div key={`${recognitionTab}-${index}`} className="list-row">
                        <span>{row}</span>
                        <span>1 week ago</span>
                      </div>
                    ))
                  ) : (
                    <p className="empty-copy">No entries yet.</p>
                  )}
                </div>
              </article>
            </section>
          ) : null}
        </main>
      </div>

      {modalView !== 'none' ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <section className="card modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-head">
              <h2>
                {modalView === 'submit_hack'
                  ? 'Submit Hack'
                  : modalView === 'create_project'
                    ? 'New Project'
                    : 'Update Mentor Profile'}
              </h2>
              <button type="button" className="icon-btn" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </header>

            {modalView === 'submit_hack' ? (
              <div className="modal-form">
                <label htmlFor="modal-hack-title">Title</label>
                <input
                  id="modal-hack-title"
                  value={hackTitle}
                  onChange={(event) => setHackTitle(event.target.value)}
                  placeholder="e.g. Code review prompt"
                />

                <label htmlFor="modal-hack-description">Description</label>
                <textarea
                  id="modal-hack-description"
                  value={hackDescription}
                  onChange={(event) => setHackDescription(event.target.value)}
                  placeholder="What does this solve?"
                />

                <label htmlFor="modal-hack-content">Content</label>
                <textarea
                  id="modal-hack-content"
                  value={hackContent}
                  onChange={(event) => setHackContent(event.target.value)}
                  placeholder="Prompt or config"
                />

                <div className="split-form">
                  <div>
                    <label htmlFor="modal-hack-type">Type</label>
                    <select
                      id="modal-hack-type"
                      value={hackAssetType}
                      onChange={(event) => setHackAssetType(event.target.value as 'prompt' | 'skill' | 'app')}
                    >
                      <option value="prompt">Prompt</option>
                      <option value="skill">Skill</option>
                      <option value="app">App</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="modal-hack-visibility">Visibility</label>
                    <select
                      id="modal-hack-visibility"
                      value={hackVisibility}
                      onChange={(event) =>
                        setHackVisibility(event.target.value as 'private' | 'org' | 'public')
                      }
                    >
                      <option value="org">Organization</option>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void handleCreateHack()}>
                    {saving ? 'Submitting...' : 'Submit Hack'}
                  </button>
                </div>
              </div>
            ) : null}

            {modalView === 'create_project' ? (
              <div className="modal-form">
                <label htmlFor="modal-project-title">Project title</label>
                <input
                  id="modal-project-title"
                  value={projectTitle}
                  onChange={(event) => setProjectTitle(event.target.value)}
                  placeholder="e.g. Release notes automation"
                />

                <label htmlFor="modal-project-description">Description</label>
                <textarea
                  id="modal-project-description"
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  placeholder="What are you building?"
                />

                <div className="split-form">
                  <div>
                    <label htmlFor="modal-project-type">Hack type</label>
                    <select
                      id="modal-project-type"
                      value={projectHackType}
                      onChange={(event) => setProjectHackType(event.target.value as 'prompt' | 'skill' | 'app')}
                    >
                      <option value="prompt">Prompt</option>
                      <option value="skill">Skill</option>
                      <option value="app">App</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="modal-project-visibility">Visibility</label>
                    <select
                      id="modal-project-visibility"
                      value={projectVisibility}
                      onChange={(event) =>
                        setProjectVisibility(event.target.value as 'private' | 'org' | 'public')
                      }
                    >
                      <option value="org">Organization</option>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void handleCreateProject()}>
                    {saving ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </div>
            ) : null}

            {modalView === 'mentor_profile' ? (
              <div className="modal-form">
                <label htmlFor="modal-mentor-capacity">Monthly mentoring availability</label>
                <input
                  id="modal-mentor-capacity"
                  inputMode="numeric"
                  value={mentorCapacity}
                  onChange={(event) => setMentorCapacity(event.target.value)}
                />

                <label className="check-label" htmlFor="modal-happy-mentor">
                  <input
                    id="modal-happy-mentor"
                    type="checkbox"
                    checked={happyToMentor}
                    onChange={(event) => setHappyToMentor(event.target.checked)}
                  />
                  Happy to Mentor
                </label>

                <label className="check-label" htmlFor="modal-seeking-mentor">
                  <input
                    id="modal-seeking-mentor"
                    type="checkbox"
                    checked={seekingMentor}
                    onChange={(event) => setSeekingMentor(event.target.checked)}
                  />
                  Seeking Mentor
                </label>

                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving}
                    onClick={() => void handleUpdateMentorProfile()}
                  >
                    {saving ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
