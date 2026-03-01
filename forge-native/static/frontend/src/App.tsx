import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from './utils/forgeBridge';
import { DEFAULT_TIMEZONE } from './types';
import type {
  ArtifactListItem,
  ArtifactType,
  ArtifactVisibility,
  BootstrapData,
  CreateArtifactInput,
  CreateHackInput,
  CreateInstanceDraftInput,
  CreateProblemInput,
  CreateProjectInput,
  EventDuration,
  FlagProblemInput,
  FeaturedHack,
  GetPathwayResult,
  GetShowcaseHackDetailResult,
  GetArtifactResult,
  LifecycleStatus,
  ListPathwaysInput,
  MovePipelineItemInput,
  PathwayListItem,
  PathwayStep,
  PathwayStepType,
  ListProblemImportCandidatesInput,
  PersonSnapshot,
  PipelineBoardItem,
  PipelineMetrics,
  PipelineStage,
  PipelineStageCriteria,
  ProblemImportCandidate,
  ProblemFrequency,
  ProblemListItem,
  ProblemStatus,
  ProjectSnapshot,
  ScheduleEventType,
  ShowcaseHackListItem,
  ThemePreference,
  UpsertPathwayInput,
  UpsertPathwayStepInput,
  UpdatePipelineStageCriteriaInput,
  UpdateProblemStatusInput,
  UpdateMentorProfileInput,
  WizardStep,
} from './types';
import {
  buildConfluencePagePath,
  buildSwitcherSections,
  isNavigableRegistryItem,
  readSwitcherRegistryCache,
  runSwitcherNavigation,
  sortByMostRecent,
  summarizeSwitcherNavigability,
  switcherRowMetaText,
  writeSwitcherRegistryCache,
} from './appSwitcher';
import { invokeTyped } from './hooks/useForgeData';
import { NAV_ITEMS, type View, type HackTab, type HackTypeFilter, type HackStatusFilter, type MentorFilter, type ModalView, type RecognitionTab } from './constants/nav';
import { Layout } from './components/Layout';
import { WelcomeHero, StatCards } from './components/Dashboard';
import { HackCard, ProjectCard, PersonCard } from './components/shared/Cards';
import { formatLabel, getInitials } from './utils/format';
import {
  isValidHttpsUrl,
  mapFeaturedHackToArtifact,
  parseRegistryTags,
  REGISTRY_ARTIFACT_TYPES,
  type RegistrySortBy,
} from './utils/registry';
import {
  applyPreviewFlagMutation,
  applyPreviewVoteMutation,
  applyProblemFilters,
  buildProblemAppliedFilters,
  createPreviewProblemListItem,
  DEFAULT_PROBLEM_FILTER_DRAFT,
  getDefaultProblemFilterDraft,
  getDefaultProblemFilterSet,
  PROBLEM_FREQUENCIES,
  PROBLEM_STATUSES,
  resolveProblemModerationAction,
  seedPreviewProblems,
  type ProblemSortBy,
  validateProblemCreateDraft,
  validateProblemStatusDraft,
} from './utils/problemExchange';
import { ScheduleBuilderV2, ScheduleBuilderV2Preview } from './components/schedule-builder-v2';
import type {
  ScheduleBuilderOutput as ScheduleBuilderV2Output,
  ScheduleBuilderState as ScheduleBuilderV2State,
} from './types/scheduleBuilderV2';
import { EventSelectionPanel } from './components/EventSelectionPanel';
import { getDefaultSelections } from './data/scheduleEvents';

/** Bump when deploying to help bust Atlassian CDN cache; check console to confirm loaded bundle */
const HACKCENTRAL_UI_VERSION = '0.6.44';
if (typeof console !== 'undefined' && console.log) {
  console.log('[HackCentral Confluence UI] loaded', HACKCENTRAL_UI_VERSION);
}

const BOOTSTRAP_TIMEOUT_MS = 15000;
const LOCAL_PREVIEW_HOSTS = new Set(['localhost', '127.0.0.1']);
const HACKS_SCOPE_NOTE = '';
const TEAM_PULSE_PLACEHOLDER_NOTE = '';
const CREATE_DRAFT_TIMEOUT_MS = 15_000;
const APP_VIEW_NAV_TIMEOUT_MS = 2_500;
const ALLOWED_EMAIL_DOMAIN = '@adaptavist.com';
const CHILD_IMPORT_MIN_VOTES_DEFAULT = 3;
const RUNTIME_CONFIG_ERROR_CODE = 'HDC_RUNTIME_CONFIG_INVALID';
const HDC_PERF_CREATE_HANDOFF_V1 = String(import.meta.env.VITE_HDC_PERF_CREATE_HANDOFF_V1 || '').trim().toLowerCase() === 'true';
const HDC_PERF_LOADING_UX_V1 = String(import.meta.env.VITE_HDC_PERF_LOADING_UX_V1 || '').trim().toLowerCase() === 'true';
const PATHWAY_STEP_TYPE_OPTIONS: Array<{ value: PathwayStepType; label: string }> = [
  { value: 'read', label: 'Read' },
  { value: 'try', label: 'Try' },
  { value: 'build', label: 'Build' },
];

type PathwayEditorMode = 'create' | 'edit';

type PathwayStepDraft = {
  localId: string;
  stepId?: string;
  type: PathwayStepType;
  title: string;
  description: string;
  linkedHackProjectId: string;
  linkedArtifactId: string;
  externalUrl: string;
  challengePrompt: string;
  isOptional: boolean;
};

type RuntimeConfigErrorLike = {
  code?: unknown;
  message?: unknown;
  diagnostics?: {
    owner?: unknown;
    routeSource?: unknown;
    missingVars?: unknown;
  };
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}

function isRuntimeConfigError(error: unknown): boolean {
  const maybeError = error as RuntimeConfigErrorLike;
  const message = getErrorMessage(error);
  return maybeError?.code === RUNTIME_CONFIG_ERROR_CODE || message.includes(RUNTIME_CONFIG_ERROR_CODE);
}

function getRuntimeConfigOperatorMessage(error: unknown): string {
  const message = getErrorMessage(error);
  const diagnostics = (error as RuntimeConfigErrorLike)?.diagnostics;
  const routeSource = typeof diagnostics?.routeSource === 'string' ? diagnostics.routeSource : 'unknown';
  const missingVars = Array.isArray(diagnostics?.missingVars)
    ? diagnostics.missingVars.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  if (missingVars.length > 0) {
    return `Runtime route configuration is invalid (${routeSource}). Missing vars: ${missingVars.join(', ')}.`;
  }
  return `Runtime route configuration is invalid (${routeSource}). ${message}`;
}

function navigateTopWindow(targetUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  if (window.top && window.top !== window) {
    // Best-effort attempt; in Forge iframe contexts this may be blocked/no-op.
    try {
      window.top.location.assign(targetUrl);
    } catch {
      // Ignore and continue to other launch strategies.
    }
    return false;
  }
  window.location.assign(targetUrl);
  return true;
}

async function navigateWithRouterTimeout(targetUrl: string): Promise<boolean> {
  return navigateWithRouterTimeoutBudget(targetUrl, APP_VIEW_NAV_TIMEOUT_MS);
}

async function navigateWithRouterTimeoutBudget(targetUrl: string, timeoutMs: number): Promise<boolean> {
  if (timeoutMs <= 0) return false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const outcome = await Promise.race([
      router.navigate(targetUrl).then(() => 'navigated' as const),
      new Promise<'timeout'>((resolve) => {
        timeoutId = setTimeout(() => resolve('timeout'), timeoutMs);
      }),
    ]);
    return outcome === 'navigated';
  } catch {
    return false;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function openWithRouterTimeout(targetUrl: string): Promise<boolean> {
  return openWithRouterTimeoutBudget(targetUrl, APP_VIEW_NAV_TIMEOUT_MS);
}

async function openWithRouterTimeoutBudget(targetUrl: string, timeoutMs: number): Promise<boolean> {
  if (timeoutMs <= 0) return false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const outcome = await Promise.race([
      router.open(targetUrl).then(() => 'opened' as const),
      new Promise<'timeout'>((resolve) => {
        timeoutId = setTimeout(() => resolve('timeout'), timeoutMs);
      }),
    ]);
    return outcome === 'opened';
  } catch {
    return false;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function launchAppViewUrl(targetUrl: string): Promise<boolean> {
  if (navigateTopWindow(targetUrl)) return true;
  if (await navigateWithRouterTimeout(targetUrl)) return true;
  return openWithRouterTimeout(targetUrl);
}

async function launchAppViewUrlFastPath(targetUrl: string): Promise<boolean> {
  if (navigateTopWindow(targetUrl)) return true;
  const budgetStartedAt = Date.now();
  if (await navigateWithRouterTimeoutBudget(targetUrl, APP_VIEW_NAV_TIMEOUT_MS)) return true;
  const remainingBudgetMs = APP_VIEW_NAV_TIMEOUT_MS - Math.max(0, Date.now() - budgetStartedAt);
  if (remainingBudgetMs <= 0) return false;
  return openWithRouterTimeoutBudget(targetUrl, remainingBudgetMs);
}

function logCreateHandoffTelemetry(input: {
  creationRequestId: string;
  eventId?: string | null;
  childPageId?: string | null;
  durationMs: number;
  stageMs: Record<string, number>;
  outcome: 'opened_app_view' | 'fallback_child_page' | 'context_refreshed' | 'timeout' | 'error';
  warning?: string | null;
}): void {
  console.info(
    '[hdc-performance-telemetry]',
    JSON.stringify({
      metric: 'create_handoff',
      source: 'global_frontend',
      mode: HDC_PERF_CREATE_HANDOFF_V1 ? 'v1' : 'legacy',
      ...input,
    })
  );
}

function isAdaptavistEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

function isDateRangeInvalid(start: string, end: string): boolean {
  return Boolean(start && end && start > end);
}

const ACTIVE_HACKDAY_LIFECYCLE_STATUSES = new Set<LifecycleStatus>([
  'registration',
  'team_formation',
  'hacking',
  'voting',
  'results',
]);

function formatHackdayLifecycleStatus(status: LifecycleStatus): string {
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
  badgeVariant?: 'amber' | 'teal' | 'blue';
}

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
  { id: 'b-rising', label: 'Rising Star', badgeVariant: 'amber' },
  { id: 'b-mentor', label: 'Mentor Champion', count: 3, badgeVariant: 'teal' },
  { id: 'b-verify', label: 'Verifier', count: 5, badgeVariant: 'blue' },
  { id: 'b-reused', label: 'Most Reused', count: 12, badgeVariant: 'blue' },
  { id: 'b-early', label: 'Early Adopter', badgeVariant: 'amber' },
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
    totalPeople: 47,
    totalHacks: 94,
    featuredHacks: 16,
    inProgressProjects: 12,
    completedProjects: 8,
    activeMentors: 9,
  },
  featuredHacks: [
    // ── Atlassian Ecosystem ──────────────────────────────────────────────
    {
      id: 'hack-jira-epic-breakdown',
      title: 'Jira Epic Breakdown',
      description: 'Paste a one-liner epic description and get a full set of user stories with acceptance criteria, story points, and edge-case notes — ready to copy into Jira.',
      assetType: 'prompt',
      status: 'verified',
      reuseCount: 34,
      authorName: 'Priya S.',
      visibility: 'org',
      intendedUser: 'Product managers and engineers',
      context: 'Sprint planning or backlog grooming sessions',
      limitations: 'Works best for functional features; not great for infrastructure epics',
      riskNotes: 'Review acceptance criteria — the model can over-specify edge cases',
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'hack-confluence-page-summary',
      title: 'Confluence Page Summariser',
      description: 'Give it a Confluence page URL and it returns a 5-bullet executive summary, key decisions, and a list of open questions. Huge time-saver for long design docs.',
      assetType: 'prompt',
      status: 'verified',
      reuseCount: 28,
      authorName: 'Tom H.',
      visibility: 'org',
      intendedUser: 'Anyone catching up on a page',
      context: 'Copy the page body into the prompt — works with Claude or GPT-4',
      limitations: 'Loses nuance on highly technical specs',
      riskNotes: 'Do not include pages marked CONFIDENTIAL',
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'hack-sprint-retro-synth',
      title: 'Sprint Retrospective Synthesiser',
      description: 'Converts raw retro sticky-note exports (CSV or Miro JSON) into a structured "What we learned / What we\'ll change" report with action owners and due dates.',
      assetType: 'prompt',
      status: 'verified',
      reuseCount: 19,
      authorName: 'Chloe R.',
      visibility: 'org',
      intendedUser: 'Scrum masters and delivery leads',
      context: 'Run after each sprint retro before the all-hands update',
      limitations: 'Needs at least 10 sticky notes to produce meaningful themes',
      riskNotes: 'Anonymise contributors before pasting into public AI tools',
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'hack-jql-natural-language',
      title: 'Natural Language → JQL',
      description: 'Type what you want in plain English ("all bugs from the mobile team opened last month that are still unassigned") and get a ready-to-paste JQL query.',
      assetType: 'prompt',
      status: 'verified',
      reuseCount: 41,
      authorName: 'Marcus D.',
      visibility: 'org',
      intendedUser: 'Anyone who avoids writing JQL manually',
      context: 'Works in Claude, GPT-4, and Cursor chat',
      limitations: 'Complex field names (custom fields) need to be provided manually',
      riskNotes: null,
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'hack-pr-description-writer',
      title: 'Bitbucket PR Description Writer',
      description: 'Paste your git diff (or a summary of changes) and get a properly formatted PR description: what changed, why, how to test, and a risk checklist.',
      assetType: 'prompt',
      status: 'verified',
      reuseCount: 22,
      authorName: 'Lena M.',
      visibility: 'org',
      intendedUser: 'Engineers',
      context: 'Run before opening every PR',
      limitations: 'Large diffs (500+ lines) need chunking — summarise per-file first',
      riskNotes: 'Check that secrets are not in the diff before pasting',
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'hack-confluence-healthcheck',
      title: 'Confluence Space Healthcheck',
      description: 'A Forge app that scans a Confluence space for stale pages (untouched > 6 months), orphaned pages (no parent), and broken links — outputs a triage report.',
      assetType: 'app',
      status: 'verified',
      reuseCount: 11,
      authorName: 'Nick Fine',
      visibility: 'org',
      intendedUser: 'Space admins and documentation owners',
      context: 'Run quarterly to keep spaces healthy',
      limitations: 'Does not flag intentionally archived pages — add an "archive" label to exclude',
      riskNotes: null,
      sourceRepoUrl: 'https://bitbucket.org/adaptavist/confluence-healthcheck',
      demoUrl: null,
    },
    // ── AI & Productivity ─────────────────────────────────────────────────
    {
      id: 'hack-cursor-rules-generator',
      title: 'Cursor Rules Generator',
      description: 'Tell it your tech stack, team conventions, and testing philosophy — it outputs a ready-to-use .cursorrules file that keeps Claude on-brand for your repo.',
      assetType: 'skill',
      status: 'verified',
      reuseCount: 56,
      authorName: 'Nick Fine',
      visibility: 'org',
      intendedUser: 'Engineers using Cursor IDE',
      context: 'Run once per repo; update when conventions change',
      limitations: 'More effective with a detailed prompt about your stack',
      riskNotes: null,
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'hack-prompt-compression',
      title: 'Prompt Compression Toolkit',
      description: 'A set of three reusable prompt patterns that compress verbose system prompts by 40–60% without losing intent — reduces cost and improves response speed.',
      assetType: 'skill',
      status: 'verified',
      reuseCount: 31,
      authorName: 'Danielle K.',
      visibility: 'org',
      intendedUser: 'Anyone managing high-volume AI workflows',
      context: 'Apply before finalising any system prompt going to production',
      limitations: 'Very domain-specific prompts resist compression — verify outputs manually',
      riskNotes: null,
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'hack-claude-persona-blocks',
      title: 'Modular Claude Persona Blocks',
      description: 'A library of composable system-prompt building blocks: tone, expertise level, output format, chain-of-thought style. Mix and match for any use case.',
      assetType: 'skill',
      status: 'verified',
      reuseCount: 44,
      authorName: 'Alex M.',
      visibility: 'org',
      intendedUser: 'Prompt engineers and product teams',
      context: 'Use as a starting point; always test with your real data',
      limitations: 'Persona blocks do not substitute for task-specific context',
      riskNotes: null,
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'hack-okr-progress-reporter',
      title: 'OKR Progress Reporter',
      description: 'Paste key-result metrics into the prompt and get a natural-language progress narrative suitable for exec updates — with confidence scores and blocker highlights.',
      assetType: 'prompt',
      status: 'verified',
      reuseCount: 17,
      authorName: 'Yemi O.',
      visibility: 'org',
      intendedUser: 'Team leads and heads of department',
      context: 'Run at end of each quarter before QBR preparation',
      limitations: 'Requires clean numeric data — works poorly with qualitative-only KRs',
      riskNotes: 'Do not include sensitive financial targets in shared AI tools',
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'hack-slack-digest',
      title: 'Slack Channel Digest',
      description: 'Export a Slack channel history (JSON) and get a concise digest: key decisions made, action items assigned, unresolved questions, and mood sentiment.',
      assetType: 'prompt',
      status: 'verified',
      reuseCount: 25,
      authorName: 'Fatima A.',
      visibility: 'org',
      intendedUser: 'Anyone returning from leave or joining a busy channel',
      context: 'Works with Slack\'s built-in export feature',
      limitations: 'Threads are flattened — context from replies may be lost',
      riskNotes: 'Ensure channel is not HR-restricted before exporting',
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'hack-api-doc-generator',
      title: 'API Documentation Generator',
      description: 'Paste an OpenAPI spec or a set of function signatures and get full Confluence-ready documentation: endpoints, params, examples, error codes, and a quickstart guide.',
      assetType: 'prompt',
      status: 'verified',
      reuseCount: 20,
      authorName: 'Ravi P.',
      visibility: 'org',
      intendedUser: 'Backend engineers and developer advocates',
      context: 'Run when shipping a new API version',
      limitations: 'Needs a complete spec; partial specs produce incomplete docs',
      riskNotes: null,
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'hack-incident-postmortem',
      title: 'Incident Post-Mortem Writer',
      description: 'Give it your incident timeline, contributing factors, and resolution steps — it writes a blameless post-mortem in the Atlassian standard format, ready for Confluence.',
      assetType: 'prompt',
      status: 'verified',
      reuseCount: 14,
      authorName: 'Chris B.',
      visibility: 'org',
      intendedUser: 'SREs and on-call engineers',
      context: 'Write within 24h of incident resolution while context is fresh',
      limitations: 'Cannot infer contributing factors — you must provide them',
      riskNotes: 'Ensure SLA breach details are reviewed by legal before publishing',
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'hack-onboarding-copilot',
      title: 'New Joiner Onboarding Copilot',
      description: 'A Forge app embedded in Confluence that answers new-joiner questions using the team\'s own Confluence pages as context — no more pinging Slack for basics.',
      assetType: 'app',
      status: 'in_progress',
      reuseCount: 7,
      authorName: 'Sam Chen',
      visibility: 'org',
      intendedUser: 'New joiners and people managers',
      context: 'Requires a well-structured Confluence onboarding space',
      limitations: 'Only as good as the source docs — stale pages produce wrong answers',
      riskNotes: null,
      sourceRepoUrl: 'https://bitbucket.org/adaptavist/onboarding-copilot',
      demoUrl: null,
    },
    {
      id: 'hack-vibe-check-guardrail',
      title: 'Vibe Check Guardrail',
      description: 'Before publishing any AI-generated content externally, run it through this prompt. It flags off-brand language, overconfident claims, and potential compliance red flags.',
      assetType: 'skill',
      status: 'verified',
      reuseCount: 38,
      authorName: 'Jordan T.',
      visibility: 'org',
      intendedUser: 'Marketing, comms, and anyone publishing AI-written content',
      context: 'Final check before any customer-facing publication',
      limitations: 'Not a substitute for legal review on regulated content',
      riskNotes: null,
      sourceRepoUrl: null,
      demoUrl: null,
    },
    {
      id: 'hack-test-case-generator',
      title: 'Test Case Generator',
      description: 'Paste a user story or feature spec and get a full test matrix: happy paths, edge cases, negative tests, and accessibility checks — formatted for Jira Zephyr or Xray.',
      assetType: 'prompt',
      status: 'verified',
      reuseCount: 29,
      authorName: 'Priya S.',
      visibility: 'org',
      intendedUser: 'QA engineers and developers writing their own tests',
      context: 'Run during sprint planning alongside Jira Epic Breakdown',
      limitations: 'Complex UI flows benefit from screenshots in the prompt',
      riskNotes: null,
      sourceRepoUrl: null,
      demoUrl: null,
    },
  ],
  recentProjects: [
    {
      id: 'proj-confluence-release-notes',
      title: 'Confluence AI Release Notes Pipeline',
      description: 'Automatically drafts release notes from merged Jira tickets and Bitbucket PRs, formatted as a Confluence page and routed for review before publishing.',
      status: 'building',
      statusLabel: 'Building',
      hackType: 'app',
      ownerName: 'Tom H.',
      attachedHacksCount: 3,
      commentCount: 9,
      visibility: 'org',
      workflowTransformed: true,
      aiImpactHypothesis: 'Reduce release-note prep from 3 hours to 15 minutes',
      aiToolsUsed: ['Confluence Forge', 'Jira API', 'Claude claude-sonnet-4-5'],
      timeSavedEstimate: 22,
      failuresAndLessons: 'Early version hallucinated ticket titles — now fetches raw data directly.',
    },
    {
      id: 'proj-ai-onboarding',
      title: 'AI Onboarding Copilot',
      description: 'Confluence-embedded chatbot that answers new joiner questions using the team\'s own pages as context. Reduces first-week Slack noise by ~60%.',
      status: 'incubation',
      statusLabel: 'Incubation',
      hackType: 'app',
      ownerName: 'Sam Chen',
      attachedHacksCount: 4,
      commentCount: 14,
      visibility: 'org',
      workflowTransformed: true,
      aiImpactHypothesis: 'Cut new-joiner support burden by 50%',
      aiToolsUsed: ['Forge', 'Confluence REST API', 'GPT-4o'],
      timeSavedEstimate: 35,
      failuresAndLessons: 'Prompt tuning critical — generic answers without page-specific context were useless.',
    },
    {
      id: 'proj-cursor-workflow',
      title: 'Engineering Cursor Workflow Kit',
      description: 'A curated set of Cursor rules, prompt templates, and workflow patterns adopted org-wide. Standardises how we use AI in our dev workflow.',
      status: 'completed',
      statusLabel: 'Completed',
      hackType: 'skill',
      ownerName: 'Nick Fine',
      attachedHacksCount: 6,
      commentCount: 21,
      visibility: 'org',
      workflowTransformed: true,
      aiImpactHypothesis: 'Reduce PR review cycles by 30%',
      aiToolsUsed: ['Cursor', 'Claude'],
      timeSavedEstimate: 48,
      failuresAndLessons: 'Rules need per-repo customisation — a one-size-fits-all rules file degraded output quality.',
    },
    {
      id: 'proj-jira-automation',
      title: 'Jira Sprint Intelligence Dashboard',
      description: 'Weekly Jira digest that uses AI to surface risk: tickets that have been in review too long, velocity drift, unassigned blockers, and scope-creep signals.',
      status: 'idea',
      statusLabel: 'Idea',
      hackType: 'prompt',
      ownerName: 'Marcus D.',
      attachedHacksCount: 2,
      commentCount: 5,
      visibility: 'org',
      workflowTransformed: false,
      aiImpactHypothesis: 'Catch sprint failures 3 days earlier',
      aiToolsUsed: ['Jira API', 'Claude'],
      timeSavedEstimate: 10,
      failuresAndLessons: null,
    },
  ],
  people: [
    {
      id: 'p1',
      fullName: 'Nick Fine',
      email: 'nick.fine@adaptavist.com',
      experienceLevel: 'power_user',
      experienceLabel: 'AI Power User',
      mentorCapacity: 4,
      mentorSessionsUsed: 2,
      mentorSlotsRemaining: 2,
      capabilities: ['Cursor', 'Claude', 'Forge Apps', 'Prompt Engineering', 'Happy to Mentor'],
    },
    {
      id: 'p2',
      fullName: 'Priya Sharma',
      email: 'priya.sharma@adaptavist.com',
      experienceLevel: 'power_user',
      experienceLabel: 'AI Power User',
      mentorCapacity: 3,
      mentorSessionsUsed: 3,
      mentorSlotsRemaining: 0,
      capabilities: ['Jira Automation', 'Product Strategy', 'Prompt Engineering', 'Happy to Mentor'],
    },
    {
      id: 'p3',
      fullName: 'Tom Harvey',
      email: 'tom.harvey@adaptavist.com',
      experienceLevel: 'comfortable',
      experienceLabel: 'AI Comfortable',
      mentorCapacity: 2,
      mentorSessionsUsed: 1,
      mentorSlotsRemaining: 1,
      capabilities: ['Confluence API', 'Forge Apps', 'Documentation'],
    },
    {
      id: 'p4',
      fullName: 'Sam Chen',
      email: 'sam.chen@adaptavist.com',
      experienceLevel: 'comfortable',
      experienceLabel: 'AI Comfortable',
      mentorCapacity: 2,
      mentorSessionsUsed: 2,
      mentorSlotsRemaining: 0,
      capabilities: ['GPT-4', 'Product Management', 'Confluence'],
    },
    {
      id: 'p5',
      fullName: 'Marcus Devereux',
      email: 'marcus.devereux@adaptavist.com',
      experienceLevel: 'power_user',
      experienceLabel: 'AI Power User',
      mentorCapacity: 3,
      mentorSessionsUsed: 1,
      mentorSlotsRemaining: 2,
      capabilities: ['JQL', 'Jira', 'Data Analysis', 'Happy to Mentor'],
    },
    {
      id: 'p6',
      fullName: 'Chloe Richards',
      email: 'chloe.richards@adaptavist.com',
      experienceLevel: 'comfortable',
      experienceLabel: 'AI Comfortable',
      mentorCapacity: 2,
      mentorSessionsUsed: 0,
      mentorSlotsRemaining: 2,
      capabilities: ['Agile Delivery', 'Miro', 'Retrospectives', 'Seeking Mentor'],
    },
    {
      id: 'p7',
      fullName: 'Lena Müller',
      email: 'lena.muller@adaptavist.com',
      experienceLevel: 'comfortable',
      experienceLabel: 'AI Comfortable',
      mentorCapacity: 2,
      mentorSessionsUsed: 1,
      mentorSlotsRemaining: 1,
      capabilities: ['Bitbucket', 'Code Review', 'Cursor', 'Happy to Mentor'],
    },
    {
      id: 'p8',
      fullName: 'Danielle Kowalski',
      email: 'danielle.kowalski@adaptavist.com',
      experienceLevel: 'power_user',
      experienceLabel: 'AI Power User',
      mentorCapacity: 4,
      mentorSessionsUsed: 2,
      mentorSlotsRemaining: 2,
      capabilities: ['Token Optimisation', 'Prompt Engineering', 'LLM Ops', 'Happy to Mentor'],
    },
    {
      id: 'p9',
      fullName: 'Jordan Taylor',
      email: 'jordan.taylor@adaptavist.com',
      experienceLevel: 'comfortable',
      experienceLabel: 'AI Comfortable',
      mentorCapacity: 0,
      mentorSessionsUsed: 0,
      mentorSlotsRemaining: 0,
      capabilities: ['QA', 'Test Automation', 'Zephyr'],
    },
    {
      id: 'p10',
      fullName: 'Yemi Okafor',
      email: 'yemi.okafor@adaptavist.com',
      experienceLevel: 'curious',
      experienceLabel: 'AI Curious',
      mentorCapacity: 0,
      mentorSessionsUsed: 0,
      mentorSlotsRemaining: 0,
      capabilities: ['OKRs', 'Strategy', 'Seeking Mentor'],
    },
    {
      id: 'p11',
      fullName: 'Fatima Al-Hassan',
      email: 'fatima.alhassan@adaptavist.com',
      experienceLevel: 'curious',
      experienceLabel: 'AI Curious',
      mentorCapacity: 0,
      mentorSessionsUsed: 0,
      mentorSlotsRemaining: 0,
      capabilities: ['Slack', 'Communications', 'Seeking Mentor'],
    },
    {
      id: 'p12',
      fullName: 'Ravi Patel',
      email: 'ravi.patel@adaptavist.com',
      experienceLevel: 'comfortable',
      experienceLabel: 'AI Comfortable',
      mentorCapacity: 2,
      mentorSessionsUsed: 0,
      mentorSlotsRemaining: 2,
      capabilities: ['API Design', 'OpenAPI', 'Developer Experience', 'Happy to Mentor'],
    },
    {
      id: 'p13',
      fullName: 'Chris Brennan',
      email: 'chris.brennan@adaptavist.com',
      experienceLevel: 'comfortable',
      experienceLabel: 'AI Comfortable',
      mentorCapacity: 0,
      mentorSessionsUsed: 0,
      mentorSlotsRemaining: 0,
      capabilities: ['SRE', 'Incident Management', 'Confluence'],
    },
    {
      id: 'p14',
      fullName: 'Alex Rivera',
      email: 'alex.rivera@adaptavist.com',
      experienceLevel: 'newbie',
      experienceLabel: 'AI Newbie',
      mentorCapacity: 0,
      mentorSessionsUsed: 0,
      mentorSlotsRemaining: 0,
      capabilities: ['Project Management', 'Seeking Mentor'],
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
      isNavigable: true,
      confluenceParentPageId: null,
      schedule: {
        timezone: DEFAULT_TIMEZONE,
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
      isNavigable: true,
      confluenceParentPageId: null,
      schedule: {
        timezone: DEFAULT_TIMEZONE,
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

const PIPELINE_STAGE_DEFINITIONS: PipelineStageCriteria[] = [
  {
    stage: 'hack',
    label: 'Hack',
    description: 'Submitted and demoed.',
    criteria: ['Demo exists', 'Problem Exchange link if applicable'],
  },
  {
    stage: 'validated_prototype',
    label: 'Validated Prototype',
    description: 'Tested with real users and value evidence.',
    criteria: ['3+ users outside team tried it', 'At least one qualitative feedback note'],
  },
  {
    stage: 'incubating_project',
    label: 'Incubating Project',
    description: 'Allocated time/resources and active development.',
    criteria: ['Repeated usage evidence', 'Named owner + external lead endorsement'],
  },
  {
    stage: 'product_candidate',
    label: 'Product Candidate',
    description: 'Business case, sponsor, and roadmap identified.',
    criteria: ['Business case drafted', 'Sponsor identified from leadership'],
  },
];

function mapProjectStatusToPipelineStage(project: ProjectSnapshot): PipelineStage {
  const normalized = project.status.trim().toLowerCase();
  if (normalized === 'incubation') return 'incubating_project';
  if (normalized === 'building' || normalized === 'in_progress') return 'validated_prototype';
  if (normalized === 'completed' || normalized === 'verified') return 'product_candidate';
  return 'hack';
}

function parsePipelineCriteriaText(value: string): string[] {
  return [...new Set(value.split('\n').map((line) => line.trim()).filter(Boolean))];
}

function parseCommaSeparatedList(value: string): string[] {
  return [...new Set(value.split(',').map((token) => token.trim()).filter(Boolean))];
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

function mapShowcaseItemToFeaturedHack(item: ShowcaseHackListItem): FeaturedHack {
  return {
    id: item.projectId,
    title: item.title,
    description: item.description,
    assetType: item.assetType,
    status: item.status === 'completed' ? 'verified' : 'in_progress',
    reuseCount: item.reuseCount,
    authorName: item.authorName,
    visibility: item.visibility,
    intendedUser: null,
    context: null,
    limitations: null,
    riskNotes: null,
    sourceRepoUrl: null,
    demoUrl: item.demoUrl ?? null,
  };
}

function mapFeaturedHackToShowcaseItem(hack: FeaturedHack): ShowcaseHackListItem {
  const now = new Date().toISOString();
  return {
    projectId: hack.id,
    title: hack.title,
    description: hack.description,
    assetType: hack.assetType,
    status: hack.status === 'in_progress' ? 'in_progress' : 'completed',
    featured: hack.status === 'verified',
    authorName: hack.authorName,
    visibility: hack.visibility,
    tags: [],
    demoUrl: hack.demoUrl ?? undefined,
    pipelineStage: 'hack',
    reuseCount: hack.reuseCount,
    teamMembersCount: 0,
    linkedArtifactsCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function mapProblemListItemToImportCandidate(problem: ProblemListItem): ProblemImportCandidate {
  return {
    problemId: problem.id,
    title: problem.title,
    description: problem.description,
    status: problem.status,
    voteCount: problem.voteCount,
    estimatedTimeWastedHours: problem.estimatedTimeWastedHours,
    team: problem.team,
    domain: problem.domain,
    updatedAt: problem.updatedAt,
    createdByName: problem.createdByName,
  };
}

function buildPreviewPathwayListItem(): PathwayListItem {
  const now = new Date().toISOString();
  return {
    pathwayId: 'preview-pathway-ai-101',
    title: 'AI 101 Micro-Pathway',
    summary: 'Start with foundational concepts, then reuse and build.',
    introText: 'Learn what AI hacks are, try one, then build your own contribution.',
    domain: 'General',
    role: 'All',
    tags: ['onboarding', 'starter'],
    stepCount: 4,
    published: true,
    recommended: true,
    updatedAt: now,
    updatedByName: 'HackCentral',
    progress: {
      completedStepIds: [],
      completedSteps: 0,
      totalSteps: 4,
      completionPercent: 0,
    },
  };
}

function buildPreviewPathwayDetail(completedStepIds: string[] = []): GetPathwayResult {
  const listItem = buildPreviewPathwayListItem();
  const steps: PathwayStep[] = [
    {
      stepId: 'preview-step-1',
      position: 1,
      type: 'read',
      title: 'Understand what an AI hack is',
      description: 'Read the quick definitions and examples of prompts, skills, and apps.',
      isOptional: false,
    },
    {
      stepId: 'preview-step-2',
      position: 2,
      type: 'try',
      title: 'Reuse a featured hack',
      description: 'Open Completed Hacks and record one reuse with “I used this”.',
      isOptional: false,
    },
    {
      stepId: 'preview-step-3',
      position: 3,
      type: 'build',
      title: 'Submit your first hack',
      description: 'Publish a prompt, skill, or app with context and limitations.',
      isOptional: false,
    },
    {
      stepId: 'preview-step-4',
      position: 4,
      type: 'build',
      title: 'Link it to a project',
      description: 'Attach your hack to an in-progress project so impact is visible.',
      isOptional: true,
    },
  ];
  const completedSet = new Set(completedStepIds);
  const completedSteps = steps.filter((step) => completedSet.has(step.stepId)).length;
  const totalSteps = steps.length;
  const completionPercent = Math.round((completedSteps / totalSteps) * 100);
  return {
    pathway: {
      ...listItem,
      progress: {
        completedStepIds: steps.map((step) => step.stepId).filter((stepId) => completedSet.has(stepId)),
        completedSteps,
        totalSteps,
        completionPercent,
      },
    },
    steps,
    canManage: false,
  };
}

function createPathwayStepDraft(step?: PathwayStep): PathwayStepDraft {
  const localId = step?.stepId || `pathway-step-${crypto.randomUUID()}`;
  return {
    localId,
    stepId: step?.stepId,
    type: step?.type ?? 'read',
    title: step?.title ?? '',
    description: step?.description ?? '',
    linkedHackProjectId: step?.linkedHackProjectId ?? '',
    linkedArtifactId: step?.linkedArtifactId ?? '',
    externalUrl: step?.externalUrl ?? '',
    challengePrompt: step?.challengePrompt ?? '',
    isOptional: step?.isOptional ?? false,
  };
}

function createDefaultPathwayStepDraft(): PathwayStepDraft {
  return {
    localId: `pathway-step-${crypto.randomUUID()}`,
    stepId: undefined,
    type: 'read',
    title: '',
    description: '',
    linkedHackProjectId: '',
    linkedArtifactId: '',
    externalUrl: '',
    challengePrompt: '',
    isOptional: false,
  };
}

function isValidHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function logSwitcherNavigabilityTelemetry(source: string, registry: BootstrapData['registry']): void {
  const { total, nonNavigable, withMissingPageId } = summarizeSwitcherNavigability(registry);
  console.info('[hdc-switcher-telemetry]', JSON.stringify({ source, total, nonNavigable, withMissingPageId }));
}

export function App(): JSX.Element {
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherWarning, setSwitcherWarning] = useState('');
  const [refreshingSwitcherRegistry, setRefreshingSwitcherRegistry] = useState(false);
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
  const [showcaseTagsInput, setShowcaseTagsInput] = useState('');
  const [showcaseSourceEventInput, setShowcaseSourceEventInput] = useState('');
  const [showcaseFeaturedOnly, setShowcaseFeaturedOnly] = useState(false);
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseHackListItem[]>([]);
  const [showcaseCanManage, setShowcaseCanManage] = useState(false);
  const [showcaseLoading, setShowcaseLoading] = useState(false);
  const [showcaseLoaded, setShowcaseLoaded] = useState(false);
  const [showcaseError, setShowcaseError] = useState('');
  const [showcaseFeaturePendingProjectId, setShowcaseFeaturePendingProjectId] = useState<string | null>(null);
  const [showcaseSelectedProjectId, setShowcaseSelectedProjectId] = useState<string | null>(null);
  const [showcaseDetail, setShowcaseDetail] = useState<GetShowcaseHackDetailResult | null>(null);
  const [showcaseDetailLoading, setShowcaseDetailLoading] = useState(false);
  const [showcaseDetailError, setShowcaseDetailError] = useState('');
  const [registrySearchInput, setRegistrySearchInput] = useState('');
  const [registryTagsInput, setRegistryTagsInput] = useState('');
  const [registryTypeFilter, setRegistryTypeFilter] = useState<ArtifactType | 'all'>('all');
  const [registrySortBy, setRegistrySortBy] = useState<RegistrySortBy>('newest');
  const [registryAppliedFilters, setRegistryAppliedFilters] = useState<{
    query?: string;
    artifactTypes?: ArtifactType[];
    tags?: string[];
    sortBy: RegistrySortBy;
  }>({ sortBy: 'newest' });
  const [registryItems, setRegistryItems] = useState<ArtifactListItem[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryLoaded, setRegistryLoaded] = useState(false);
  const [registryError, setRegistryError] = useState('');
  const [reusePendingArtifactId, setReusePendingArtifactId] = useState<string | null>(null);
  const [detailLoadingArtifactId, setDetailLoadingArtifactId] = useState<string | null>(null);
  const [registryDetailsById, setRegistryDetailsById] = useState<Record<string, GetArtifactResult>>({});
  const [showCreateArtifactForm, setShowCreateArtifactForm] = useState(false);
  const [artifactTitle, setArtifactTitle] = useState('');
  const [artifactDescription, setArtifactDescription] = useState('');
  const [artifactType, setArtifactType] = useState<ArtifactType>('prompt');
  const [artifactTagsInput, setArtifactTagsInput] = useState('');
  const [artifactSourceUrl, setArtifactSourceUrl] = useState('');
  const [artifactSourceLabel, setArtifactSourceLabel] = useState('');
  const [artifactSourceHackProjectId, setArtifactSourceHackProjectId] = useState('');
  const [artifactSourceHackdayEventId, setArtifactSourceHackdayEventId] = useState('');
  const [artifactVisibility, setArtifactVisibility] = useState<ArtifactVisibility>('org');
  const [artifactSubmitting, setArtifactSubmitting] = useState(false);
  const [problemSearchInput, setProblemSearchInput] = useState('');
  const [problemTeamsInput, setProblemTeamsInput] = useState('');
  const [problemDomainsInput, setProblemDomainsInput] = useState('');
  const [problemStatusFilter, setProblemStatusFilter] = useState<ProblemStatus | 'all'>(DEFAULT_PROBLEM_FILTER_DRAFT.status);
  const [problemSortBy, setProblemSortBy] = useState<ProblemSortBy>(DEFAULT_PROBLEM_FILTER_DRAFT.sortBy);
  const [problemIncludeHidden, setProblemIncludeHidden] = useState(DEFAULT_PROBLEM_FILTER_DRAFT.includeHidden);
  const [problemAppliedFilters, setProblemAppliedFilters] = useState<{
    query?: string;
    teams?: string[];
    domains?: string[];
    statuses?: ProblemStatus[];
    sortBy: ProblemSortBy;
    includeHidden: boolean;
  }>(() => getDefaultProblemFilterSet());
  const [problemItems, setProblemItems] = useState<ProblemListItem[]>([]);
  const [problemPreviewItems, setProblemPreviewItems] = useState<ProblemListItem[]>([]);
  const [problemPreviewVotedIds, setProblemPreviewVotedIds] = useState<string[]>([]);
  const [problemPreviewFlaggedIds, setProblemPreviewFlaggedIds] = useState<string[]>([]);
  const [problemLoading, setProblemLoading] = useState(false);
  const [problemLoaded, setProblemLoaded] = useState(false);
  const [problemError, setProblemError] = useState('');
  const [showCreateProblemForm, setShowCreateProblemForm] = useState(false);
  const [problemTitle, setProblemTitle] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [problemFrequency, setProblemFrequency] = useState<ProblemFrequency>('weekly');
  const [problemTimeWastedHours, setProblemTimeWastedHours] = useState('');
  const [problemTeam, setProblemTeam] = useState('');
  const [problemDomain, setProblemDomain] = useState('');
  const [problemContactDetails, setProblemContactDetails] = useState('');
  const [problemSubmitting, setProblemSubmitting] = useState(false);
  const [problemStatusDraftById, setProblemStatusDraftById] = useState<Record<string, ProblemStatus>>({});
  const [problemLinkHackProjectById, setProblemLinkHackProjectById] = useState<Record<string, string>>({});
  const [problemLinkArtifactById, setProblemLinkArtifactById] = useState<Record<string, string>>({});
  const [problemStatusNoteById, setProblemStatusNoteById] = useState<Record<string, string>>({});
  const [problemFlagReasonById, setProblemFlagReasonById] = useState<Record<string, string>>({});
  const [problemVotePendingId, setProblemVotePendingId] = useState<string | null>(null);
  const [problemFlagPendingId, setProblemFlagPendingId] = useState<string | null>(null);
  const [problemStatusPendingId, setProblemStatusPendingId] = useState<string | null>(null);
  const [problemModerationPendingId, setProblemModerationPendingId] = useState<string | null>(null);
  const [problemCanModerate, setProblemCanModerate] = useState(false);
  const [problemModerationMode, setProblemModerationMode] = useState<'allowlist' | 'none'>('none');

  const [pipelineItems, setPipelineItems] = useState<PipelineBoardItem[]>([]);
  const [pipelineStageCriteria, setPipelineStageCriteria] = useState<PipelineStageCriteria[]>([]);
  const [pipelineMetrics, setPipelineMetrics] = useState<PipelineMetrics | null>(null);
  const [pipelineCanManage, setPipelineCanManage] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineLoaded, setPipelineLoaded] = useState(false);
  const [pipelineError, setPipelineError] = useState('');
  const [pipelineMovePendingProjectId, setPipelineMovePendingProjectId] = useState<string | null>(null);
  const [pipelineMoveStageByProjectId, setPipelineMoveStageByProjectId] = useState<Record<string, PipelineStage>>({});
  const [pipelineMoveNoteByProjectId, setPipelineMoveNoteByProjectId] = useState<Record<string, string>>({});
  const [pipelineCriteriaDescriptionDraftByStage, setPipelineCriteriaDescriptionDraftByStage] = useState<
    Record<PipelineStage, string>
  >({
    hack: PIPELINE_STAGE_DEFINITIONS[0].description,
    validated_prototype: PIPELINE_STAGE_DEFINITIONS[1].description,
    incubating_project: PIPELINE_STAGE_DEFINITIONS[2].description,
    product_candidate: PIPELINE_STAGE_DEFINITIONS[3].description,
  });
  const [pipelineCriteriaTextDraftByStage, setPipelineCriteriaTextDraftByStage] = useState<Record<PipelineStage, string>>({
    hack: PIPELINE_STAGE_DEFINITIONS[0].criteria.join('\n'),
    validated_prototype: PIPELINE_STAGE_DEFINITIONS[1].criteria.join('\n'),
    incubating_project: PIPELINE_STAGE_DEFINITIONS[2].criteria.join('\n'),
    product_candidate: PIPELINE_STAGE_DEFINITIONS[3].criteria.join('\n'),
  });
  const [pipelineCriteriaSavePendingStage, setPipelineCriteriaSavePendingStage] = useState<PipelineStage | null>(null);

  const [pathwayQueryInput, setPathwayQueryInput] = useState('');
  const [pathwayDomainInput, setPathwayDomainInput] = useState('');
  const [pathwayRoleInput, setPathwayRoleInput] = useState('');
  const [pathwayRecommendedOnly, setPathwayRecommendedOnly] = useState(false);
  const [pathwayAppliedFilters, setPathwayAppliedFilters] = useState<ListPathwaysInput>({});
  const [pathwayItems, setPathwayItems] = useState<PathwayListItem[]>([]);
  const [pathwayCanManage, setPathwayCanManage] = useState(false);
  const [pathwayLoading, setPathwayLoading] = useState(false);
  const [pathwayLoaded, setPathwayLoaded] = useState(false);
  const [pathwayError, setPathwayError] = useState('');
  const [pathwaySelectedId, setPathwaySelectedId] = useState<string | null>(null);
  const [pathwayDetail, setPathwayDetail] = useState<GetPathwayResult | null>(null);
  const [pathwayDetailLoading, setPathwayDetailLoading] = useState(false);
  const [pathwayDetailError, setPathwayDetailError] = useState('');
  const [pathwayStepPendingId, setPathwayStepPendingId] = useState<string | null>(null);
  const [pathwayEditorOpen, setPathwayEditorOpen] = useState(false);
  const [pathwayEditorMode, setPathwayEditorMode] = useState<PathwayEditorMode>('create');
  const [pathwayEditorPathwayId, setPathwayEditorPathwayId] = useState<string | null>(null);
  const [pathwayEditorTitle, setPathwayEditorTitle] = useState('');
  const [pathwayEditorSummary, setPathwayEditorSummary] = useState('');
  const [pathwayEditorIntroText, setPathwayEditorIntroText] = useState('');
  const [pathwayEditorDomain, setPathwayEditorDomain] = useState('');
  const [pathwayEditorRole, setPathwayEditorRole] = useState('');
  const [pathwayEditorTagsInput, setPathwayEditorTagsInput] = useState('');
  const [pathwayEditorPublished, setPathwayEditorPublished] = useState(true);
  const [pathwayEditorRecommended, setPathwayEditorRecommended] = useState(false);
  const [pathwayEditorSteps, setPathwayEditorSteps] = useState<PathwayStepDraft[]>([createDefaultPathwayStepDraft()]);
  const [pathwayEditorSaving, setPathwayEditorSaving] = useState(false);

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
  const [hackDemoUrl, setHackDemoUrl] = useState('');
  const [hackTeamMembersInput, setHackTeamMembersInput] = useState('');
  const [hackSourceEventId, setHackSourceEventId] = useState('');
  const [hackTagsInput, setHackTagsInput] = useState('');
  const [hackLinkedArtifactIdsInput, setHackLinkedArtifactIdsInput] = useState('');

  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectHackType, setProjectHackType] = useState<'prompt' | 'skill' | 'app'>('prompt');
  const [projectVisibility, setProjectVisibility] = useState<'private' | 'org' | 'public'>('org');

  const [mentorCapacity, setMentorCapacity] = useState('0');
  const [happyToMentor, setHappyToMentor] = useState(false);
  const [seekingMentor, setSeekingMentor] = useState(false);

  // Create HackDay wizard state
  const [wStep, setWStep] = useState<WizardStep>(1);
  const [wEventName, setWEventName] = useState('');
  const [wEventIcon, setWEventIcon] = useState('🚀');
  const [wEventTagline, setWEventTagline] = useState('');
  const [wPrimaryAdminEmail, setWPrimaryAdminEmail] = useState('');
  const [wCoAdminsInput, setWCoAdminsInput] = useState('');
  const [wEventNameError, setWEventNameError] = useState('');
  const [wPendingRequestId, setWPendingRequestId] = useState<string | null>(null);
  const [wTimezone, setWTimezone] = useState(DEFAULT_TIMEZONE);
  const [wRegistrationOpensAt, setWRegistrationOpensAt] = useState('');
  const [wRegistrationClosesAt, setWRegistrationClosesAt] = useState('');
  const [wTeamFormationStartsAt, setWTeamFormationStartsAt] = useState('');
  const [wTeamFormationEndsAt, setWTeamFormationEndsAt] = useState('');
  const [wHackingStartsAt, setWHackingStartsAt] = useState('');
  const [wSubmissionDeadlineAt, setWSubmissionDeadlineAt] = useState('');
  const [wVotingStartsAt, setWVotingStartsAt] = useState('');
  const [wVotingEndsAt, setWVotingEndsAt] = useState('');
  const [wResultsAnnounceAt, setWResultsAnnounceAt] = useState('');
  const [wAllowCrossTeamMentoring, setWAllowCrossTeamMentoring] = useState(true);
  const [wMinTeamSize, setWMinTeamSize] = useState('1');
  const [wMaxTeamSize, setWMaxTeamSize] = useState('6');
  const [wRequireDemoLink, setWRequireDemoLink] = useState(false);
  const [wJudgingModel, setWJudgingModel] = useState<'panel' | 'popular_vote' | 'hybrid'>('hybrid');
  const [wCategoriesInput, setWCategoriesInput] = useState('');
  const [wPrizesText, setWPrizesText] = useState('');
  const [wBannerMessage, setWBannerMessage] = useState('');
  const [wAccentColor, setWAccentColor] = useState('#0f766e');
  const [wBannerImageUrl, setWBannerImageUrl] = useState('');
  const [wThemePreference, setWThemePreference] = useState<ThemePreference>('system');
  const [wLaunchMode, setWLaunchMode] = useState<'draft' | 'go_live'>('draft');
  const [wTemplateMode, setWTemplateMode] = useState<'default' | 'customized'>('default');
  const [wAutoPublishToShowcaseDrafts, setWAutoPublishToShowcaseDrafts] = useState(true);
  const [wProblemImportCandidateItems, setWProblemImportCandidateItems] = useState<ProblemImportCandidate[]>([]);
  const [wSelectedProblemImportIds, setWSelectedProblemImportIds] = useState<string[]>([]);
  const [wProblemImportLoading, setWProblemImportLoading] = useState(false);
  const [wProblemImportLoaded, setWProblemImportLoaded] = useState(false);
  const [wProblemImportError, setWProblemImportError] = useState('');
  const [wScheduleOutput, setWScheduleOutput] = useState<ScheduleBuilderV2Output | null>(null);
  const [wScheduleBuilderState, setWScheduleBuilderState] = useState<ScheduleBuilderV2State | null>(null);
  const [wEventDuration, setWEventDuration] = useState<EventDuration>(2);
  const [wSelectedEvents, setWSelectedEvents] = useState<ScheduleEventType[]>(getDefaultSelections());

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
      logSwitcherNavigabilityTelemetry('global.bootstrap.live', data.registry ?? []);
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
            logSwitcherNavigabilityTelemetry('global.bootstrap.cache', cachedRegistry);
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

  const refreshSwitcherRegistry = useCallback(async () => {
    setRefreshingSwitcherRegistry(true);
    try {
      await loadBootstrap();
      setActionError('');
      setActionMessage('Switcher registry refreshed.');
    } finally {
      setRefreshingSwitcherRegistry(false);
    }
  }, [loadBootstrap]);

  const featuredHacks = bootstrap?.featuredHacks ?? [];
  const allProjects = bootstrap?.recentProjects ?? [];
  const allPeople = bootstrap?.people ?? [];
  const registry = bootstrap?.registry ?? [];
  const sortedRegistry = useMemo(() => sortByMostRecent([...registry]), [registry]);
  const switcherSections = useMemo(() => buildSwitcherSections(registry), [registry]);
  const hasNonNavigableSwitcherItems = useMemo(
    () => registry.some((item) => !isNavigableRegistryItem(item)),
    [registry]
  );
  const switcherGroups = [
    { title: 'Live Events', items: switcherSections.live },
    { title: 'Upcoming', items: switcherSections.upcoming },
    { title: 'Recent', items: switcherSections.recent },
  ];
  const fallbackPipelineItems = useMemo<PipelineBoardItem[]>(
    () =>
      allProjects.map((project) => ({
        projectId: project.id,
        title: project.title,
        description: project.description,
        ownerName: project.ownerName,
        stage: mapProjectStatusToPipelineStage(project),
        status: project.status,
        statusLabel: project.statusLabel,
        daysInStage: 0,
        attachedHacksCount: project.attachedHacksCount,
        commentCount: project.commentCount,
        timeSavedEstimate: project.timeSavedEstimate,
        visibility: project.visibility,
        enteredStageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    [allProjects]
  );
  const fallbackPipelineMetrics = useMemo<PipelineMetrics>(() => {
    const counts: Record<PipelineStage, number> = {
      hack: 0,
      validated_prototype: 0,
      incubating_project: 0,
      product_candidate: 0,
    };
    for (const item of fallbackPipelineItems) {
      counts[item.stage] += 1;
    }
    return {
      itemsPerStage: PIPELINE_STAGE_DEFINITIONS.map((stage) => ({
        stage: stage.stage,
        count: counts[stage.stage],
      })),
      averageDaysInStage: PIPELINE_STAGE_DEFINITIONS.map((stage) => ({
        stage: stage.stage,
        averageDays: 0,
      })),
      conversionHackToValidated: percent(counts.validated_prototype, Math.max(counts.hack, 1)),
      conversionValidatedToIncubating: percent(counts.incubating_project, Math.max(counts.validated_prototype, 1)),
      conversionIncubatingToCandidate: percent(counts.product_candidate, Math.max(counts.incubating_project, 1)),
      totalEntered: fallbackPipelineItems.length,
      totalGraduated: counts.product_candidate,
    };
  }, [fallbackPipelineItems]);
  const effectivePipelineStageCriteria = pipelineStageCriteria.length > 0 ? pipelineStageCriteria : PIPELINE_STAGE_DEFINITIONS;
  const effectivePipelineItems = pipelineLoaded ? pipelineItems : fallbackPipelineItems;
  const effectivePipelineMetrics = pipelineMetrics ?? fallbackPipelineMetrics;
  const pipelineItemsByStage = useMemo(() => {
    const map: Record<PipelineStage, PipelineBoardItem[]> = {
      hack: [],
      validated_prototype: [],
      incubating_project: [],
      product_candidate: [],
    };
    for (const item of effectivePipelineItems) {
      map[item.stage].push(item);
    }
    return map;
  }, [effectivePipelineItems]);

  useEffect(() => {
    const nextDescriptions: Record<PipelineStage, string> = {
      hack: PIPELINE_STAGE_DEFINITIONS[0].description,
      validated_prototype: PIPELINE_STAGE_DEFINITIONS[1].description,
      incubating_project: PIPELINE_STAGE_DEFINITIONS[2].description,
      product_candidate: PIPELINE_STAGE_DEFINITIONS[3].description,
    };
    const nextCriteriaText: Record<PipelineStage, string> = {
      hack: PIPELINE_STAGE_DEFINITIONS[0].criteria.join('\n'),
      validated_prototype: PIPELINE_STAGE_DEFINITIONS[1].criteria.join('\n'),
      incubating_project: PIPELINE_STAGE_DEFINITIONS[2].criteria.join('\n'),
      product_candidate: PIPELINE_STAGE_DEFINITIONS[3].criteria.join('\n'),
    };
    for (const stage of effectivePipelineStageCriteria) {
      nextDescriptions[stage.stage] = stage.description;
      nextCriteriaText[stage.stage] = stage.criteria.join('\n');
    }
    setPipelineCriteriaDescriptionDraftByStage(nextDescriptions);
    setPipelineCriteriaTextDraftByStage(nextCriteriaText);
  }, [effectivePipelineStageCriteria]);

  useEffect(() => {
    if (view !== 'projects') return;
    setView('pipeline');
  }, [view]);

  const loadPipelineBoard = useCallback(async () => {
    setPipelineLoading(true);
    setPipelineError('');
    try {
      if (previewMode) {
        setPipelineItems(fallbackPipelineItems);
        setPipelineStageCriteria(PIPELINE_STAGE_DEFINITIONS);
        setPipelineMetrics(fallbackPipelineMetrics);
        setPipelineCanManage(true);
        setPipelineLoaded(true);
        return;
      }

      const result = await invokeTyped('hdcGetPipelineBoard', {});
      setPipelineItems(result.items);
      setPipelineStageCriteria(result.stageCriteria.length > 0 ? result.stageCriteria : PIPELINE_STAGE_DEFINITIONS);
      setPipelineMetrics(result.metrics);
      setPipelineCanManage(result.canManage);
      setPipelineLoaded(true);
    } catch (error) {
      setPipelineError(error instanceof Error ? error.message : 'Failed to load pipeline board.');
    } finally {
      setPipelineLoading(false);
    }
  }, [fallbackPipelineItems, fallbackPipelineMetrics, previewMode]);

  useEffect(() => {
    if (view !== 'pipeline') return;
    void loadPipelineBoard();
  }, [view, loadPipelineBoard]);

  const handleMovePipelineItem = useCallback(
    async (item: PipelineBoardItem) => {
      const targetStage = pipelineMoveStageByProjectId[item.projectId] ?? item.stage;
      const note = (pipelineMoveNoteByProjectId[item.projectId] || '').trim();
      if (targetStage === item.stage) {
        setActionError('Choose a different target stage before moving this item.');
        return;
      }
      if (note.length < 6) {
        setActionError('Transition note must be at least 6 characters.');
        return;
      }

      setPipelineMovePendingProjectId(item.projectId);
      setActionError('');
      setActionMessage('');
      try {
        if (previewMode) {
          setPipelineItems((current) =>
            current.map((candidate) =>
              candidate.projectId === item.projectId
                ? {
                    ...candidate,
                    stage: targetStage,
                    enteredStageAt: new Date().toISOString(),
                    daysInStage: 0,
                  }
                : candidate
            )
          );
          setActionMessage(`Pipeline item moved to ${formatLabel(targetStage)} (preview mode).`);
          return;
        }

        const payload: MovePipelineItemInput = {
          projectId: item.projectId,
          toStage: targetStage,
          note,
        };
        const result = await invokeTyped('hdcMovePipelineItem', payload);
        setActionMessage(
          `Pipeline item moved from ${formatLabel(result.fromStage)} to ${formatLabel(result.toStage)}.`
        );
        setPipelineMoveNoteByProjectId((current) => ({
          ...current,
          [item.projectId]: '',
        }));
        await loadPipelineBoard();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Failed to move pipeline item.');
      } finally {
        setPipelineMovePendingProjectId(null);
      }
    },
    [loadPipelineBoard, pipelineMoveNoteByProjectId, pipelineMoveStageByProjectId, previewMode]
  );

  const handleSavePipelineCriteria = useCallback(
    async (stage: PipelineStage) => {
      const existing = effectivePipelineStageCriteria.find((item) => item.stage === stage);
      if (!existing) return;

      const description = (pipelineCriteriaDescriptionDraftByStage[stage] ?? existing.description).trim();
      const criteria = parsePipelineCriteriaText(
        pipelineCriteriaTextDraftByStage[stage] ?? existing.criteria.join('\n')
      );
      if (criteria.length === 0) {
        setActionError('Stage criteria must include at least one item.');
        return;
      }
      if (criteria.some((item) => item.length < 3 || item.length > 240)) {
        setActionError('Each stage criteria item must be 3-240 characters.');
        return;
      }

      setPipelineCriteriaSavePendingStage(stage);
      setActionError('');
      setActionMessage('');
      try {
        if (previewMode) {
          setPipelineStageCriteria((current) =>
            current.map((item) =>
              item.stage === stage
                ? {
                    ...item,
                    description,
                    criteria,
                  }
                : item
            )
          );
          setActionMessage(`Stage criteria saved for ${existing.label} (preview mode).`);
          return;
        }

        const payload: UpdatePipelineStageCriteriaInput = {
          stage,
          label: existing.label,
          description,
          criteria,
        };
        const result = await invokeTyped('hdcUpdatePipelineStageCriteria', payload);
        setPipelineStageCriteria((current) =>
          current.map((item) => (item.stage === stage ? result.stageCriteria : item))
        );
        setPipelineCriteriaDescriptionDraftByStage((current) => ({
          ...current,
          [stage]: result.stageCriteria.description,
        }));
        setPipelineCriteriaTextDraftByStage((current) => ({
          ...current,
          [stage]: result.stageCriteria.criteria.join('\n'),
        }));
        setActionMessage(`Stage criteria updated for ${result.stageCriteria.label}.`);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Failed to update stage criteria.');
      } finally {
        setPipelineCriteriaSavePendingStage(null);
      }
    },
    [
      effectivePipelineStageCriteria,
      pipelineCriteriaDescriptionDraftByStage,
      pipelineCriteriaTextDraftByStage,
      previewMode,
    ]
  );

  const loadPathways = useCallback(
    async (filters: ListPathwaysInput) => {
      setPathwayLoading(true);
      setPathwayError('');
      try {
        if (previewMode) {
          const previewItem = buildPreviewPathwayListItem();
          const matchesQuery = (filters.query ?? '').trim()
            ? `${previewItem.title} ${previewItem.summary}`.toLowerCase().includes((filters.query ?? '').trim().toLowerCase())
            : true;
          const matchesDomain = filters.domain ? (previewItem.domain ?? '').toLowerCase() === filters.domain.toLowerCase() : true;
          const matchesRole = filters.role ? (previewItem.role ?? '').toLowerCase() === filters.role.toLowerCase() : true;
          const include = (!filters.recommendedOnly || previewItem.recommended) && matchesQuery && matchesDomain && matchesRole;
          const nextItems = include ? [previewItem] : [];
          setPathwayItems(nextItems);
          setPathwayCanManage(false);
          setPathwayLoaded(true);
          setPathwaySelectedId((current) => {
            if (nextItems.length === 0) return null;
            if (!current) return nextItems[0]?.pathwayId ?? null;
            return nextItems.some((item) => item.pathwayId === current) ? current : (nextItems[0]?.pathwayId ?? null);
          });
          return;
        }

        const result = await invokeTyped('hdcListPathways', {
          ...filters,
          limit: 50,
        });
        setPathwayItems(result.items);
        setPathwayCanManage(result.canManage);
        setPathwayLoaded(true);
        setPathwaySelectedId((current) => {
          if (!current) return result.items[0]?.pathwayId ?? null;
          return result.items.some((item) => item.pathwayId === current) ? current : (result.items[0]?.pathwayId ?? null);
        });
      } catch (error) {
        setPathwayError(error instanceof Error ? error.message : 'Failed to load pathways.');
      } finally {
        setPathwayLoading(false);
      }
    },
    [previewMode]
  );

  const applyPathwayFilters = useCallback(() => {
    const nextFilters: ListPathwaysInput = {
      query: pathwayQueryInput.trim() || undefined,
      domain: pathwayDomainInput.trim() || undefined,
      role: pathwayRoleInput.trim() || undefined,
      recommendedOnly: pathwayRecommendedOnly || undefined,
      publishedOnly: true,
    };
    setPathwayAppliedFilters(nextFilters);
  }, [pathwayDomainInput, pathwayQueryInput, pathwayRecommendedOnly, pathwayRoleInput]);

  useEffect(() => {
    if (view !== 'guide') return;
    void loadPathways(pathwayAppliedFilters);
  }, [loadPathways, pathwayAppliedFilters, view]);

  useEffect(() => {
    if (view !== 'guide') return;
    if (!pathwaySelectedId) {
      setPathwayDetail(null);
      setPathwayDetailError('');
      setPathwayDetailLoading(false);
      return;
    }

    const loadDetail = async (): Promise<void> => {
      setPathwayDetailLoading(true);
      setPathwayDetailError('');
      try {
        if (previewMode) {
          const existingCompleted = pathwayDetail?.pathway.pathwayId === pathwaySelectedId
            ? pathwayDetail.pathway.progress.completedStepIds
            : [];
          setPathwayDetail(buildPreviewPathwayDetail(existingCompleted));
          return;
        }
        const result = await invokeTyped('hdcGetPathway', { pathwayId: pathwaySelectedId });
        setPathwayDetail(result);
      } catch (error) {
        setPathwayDetailError(error instanceof Error ? error.message : 'Failed to load pathway details.');
      } finally {
        setPathwayDetailLoading(false);
      }
    };

    void loadDetail();
  }, [pathwaySelectedId, previewMode, view]);

  const handleTogglePathwayStepCompletion = useCallback(
    async (step: PathwayStep) => {
      if (!pathwayDetail) return;
      const currentCompleted = new Set(pathwayDetail.pathway.progress.completedStepIds);
      const nextCompleted = !currentCompleted.has(step.stepId);
      setPathwayStepPendingId(step.stepId);
      setActionError('');
      setActionMessage('');
      try {
        if (previewMode) {
          const updatedCompletedIds = nextCompleted
            ? [...currentCompleted, step.stepId]
            : [...currentCompleted].filter((id) => id !== step.stepId);
          const nextDetail = buildPreviewPathwayDetail(updatedCompletedIds);
          setPathwayDetail(nextDetail);
          setPathwayItems((current) =>
            current.map((item) =>
              item.pathwayId === nextDetail.pathway.pathwayId
                ? { ...item, progress: nextDetail.pathway.progress }
                : item
            )
          );
          setActionMessage(nextCompleted ? 'Step marked complete (preview mode).' : 'Step marked incomplete (preview mode).');
          return;
        }

        const result = await invokeTyped('hdcSetPathwayStepCompletion', {
          pathwayId: pathwayDetail.pathway.pathwayId,
          stepId: step.stepId,
          completed: nextCompleted,
        });
        setPathwayDetail((current) => {
          if (!current || current.pathway.pathwayId !== result.pathwayId) return current;
          return {
            ...current,
            pathway: {
              ...current.pathway,
              progress: result.progress,
            },
          };
        });
        setPathwayItems((current) =>
          current.map((item) =>
            item.pathwayId === result.pathwayId
              ? {
                  ...item,
                  progress: result.progress,
                }
              : item
          )
        );
        setActionMessage(nextCompleted ? 'Step marked complete.' : 'Step marked incomplete.');
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Failed to update pathway progress.');
      } finally {
        setPathwayStepPendingId(null);
      }
    },
    [pathwayDetail, previewMode]
  );

  const openCreatePathwayEditor = useCallback(() => {
    setPathwayEditorMode('create');
    setPathwayEditorPathwayId(null);
    setPathwayEditorTitle('');
    setPathwayEditorSummary('');
    setPathwayEditorIntroText('');
    setPathwayEditorDomain(pathwayDomainInput);
    setPathwayEditorRole(pathwayRoleInput);
    setPathwayEditorTagsInput('');
    setPathwayEditorPublished(true);
    setPathwayEditorRecommended(pathwayRecommendedOnly);
    setPathwayEditorSteps([createDefaultPathwayStepDraft()]);
    setPathwayEditorOpen(true);
    setActionError('');
    setActionMessage('');
  }, [pathwayDomainInput, pathwayRecommendedOnly, pathwayRoleInput]);

  const openEditPathwayEditor = useCallback(() => {
    if (!pathwayDetail) return;
    setPathwayEditorMode('edit');
    setPathwayEditorPathwayId(pathwayDetail.pathway.pathwayId);
    setPathwayEditorTitle(pathwayDetail.pathway.title);
    setPathwayEditorSummary(pathwayDetail.pathway.summary ?? '');
    setPathwayEditorIntroText(pathwayDetail.pathway.introText ?? '');
    setPathwayEditorDomain(pathwayDetail.pathway.domain ?? '');
    setPathwayEditorRole(pathwayDetail.pathway.role ?? '');
    setPathwayEditorTagsInput(pathwayDetail.pathway.tags.join(', '));
    setPathwayEditorPublished(pathwayDetail.pathway.published);
    setPathwayEditorRecommended(pathwayDetail.pathway.recommended);
    setPathwayEditorSteps(
      pathwayDetail.steps.length > 0
        ? pathwayDetail.steps.map((step) => createPathwayStepDraft(step))
        : [createDefaultPathwayStepDraft()]
    );
    setPathwayEditorOpen(true);
    setActionError('');
    setActionMessage('');
  }, [pathwayDetail]);

  const closePathwayEditor = useCallback(() => {
    if (pathwayEditorSaving) return;
    setPathwayEditorOpen(false);
  }, [pathwayEditorSaving]);

  const handleUpdatePathwayStepDraft = useCallback((localId: string, patch: Partial<PathwayStepDraft>) => {
    setPathwayEditorSteps((current) =>
      current.map((step) => (step.localId === localId ? { ...step, ...patch } : step))
    );
  }, []);

  const handleRemovePathwayStepDraft = useCallback((localId: string) => {
    setPathwayEditorSteps((current) => {
      if (current.length <= 1) {
        return current;
      }
      return current.filter((step) => step.localId !== localId);
    });
  }, []);

  const handleAddPathwayStepDraft = useCallback(() => {
    setPathwayEditorSteps((current) => [...current, createDefaultPathwayStepDraft()]);
  }, []);

  const handleSavePathwayEditor = useCallback(async () => {
    if (!pathwayCanManage) return;
    const title = pathwayEditorTitle.trim();
    if (title.length < 3) {
      setActionError('Pathway title must be at least 3 characters.');
      return;
    }
    if (pathwayEditorSteps.length === 0) {
      setActionError('Add at least one pathway step.');
      return;
    }
    const normalizedSteps: UpsertPathwayStepInput[] = [];
    for (let index = 0; index < pathwayEditorSteps.length; index += 1) {
      const step = pathwayEditorSteps[index];
      const stepTitle = step.title.trim();
      if (stepTitle.length < 3) {
        setActionError(`Step ${index + 1} title must be at least 3 characters.`);
        return;
      }
      const externalUrl = step.externalUrl.trim();
      if (externalUrl && !isValidHttpUrl(externalUrl)) {
        setActionError(`Step ${index + 1} URL must start with http:// or https://.`);
        return;
      }
      const linkedArtifactId = step.linkedArtifactId.trim();
      if (linkedArtifactId && !isUuid(linkedArtifactId)) {
        setActionError(`Step ${index + 1} linked artifact ID must be a valid UUID.`);
        return;
      }
      normalizedSteps.push({
        stepId: step.stepId?.trim() || undefined,
        type: step.type,
        title: stepTitle,
        description: step.description.trim() || undefined,
        linkedHackProjectId: step.linkedHackProjectId.trim() || undefined,
        linkedArtifactId: linkedArtifactId || undefined,
        externalUrl: externalUrl || undefined,
        challengePrompt: step.challengePrompt.trim() || undefined,
        isOptional: step.isOptional,
      });
    }
    const payload: UpsertPathwayInput = {
      pathwayId: pathwayEditorMode === 'edit' ? pathwayEditorPathwayId ?? undefined : undefined,
      title,
      summary: pathwayEditorSummary.trim() || undefined,
      introText: pathwayEditorIntroText.trim() || undefined,
      domain: pathwayEditorDomain.trim() || undefined,
      role: pathwayEditorRole.trim() || undefined,
      tags: parseRegistryTags(pathwayEditorTagsInput),
      published: pathwayEditorPublished,
      recommended: pathwayEditorRecommended,
      steps: normalizedSteps,
    };

    setPathwayEditorSaving(true);
    setActionError('');
    setActionMessage('');
    try {
      const result = await invokeTyped('hdcUpsertPathway', payload);
      setPathwayEditorOpen(false);
      setPathwaySelectedId(result.pathway.pathwayId);
      setPathwayDetail({
        pathway: result.pathway,
        steps: result.steps,
        canManage: true,
      });
      await loadPathways(pathwayAppliedFilters);
      setActionMessage(pathwayEditorMode === 'create' ? 'Pathway created.' : 'Pathway updated.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to save pathway.');
    } finally {
      setPathwayEditorSaving(false);
    }
  }, [
    loadPathways,
    pathwayAppliedFilters,
    pathwayCanManage,
    pathwayEditorDomain,
    pathwayEditorIntroText,
    pathwayEditorMode,
    pathwayEditorPathwayId,
    pathwayEditorPublished,
    pathwayEditorRecommended,
    pathwayEditorRole,
    pathwayEditorSteps,
    pathwayEditorSummary,
    pathwayEditorTagsInput,
    pathwayEditorTitle,
  ]);

  const loadShowcaseHacks = useCallback(async () => {
    setShowcaseLoading(true);
    setShowcaseError('');
    try {
      const requestedAssetTypes = hackTypeFilter === 'all' ? undefined : [hackTypeFilter];
      const requestedStatuses: Array<'completed' | 'in_progress'> =
        hackStatusFilter === 'verified'
          ? ['completed' as const]
          : hackStatusFilter === 'in_progress'
            ? ['in_progress' as const]
            : [hackTab === 'in_progress' ? 'in_progress' : 'completed'];
      const requestedTags = parseRegistryTags(showcaseTagsInput);
      const sourceEventId = showcaseSourceEventInput.trim() || undefined;

      if (previewMode) {
        let items = featuredHacks.map(mapFeaturedHackToShowcaseItem);
        const query = hackSearch.trim().toLowerCase();
        if (query) {
          items = items.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(query));
        }
        if (requestedAssetTypes && requestedAssetTypes.length > 0) {
          const types = new Set(requestedAssetTypes);
          items = items.filter((item) => types.has(item.assetType));
        }
        if (requestedStatuses.length > 0) {
          const statuses = new Set(requestedStatuses);
          items = items.filter((item) => statuses.has(item.status));
        }
        if (requestedTags.length > 0) {
          items = items.filter((item) => {
            const tags = new Set(item.tags);
            for (const tag of requestedTags) {
              if (!tags.has(tag)) return false;
            }
            return true;
          });
        }
        if (sourceEventId) {
          items = items.filter((item) => item.sourceEventId === sourceEventId);
        }
        if (showcaseFeaturedOnly) {
          items = items.filter((item) => item.featured);
        }
        setShowcaseItems(items);
        setShowcaseCanManage(true);
        setShowcaseLoaded(true);
        return;
      }

      const result = await invokeTyped('hdcListShowcaseHacks', {
        query: hackSearch.trim() || undefined,
        assetTypes: requestedAssetTypes,
        statuses: requestedStatuses,
        tags: requestedTags.length > 0 ? requestedTags : undefined,
        sourceEventId,
        featuredOnly: showcaseFeaturedOnly || undefined,
        sortBy: 'featured',
        limit: 100,
      });
      setShowcaseItems(result.items);
      setShowcaseCanManage(result.canManage);
      setShowcaseLoaded(true);
    } catch (error) {
      setShowcaseError(error instanceof Error ? error.message : 'Failed to load Showcase hacks.');
    } finally {
      setShowcaseLoading(false);
    }
  }, [
    featuredHacks,
    hackSearch,
    hackStatusFilter,
    hackTab,
    hackTypeFilter,
    previewMode,
    showcaseFeaturedOnly,
    showcaseSourceEventInput,
    showcaseTagsInput,
  ]);

  useEffect(() => {
    if (view !== 'hacks') return;
    void loadShowcaseHacks();
  }, [loadShowcaseHacks, view]);

  useEffect(() => {
    if (view !== 'hacks') return;
    if (!showcaseSelectedProjectId) return;

    const loadDetail = async (): Promise<void> => {
      setShowcaseDetailLoading(true);
      setShowcaseDetailError('');
      try {
        if (previewMode) {
          const previewItem = showcaseItems.find((item) => item.projectId === showcaseSelectedProjectId);
          if (previewItem) {
            setShowcaseDetail({
              hack: {
                ...previewItem,
                teamMembers: [],
                linkedArtifactIds: [],
                context: null,
                limitations: null,
                riskNotes: null,
                sourceRepoUrl: null,
              },
              artifactsProduced: [],
              problemsSolved: [],
            });
          }
          return;
        }
        const result = await invokeTyped('hdcGetShowcaseHackDetail', {
          projectId: showcaseSelectedProjectId,
        });
        setShowcaseDetail(result);
      } catch (error) {
        setShowcaseDetailError(error instanceof Error ? error.message : 'Failed to load showcase detail.');
      } finally {
        setShowcaseDetailLoading(false);
      }
    };

    void loadDetail();
  }, [previewMode, showcaseItems, showcaseSelectedProjectId, view]);

  const handleToggleShowcaseFeatured = useCallback(
    async (item: ShowcaseHackListItem) => {
      if (!showcaseCanManage) return;
      const nextFeatured = !item.featured;
      setShowcaseFeaturePendingProjectId(item.projectId);
      setActionError('');
      setActionMessage('');
      try {
        if (previewMode) {
          setShowcaseItems((current) =>
            current.map((candidate) =>
              candidate.projectId === item.projectId ? { ...candidate, featured: nextFeatured } : candidate
            )
          );
          setActionMessage(nextFeatured ? 'Marked featured (preview mode).' : 'Removed featured flag (preview mode).');
          return;
        }

        const result = await invokeTyped('hdcSetShowcaseFeatured', {
          projectId: item.projectId,
          featured: nextFeatured,
        });
        setShowcaseItems((current) =>
          current.map((candidate) =>
            candidate.projectId === result.projectId
              ? { ...candidate, featured: result.featured, updatedAt: result.updatedAt }
              : candidate
          )
        );
        setShowcaseDetail((current) => {
          if (!current || current.hack.projectId !== result.projectId) return current;
          return {
            ...current,
            hack: {
              ...current.hack,
              featured: result.featured,
              updatedAt: result.updatedAt,
            },
          };
        });
        setActionMessage(result.featured ? 'Hack marked as featured.' : 'Hack removed from featured section.');
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Failed to update featured flag.');
      } finally {
        setShowcaseFeaturePendingProjectId(null);
      }
    },
    [previewMode, showcaseCanManage]
  );

  const loadRegistryArtifacts = useCallback(
    async (filters: {
      query?: string;
      artifactTypes?: ArtifactType[];
      tags?: string[];
      sortBy: RegistrySortBy;
    }) => {
      setRegistryLoading(true);
      setRegistryError('');
      try {
        if (previewMode) {
          let previewItems = featuredHacks.map(mapFeaturedHackToArtifact);
          if (filters.query) {
            const q = filters.query.toLowerCase();
            previewItems = previewItems.filter((item) =>
              `${item.title} ${item.description}`.toLowerCase().includes(q)
            );
          }
          if (filters.artifactTypes && filters.artifactTypes.length > 0) {
            const typeSet = new Set(filters.artifactTypes);
            previewItems = previewItems.filter((item) => typeSet.has(item.artifactType));
          }
          if (filters.tags && filters.tags.length > 0) {
            const tagSet = new Set(filters.tags);
            previewItems = previewItems.filter((item) => {
              const itemTags = new Set(item.tags.map((tag) => tag.toLowerCase()));
              for (const requestedTag of tagSet) {
                if (!itemTags.has(requestedTag)) return false;
              }
              return true;
            });
          }
          if (filters.sortBy === 'reuse_count') {
            previewItems = previewItems.slice().sort((a, b) => b.reuseCount - a.reuseCount);
          }
          setRegistryItems(previewItems);
          setRegistryLoaded(true);
          return;
        }

        const result = await invokeTyped('hdcListArtifacts', {
          query: filters.query || undefined,
          artifactTypes: filters.artifactTypes && filters.artifactTypes.length > 0 ? filters.artifactTypes : undefined,
          tags: filters.tags && filters.tags.length > 0 ? filters.tags : undefined,
          sortBy: filters.sortBy,
          limit: 50,
        });
        setRegistryItems(result.items);
        setRegistryLoaded(true);
      } catch (error) {
        setRegistryError(error instanceof Error ? error.message : 'Failed to load Registry artifacts.');
      } finally {
        setRegistryLoading(false);
      }
    },
    [featuredHacks, previewMode]
  );

  const applyRegistryFilters = useCallback(() => {
    const query = registrySearchInput.trim();
    const tags = parseRegistryTags(registryTagsInput);
    const nextFilters = {
      query: query || undefined,
      artifactTypes: registryTypeFilter === 'all' ? undefined : [registryTypeFilter],
      tags: tags.length > 0 ? tags : undefined,
      sortBy: registrySortBy,
    };
    setRegistryAppliedFilters(nextFilters);
    setRegistryDetailsById({});
  }, [registrySearchInput, registrySortBy, registryTagsInput, registryTypeFilter]);

  const clearRegistryFilters = useCallback(() => {
    setRegistrySearchInput('');
    setRegistryTagsInput('');
    setRegistryTypeFilter('all');
    setRegistrySortBy('newest');
    setRegistryAppliedFilters({ sortBy: 'newest' });
    setRegistryDetailsById({});
  }, []);

  useEffect(() => {
    if (view !== 'library') return;
    void loadRegistryArtifacts(registryAppliedFilters);
  }, [view, loadRegistryArtifacts, registryAppliedFilters]);

  const handleRegistrySearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyRegistryFilters();
      }
    },
    [applyRegistryFilters]
  );

  const resetArtifactForm = useCallback(() => {
    setArtifactTitle('');
    setArtifactDescription('');
    setArtifactType('prompt');
    setArtifactTagsInput('');
    setArtifactSourceUrl('');
    setArtifactSourceLabel('');
    setArtifactSourceHackProjectId('');
    setArtifactSourceHackdayEventId('');
    setArtifactVisibility('org');
  }, []);

  const handleCreateArtifact = useCallback(async () => {
    const title = artifactTitle.trim();
    if (title.length < 3 || title.length > 120) {
      setActionError('Artifact title must be 3-120 characters.');
      return;
    }

    const description = artifactDescription.trim();
    if (description.length < 10 || description.length > 2000) {
      setActionError('Artifact description must be 10-2000 characters.');
      return;
    }

    const tags = parseRegistryTags(artifactTagsInput);
    if (tags.length === 0) {
      setActionError('At least one artifact tag is required (comma-separated).');
      return;
    }

    const sourceUrl = artifactSourceUrl.trim();
    if (!isValidHttpsUrl(sourceUrl)) {
      setActionError('Source URL must be a valid https URL.');
      return;
    }

    setArtifactSubmitting(true);
    setActionError('');
    setActionMessage('');

    const payload: CreateArtifactInput = {
      title,
      description,
      artifactType,
      tags,
      sourceUrl,
      sourceLabel: artifactSourceLabel.trim() || undefined,
      sourceHackProjectId: artifactSourceHackProjectId.trim() || undefined,
      sourceHackdayEventId: artifactSourceHackdayEventId.trim() || undefined,
      visibility: artifactVisibility,
    };

    try {
      if (previewMode) {
        const now = new Date().toISOString();
        const previewItem: ArtifactListItem = {
          id: `preview-created-${Date.now()}`,
          title: payload.title,
          description: payload.description,
          artifactType: payload.artifactType,
          tags: payload.tags,
          sourceUrl: payload.sourceUrl,
          sourceLabel: payload.sourceLabel,
          sourceHackProjectId: payload.sourceHackProjectId,
          sourceHackdayEventId: payload.sourceHackdayEventId,
          visibility: payload.visibility ?? 'org',
          reuseCount: 0,
          createdAt: now,
          updatedAt: now,
          authorName: bootstrap?.viewer.accountId ?? 'Local Preview User',
        };
        setRegistryItems((current) => [previewItem, ...current]);
      } else {
        await invokeTyped('hdcCreateArtifact', payload);
        await loadRegistryArtifacts(registryAppliedFilters);
      }
      setActionMessage(`Artifact submitted to Registry: ${payload.title}`);
      resetArtifactForm();
      setShowCreateArtifactForm(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to create artifact.');
    } finally {
      setArtifactSubmitting(false);
    }
  }, [
    artifactDescription,
    artifactSourceHackProjectId,
    artifactSourceHackdayEventId,
    artifactSourceLabel,
    artifactSourceUrl,
    artifactTagsInput,
    artifactTitle,
    artifactType,
    artifactVisibility,
    bootstrap?.viewer.accountId,
    loadRegistryArtifacts,
    previewMode,
    registryAppliedFilters,
    resetArtifactForm,
  ]);

  const handleMarkArtifactReuse = useCallback(
    async (artifactId: string) => {
      setActionError('');
      setActionMessage('');
      setReusePendingArtifactId(artifactId);
      try {
        if (previewMode) {
          setRegistryItems((current) =>
            current.map((item) => (item.id === artifactId ? { ...item, reuseCount: item.reuseCount + 1 } : item))
          );
          setActionMessage('Reuse count updated (preview mode).');
          return;
        }

        const result = await invokeTyped('hdcMarkArtifactReuse', { artifactId });
        setRegistryItems((current) =>
          current.map((item) => (item.id === artifactId ? { ...item, reuseCount: result.reuseCount } : item))
        );
        setActionMessage(
          result.alreadyMarked
            ? 'Reuse already recorded for your account.'
            : 'Thanks. Reuse has been recorded.'
        );
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Failed to mark artifact reuse.');
      } finally {
        setReusePendingArtifactId(null);
      }
    },
    [previewMode]
  );

  const handleToggleArtifactDetails = useCallback(
    async (artifactId: string) => {
      if (registryDetailsById[artifactId]) {
        setRegistryDetailsById((current) => {
          const next = { ...current };
          delete next[artifactId];
          return next;
        });
        return;
      }

      setDetailLoadingArtifactId(artifactId);
      try {
        if (previewMode) {
          const previewItem = registryItems.find((item) => item.id === artifactId);
          if (!previewItem) return;
          setRegistryDetailsById((current) => ({
            ...current,
            [artifactId]: {
              artifact: previewItem,
              sourceHack: null,
            },
          }));
          return;
        }

        const result = await invokeTyped('hdcGetArtifact', { artifactId });
        setRegistryDetailsById((current) => ({ ...current, [artifactId]: result }));
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Failed to fetch artifact details.');
      } finally {
        setDetailLoadingArtifactId(null);
      }
    },
    [previewMode, registryDetailsById, registryItems]
  );

  useEffect(() => {
    if (!previewMode) return;
    if (problemPreviewItems.length > 0) return;
    const fallbackAuthor = bootstrap?.viewer.accountId ?? 'Local Preview User';
    setProblemPreviewItems(seedPreviewProblems(featuredHacks, fallbackAuthor));
  }, [bootstrap?.viewer.accountId, featuredHacks, previewMode, problemPreviewItems.length]);

  const loadProblemExchangeCapabilities = useCallback(async () => {
    if (previewMode) {
      setProblemCanModerate(true);
      setProblemModerationMode('allowlist');
      return;
    }
    try {
      const result = await invokeTyped('hdcGetProblemExchangeCapabilities');
      setProblemCanModerate(result.canModerate);
      setProblemModerationMode(result.moderationMode);
      if (!result.canModerate) {
        setProblemIncludeHidden(false);
      }
    } catch {
      setProblemCanModerate(false);
      setProblemModerationMode('none');
      setProblemIncludeHidden(false);
    }
  }, [previewMode]);

  const loadProblemExchangeItems = useCallback(
    async (filters: {
      query?: string;
      teams?: string[];
      domains?: string[];
      statuses?: ProblemStatus[];
      sortBy: ProblemSortBy;
      includeHidden: boolean;
    }) => {
      setProblemLoading(true);
      setProblemError('');
      try {
        if (previewMode) {
          const fallbackAuthor = bootstrap?.viewer.accountId ?? 'Local Preview User';
          const seed = problemPreviewItems.length > 0 ? problemPreviewItems : seedPreviewProblems(featuredHacks, fallbackAuthor);
          const filtered = applyProblemFilters(seed, filters);
          setProblemPreviewItems(seed);
          setProblemItems(filtered);
          setProblemLoaded(true);
          return;
        }

        const result = await invokeTyped('hdcListProblems', {
          query: filters.query || undefined,
          teams: filters.teams && filters.teams.length > 0 ? filters.teams : undefined,
          domains: filters.domains && filters.domains.length > 0 ? filters.domains : undefined,
          statuses: filters.statuses && filters.statuses.length > 0 ? filters.statuses : undefined,
          sortBy: filters.sortBy,
          includeHidden: filters.includeHidden,
          limit: 50,
        });
        setProblemItems(result.items);
        setProblemLoaded(true);
      } catch (error) {
        setProblemError(error instanceof Error ? error.message : 'Failed to load Problem Exchange items.');
      } finally {
        setProblemLoading(false);
      }
    },
    [applyProblemFilters, bootstrap?.viewer.accountId, featuredHacks, previewMode, problemPreviewItems]
  );

  useEffect(() => {
    if (view !== 'problem_exchange') return;
    void loadProblemExchangeCapabilities();
  }, [view, loadProblemExchangeCapabilities]);

  useEffect(() => {
    if (problemCanModerate) return;
    if (!problemAppliedFilters.includeHidden) return;
    setProblemAppliedFilters((current) => ({ ...current, includeHidden: false }));
  }, [problemAppliedFilters.includeHidden, problemCanModerate]);

  const applyPreviewProblemMutation = useCallback(
    (mutation: (items: ProblemListItem[]) => ProblemListItem[]) => {
      const fallbackAuthor = bootstrap?.viewer.accountId ?? 'Local Preview User';
      setProblemPreviewItems((current) => {
        const source = current.length > 0 ? current : seedPreviewProblems(featuredHacks, fallbackAuthor);
        const next = mutation(source);
        setProblemItems(applyProblemFilters(next, problemAppliedFilters));
        setProblemLoaded(true);
        return next;
      });
    },
    [applyProblemFilters, bootstrap?.viewer.accountId, featuredHacks, problemAppliedFilters]
  );

  const applyProblemFiltersToList = useCallback(() => {
    const nextFilters = buildProblemAppliedFilters(
      {
        query: problemSearchInput,
        teamsInput: problemTeamsInput,
        domainsInput: problemDomainsInput,
        status: problemStatusFilter,
        sortBy: problemSortBy,
        includeHidden: problemIncludeHidden,
      },
      problemCanModerate
    );
    setProblemAppliedFilters(nextFilters);
  }, [problemCanModerate, problemDomainsInput, problemIncludeHidden, problemSearchInput, problemSortBy, problemStatusFilter, problemTeamsInput]);

  const clearProblemFilters = useCallback(() => {
    const defaults = getDefaultProblemFilterDraft();
    setProblemSearchInput(defaults.query);
    setProblemTeamsInput(defaults.teamsInput);
    setProblemDomainsInput(defaults.domainsInput);
    setProblemStatusFilter(defaults.status);
    setProblemSortBy(defaults.sortBy);
    setProblemIncludeHidden(defaults.includeHidden);
    setProblemAppliedFilters(getDefaultProblemFilterSet());
  }, []);

  useEffect(() => {
    if (view !== 'problem_exchange') return;
    void loadProblemExchangeItems(problemAppliedFilters);
  }, [view, loadProblemExchangeItems, problemAppliedFilters]);

  const handleProblemSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      applyProblemFiltersToList();
    },
    [applyProblemFiltersToList]
  );

  const resetProblemForm = useCallback(() => {
    setProblemTitle('');
    setProblemDescription('');
    setProblemFrequency('weekly');
    setProblemTimeWastedHours('');
    setProblemTeam('');
    setProblemDomain('');
    setProblemContactDetails('');
  }, []);

  const handleCreateProblem = useCallback(async () => {
    const validationError = validateProblemCreateDraft({
      title: problemTitle,
      description: problemDescription,
      frequency: problemFrequency,
      estimatedTimeWastedHours: problemTimeWastedHours,
      team: problemTeam,
      domain: problemDomain,
      contactDetails: problemContactDetails,
    });
    if (validationError) {
      setActionError(validationError);
      return;
    }

    setProblemSubmitting(true);
    setActionError('');
    setActionMessage('');

    const payload: CreateProblemInput = {
      title: problemTitle.trim(),
      description: problemDescription.trim(),
      frequency: problemFrequency,
      estimatedTimeWastedHours: Number(problemTimeWastedHours),
      team: problemTeam.trim(),
      domain: problemDomain.trim(),
      contactDetails: problemContactDetails.trim(),
    };

    try {
      if (previewMode) {
        const authorName = bootstrap?.viewer.accountId ?? 'Local Preview User';
        applyPreviewProblemMutation((items) => [createPreviewProblemListItem(payload, authorName), ...items]);
      } else {
        await invokeTyped('hdcCreateProblem', payload);
        await loadProblemExchangeItems(problemAppliedFilters);
      }
      setActionMessage(`Problem posted: ${payload.title}`);
      resetProblemForm();
      setShowCreateProblemForm(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to create problem.');
    } finally {
      setProblemSubmitting(false);
    }
  }, [
    applyPreviewProblemMutation,
    bootstrap?.viewer.accountId,
    loadProblemExchangeItems,
    previewMode,
    problemAppliedFilters,
    problemContactDetails,
    problemDescription,
    problemDomain,
    problemFrequency,
    problemTeam,
    problemTimeWastedHours,
    problemTitle,
    resetProblemForm,
    validateProblemCreateDraft,
  ]);

  const handleVoteProblem = useCallback(
    async (problemId: string) => {
      setProblemVotePendingId(problemId);
      setActionError('');
      setActionMessage('');
      try {
        if (previewMode) {
          let previewResult:
            | {
                nextItems: ProblemListItem[];
                nextVotedIds: string[];
                alreadyVoted: boolean;
              }
            | undefined;
          applyPreviewProblemMutation((items) => {
            previewResult = applyPreviewVoteMutation(items, problemPreviewVotedIds, problemId);
            return previewResult.nextItems;
          });
          if (!previewResult) return;
          if (previewResult.alreadyVoted) {
            setActionMessage('Vote already recorded for your account (preview mode).');
            return;
          }
          setProblemPreviewVotedIds(previewResult.nextVotedIds);
          setActionMessage('Vote recorded (preview mode).');
          return;
        }

        const result = await invokeTyped('hdcVoteProblem', { problemId });
        setProblemItems((current) =>
          current.map((item) => (item.id === problemId ? { ...item, voteCount: result.voteCount } : item))
        );
        setActionMessage(result.alreadyVoted ? 'You already voted for this problem.' : 'Vote recorded.');
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Failed to vote for problem.');
      } finally {
        setProblemVotePendingId(null);
      }
    },
    [applyPreviewProblemMutation, previewMode, problemPreviewVotedIds]
  );

  const handleUpdateProblemStatus = useCallback(
    async (problem: ProblemListItem) => {
      const status = problemStatusDraftById[problem.id] ?? problem.status;
      const linkedHackProjectId = problemLinkHackProjectById[problem.id]?.trim() || undefined;
      const linkedArtifactId = problemLinkArtifactById[problem.id]?.trim() || undefined;
      const note = problemStatusNoteById[problem.id]?.trim() || undefined;

      const statusValidationError = validateProblemStatusDraft({
        status,
        linkedHackProjectId,
        linkedArtifactId,
      });
      if (statusValidationError) {
        setActionError(statusValidationError);
        return;
      }

      setProblemStatusPendingId(problem.id);
      setActionError('');
      setActionMessage('');
      try {
        if (previewMode) {
          applyPreviewProblemMutation((items) =>
            items.map((item) =>
              item.id === problem.id
                ? {
                    ...item,
                    status,
                    linkedHackProjectId,
                    linkedArtifactId,
                    updatedAt: new Date().toISOString(),
                  }
                : item
            )
          );
          setActionMessage(`Problem status updated to ${formatLabel(status)} (preview mode).`);
          return;
        }

        const payload: UpdateProblemStatusInput = {
          problemId: problem.id,
          status,
          linkedHackProjectId,
          linkedArtifactId,
          note,
        };
        const result = await invokeTyped('hdcUpdateProblemStatus', payload);
        setProblemItems((current) =>
          current.map((item) =>
            item.id === problem.id
              ? {
                  ...item,
                  status: result.status,
                  linkedHackProjectId: result.linkedHackProjectId,
                  linkedArtifactId: result.linkedArtifactId,
                  updatedAt: result.updatedAt,
                }
              : item
          )
        );
        setActionMessage(`Problem status updated to ${formatLabel(result.status)}.`);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Failed to update problem status.');
      } finally {
        setProblemStatusPendingId(null);
      }
    },
    [applyPreviewProblemMutation, previewMode, problemLinkArtifactById, problemLinkHackProjectById, problemStatusDraftById, problemStatusNoteById]
  );

  const handleFlagProblem = useCallback(
    async (problem: ProblemListItem) => {
      const reason = problemFlagReasonById[problem.id]?.trim() || undefined;
      setProblemFlagPendingId(problem.id);
      setActionError('');
      setActionMessage('');
      try {
        if (previewMode) {
          let previewResult:
            | {
                nextItems: ProblemListItem[];
                nextFlaggedIds: string[];
                alreadyFlagged: boolean;
                autoHidden: boolean;
              }
            | undefined;
          applyPreviewProblemMutation((items) => {
            previewResult = applyPreviewFlagMutation(items, problemPreviewFlaggedIds, problem.id);
            return previewResult.nextItems;
          });
          if (!previewResult) return;
          if (previewResult.alreadyFlagged) {
            setActionMessage('You already flagged this problem (preview mode).');
            return;
          }
          setProblemPreviewFlaggedIds(previewResult.nextFlaggedIds);
          setActionMessage(
            previewResult.autoHidden
              ? 'Flag recorded. Problem auto-hidden pending moderation.'
              : 'Flag recorded (preview mode).'
          );
          return;
        }

        const payload: FlagProblemInput = {
          problemId: problem.id,
          reason,
        };
        const result = await invokeTyped('hdcFlagProblem', payload);
        setProblemItems((current) =>
          current.map((item) =>
            item.id === problem.id
              ? {
                  ...item,
                  flagCount: result.flagCount,
                  moderationState: result.moderationState,
                }
              : item
          )
        );
        if (result.autoHidden) {
          setActionMessage('Flag recorded. Problem auto-hidden pending moderation.');
        } else {
          setActionMessage(result.alreadyFlagged ? 'You already flagged this problem.' : 'Flag recorded.');
        }
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Failed to flag problem.');
      } finally {
        setProblemFlagPendingId(null);
      }
    },
    [applyPreviewProblemMutation, previewMode, problemFlagReasonById, problemPreviewFlaggedIds]
  );

  const handleModerateProblem = useCallback(
    async (problem: ProblemListItem, decision: 'remove' | 'reinstate') => {
      if (!problemCanModerate) {
        setActionError('Moderator access is required for remove/reinstate actions.');
        return;
      }
      setProblemModerationPendingId(problem.id);
      setActionError('');
      setActionMessage('');
      try {
        if (previewMode) {
          const moderationState = decision === 'remove' ? 'removed' : 'visible';
          applyPreviewProblemMutation((items) =>
            items.map((item) =>
              item.id === problem.id
                ? { ...item, moderationState, updatedAt: new Date().toISOString() }
                : item
            )
          );
          setActionMessage(
            decision === 'remove'
              ? 'Problem removed by moderator (preview mode).'
              : 'Problem reinstated (preview mode).'
          );
          return;
        }

        const result = await invokeTyped('hdcModerateProblem', {
          problemId: problem.id,
          decision,
        });
        setProblemItems((current) =>
          current.map((item) =>
            item.id === problem.id
              ? { ...item, moderationState: result.moderationState, updatedAt: result.reviewedAt }
              : item
          )
        );
        setActionMessage(decision === 'remove' ? 'Problem removed by moderator.' : 'Problem reinstated.');
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Failed to moderate problem.');
      } finally {
        setProblemModerationPendingId(null);
      }
    },
    [applyPreviewProblemMutation, previewMode, problemCanModerate]
  );

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

  const showcaseAsFeaturedHacks = useMemo(
    () => showcaseItems.map((item) => mapShowcaseItemToFeaturedHack(item)),
    [showcaseItems]
  );

  const filteredHacks = useMemo(() => {
    return showcaseAsFeaturedHacks.filter((hack) => {
      const search = hackSearch.trim().toLowerCase();
      if (search && !`${hack.title} ${hack.description}`.toLowerCase().includes(search)) return false;
      if (hackTypeFilter !== 'all' && hack.assetType !== hackTypeFilter) return false;
      if (hackStatusFilter !== 'all' && hack.status !== hackStatusFilter) return false;
      if (!showDeprecated && isDeprecated(hack.status)) return false;
      return true;
    });
  }, [showcaseAsFeaturedHacks, hackSearch, hackStatusFilter, hackTypeFilter, showDeprecated]);

  const featuredTop = useMemo(() => {
    const featured = showcaseItems.filter((item) => item.featured).slice(0, 4).map(mapShowcaseItemToFeaturedHack);
    if (featured.length > 0) return featured;
    return filteredHacks.slice(0, 4);
  }, [filteredHacks, showcaseItems]);

  const globalSearchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return { hacks: featuredHacks.slice(0, 6), people: allPeople.slice(0, 6), projects: allProjects.slice(0, 6) };
    const matchHack = (h: { title: string; description: string }) =>
      `${h.title} ${h.description}`.toLowerCase().includes(q);
    const matchPerson = (p: { fullName: string; email: string }) =>
      `${p.fullName} ${p.email}`.toLowerCase().includes(q);
    const matchProject = (p: { title: string; description: string }) =>
      `${p.title} ${p.description}`.toLowerCase().includes(q);
    return {
      hacks: featuredHacks.filter(matchHack),
      people: allPeople.filter(matchPerson),
      projects: allProjects.filter(matchProject),
    };
  }, [globalSearch, featuredHacks, allPeople, allProjects]);

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
    if (!hackDemoUrl.trim()) {
      setActionError('Demo URL is required.');
      return;
    }

    if (previewMode) {
      setActionError('');
      setActionMessage(`Local preview: simulated hack submit for "${hackTitle.trim()}"`);
      setHackTitle('');
      setHackDescription('');
      setHackContent('');
      setHackDemoUrl('');
      setHackTeamMembersInput('');
      setHackSourceEventId('');
      setHackTagsInput('');
      setHackLinkedArtifactIdsInput('');
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
      demoUrl: hackDemoUrl.trim(),
      teamMembers: parseCommaSeparatedList(hackTeamMembersInput),
      sourceEventId: hackSourceEventId.trim() || undefined,
      tags: parseRegistryTags(hackTagsInput),
      linkedArtifactIds: parseCommaSeparatedList(hackLinkedArtifactIdsInput),
    };

    try {
      await invokeTyped('createHack', payload);
      setActionMessage(`Hack submitted: ${payload.title}`);
      setHackTitle('');
      setHackDescription('');
      setHackContent('');
      setHackDemoUrl('');
      setHackTeamMembersInput('');
      setHackSourceEventId('');
      setHackTagsInput('');
      setHackLinkedArtifactIdsInput('');
      closeModal();
      await loadBootstrap();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to submit hack.');
    } finally {
      setSaving(false);
    }
  }, [
    hackAssetType,
    hackContent,
    hackDemoUrl,
    hackDescription,
    hackLinkedArtifactIdsInput,
    hackSourceEventId,
    hackTagsInput,
    hackTeamMembersInput,
    hackTitle,
    hackVisibility,
    loadBootstrap,
    previewMode,
  ]);

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

  const resetWizard = useCallback(() => {
    setWStep(1);
    setWEventName('');
    setWEventIcon('🚀');
    setWEventTagline('');
    setWPrimaryAdminEmail('');
    setWCoAdminsInput('');
    setWEventNameError('');
    setWPendingRequestId(null);
    setWTimezone(DEFAULT_TIMEZONE);
    setWRegistrationOpensAt('');
    setWRegistrationClosesAt('');
    setWTeamFormationStartsAt('');
    setWTeamFormationEndsAt('');
    setWHackingStartsAt('');
    setWSubmissionDeadlineAt('');
    setWVotingStartsAt('');
    setWVotingEndsAt('');
    setWResultsAnnounceAt('');
    setWAllowCrossTeamMentoring(true);
    setWMinTeamSize('1');
    setWMaxTeamSize('6');
    setWRequireDemoLink(false);
    setWJudgingModel('hybrid');
    setWCategoriesInput('');
    setWPrizesText('');
    setWBannerMessage('');
    setWAccentColor('#0f766e');
    setWBannerImageUrl('');
    setWThemePreference('system');
    setWLaunchMode('draft');
    setWTemplateMode('default');
    setWAutoPublishToShowcaseDrafts(true);
    setWProblemImportCandidateItems([]);
    setWSelectedProblemImportIds([]);
    setWProblemImportLoading(false);
    setWProblemImportLoaded(false);
    setWProblemImportError('');
    setWScheduleOutput(null);
    setWScheduleBuilderState(null);
  }, []);

  const getWizardValidationError = useCallback((step: WizardStep): string | null => {
    if (step >= 1) {
      setWEventNameError('');
      if (!wEventName.trim()) {
        setWEventNameError('Event name is required.');
        return 'Event name is required.';
      }
      if (wPrimaryAdminEmail.trim() && !isAdaptavistEmail(wPrimaryAdminEmail)) {
        return `Primary admin email must be an ${ALLOWED_EMAIL_DOMAIN} address.`;
      }
      const badCoAdmin = wCoAdminsInput
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
        .some((email) => !isAdaptavistEmail(email));
      if (badCoAdmin) return `All co-admin emails must be ${ALLOWED_EMAIL_DOMAIN} addresses.`;
    }
    if (step >= 2) {
      if (isDateRangeInvalid(wRegistrationOpensAt, wRegistrationClosesAt)) return 'Registration close must be after open.';
      if (isDateRangeInvalid(wTeamFormationStartsAt, wTeamFormationEndsAt)) return 'Team formation end must be after start.';
      if (isDateRangeInvalid(wHackingStartsAt, wSubmissionDeadlineAt)) return 'Submission deadline must be after hacking start.';
      if (isDateRangeInvalid(wVotingStartsAt, wVotingEndsAt)) return 'Voting end must be after start.';
    }
    if (step >= 4) {
      const minT = Math.max(1, Math.floor(Number(wMinTeamSize) || 1));
      const maxT = Math.max(1, Math.floor(Number(wMaxTeamSize) || 1));
      if (minT > maxT) return 'Minimum team size must be ≤ maximum team size.';
    }
    return null;
  }, [wCoAdminsInput, wEventName, wHackingStartsAt, wMaxTeamSize, wMinTeamSize, wPrimaryAdminEmail, wRegistrationClosesAt, wRegistrationOpensAt, wSubmissionDeadlineAt, wTeamFormationEndsAt, wTeamFormationStartsAt, wVotingEndsAt, wVotingStartsAt]);

  const resolveAppViewUrlForPage = useCallback(async (targetPageId: string): Promise<string | null> => {
    if (previewMode || !targetPageId) return null;
    try {
      const result = await invokeTyped('hdcGetAppViewUrl', { pageId: targetPageId });
      const url = typeof result?.url === 'string' ? result.url.trim() : '';
      if (url) {
        console.info(
          '[HackCentral app-view route]',
          JSON.stringify({
            pageId: targetPageId,
            runtimeOwner: result.runtimeOwner,
            routeVersion: result.routeVersion,
          })
        );
      }
      return url || null;
    } catch (err) {
      if (isRuntimeConfigError(err)) {
        setActionError(getRuntimeConfigOperatorMessage(err));
        throw err;
      }
      return null;
    }
  }, [previewMode]);

  const loadProblemImportCandidates = useCallback(async () => {
    setWProblemImportLoading(true);
    setWProblemImportError('');
    try {
      if (previewMode) {
        const fallbackAuthor = bootstrap?.viewer.accountId || 'Preview User';
        const source = problemPreviewItems.length > 0 ? problemPreviewItems : seedPreviewProblems(featuredHacks, fallbackAuthor);
        const items = source
          .filter((item) => item.moderationState === 'visible')
          .filter((item) => item.status === 'open' || item.status === 'claimed')
          .filter((item) => item.voteCount >= CHILD_IMPORT_MIN_VOTES_DEFAULT)
          .sort((left, right) => right.voteCount - left.voteCount)
          .slice(0, 20)
          .map((item) => mapProblemListItemToImportCandidate(item));
        setWProblemImportCandidateItems(items);
        setWSelectedProblemImportIds((current) =>
          current.filter((problemId) => items.some((item) => item.problemId === problemId))
        );
        setWProblemImportLoaded(true);
        return;
      }

      const payload: ListProblemImportCandidatesInput = {
        limit: 20,
        minVoteCount: CHILD_IMPORT_MIN_VOTES_DEFAULT,
        statuses: ['open', 'claimed'],
      };
      const result = await invokeTyped('hdcListProblemImportCandidates', payload);
      setWProblemImportCandidateItems(result.items);
      setWSelectedProblemImportIds((current) =>
        current.filter((problemId) => result.items.some((item) => item.problemId === problemId))
      );
      setWProblemImportLoaded(true);
    } catch (error) {
      setWProblemImportError(error instanceof Error ? error.message : 'Failed to load Problem Exchange candidates.');
    } finally {
      setWProblemImportLoading(false);
    }
  }, [bootstrap?.viewer.accountId, featuredHacks, previewMode, problemPreviewItems]);

  useEffect(() => {
    if (view !== 'create_hackday' || wStep !== 6) return;
    if (wProblemImportLoaded || wProblemImportLoading) return;
    void loadProblemImportCandidates();
  }, [loadProblemImportCandidates, view, wProblemImportLoaded, wProblemImportLoading, wStep]);

  const handleCreateHackDay = useCallback(async () => {
    const parentPageId = bootstrap?.parentPageId;
    if (!parentPageId) {
      setActionError('No parent page configured. Set CONFLUENCE_HDC_PARENT_PAGE_ID in Forge env.');
      return;
    }

    const validationError = getWizardValidationError(wStep);
    if (validationError) {
      setActionError(validationError);
      return;
    }

    if (previewMode) {
      setActionMessage(`Local preview: would create HackDay "${wEventName.trim()}".`);
      resetWizard();
      setView('hackdays');
      return;
    }

    setSaving(true);
    setActionError('');
    setActionMessage(HDC_PERF_LOADING_UX_V1 ? 'Creating HackDay draft...' : '');

    const requestId = wPendingRequestId || crypto.randomUUID();
    if (!wPendingRequestId) setWPendingRequestId(requestId);
    const handoffStartedAt = Date.now();
    const handoffStageMs: Record<string, number> = {};
    const markHandoffStage = (stage: string, stageStartedAt: number): void => {
      handoffStageMs[stage] = Math.max(0, Date.now() - stageStartedAt);
    };
    let handoffOutcome: 'opened_app_view' | 'fallback_child_page' | 'context_refreshed' | 'timeout' | 'error' = 'error';
    let handoffWarning: string | null = null;
    let handoffEventId: string | null = null;
    let handoffChildPageId: string | null = null;

    const minT = Math.max(1, Math.floor(Number(wMinTeamSize) || 1));
    const maxT = Math.max(minT, Math.floor(Number(wMaxTeamSize) || 1));
    const categories = wCategoriesInput.split(',').map((v) => v.trim()).filter(Boolean);
    const coAdminEmails = wCoAdminsInput.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);

    const payload: CreateInstanceDraftInput = {
      parentPageId,
      creationRequestId: requestId,
      wizardSchemaVersion: 2,
      completedStep: wStep,
      launchMode: wLaunchMode,
      instanceRuntime: 'hackday_template',
      templateTarget: 'hackday',
      basicInfo: {
        eventName: wEventName.trim(),
        eventIcon: wEventIcon || '🚀',
        eventTagline: wEventTagline.trim() || undefined,
        primaryAdminEmail: wPrimaryAdminEmail.trim().toLowerCase() || undefined,
        coAdminEmails: coAdminEmails.length > 0 ? coAdminEmails : undefined,
      },
      schedule: {
        timezone: wScheduleOutput?.timezone || wTimezone,
        duration: wEventDuration,
        selectedEvents: wSelectedEvents,
        ...(wScheduleOutput || {}),
        registrationOpensAt: wScheduleOutput?.registrationOpensAt || wRegistrationOpensAt || undefined,
        registrationClosesAt: wScheduleOutput?.registrationClosesAt || wRegistrationClosesAt || undefined,
        teamFormationStartsAt: wScheduleOutput?.teamFormationStartsAt || wTeamFormationStartsAt || undefined,
        teamFormationEndsAt: wScheduleOutput?.teamFormationEndsAt || wTeamFormationEndsAt || undefined,
        hackingStartsAt: wScheduleOutput?.hackingStartsAt || wHackingStartsAt || undefined,
        submissionDeadlineAt: wScheduleOutput?.submissionDeadlineAt || wSubmissionDeadlineAt || undefined,
        votingStartsAt: wScheduleOutput?.votingStartsAt || wVotingStartsAt || undefined,
        votingEndsAt: wScheduleOutput?.votingEndsAt || wVotingEndsAt || undefined,
        resultsAnnounceAt: wScheduleOutput?.resultsAnnounceAt || wResultsAnnounceAt || undefined,
      },
      rules: {
        allowCrossTeamMentoring: wAllowCrossTeamMentoring,
        minTeamSize: minT,
        maxTeamSize: maxT,
        requireDemoLink: wRequireDemoLink,
        judgingModel: wJudgingModel,
        categories: categories.length > 0 ? categories : undefined,
        prizesText: wPrizesText.trim() || undefined,
      },
      branding: {
        bannerMessage: wBannerMessage.trim() || undefined,
        accentColor: wAccentColor.trim() || undefined,
        bannerImageUrl: wBannerImageUrl.trim() || undefined,
        themePreference: wThemePreference,
      },
      childIntegration: {
        importProblemIds: wSelectedProblemImportIds.length > 0 ? wSelectedProblemImportIds : undefined,
        autoPublishToShowcaseDrafts: wAutoPublishToShowcaseDrafts,
        templateMode: wTemplateMode,
      },
    };

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const createResolverStartedAt = Date.now();
      const result = await Promise.race([
        invokeTyped('hdcCreateInstanceDraft', payload),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`Creation timed out after ${CREATE_DRAFT_TIMEOUT_MS / 1000}s. Retry to continue.`)), CREATE_DRAFT_TIMEOUT_MS);
        }),
      ]);
      markHandoffStage('create_resolver', createResolverStartedAt);
      clearTimeout(timeoutId);
      setActionMessage(
        `HackDay created! Child page: ${result.childPageId}. Open that page, then click "Open App View" for the full HackDay runtime.`
      );
      setWPendingRequestId(null);
      resetWizard();
      if (!HDC_PERF_CREATE_HANDOFF_V1) {
        await loadBootstrap();
      }
      setView('hackdays');
      const childPageId = typeof result.childPageId === 'string' ? result.childPageId.trim() : '';
      handoffEventId = typeof result.eventId === 'string' ? result.eventId : null;
      handoffChildPageId = childPageId || null;

      if (childPageId) {
        if (HDC_PERF_LOADING_UX_V1) {
          setActionMessage('HackDay created. Preparing app context...');
        }
        const activationStartedAt = Date.now();
        try {
          const activation = HDC_PERF_CREATE_HANDOFF_V1 && handoffEventId
            ? await invokeTyped('hdcSetActiveAppModeContext', { pageId: childPageId, eventId: handoffEventId })
            : await invokeTyped('hdcActivateAppModeContext', { pageId: childPageId });
          if (!activation?.success) {
            console.warn('[HackCentral] hdcActivateAppModeContext returned non-success during create flow', activation);
          }
        } catch (activationErr) {
          console.warn('[HackCentral] Failed to prime app mode context during create flow', activationErr);
          handoffWarning = activationErr instanceof Error ? activationErr.message : String(activationErr);
        }
        markHandoffStage('context_activation', activationStartedAt);
      }

      const appViewUrlLookupStartedAt = Date.now();
      const appViewUrl = result.appViewUrl || (await resolveAppViewUrlForPage(result.childPageId));
      markHandoffStage('app_view_url_lookup', appViewUrlLookupStartedAt);
      const appViewRuntimeOwner = typeof result.appViewRuntimeOwner === 'string'
        ? result.appViewRuntimeOwner.trim().toLowerCase()
        : '';
      if (appViewRuntimeOwner === 'hackcentral' && !appViewUrl) {
        throw new Error(
          `[${RUNTIME_CONFIG_ERROR_CODE}] HackCentral runtime owner returned no appViewUrl during create flow.`
        );
      }
      let appViewOpened = false;
      if (appViewUrl) {
        setActionMessage('HackDay created. Opening full app view now...');
        const appViewLaunchStartedAt = Date.now();
        appViewOpened = HDC_PERF_CREATE_HANDOFF_V1
          ? await launchAppViewUrlFastPath(appViewUrl)
          : await launchAppViewUrl(appViewUrl);
        markHandoffStage('app_view_launch', appViewLaunchStartedAt);
        if (appViewOpened) {
          handoffOutcome = 'opened_app_view';
          setActionMessage('HackDay created. App view opened.');
          return;
        }
        setActionMessage('HackDay created. App view launch was blocked, opening child page instead.');
      }

      const childPagePath = childPageId ? buildConfluencePagePath(childPageId) : '';
      const absoluteChildTarget =
        childPagePath && typeof window !== 'undefined'
          ? `${window.location.origin}${childPagePath}`
          : childPagePath;

      if (childPagePath) {
        setActionMessage('HackDay created. Opening child page now. Once there, use "Open App View" in the page header.');
        const childNavigateStartedAt = Date.now();
        try {
          await router.navigate(childPagePath);
          markHandoffStage('child_page_navigation', childNavigateStartedAt);
          handoffOutcome = 'fallback_child_page';
          return;
        } catch {
          // Fall through to broader navigation options.
        }

        if (absoluteChildTarget) {
          try {
            await router.open(absoluteChildTarget);
            markHandoffStage('child_page_navigation', childNavigateStartedAt);
            handoffOutcome = 'fallback_child_page';
            return;
          } catch {
            if (typeof window !== 'undefined') {
              markHandoffStage('child_page_navigation', childNavigateStartedAt);
              handoffOutcome = 'fallback_child_page';
              window.location.assign(absoluteChildTarget);
              return;
            }
          }
        }
      }

      if (result.childPageUrl) {
        setActionMessage('HackDay created. Opening child page now. Once there, use "Open App View" in the page header.');
        const childNavigateStartedAt = Date.now();
        try {
          await router.navigate(result.childPageUrl);
          markHandoffStage('child_page_navigation', childNavigateStartedAt);
          handoffOutcome = 'fallback_child_page';
          return;
        } catch {
          // Fall through to full-page navigation.
        }
        if (typeof window !== 'undefined') {
          markHandoffStage('child_page_navigation', childNavigateStartedAt);
          handoffOutcome = 'fallback_child_page';
          window.location.assign(result.childPageUrl);
          return;
        }
      }
      const contextRefreshStartedAt = Date.now();
      await loadBootstrap();
      markHandoffStage('context_refresh', contextRefreshStartedAt);
      handoffOutcome = 'context_refreshed';
    } catch (err) {
      clearTimeout(timeoutId);
      if (isRuntimeConfigError(err)) {
        handoffWarning = err instanceof Error ? err.message : String(err);
        handoffOutcome = 'error';
        setActionError(getRuntimeConfigOperatorMessage(err));
        return;
      }
      const msg = err instanceof Error ? err.message : 'Failed to create HackDay.';
      if (msg.includes('already exists')) {
        setWEventNameError('An instance with this name already exists under this parent page.');
        setWPendingRequestId(null);
        handoffOutcome = 'error';
        handoffWarning = msg;
      } else if (msg.toLowerCase().includes('timed out')) {
        handoffOutcome = 'timeout';
        handoffWarning = msg;
        setActionError(msg);
      } else {
        handoffOutcome = 'error';
        handoffWarning = msg;
        setActionError(msg);
      }
    } finally {
      logCreateHandoffTelemetry({
        creationRequestId: requestId,
        eventId: handoffEventId,
        childPageId: handoffChildPageId,
        durationMs: Math.max(0, Date.now() - handoffStartedAt),
        stageMs: handoffStageMs,
        outcome: handoffOutcome,
        warning: handoffWarning,
      });
      setSaving(false);
    }
  }, [bootstrap?.parentPageId, getWizardValidationError, loadBootstrap, previewMode, resetWizard, resolveAppViewUrlForPage, wAccentColor, wAllowCrossTeamMentoring, wAutoPublishToShowcaseDrafts, wBannerImageUrl, wBannerMessage, wCategoriesInput, wCoAdminsInput, wEventIcon, wEventName, wEventTagline, wHackingStartsAt, wJudgingModel, wMaxTeamSize, wMinTeamSize, wPendingRequestId, wPrimaryAdminEmail, wPrizesText, wRegistrationClosesAt, wRegistrationOpensAt, wRequireDemoLink, wResultsAnnounceAt, wSelectedProblemImportIds, wStep, wSubmissionDeadlineAt, wTeamFormationEndsAt, wTeamFormationStartsAt, wTemplateMode, wThemePreference, wTimezone, wVotingEndsAt, wVotingStartsAt]);

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
    let appViewUrl: string | null = null;
    try {
      appViewUrl = await resolveAppViewUrlForPage(targetPageId);
    } catch (err) {
      if (isRuntimeConfigError(err)) {
        return;
      }
      appViewUrl = null;
    }
    const targetPath = buildConfluencePagePath(targetPageId);
    const absoluteTarget =
      typeof window !== 'undefined' ? `${window.location.origin}${targetPath}` : targetPath;
    setSwitcherOpen(false);

    if (previewMode) {
      const previewTarget = appViewUrl || targetPath;
      setActionMessage(`Local preview mode: would navigate to ${previewTarget}`);
      return;
    }

    if (appViewUrl) {
      if (await launchAppViewUrl(appViewUrl)) {
        return;
      }
    }

    try {
      await router.navigate(targetPath);
      return;
    } catch {
      // Fall through to broader navigation options.
    }

    try {
      await router.open(absoluteTarget);
      return;
    } catch {
      if (typeof window !== 'undefined') {
        window.location.assign(absoluteTarget);
      }
    }
  }, [previewMode, resolveAppViewUrlForPage]);

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
    <Layout
      view={view}
      setView={setView}
      setHackTab={setHackTab}
      globalSearch={globalSearch}
      setGlobalSearch={setGlobalSearch}
      switcherOpen={switcherOpen}
      setSwitcherOpen={setSwitcherOpen}
      switcherRef={switcherRef}
      switcherMenuRef={switcherMenuRef}
      onSwitcherMenuKeyDown={onSwitcherMenuKeyDown}
      switcherGroups={switcherGroups}
      navigateToSwitcherPage={navigateToSwitcherPage}
      profileInitial={profileInitial}
      accountId={bootstrap.viewer.accountId}
      switcherWarning={switcherWarning}
      hasNonNavigableSwitcherItems={hasNonNavigableSwitcherItems}
      refreshSwitcherRegistry={refreshSwitcherRegistry}
      refreshingSwitcherRegistry={refreshingSwitcherRegistry}
    >
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
              <WelcomeHero onSubmitHack={() => setModalView('submit_hack')} />
              <StatCards summary={bootstrap.summary} />

              <section className="card section-head-row dashboard-section-head">
                <div>
                  <h2>Latest Hacks</h2>
                  <p>Built by us, for us</p>
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
                <article className="card quote-card dashboard-quote-card">
                  <p className="quote-mark">❞</p>
                  <p className="quote-body">"The Jira Epic Breakdown prompt alone saved our whole team a full planning day."</p>
                  <p className="quote-meta">Priya S. · Product Manager</p>
                </article>

                <article className="card recognition-card dashboard-recognition-card">
                  <h3>Your recognition</h3>
                  <p>Complete mentor sessions, verify hacks, or get reuses to earn badges.</p>
                  <div className="badge-wrap">
                    {BADGES.map((badge) => (
                      <span key={badge.id} className="badge-pill" data-badge={badge.badgeVariant ?? undefined}>
                        {badge.label}
                        {badge.count ? <span className="badge-count">x{badge.count}</span> : null}
                      </span>
                    ))}
                  </div>
                </article>
              </section>

                <button
                  type="button"
                  className="fab dashboard-fab"
                  aria-label={quickActionsOpen ? 'Close quick actions' : 'Open quick actions'}
                  onClick={() => setQuickActionsOpen((open) => !open)}
                >
                {quickActionsOpen ? '×' : '+'}
              </button>

              {quickActionsOpen ? (
                <section className="card quick-actions dashboard-quick-actions">
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
                <div>
                  <h1>Showcase</h1>
                  <p className="subtitle">Curated and searchable hacks with demo context and delivery evidence.</p>
                </div>
                <div className="registry-title-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModalView('submit_hack')}>
                    + Submit Hack
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void loadShowcaseHacks()}
                    disabled={showcaseLoading}
                  >
                    {showcaseLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </section>

              {hackTab === 'completed' && HACKS_SCOPE_NOTE ? <section className="message message-preview">{HACKS_SCOPE_NOTE}</section> : null}

              <section className="filter-row">
                <input
                  type="search"
                  placeholder={hackTab === 'completed' ? 'Search completed hacks...' : 'Search in-progress hacks...'}
                  value={hackSearch}
                  onChange={(event) => setHackSearch(event.target.value)}
                />

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
                  <option value="all">Tab Default Status</option>
                  <option value="in_progress">In progress</option>
                  <option value="verified">Completed</option>
                </select>
                <input
                  type="text"
                  placeholder="Tags (comma separated)"
                  value={showcaseTagsInput}
                  onChange={(event) => setShowcaseTagsInput(event.target.value)}
                />
                <input
                  type="text"
                  placeholder="HackDay event ID"
                  value={showcaseSourceEventInput}
                  onChange={(event) => setShowcaseSourceEventInput(event.target.value)}
                />
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={showcaseFeaturedOnly}
                    onChange={(event) => setShowcaseFeaturedOnly(event.target.checked)}
                  />
                  Featured only
                </label>
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

              {showcaseError ? <section className="message message-error">{showcaseError}</section> : null}

              {hackTab === 'completed' ? (
                <article className="card featured-block">
                  <h2>Featured Hacks</h2>
                  <p>High-trust, curated collection of proven AI hacks</p>
                  <div className="grid featured-grid">
                    {featuredTop.map((hack) => (
                      <HackCard key={`featured-${hack.id}`} item={hack} />
                    ))}
                    {featuredTop.length === 0 ? <p className="empty-copy">No featured hacks in this filter set yet.</p> : null}
                  </div>
                </article>
              ) : null}

              <section className="grid hacks-grid">
                {filteredHacks.map((hack) => {
                  const showcaseItem = showcaseItems.find((item) => item.projectId === hack.id);
                  if (!showcaseItem) return null;
                  return (
                    <article key={hack.id} className="card">
                      <HackCard item={hack} />
                      <div className="registry-actions">
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setShowcaseSelectedProjectId(showcaseItem.projectId)}
                        >
                          View details
                        </button>
                        {showcaseCanManage ? (
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => void handleToggleShowcaseFeatured(showcaseItem)}
                            disabled={showcaseFeaturePendingProjectId === showcaseItem.projectId}
                          >
                            {showcaseFeaturePendingProjectId === showcaseItem.projectId
                              ? 'Saving...'
                              : showcaseItem.featured
                                ? 'Unfeature'
                                : 'Mark featured'}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </section>
              {!showcaseLoading && filteredHacks.length === 0 && showcaseLoaded ? (
                <p className="empty-copy">No showcase hacks match your filters.</p>
              ) : null}
              {showcaseLoading ? <p className="empty-copy">Loading showcase hacks...</p> : null}

              {showcaseSelectedProjectId ? (
                <article className="card registry-detail-block">
                  <section className="section-head-row">
                    <div>
                      <h2>Hack Detail</h2>
                      <p>Project ID: {showcaseSelectedProjectId}</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setShowcaseSelectedProjectId(null);
                        setShowcaseDetail(null);
                        setShowcaseDetailError('');
                      }}
                    >
                      Close
                    </button>
                  </section>
                  {showcaseDetailLoading ? <p className="empty-copy">Loading hack detail...</p> : null}
                  {showcaseDetailError ? <p className="message message-error">{showcaseDetailError}</p> : null}
                  {showcaseDetail ? (
                    <div className="grid showcase-detail-grid">
                      <div>
                        <h3>{showcaseDetail.hack.title}</h3>
                        <p>{showcaseDetail.hack.description || 'No description provided.'}</p>
                        <p className="meta">Pipeline stage: {formatLabel(showcaseDetail.hack.pipelineStage)}</p>
                        <p className="meta">
                          Demo:{' '}
                          {showcaseDetail.hack.demoUrl ? (
                            <a href={showcaseDetail.hack.demoUrl} target="_blank" rel="noreferrer">
                              {showcaseDetail.hack.demoUrl}
                            </a>
                          ) : (
                            'Not provided'
                          )}
                        </p>
                        <p className="meta">Team: {showcaseDetail.hack.teamMembers.length > 0 ? showcaseDetail.hack.teamMembers.join(', ') : 'Not provided'}</p>
                      </div>
                      <div>
                        <h3>Artifacts Produced ({showcaseDetail.artifactsProduced.length})</h3>
                        {showcaseDetail.artifactsProduced.length > 0 ? (
                          <ul className="showcase-meta-list">
                            {showcaseDetail.artifactsProduced.map((artifact) => (
                              <li key={artifact.artifactId}>
                                {artifact.title} ({formatLabel(artifact.artifactType)}) · {artifact.reuseCount} reuses
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="empty-copy">No linked artifacts yet.</p>
                        )}
                        <h3>Problems Solved ({showcaseDetail.problemsSolved.length})</h3>
                        {showcaseDetail.problemsSolved.length > 0 ? (
                          <ul className="showcase-meta-list">
                            {showcaseDetail.problemsSolved.map((problem) => (
                              <li key={problem.problemId}>
                                {problem.title} ({formatLabel(problem.status)})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="empty-copy">No linked solved problems yet.</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </article>
              ) : null}
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
              {TEAM_PULSE_PLACEHOLDER_NOTE ? <section className="message message-preview">{TEAM_PULSE_PLACEHOLDER_NOTE}</section> : null}

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

          {view === 'library' ? (
            <section className="page-stack">
              <section className="title-row">
                <div>
                  <h1>Discover Registry</h1>
                  <p className="subtitle">Reusable AI artifacts from shipped hacks: prompts, skills, templates, and learnings</p>
                </div>
                <div className="registry-title-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowCreateArtifactForm((current) => !current)}
                  >
                    {showCreateArtifactForm ? 'Close Form' : '+ Submit Artifact'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      void loadRegistryArtifacts(registryAppliedFilters);
                    }}
                    disabled={registryLoading}
                  >
                    {registryLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </section>

              <section className="filter-row">
                <input
                  type="search"
                  placeholder="Search artifacts by title or description..."
                  value={registrySearchInput}
                  onChange={(event) => setRegistrySearchInput(event.target.value)}
                  onKeyDown={handleRegistrySearchKeyDown}
                />
                <select
                  value={registryTypeFilter}
                  onChange={(event) => setRegistryTypeFilter(event.target.value as ArtifactType | 'all')}
                >
                  <option value="all">All Types</option>
                  {REGISTRY_ARTIFACT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatLabel(type)}
                    </option>
                  ))}
                </select>
                <select
                  value={registrySortBy}
                  onChange={(event) => setRegistrySortBy(event.target.value as RegistrySortBy)}
                >
                  <option value="newest">Newest</option>
                  <option value="reuse_count">Most Reused</option>
                </select>
                <input
                  type="text"
                  placeholder="Tags (comma separated)"
                  value={registryTagsInput}
                  onChange={(event) => setRegistryTagsInput(event.target.value)}
                />
              </section>

              <section className="registry-filter-actions">
                <button type="button" className="btn btn-primary" onClick={applyRegistryFilters}>
                  Apply Filters
                </button>
                <button type="button" className="btn btn-outline" onClick={clearRegistryFilters}>
                  Reset
                </button>
                <span className="meta">
                  Showing {registryItems.length} artifact{registryItems.length === 1 ? '' : 's'}
                </span>
              </section>

              {showCreateArtifactForm ? (
                <article className="card registry-form-card">
                  <section className="section-head-row">
                    <div>
                      <h2>Submit Registry Artifact</h2>
                      <p>Requires title, description, tags, and source URL (`https`). Optional source-hack linkage supported.</p>
                    </div>
                  </section>

                  <form
                    className="modal-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleCreateArtifact();
                    }}
                  >
                    <label htmlFor="artifact-title">Title</label>
                    <input
                      id="artifact-title"
                      value={artifactTitle}
                      onChange={(event) => setArtifactTitle(event.target.value)}
                      placeholder="E.g. Jira Epic Breakdown Prompt"
                    />

                    <label htmlFor="artifact-description">Description</label>
                    <textarea
                      id="artifact-description"
                      value={artifactDescription}
                      onChange={(event) => setArtifactDescription(event.target.value)}
                      placeholder="10-2000 chars explaining what the artifact does and where it works."
                    />

                    <section className="split-form">
                      <div>
                        <label htmlFor="artifact-type">Type</label>
                        <select
                          id="artifact-type"
                          value={artifactType}
                          onChange={(event) => setArtifactType(event.target.value as ArtifactType)}
                        >
                          {REGISTRY_ARTIFACT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {formatLabel(type)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="artifact-visibility">Visibility</label>
                        <select
                          id="artifact-visibility"
                          value={artifactVisibility}
                          onChange={(event) => setArtifactVisibility(event.target.value as ArtifactVisibility)}
                        >
                          <option value="private">Private</option>
                          <option value="org">Org</option>
                          <option value="public">Public</option>
                        </select>
                      </div>
                    </section>

                    <label htmlFor="artifact-tags">Tags</label>
                    <input
                      id="artifact-tags"
                      value={artifactTagsInput}
                      onChange={(event) => setArtifactTagsInput(event.target.value)}
                      placeholder="E.g. jira, planning, prompt-engineering"
                    />

                    <section className="split-form">
                      <div>
                        <label htmlFor="artifact-source-url">Source URL</label>
                        <input
                          id="artifact-source-url"
                          value={artifactSourceUrl}
                          onChange={(event) => setArtifactSourceUrl(event.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label htmlFor="artifact-source-label">Source Label (optional)</label>
                        <input
                          id="artifact-source-label"
                          value={artifactSourceLabel}
                          onChange={(event) => setArtifactSourceLabel(event.target.value)}
                          placeholder="Confluence doc, repo, demo"
                        />
                      </div>
                    </section>

                    <section className="split-form">
                      <div>
                        <label htmlFor="artifact-source-hack-project-id">Source Hack Project ID (optional)</label>
                        <input
                          id="artifact-source-hack-project-id"
                          value={artifactSourceHackProjectId}
                          onChange={(event) => setArtifactSourceHackProjectId(event.target.value)}
                          placeholder="UUID"
                        />
                      </div>
                      <div>
                        <label htmlFor="artifact-source-hackday-id">Source HackDay Event ID (optional)</label>
                        <input
                          id="artifact-source-hackday-id"
                          value={artifactSourceHackdayEventId}
                          onChange={(event) => setArtifactSourceHackdayEventId(event.target.value)}
                          placeholder="UUID"
                        />
                      </div>
                    </section>

                    <section className="modal-actions">
                      <button type="button" className="btn btn-outline" onClick={resetArtifactForm} disabled={artifactSubmitting}>
                        Reset
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={artifactSubmitting}>
                        {artifactSubmitting ? 'Submitting...' : 'Submit Artifact'}
                      </button>
                    </section>
                  </form>
                </article>
              ) : null}

              {registryError ? <section className="message message-error">{registryError}</section> : null}

              {registryLoading ? (
                <section className="card">
                  <p className="empty-copy">Loading Registry artifacts...</p>
                </section>
              ) : null}

              {!registryLoading && registryLoaded && registryItems.length > 0 ? (
                <section className="grid hacks-grid">
                  {registryItems.map((item) => {
                    const detail = registryDetailsById[item.id];
                    return (
                      <article key={item.id} className="card hack-card registry-card">
                        <div className="hack-card-head">
                          <div className="hack-card-title-wrap">
                            <h3>{item.title}</h3>
                          </div>
                          <span className={`pill pill-${item.artifactType}`}>
                            {formatLabel(item.artifactType)}
                          </span>
                        </div>

                        <p className="hack-card-copy">{item.description}</p>

                        {item.tags.length > 0 ? (
                          <div className="registry-tags">
                            {item.tags.slice(0, 5).map((tag) => (
                              <span key={`${item.id}-${tag}`} className="soft-tag">
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="registry-meta">
                          <span className="meta">By {item.authorName}</span>
                          <span className="meta">{new Date(item.createdAt).toLocaleDateString()}</span>
                          <span className="meta">Visibility: {formatLabel(item.visibility)}</span>
                        </div>

                        <div className="hack-card-foot">
                          <div className="registry-actions">
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={() => {
                                void handleToggleArtifactDetails(item.id);
                              }}
                              disabled={detailLoadingArtifactId === item.id}
                            >
                              {registryDetailsById[item.id]
                                ? 'Hide Details'
                                : detailLoadingArtifactId === item.id
                                  ? 'Loading...'
                                  : 'View Details'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => {
                                void handleMarkArtifactReuse(item.id);
                              }}
                              disabled={reusePendingArtifactId === item.id}
                            >
                              {reusePendingArtifactId === item.id ? 'Saving...' : 'Mark Reuse'}
                            </button>
                            <a
                              className="btn btn-ghost"
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Source
                            </a>
                          </div>
                          <span className="meta">{item.reuseCount} reuses</span>
                        </div>

                        {detail ? (
                          <section className="registry-detail-block">
                            {item.sourceLabel ? <p className="meta">Source label: {item.sourceLabel}</p> : null}
                            {detail.sourceHack ? (
                              <p className="meta">
                                Linked hack: {detail.sourceHack.title} (
                                {detail.sourceHack.status})
                              </p>
                            ) : (
                              <p className="meta">No linked hack metadata.</p>
                            )}
                          </section>
                        ) : null}
                      </article>
                    );
                  })}
                </section>
              ) : (
                !registryLoading && registryLoaded ? (
                  <p className="empty-copy">No registry artifacts match these filters yet.</p>
                ) : null
              )}
            </section>
          ) : null}

          {view === 'problem_exchange' ? (
            <section className="page-stack">
              <section className="title-row">
                <div>
                  <h1>Problem Exchange</h1>
                  <p className="subtitle">Surface repeat pain points, vote for impact, and connect solved problems to shipped hacks.</p>
                </div>
                <div className="problem-title-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowCreateProblemForm((current) => !current)}
                  >
                    {showCreateProblemForm ? 'Close Form' : '+ Submit Problem'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      void loadProblemExchangeItems(problemAppliedFilters);
                    }}
                    disabled={problemLoading}
                  >
                    {problemLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </section>

              <section className="filter-row">
                <input
                  type="search"
                  placeholder="Search problems by title or description..."
                  value={problemSearchInput}
                  onChange={(event) => setProblemSearchInput(event.target.value)}
                  onKeyDown={handleProblemSearchKeyDown}
                />
                <input
                  type="text"
                  placeholder="Teams (comma separated)"
                  value={problemTeamsInput}
                  onChange={(event) => setProblemTeamsInput(event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Domains (comma separated)"
                  value={problemDomainsInput}
                  onChange={(event) => setProblemDomainsInput(event.target.value)}
                />
                <select
                  value={problemStatusFilter}
                  onChange={(event) => setProblemStatusFilter(event.target.value as ProblemStatus | 'all')}
                >
                  <option value="all">All Statuses</option>
                  {PROBLEM_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>
                <select
                  value={problemSortBy}
                  onChange={(event) => setProblemSortBy(event.target.value as ProblemSortBy)}
                >
                  <option value="votes">Top Votes</option>
                  <option value="time_wasted">Highest Time Wasted</option>
                  <option value="newest">Newest</option>
                </select>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={problemIncludeHidden}
                    onChange={(event) => setProblemIncludeHidden(event.target.checked)}
                    disabled={!problemCanModerate}
                  />
                  Include hidden/removed
                </label>
              </section>

              <section className="problem-filter-actions">
                <button type="button" className="btn btn-primary" onClick={applyProblemFiltersToList}>
                  Apply Filters
                </button>
                <button type="button" className="btn btn-outline" onClick={clearProblemFilters}>
                  Reset
                </button>
                <span className="meta">
                  Showing {problemItems.length} problem{problemItems.length === 1 ? '' : 's'}
                </span>
                {!problemCanModerate ? (
                  <span className="meta">
                    Moderation mode: {formatLabel(problemModerationMode)}. Remove/Reinstate actions are restricted.
                  </span>
                ) : null}
              </section>

              {showCreateProblemForm ? (
                <article className="card problem-form-card">
                  <section className="section-head-row">
                    <div>
                      <h2>Submit Problem</h2>
                      <p>Share a repeated workflow pain point. Add enough context for others to vote, claim, and solve.</p>
                    </div>
                  </section>
                  <form
                    className="modal-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleCreateProblem();
                    }}
                  >
                    <label htmlFor="problem-title">Title</label>
                    <input
                      id="problem-title"
                      value={problemTitle}
                      onChange={(event) => setProblemTitle(event.target.value)}
                      placeholder="E.g. Manual reporting reconciliation takes half a day weekly"
                    />

                    <label htmlFor="problem-description">Description</label>
                    <textarea
                      id="problem-description"
                      value={problemDescription}
                      onChange={(event) => setProblemDescription(event.target.value)}
                      placeholder="Describe current steps, bottlenecks, and impact."
                    />

                    <section className="split-form">
                      <div>
                        <label htmlFor="problem-frequency">Frequency</label>
                        <select
                          id="problem-frequency"
                          value={problemFrequency}
                          onChange={(event) => setProblemFrequency(event.target.value as ProblemFrequency)}
                        >
                          {PROBLEM_FREQUENCIES.map((frequency) => (
                            <option key={frequency} value={frequency}>
                              {formatLabel(frequency)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="problem-time-wasted">Estimated Time Wasted (hours)</label>
                        <input
                          id="problem-time-wasted"
                          inputMode="decimal"
                          value={problemTimeWastedHours}
                          onChange={(event) => setProblemTimeWastedHours(event.target.value)}
                          placeholder="E.g. 6"
                        />
                      </div>
                    </section>

                    <section className="split-form">
                      <div>
                        <label htmlFor="problem-team">Team</label>
                        <input
                          id="problem-team"
                          value={problemTeam}
                          onChange={(event) => setProblemTeam(event.target.value)}
                          placeholder="E.g. RevOps"
                        />
                      </div>
                      <div>
                        <label htmlFor="problem-domain">Domain</label>
                        <input
                          id="problem-domain"
                          value={problemDomain}
                          onChange={(event) => setProblemDomain(event.target.value)}
                          placeholder="E.g. Reporting"
                        />
                      </div>
                    </section>

                    <label htmlFor="problem-contact-details">Contact Details</label>
                    <input
                      id="problem-contact-details"
                      value={problemContactDetails}
                      onChange={(event) => setProblemContactDetails(event.target.value)}
                      placeholder="E.g. name/email/Slack channel"
                    />

                    <section className="modal-actions">
                      <button type="button" className="btn btn-outline" onClick={resetProblemForm} disabled={problemSubmitting}>
                        Reset
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={problemSubmitting}>
                        {problemSubmitting ? 'Submitting...' : 'Submit Problem'}
                      </button>
                    </section>
                  </form>
                </article>
              ) : null}

              {problemError ? <section className="message message-error">{problemError}</section> : null}

              {problemLoading ? (
                <section className="card">
                  <p className="empty-copy">Loading Problem Exchange items...</p>
                </section>
              ) : null}

              {!problemLoading && problemLoaded && problemItems.length > 0 ? (
                <section className="grid hacks-grid">
                  {problemItems.map((problem) => {
                    const statusValue = problemStatusDraftById[problem.id] ?? problem.status;
                    const linkedHackProjectValue = problemLinkHackProjectById[problem.id] ?? problem.linkedHackProjectId ?? '';
                    const linkedArtifactValue = problemLinkArtifactById[problem.id] ?? problem.linkedArtifactId ?? '';
                    const statusNoteValue = problemStatusNoteById[problem.id] ?? '';
                    const flagReasonValue = problemFlagReasonById[problem.id] ?? '';
                    const moderationAction = resolveProblemModerationAction(problemCanModerate, problem.moderationState);
                    return (
                      <article key={problem.id} className="card hack-card problem-card">
                        <div className="hack-card-head">
                          <div className="hack-card-title-wrap">
                            <h3>{problem.title}</h3>
                          </div>
                          <div className="problem-pill-row">
                            <span className={`pill pill-${problem.status}`}>{formatLabel(problem.status)}</span>
                            {problem.moderationState !== 'visible' ? (
                              <span className={`pill pill-moderation-${problem.moderationState}`}>
                                {formatLabel(problem.moderationState)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <p className="hack-card-copy">{problem.description}</p>

                        <div className="problem-meta-grid">
                          <span className="meta">Team: {problem.team}</span>
                          <span className="meta">Domain: {problem.domain}</span>
                          <span className="meta">Frequency: {formatLabel(problem.frequency)}</span>
                          <span className="meta">Time wasted: {problem.estimatedTimeWastedHours}h</span>
                          <span className="meta">Submitted by {problem.createdByName}</span>
                          <span className="meta">Contact: {problem.contactDetails}</span>
                        </div>

                        <div className="hack-card-foot">
                          <div className="problem-actions">
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => {
                                void handleVoteProblem(problem.id);
                              }}
                              disabled={problemVotePendingId === problem.id || problem.moderationState === 'removed'}
                            >
                              {problemVotePendingId === problem.id ? 'Saving...' : 'Vote'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={() => {
                                void handleFlagProblem(problem);
                              }}
                              disabled={problemFlagPendingId === problem.id || problem.moderationState === 'removed'}
                            >
                              {problemFlagPendingId === problem.id ? 'Saving...' : 'Flag'}
                            </button>
                            {moderationAction ? (
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => {
                                  void handleModerateProblem(problem, moderationAction);
                                }}
                                disabled={problemModerationPendingId === problem.id}
                              >
                                {problemModerationPendingId === problem.id
                                  ? 'Saving...'
                                  : moderationAction === 'reinstate'
                                    ? 'Reinstate'
                                    : 'Remove'}
                              </button>
                            ) : null}
                          </div>
                          <span className="meta">
                            {problem.voteCount} vote{problem.voteCount === 1 ? '' : 's'} · {problem.flagCount} flag{problem.flagCount === 1 ? '' : 's'}
                          </span>
                        </div>

                        <section className="problem-inline-section">
                          <label htmlFor={`problem-flag-reason-${problem.id}`}>Flag reason (optional)</label>
                          <input
                            id={`problem-flag-reason-${problem.id}`}
                            value={flagReasonValue}
                            onChange={(event) =>
                              setProblemFlagReasonById((current) => ({ ...current, [problem.id]: event.target.value }))
                            }
                            placeholder="Reason to help moderators review"
                          />
                        </section>

                        <section className="problem-status-panel">
                          <h4>Update status</h4>
                          <div className="problem-status-grid">
                            <select
                              value={statusValue}
                              onChange={(event) =>
                                setProblemStatusDraftById((current) => ({
                                  ...current,
                                  [problem.id]: event.target.value as ProblemStatus,
                                }))
                              }
                            >
                              {PROBLEM_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {formatLabel(status)}
                                </option>
                              ))}
                            </select>
                            <input
                              value={linkedHackProjectValue}
                              onChange={(event) =>
                                setProblemLinkHackProjectById((current) => ({
                                  ...current,
                                  [problem.id]: event.target.value,
                                }))
                              }
                              placeholder="Linked hack project ID (required for solved unless artifact linked)"
                            />
                            <input
                              value={linkedArtifactValue}
                              onChange={(event) =>
                                setProblemLinkArtifactById((current) => ({
                                  ...current,
                                  [problem.id]: event.target.value,
                                }))
                              }
                              placeholder="Linked artifact ID (required for solved unless project linked)"
                            />
                            <input
                              value={statusNoteValue}
                              onChange={(event) =>
                                setProblemStatusNoteById((current) => ({
                                  ...current,
                                  [problem.id]: event.target.value,
                                }))
                              }
                              placeholder="Transition note (optional)"
                            />
                          </div>
                          <div className="problem-status-actions">
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => {
                                void handleUpdateProblemStatus(problem);
                              }}
                              disabled={problemStatusPendingId === problem.id}
                            >
                              {problemStatusPendingId === problem.id ? 'Saving...' : 'Save Status'}
                            </button>
                          </div>
                          {(problem.linkedHackProjectId || problem.linkedArtifactId) ? (
                            <p className="meta">
                              Linked sources:
                              {problem.linkedHackProjectId ? ` Hack ${problem.linkedHackProjectId}` : ''}
                              {problem.linkedArtifactId ? ` Artifact ${problem.linkedArtifactId}` : ''}
                            </p>
                          ) : null}
                        </section>
                      </article>
                    );
                  })}
                </section>
              ) : (
                !problemLoading && problemLoaded ? (
                  <p className="empty-copy">No problems match these filters yet.</p>
                ) : null
              )}
            </section>
          ) : null}

          {view === 'hackdays' ? (
            <section className="page-stack">
              <section className="title-row">
                <div>
                  <h1>HackDays</h1>
                  <p className="subtitle">Create HackDays from here, then use "Open App View" on the child page for the app-shell experience.</p>
                </div>
              </section>

              <section className="card hackdays-hero-card">
                <div className="hackdays-hero-row">
                  <div className="hackdays-hero-copy">
                    <h2>Manage HackDay events</h2>
                    <p>Create new HackDays, open the child page, then click "Open App View" to run in app shell.</p>
                  </div>
                  {bootstrap?.parentPageId ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => { resetWizard(); setView('create_hackday'); }}
                    >
                      + Create HackDay
                    </button>
                  ) : null}
                </div>
              </section>

              {sortedRegistry.length > 0 ? (
                <div className="grid hacks-grid">
                  {sortedRegistry.map((event) => (
                    <article key={event.id} className="card hackday-card">
                      <div className="hackday-card-top">
                        <div className="hackday-card-header">
                          <span className="hackday-icon" aria-hidden>{event.icon || '🚀'}</span>
                          <div className="hackday-title-wrap">
                            <h3>{event.eventName}</h3>
                            {event.tagline ? <p className="hackday-tagline">{event.tagline}</p> : null}
                          </div>
                        </div>
                        <span
                          className={`hackday-status-pill${ACTIVE_HACKDAY_LIFECYCLE_STATUSES.has(event.lifecycleStatus) ? ' hackday-status-pill-active' : ''}`}
                        >
                          {formatHackdayLifecycleStatus(event.lifecycleStatus)}
                        </span>
                      </div>

                      <div className="hackday-meta">
                        {event.hackingStartsAt ? (
                          <div className="hackday-meta-row">
                            <span className="hackday-meta-label">Hacking starts</span>
                            <span className="hackday-date">
                              {new Date(event.hackingStartsAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <div className="hackday-card-footer">
                        {event.isNavigable && event.confluencePageId ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => navigateToSwitcherPage(event.confluencePageId!)}
                          >
                            Open
                          </button>
                        ) : (
                          <span className="text-muted">Page not yet available</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <section className="card hackdays-empty-card">
                  <div className="hackdays-empty-icon" aria-hidden>🚀</div>
                  <p className="hackdays-empty-title">No HackDays yet</p>
                  <p className="empty-copy">Use “Create HackDay” above to create your first event.</p>
                </section>
              )}

              {!bootstrap?.parentPageId ? (
                <p className="meta">Set <strong>CONFLUENCE_HDC_PARENT_PAGE_ID</strong> in Forge env to enable the create wizard.</p>
              ) : null}
            </section>
          ) : null}

          {view === 'create_hackday' ? (
            <section className="wizard-page">
              <section className="wizard-page-head">
                <h1>Create HackDay</h1>
                <p className="subtitle">Set up your event in 6 steps</p>
              </section>

              {/* Numbered progress stepper */}
              <div className="wizard-stepper" role="list" aria-label="Wizard progress">
                {(['Basic Info', 'Schedule', 'Schedule Review', 'Rules', 'Branding', 'Review'] as const).map((label, idx) => {
                  const stepNum = idx + 1;
                  const isDone = wStep > stepNum;
                  const isActive = wStep === stepNum;
                  return (
                    <div key={label} className="ws-step-wrap">
                      <div
                        className={`ws-step${isActive ? ' ws-active' : ''}${isDone ? ' ws-done' : ''}`}
                        role="listitem"
                        aria-current={isActive ? 'step' : undefined}
                      >
                        <div className="ws-circle">{isDone ? '✓' : stepNum}</div>
                        <span className="ws-label">{label}</span>
                      </div>
                      {idx < 5 && (
                        <div className={`ws-line${isDone ? ' ws-line-done' : ''}`} aria-hidden />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Wizard card: head / body / foot */}
              <article className="card wizard-card">
                <div className="wizard-card-head">
                  <p className="wizard-card-step-eyebrow">Step {wStep} of 6</p>
                  <h2 className="wizard-card-title">
                    {wStep === 1
                      ? 'Basic Info'
                      : wStep === 2
                        ? 'Schedule'
                        : wStep === 3
                          ? 'Schedule Review'
                          : wStep === 4
                            ? 'Rules'
                            : wStep === 5
                              ? 'Branding'
                              : 'Review & Create'}
                  </h2>
                  {wStep === 3 ? (
                    <p className="wizard-card-subtitle">
                      Review the generated timeline. If anything looks off, go back to Schedule to edit timings,
                      enabled events, or custom events.
                    </p>
                  ) : null}
                  {(wEventNameError || actionError) ? (
                    <p className="wizard-error" role="alert">{wEventNameError || actionError}</p>
                  ) : null}
                </div>

                <div className="wizard-card-body">

                  {/* ── Step 1: Basic Info ── */}
                  {wStep === 1 ? (
                    <div className="wizard-fields">
                      <div className="field-group">
                        <div className="field-row">
                          <label htmlFor="w-name" className="field-label">
                            Event name <span className="required">*</span>
                          </label>
                          <input
                            id="w-name"
                            className="field-input"
                            value={wEventName}
                            onChange={(e) => setWEventName(e.target.value)}
                            placeholder="e.g. Spring HackDay 2026"
                          />
                        </div>
                        <div className="field-pair">
                          <div className="field-row">
                            <label htmlFor="w-icon" className="field-label">Icon (emoji)</label>
                            <input
                              id="w-icon"
                              className="field-input field-input-short"
                              value={wEventIcon}
                              onChange={(e) => setWEventIcon(e.target.value)}
                              placeholder="🚀"
                              maxLength={4}
                            />
                          </div>
                          <div className="field-row">
                            <label htmlFor="w-tagline" className="field-label">Tagline</label>
                            <input
                              id="w-tagline"
                              className="field-input"
                              value={wEventTagline}
                              onChange={(e) => setWEventTagline(e.target.value)}
                              placeholder="Optional short description"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="field-group">
                        <p className="field-group-label">Administrators</p>
                        <div className="field-row">
                          <label htmlFor="w-admin-email" className="field-label">Primary admin email</label>
                          <input
                            id="w-admin-email"
                            className="field-input"
                            type="email"
                            value={wPrimaryAdminEmail}
                            onChange={(e) => setWPrimaryAdminEmail(e.target.value)}
                            placeholder="you@adaptavist.com"
                          />
                        </div>
                        <div className="field-row">
                          <label htmlFor="w-co-admins" className="field-label">Co-admin emails</label>
                          <input
                            id="w-co-admins"
                            className="field-input"
                            value={wCoAdminsInput}
                            onChange={(e) => setWCoAdminsInput(e.target.value)}
                            placeholder="co1@adaptavist.com, co2@adaptavist.com"
                          />
                          <span className="field-hint">Comma-separated</span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* ── Step 2: Schedule ── */}
                  {wStep === 2 ? (
                    <div className="wizard-fields">
                      <ScheduleBuilderV2
                        timezone={wTimezone}
                        initialState={wScheduleBuilderState ?? undefined}
                        onChange={(output) => {
                          setWScheduleOutput(output);
                          if (output.timezone) setWTimezone(output.timezone);
                          if (output.duration) setWEventDuration(output.duration);
                        }}
                        onStateChange={setWScheduleBuilderState}
                        showInlinePreview={false}
                      />
                    </div>
                  ) : null}

                  {/* ── Step 3: Schedule Review ── */}
                  {wStep === 3 ? (
                    <div className="wizard-fields">
                      {wScheduleBuilderState ? (
                        <ScheduleBuilderV2Preview
                          duration={wScheduleBuilderState.duration}
                          anchorDate={wScheduleBuilderState.anchorDate}
                          timezone={wScheduleBuilderState.timezone || wTimezone}
                          eventStates={wScheduleBuilderState.eventStates}
                          customEvents={wScheduleBuilderState.customEvents}
                          showHeaderText={false}
                          surfaceVariant="flat"
                        />
                      ) : (
                        <p className="meta">
                          Preview is unavailable until the Schedule step is opened in this session. Go back to
                          Schedule to generate it.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {/* ── Step 4: Rules ── */}
                  {wStep === 4 ? (
                    <div className="wizard-fields">
                      <div className="field-group">
                        <p className="field-group-label">Team</p>
                        <div className="field-pair">
                          <div className="field-row">
                            <label htmlFor="w-min-team" className="field-label">Min size</label>
                            <input id="w-min-team" className="field-input" type="number" min="1" value={wMinTeamSize} onChange={(e) => setWMinTeamSize(e.target.value)} />
                          </div>
                          <div className="field-row">
                            <label htmlFor="w-max-team" className="field-label">Max size</label>
                            <input id="w-max-team" className="field-input" type="number" min="1" value={wMaxTeamSize} onChange={(e) => setWMaxTeamSize(e.target.value)} />
                          </div>
                        </div>
                        <div className="field-row">
                          <label htmlFor="w-judging" className="field-label">Judging model</label>
                          <select id="w-judging" className="field-input" value={wJudgingModel} onChange={(e) => setWJudgingModel(e.target.value as 'panel' | 'popular_vote' | 'hybrid')}>
                            <option value="hybrid">Hybrid — panel + community vote</option>
                            <option value="panel">Panel only</option>
                            <option value="popular_vote">Popular vote</option>
                          </select>
                        </div>
                      </div>
                      <div className="field-group">
                        <p className="field-group-label">Permissions</p>
                        <label className="toggle-row">
                          <input type="checkbox" checked={wAllowCrossTeamMentoring} onChange={(e) => setWAllowCrossTeamMentoring(e.target.checked)} />
                          <span className="toggle-text">
                            <span className="toggle-title">Allow cross-team mentoring</span>
                            <span className="toggle-desc">Mentors can advise teams they're not a member of</span>
                          </span>
                        </label>
                        <label className="toggle-row">
                          <input type="checkbox" checked={wRequireDemoLink} onChange={(e) => setWRequireDemoLink(e.target.checked)} />
                          <span className="toggle-text">
                            <span className="toggle-title">Require demo link</span>
                            <span className="toggle-desc">Teams must submit a demo URL to qualify for judging</span>
                          </span>
                        </label>
                      </div>
                      <div className="field-group">
                        <p className="field-group-label">Content</p>
                        <div className="field-row">
                          <label htmlFor="w-categories" className="field-label">Categories</label>
                          <input id="w-categories" className="field-input" value={wCategoriesInput} onChange={(e) => setWCategoriesInput(e.target.value)} placeholder="e.g. AI, Productivity, Tooling" />
                          <span className="field-hint">Comma-separated</span>
                        </div>
                        <div className="field-row">
                          <label htmlFor="w-prizes" className="field-label">Prizes</label>
                          <textarea id="w-prizes" className="field-input field-textarea" value={wPrizesText} onChange={(e) => setWPrizesText(e.target.value)} placeholder="Describe prizes and recognition..." rows={3} />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* ── Step 5: Branding ── */}
                  {wStep === 5 ? (
                    <div className="wizard-fields">
                      <div className="field-group">
                        <p className="field-group-label">Colours</p>
                        <div className="field-row">
                          <label htmlFor="w-accent" className="field-label">Accent colour</label>
                          <div className="color-picker-row">
                            <input
                              id="w-accent"
                              type="color"
                              className="color-swatch-input"
                              value={wAccentColor}
                              onChange={(e) => setWAccentColor(e.target.value)}
                              aria-label="Pick accent colour"
                            />
                            <input
                              type="text"
                              className="field-input color-hex-input"
                              value={wAccentColor}
                              onChange={(e) => setWAccentColor(e.target.value)}
                              placeholder="#0f766e"
                            />
                            <span className="color-live-preview" style={{ background: wAccentColor }} aria-hidden />
                          </div>
                          <div className="color-presets" role="group" aria-label="Preset colours">
                            {['#14b8a6', '#6366f1', '#f59e0b', '#ef4444', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899'].map((hex) => (
                              <button
                                key={hex}
                                type="button"
                                className={`color-preset-btn${wAccentColor === hex ? ' color-preset-active' : ''}`}
                                style={{ background: hex }}
                                onClick={() => setWAccentColor(hex)}
                                aria-label={`Set colour to ${hex}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="field-group">
                        <p className="field-group-label">Messaging</p>
                        <div className="field-row">
                          <label htmlFor="w-banner-msg" className="field-label">Banner message</label>
                          <input id="w-banner-msg" className="field-input" value={wBannerMessage} onChange={(e) => setWBannerMessage(e.target.value)} placeholder="Optional announcement banner" />
                        </div>
                        <div className="field-row">
                          <label htmlFor="w-banner-img" className="field-label">Banner image URL</label>
                          <input id="w-banner-img" className="field-input" value={wBannerImageUrl} onChange={(e) => setWBannerImageUrl(e.target.value)} placeholder="https://..." />
                        </div>
                      </div>
                      <div className="field-group">
                        <p className="field-group-label">Appearance</p>
                        <div className="field-row">
                          <label htmlFor="w-theme" className="field-label">Theme preference</label>
                          <select id="w-theme" className="field-input" value={wThemePreference} onChange={(e) => setWThemePreference(e.target.value as ThemePreference)}>
                            <option value="system">System default</option>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* ── Step 6: Review & Create ── */}
                  {wStep === 6 ? (
                    <div className="wizard-fields">
                      <div className="review-block">
                        <p className="review-block-title">Basic Info</p>
                        <div className="review-kv-grid">
                          <span className="review-k">Name</span>
                          <span className="review-v">{wEventIcon} {wEventName || <em>Not set</em>}</span>
                          {wEventTagline ? (
                            <><span className="review-k">Tagline</span><span className="review-v">{wEventTagline}</span></>
                          ) : null}
                          {wPrimaryAdminEmail ? (
                            <><span className="review-k">Admin</span><span className="review-v">{wPrimaryAdminEmail}</span></>
                          ) : null}
                        </div>
                      </div>
                      <div className="review-block">
                        <p className="review-block-title">Schedule</p>
                        <div className="review-kv-grid">
                          <span className="review-k">Timezone</span>
                          <span className="review-v">{wScheduleOutput?.timezone || wTimezone}</span>
                          {(wScheduleOutput?.hackingStartsAt || wHackingStartsAt) ? (
                            <>
                              <span className="review-k">Hacking starts</span>
                              <span className="review-v">
                                {wScheduleOutput?.hackingStartsAt
                                  ? new Intl.DateTimeFormat('en-GB', { timeZone: wScheduleOutput.timezone || wTimezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(wScheduleOutput.hackingStartsAt))
                                  : wHackingStartsAt}
                              </span>
                            </>
                          ) : null}
                          {(wScheduleOutput?.submissionDeadlineAt || wSubmissionDeadlineAt) ? (
                            <>
                              <span className="review-k">Deadline</span>
                              <span className="review-v">
                                {wScheduleOutput?.submissionDeadlineAt
                                  ? new Intl.DateTimeFormat('en-GB', { timeZone: wScheduleOutput.timezone || wTimezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(wScheduleOutput.submissionDeadlineAt))
                                  : wSubmissionDeadlineAt}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="review-block">
                        <p className="review-block-title">Rules</p>
                        <div className="review-kv-grid">
                          <span className="review-k">Team size</span>
                          <span className="review-v">{wMinTeamSize}–{wMaxTeamSize} people</span>
                          <span className="review-k">Judging</span>
                          <span className="review-v">
                            {wJudgingModel === 'popular_vote' ? 'Popular vote' : wJudgingModel === 'panel' ? 'Panel' : 'Hybrid'}
                          </span>
                        </div>
                      </div>
                      <div className="review-block">
                        <p className="review-block-title">Branding</p>
                        <div className="review-kv-grid">
                          <span className="review-k">Accent</span>
                          <span className="review-v review-v-color">
                            <span className="review-color-chip" style={{ background: wAccentColor }} aria-hidden />
                            {wAccentColor}
                          </span>
                          <span className="review-k">Theme</span>
                          <span className="review-v">{wThemePreference}</span>
                        </div>
                      </div>
                      <div className="review-block">
                        <p className="review-block-title">Child Integrations</p>
                        <div className="review-kv-grid">
                          <span className="review-k">Template preset</span>
                          <span className="review-v">
                            <label className="toggle-row">
                              <input
                                type="radio"
                                name="wTemplateMode"
                                value="default"
                                checked={wTemplateMode === 'default'}
                                onChange={() => setWTemplateMode('default')}
                              />
                              <span className="toggle-text">
                                <span className="toggle-title">Default template</span>
                              </span>
                            </label>
                            <label className="toggle-row">
                              <input
                                type="radio"
                                name="wTemplateMode"
                                value="customized"
                                checked={wTemplateMode === 'customized'}
                                onChange={() => setWTemplateMode('customized')}
                              />
                              <span className="toggle-text">
                                <span className="toggle-title">Customized template</span>
                              </span>
                            </label>
                          </span>
                          <span className="review-k">Auto-publish</span>
                          <span className="review-v">
                            <label className="toggle-row">
                              <input
                                type="checkbox"
                                checked={wAutoPublishToShowcaseDrafts}
                                onChange={(event) => setWAutoPublishToShowcaseDrafts(event.target.checked)}
                              />
                              <span className="toggle-text">
                                <span className="toggle-title">Create Showcase drafts on event completion</span>
                              </span>
                            </label>
                          </span>
                        </div>
                        <div className="problem-title-actions">
                          <p className="meta">
                            Import high-voted Problem Exchange items as official challenges (vote threshold: {CHILD_IMPORT_MIN_VOTES_DEFAULT}+).
                          </p>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              void loadProblemImportCandidates();
                            }}
                            disabled={wProblemImportLoading}
                          >
                            {wProblemImportLoading ? 'Refreshing...' : 'Refresh candidates'}
                          </button>
                        </div>
                        {wProblemImportError ? <p className="error-text">{wProblemImportError}</p> : null}
                        {wProblemImportLoading ? <p className="meta">Loading Problem Exchange candidates…</p> : null}
                        {!wProblemImportLoading && wProblemImportLoaded ? (
                          wProblemImportCandidateItems.length > 0 ? (
                            <div className="wizard-fields">
                              {wProblemImportCandidateItems.map((problem) => {
                                const isSelected = wSelectedProblemImportIds.includes(problem.problemId);
                                return (
                                  <label key={problem.problemId} className="toggle-row">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(event) =>
                                        setWSelectedProblemImportIds((current) => {
                                          if (event.target.checked) {
                                            return current.includes(problem.problemId)
                                              ? current
                                              : [...current, problem.problemId];
                                          }
                                          return current.filter((id) => id !== problem.problemId);
                                        })
                                      }
                                    />
                                    <span className="toggle-text">
                                      <span className="toggle-title">
                                        {problem.title}
                                      </span>
                                      <span className="toggle-desc">
                                        {problem.voteCount} votes · {problem.team} / {problem.domain} · {formatLabel(problem.status)}
                                      </span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="meta">No import candidates match the current threshold yet.</p>
                          )
                        ) : null}
                      </div>
                      <div className="launch-mode-toggle" role="group" aria-label="Launch mode">
                        <label className={`launch-mode-option${wLaunchMode === 'draft' ? ' launch-mode-selected' : ''}`}>
                          <input
                            type="radio"
                            name="wLaunchMode"
                            value="draft"
                            checked={wLaunchMode === 'draft'}
                            onChange={() => setWLaunchMode('draft')}
                          />
                          <span className="launch-mode-icon">📋</span>
                          <span className="launch-mode-text">
                            <span className="launch-mode-title">Save as draft</span>
                            <span className="launch-mode-desc">Review and publish from the admin panel later</span>
                          </span>
                        </label>
                        <label className={`launch-mode-option${wLaunchMode === 'go_live' ? ' launch-mode-selected' : ''}`}>
                          <input
                            type="radio"
                            name="wLaunchMode"
                            value="go_live"
                            checked={wLaunchMode === 'go_live'}
                            onChange={() => setWLaunchMode('go_live')}
                          />
                          <span className="launch-mode-icon">🚀</span>
                          <span className="launch-mode-text">
                            <span className="launch-mode-title">Go live immediately</span>
                            <span className="launch-mode-desc">Open for registration as soon as it's created</span>
                          </span>
                        </label>
                      </div>
                    </div>
                  ) : null}

                </div>{/* /wizard-card-body */}

                {/* Card footer: nav */}
                <div className="wizard-card-foot">
                  {wStep > 1 ? (
                    <button type="button" className="btn btn-ghost" onClick={() => { setActionError(''); setWStep((s) => (s - 1) as WizardStep); window.scrollTo({ top: 0, behavior: 'instant' }); }}>
                      {wStep === 3 ? '← Back to Schedule' : '← Back'}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-ghost" onClick={() => { resetWizard(); setView('hackdays'); }}>
                      Cancel
                    </button>
                  )}
                  {wStep < 6 ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        const err = getWizardValidationError(wStep);
                        if (err) { setActionError(err); return; }
                        setActionError('');
                        setWStep((s) => (s + 1) as WizardStep);
                        window.scrollTo({ top: 0, behavior: 'instant' });
                      }}
                    >
                      {wStep === 3 ? 'Continue to Rules →' : 'Next →'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-create"
                      disabled={saving}
                      onClick={() => void handleCreateHackDay()}
                    >
                      {saving ? 'Creating…' : '🚀 Create HackDay'}
                    </button>
                  )}
                </div>
              </article>
            </section>
          ) : null}

          {view === 'profile' ? (
            <section className="page-stack">
              <section className="title-row">
                <div>
                  <h1>Profile</h1>
                  <p className="subtitle">Your account and mentor settings</p>
                </div>
              </section>
              <article className="card">
                <div className="profile-header-row">
                  <span className="profile-avatar" aria-hidden>{profileInitial}</span>
                  <div>
                    <h2>Account</h2>
                    <p className="meta">{bootstrap.viewer.accountId}</p>
                  </div>
                </div>
                <div className="profile-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setModalView('mentor_profile')}>
                    Update Mentor Profile
                  </button>
                </div>
              </article>
            </section>
          ) : null}

          {view === 'search' ? (
            <section className="page-stack">
              <section className="title-row">
                <div>
                  <h1>Search</h1>
                  <p className="subtitle">{globalSearch.trim() ? `Results for "${globalSearch.trim()}"` : 'Search hacks, people, and projects'}</p>
                </div>
              </section>
              {globalSearch.trim() ? (
                <>
                  <section>
                    <h2 className="list-title">Hacks ({globalSearchResults.hacks.length})</h2>
                    {globalSearchResults.hacks.length > 0 ? (
                      <div className="grid hacks-grid">
                        {globalSearchResults.hacks.map((hack) => (
                          <HackCard key={hack.id} item={hack} />
                        ))}
                      </div>
                    ) : <p className="empty-copy">No hacks match.</p>}
                  </section>
                  <section>
                    <h2 className="list-title">People ({globalSearchResults.people.length})</h2>
                    {globalSearchResults.people.length > 0 ? (
                      <div className="grid people-grid">
                        {globalSearchResults.people.map((person) => (
                          <PersonCard key={person.id} item={person} />
                        ))}
                      </div>
                    ) : <p className="empty-copy">No people match.</p>}
                  </section>
                  <section>
                    <h2 className="list-title">Projects ({globalSearchResults.projects.length})</h2>
                    {globalSearchResults.projects.length > 0 ? (
                      <div className="grid hacks-grid">
                        {globalSearchResults.projects.map((project) => (
                          <ProjectCard key={project.id} item={project} />
                        ))}
                      </div>
                    ) : <p className="empty-copy">No projects match.</p>}
                  </section>
                </>
              ) : (
                <p className="empty-copy">Type in the header search and press Enter to search.</p>
              )}
            </section>
          ) : null}

          {view === 'pipeline' ? (
            <section className="page-stack">
              <section className="title-row">
                <div>
                  <h1>Pipeline</h1>
                  <p className="subtitle">Structured stage-gate board from hack to product candidate.</p>
                </div>
              </section>
              <section className="pipeline-metrics-grid">
                <article className="card">
                  <h2 className="list-title">Items Per Stage</h2>
                  <ul className="pipeline-metric-list">
                    {effectivePipelineMetrics.itemsPerStage.map((metric) => (
                      <li key={metric.stage}>
                        <span>{formatLabel(metric.stage)}</span>
                        <strong>{metric.count}</strong>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="card">
                  <h2 className="list-title">Average Time In Stage (days)</h2>
                  <ul className="pipeline-metric-list">
                    {effectivePipelineMetrics.averageDaysInStage.map((metric) => (
                      <li key={metric.stage}>
                        <span>{formatLabel(metric.stage)}</span>
                        <strong>{metric.averageDays}</strong>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="card">
                  <h2 className="list-title">Conversion And Throughput</h2>
                  <ul className="pipeline-metric-list">
                    <li>
                      <span>Hack → Validated</span>
                      <strong>{effectivePipelineMetrics.conversionHackToValidated.toFixed(1)}%</strong>
                    </li>
                    <li>
                      <span>Validated → Incubating</span>
                      <strong>{effectivePipelineMetrics.conversionValidatedToIncubating.toFixed(1)}%</strong>
                    </li>
                    <li>
                      <span>Incubating → Candidate</span>
                      <strong>{effectivePipelineMetrics.conversionIncubatingToCandidate.toFixed(1)}%</strong>
                    </li>
                    <li>
                      <span>Total entered / graduated</span>
                      <strong>
                        {effectivePipelineMetrics.totalEntered} / {effectivePipelineMetrics.totalGraduated}
                      </strong>
                    </li>
                  </ul>
                </article>
              </section>

              {pipelineLoading ? <p className="empty-copy">Loading pipeline board…</p> : null}
              {pipelineError ? <p className="error-text">{pipelineError}</p> : null}

              <section className="pipeline-board" aria-label="Pipeline board">
                {effectivePipelineStageCriteria.map((stage) => {
                  const items = pipelineItemsByStage[stage.stage];
                  return (
                    <article key={stage.stage} className="pipeline-column">
                      <header className="pipeline-column-header">
                        <h2>{stage.label}</h2>
                        <span>{items.length}</span>
                      </header>
                      <p className="pipeline-column-description">{stage.description}</p>
                      <ul className="pipeline-criteria-list">
                        {stage.criteria.map((criterion) => (
                          <li key={criterion}>{criterion}</li>
                        ))}
                      </ul>
                      {pipelineCanManage ? (
                        <div className="pipeline-stage-editor">
                          <label>
                            Stage description
                            <input
                              type="text"
                              value={pipelineCriteriaDescriptionDraftByStage[stage.stage] ?? stage.description}
                              onChange={(event) =>
                                setPipelineCriteriaDescriptionDraftByStage((current) => ({
                                  ...current,
                                  [stage.stage]: event.target.value,
                                }))
                              }
                              placeholder="Short stage definition"
                            />
                          </label>
                          <label>
                            Stage criteria (one per line)
                            <textarea
                              value={pipelineCriteriaTextDraftByStage[stage.stage] ?? stage.criteria.join('\n')}
                              onChange={(event) =>
                                setPipelineCriteriaTextDraftByStage((current) => ({
                                  ...current,
                                  [stage.stage]: event.target.value,
                                }))
                              }
                              rows={4}
                            />
                          </label>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => void handleSavePipelineCriteria(stage.stage)}
                            disabled={pipelineCriteriaSavePendingStage === stage.stage}
                          >
                            {pipelineCriteriaSavePendingStage === stage.stage ? 'Saving…' : 'Save stage criteria'}
                          </button>
                        </div>
                      ) : null}
                      <div className="pipeline-column-body">
                        {items.length > 0 ? (
                          items.map((item) => (
                            <article key={item.projectId} className="card pipeline-card">
                              <h3>{item.title}</h3>
                              <p>{item.description || 'No description provided.'}</p>
                              <div className="pipeline-card-meta">
                                <span>Owner: {item.ownerName}</span>
                                <span>Days in stage: {item.daysInStage}</span>
                                <span>Attached hacks: {item.attachedHacksCount}</span>
                                <span>Comments: {item.commentCount}</span>
                                <span>
                                  Time saved estimate:{' '}
                                  {item.timeSavedEstimate !== null ? `${item.timeSavedEstimate}h` : 'n/a'}
                                </span>
                              </div>
                              {pipelineCanManage ? (
                                <div className="pipeline-move-controls">
                                  <label>
                                    Target stage
                                    <select
                                      value={pipelineMoveStageByProjectId[item.projectId] ?? item.stage}
                                      onChange={(event) =>
                                        setPipelineMoveStageByProjectId((current) => ({
                                          ...current,
                                          [item.projectId]: event.target.value as PipelineStage,
                                        }))
                                      }
                                    >
                                      {effectivePipelineStageCriteria.map((option) => (
                                        <option key={option.stage} value={option.stage}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label>
                                    Transition note (required)
                                    <input
                                      type="text"
                                      value={pipelineMoveNoteByProjectId[item.projectId] ?? ''}
                                      onChange={(event) =>
                                        setPipelineMoveNoteByProjectId((current) => ({
                                          ...current,
                                          [item.projectId]: event.target.value,
                                        }))
                                      }
                                      placeholder="Reason for this stage move"
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => void handleMovePipelineItem(item)}
                                    disabled={pipelineMovePendingProjectId === item.projectId}
                                  >
                                    {pipelineMovePendingProjectId === item.projectId ? 'Moving…' : 'Move stage'}
                                  </button>
                                </div>
                              ) : null}
                            </article>
                          ))
                        ) : (
                          <p className="empty-copy">No items in this stage.</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>
            </section>
          ) : null}

          {view === 'onboarding' ? (
            <section className="page-stack">
              <section className="title-row">
                <div>
                  <h1>Get started</h1>
                  <p className="subtitle">Choose a path to start using AI hacks in your work.</p>
                </div>
              </section>
              <div className="grid onboarding-grid">
                <article className="card onboarding-card" role="button" tabIndex={0} onClick={() => { setView('hacks'); setHackTab('completed'); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('hacks'); setHackTab('completed'); } }}>
                  <h2 className="onboarding-card-title">AI Experiment Starter template</h2>
                  <p className="onboarding-card-copy">Start a new AI experiment with proper structure and risk assessment. Find it in Featured Hacks.</p>
                  <span className="onboarding-card-cta">Open Featured Hacks →</span>
                </article>
                <article className="card onboarding-card" role="button" tabIndex={0} onClick={() => { setView('hacks'); setHackTab('completed'); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('hacks'); setHackTab('completed'); } }}>
                  <h2 className="onboarding-card-title">Copilot prompt pack for your role</h2>
                  <p className="onboarding-card-copy">Curated prompts, skills, and apps by use case: code review, meeting notes, docs, and more.</p>
                  <span className="onboarding-card-cta">Browse Featured Hacks →</span>
                </article>
                <article className="card onboarding-card" role="button" tabIndex={0} onClick={() => { setView('hacks'); setHackTab('completed'); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('hacks'); setHackTab('completed'); } }}>
                  <h2 className="onboarding-card-title">Reuse a Featured Hacks item</h2>
                  <p className="onboarding-card-copy">Copy first, create later. Start by reusing a verified prompt, skill, or app from Completed Hacks.</p>
                  <span className="onboarding-card-cta">Explore Completed Hacks →</span>
                </article>
              </div>
              <article className="card onboarding-guide-card">
                <h2 className="onboarding-guide-title">AI 101 micro-guide</h2>
                <p className="onboarding-guide-copy">New to AI hacks? Learn what they are, how to reuse them, and how to contribute.</p>
                <button type="button" className="btn btn-primary" onClick={() => setView('guide')}>
                  Open Guide
                </button>
              </article>
            </section>
          ) : null}

          {view === 'guide' ? (
            <section className="page-stack">
              <section className="title-row">
                <button type="button" className="btn btn-ghost" onClick={() => setView('dashboard')}>
                  ← Back to Dashboard
                </button>
              </section>
              <section className="title-row">
                <div>
                  <h1>Guide Pathways</h1>
                  <p className="subtitle">Structured learning paths by role and domain.</p>
                </div>
              </section>
              <article className="card">
                <div className="guide-filter-grid">
                  <label>
                    Search
                    <input
                      value={pathwayQueryInput}
                      onChange={(event) => setPathwayQueryInput(event.target.value)}
                      placeholder="Search pathways"
                    />
                  </label>
                  <label>
                    Domain
                    <input
                      value={pathwayDomainInput}
                      onChange={(event) => setPathwayDomainInput(event.target.value)}
                      placeholder="e.g. Finance"
                    />
                  </label>
                  <label>
                    Role
                    <input
                      value={pathwayRoleInput}
                      onChange={(event) => setPathwayRoleInput(event.target.value)}
                      placeholder="e.g. Analyst"
                    />
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={pathwayRecommendedOnly}
                      onChange={(event) => setPathwayRecommendedOnly(event.target.checked)}
                    />
                    Recommended only
                  </label>
                  <div className="guide-filter-actions">
                    <button type="button" className="btn btn-primary" onClick={applyPathwayFilters}>
                      Apply
                    </button>
                  </div>
                </div>
              </article>

              <section className="guide-layout">
                <article className="card guide-list-card">
                  <div className="guide-list-head">
                    <h2>Pathways</h2>
                    <div className="guide-list-head-actions">
                      {pathwayCanManage ? <span className="status-pill">Editor</span> : null}
                      {pathwayCanManage ? (
                        <button type="button" className="btn btn-outline" onClick={openCreatePathwayEditor}>
                          Create pathway
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {pathwayLoading ? <p className="empty-copy">Loading pathways…</p> : null}
                  {!pathwayLoading && pathwayError ? <p className="error">{pathwayError}</p> : null}
                  {!pathwayLoading && !pathwayError && pathwayItems.length === 0 ? (
                    <p className="empty-copy">No pathways matched your filters.</p>
                  ) : null}
                  {!pathwayLoading && !pathwayError && pathwayItems.length > 0 ? (
                    <div className="guide-list">
                      {pathwayItems.map((item) => (
                        <button
                          type="button"
                          key={item.pathwayId}
                          className={`guide-list-item ${pathwaySelectedId === item.pathwayId ? 'is-active' : ''}`}
                          onClick={() => setPathwaySelectedId(item.pathwayId)}
                        >
                          <strong>{item.title}</strong>
                          <span>{item.summary || 'No summary provided.'}</span>
                          <small>
                            {item.progress.completedSteps}/{item.progress.totalSteps} steps • {item.progress.completionPercent}% complete
                          </small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>

                <article className="card guide-content">
                  {pathwayDetailLoading ? <p className="empty-copy">Loading pathway details…</p> : null}
                  {!pathwayDetailLoading && pathwayDetailError ? <p className="error">{pathwayDetailError}</p> : null}
                  {!pathwayDetailLoading && !pathwayDetailError && pathwayDetail ? (
                    <>
                      <h2>{pathwayDetail.pathway.title}</h2>
                      <p>{pathwayDetail.pathway.introText || pathwayDetail.pathway.summary || 'No intro text yet.'}</p>
                      <p className="subtitle">
                        {pathwayDetail.pathway.domain || 'General'} • {pathwayDetail.pathway.role || 'All roles'} •{' '}
                        {pathwayDetail.pathway.progress.completedSteps}/{pathwayDetail.pathway.progress.totalSteps} complete
                      </p>
                      {pathwayCanManage ? (
                        <div className="guide-detail-actions">
                          <button type="button" className="btn btn-outline" onClick={openEditPathwayEditor}>
                            Edit pathway
                          </button>
                        </div>
                      ) : null}
                      <ol className="guide-step-list">
                        {pathwayDetail.steps.map((step) => {
                          const completed = pathwayDetail.pathway.progress.completedStepIds.includes(step.stepId);
                          return (
                            <li key={step.stepId} className={`guide-step ${completed ? 'is-complete' : ''}`}>
                              <div>
                                <strong>
                                  {step.position}. {step.title}
                                </strong>
                                <p>{step.description || 'No step description provided.'}</p>
                                <small>{step.type.toUpperCase()}{step.isOptional ? ' • Optional' : ''}</small>
                              </div>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                disabled={pathwayStepPendingId === step.stepId}
                                onClick={() => void handleTogglePathwayStepCompletion(step)}
                              >
                                {pathwayStepPendingId === step.stepId
                                  ? 'Saving…'
                                  : completed
                                    ? 'Mark incomplete'
                                    : 'Mark complete'}
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                    </>
                  ) : null}
                  {!pathwayDetailLoading && !pathwayDetailError && !pathwayDetail && pathwayLoaded ? (
                    <p className="empty-copy">Select a pathway to view details.</p>
                  ) : null}
                  <div className="guide-actions">
                    <button type="button" className="btn btn-primary" onClick={() => setView('dashboard')}>
                      Back to Dashboard
                    </button>
                  </div>
                </article>
              </section>

              {pathwayCanManage && pathwayEditorOpen ? (
                <article className="card pathway-editor">
                  <div className="pathway-editor-head">
                    <h2>{pathwayEditorMode === 'create' ? 'Create pathway' : 'Edit pathway'}</h2>
                    <p className="subtitle">
                      Define pathway metadata and step sequence. Saving replaces the full step list.
                    </p>
                  </div>
                  <form
                    className="pathway-editor-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleSavePathwayEditor();
                    }}
                  >
                    <div className="pathway-editor-grid">
                      <label>
                        Title
                        <input
                          value={pathwayEditorTitle}
                          onChange={(event) => setPathwayEditorTitle(event.target.value)}
                          placeholder="e.g. Prompt Engineering Foundations"
                        />
                      </label>
                      <label>
                        Domain
                        <input
                          value={pathwayEditorDomain}
                          onChange={(event) => setPathwayEditorDomain(event.target.value)}
                          placeholder="e.g. Finance"
                        />
                      </label>
                      <label>
                        Role
                        <input
                          value={pathwayEditorRole}
                          onChange={(event) => setPathwayEditorRole(event.target.value)}
                          placeholder="e.g. Analyst"
                        />
                      </label>
                      <label>
                        Tags (comma separated)
                        <input
                          value={pathwayEditorTagsInput}
                          onChange={(event) => setPathwayEditorTagsInput(event.target.value)}
                          placeholder="onboarding, prompts"
                        />
                      </label>
                      <label className="pathway-editor-span-2">
                        Summary
                        <textarea
                          rows={2}
                          value={pathwayEditorSummary}
                          onChange={(event) => setPathwayEditorSummary(event.target.value)}
                          placeholder="Short summary shown in pathway list."
                        />
                      </label>
                      <label className="pathway-editor-span-2">
                        Intro text
                        <textarea
                          rows={3}
                          value={pathwayEditorIntroText}
                          onChange={(event) => setPathwayEditorIntroText(event.target.value)}
                          placeholder="Detailed intro shown in pathway detail."
                        />
                      </label>
                    </div>

                    <div className="pathway-editor-flags">
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={pathwayEditorPublished}
                          onChange={(event) => setPathwayEditorPublished(event.target.checked)}
                        />
                        Published
                      </label>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={pathwayEditorRecommended}
                          onChange={(event) => setPathwayEditorRecommended(event.target.checked)}
                        />
                        Recommended
                      </label>
                    </div>

                    <div className="pathway-editor-steps">
                      <div className="pathway-editor-steps-head">
                        <h3>Steps</h3>
                        <button type="button" className="btn btn-outline" onClick={handleAddPathwayStepDraft}>
                          Add step
                        </button>
                      </div>
                      {pathwayEditorSteps.map((step, index) => (
                        <section key={step.localId} className="pathway-editor-step">
                          <div className="pathway-editor-step-head">
                            <strong>Step {index + 1}</strong>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => handleRemovePathwayStepDraft(step.localId)}
                              disabled={pathwayEditorSteps.length <= 1}
                            >
                              Remove
                            </button>
                          </div>
                          <div className="pathway-editor-step-grid">
                            <label>
                              Type
                              <select
                                value={step.type}
                                onChange={(event) =>
                                  handleUpdatePathwayStepDraft(step.localId, { type: event.target.value as PathwayStepType })
                                }
                              >
                                {PATHWAY_STEP_TYPE_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Title
                              <input
                                value={step.title}
                                onChange={(event) => handleUpdatePathwayStepDraft(step.localId, { title: event.target.value })}
                                placeholder="e.g. Read prompt writing basics"
                              />
                            </label>
                            <label className="pathway-editor-step-span-2">
                              Description
                              <textarea
                                rows={2}
                                value={step.description}
                                onChange={(event) =>
                                  handleUpdatePathwayStepDraft(step.localId, { description: event.target.value })
                                }
                                placeholder="What should participants do in this step?"
                              />
                            </label>
                            <label>
                              External URL
                              <input
                                value={step.externalUrl}
                                onChange={(event) =>
                                  handleUpdatePathwayStepDraft(step.localId, { externalUrl: event.target.value })
                                }
                                placeholder="https://..."
                              />
                            </label>
                            <label>
                              Challenge prompt
                              <input
                                value={step.challengePrompt}
                                onChange={(event) =>
                                  handleUpdatePathwayStepDraft(step.localId, { challengePrompt: event.target.value })
                                }
                                placeholder="Optional challenge prompt"
                              />
                            </label>
                            <label>
                              Linked Project ID
                              <input
                                value={step.linkedHackProjectId}
                                onChange={(event) =>
                                  handleUpdatePathwayStepDraft(step.localId, { linkedHackProjectId: event.target.value })
                                }
                                placeholder="Optional project id"
                              />
                            </label>
                            <label>
                              Linked Artifact ID
                              <input
                                value={step.linkedArtifactId}
                                onChange={(event) =>
                                  handleUpdatePathwayStepDraft(step.localId, { linkedArtifactId: event.target.value })
                                }
                                placeholder="Optional artifact id"
                              />
                            </label>
                            <label className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={step.isOptional}
                                onChange={(event) =>
                                  handleUpdatePathwayStepDraft(step.localId, { isOptional: event.target.checked })
                                }
                              />
                              Optional step
                            </label>
                          </div>
                        </section>
                      ))}
                    </div>

                    <div className="pathway-editor-actions">
                      <button type="button" className="btn btn-ghost" onClick={closePathwayEditor} disabled={pathwayEditorSaving}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={pathwayEditorSaving}>
                        {pathwayEditorSaving ? 'Saving…' : pathwayEditorMode === 'create' ? 'Create pathway' : 'Save pathway'}
                      </button>
                    </div>
                  </form>
                </article>
              ) : null}

              {!pathwayLoading && pathwayItems.length === 0 ? (
                <article className="card guide-content">
                  <h2>AI 101 quick start</h2>
                  <p>Browse Completed Hacks for reusable prompts, skills, and apps.</p>
                  <p>Attach reused hacks to in-progress projects so impact remains visible.</p>
                  <p>Publish your first contribution with context, limitations, and a demo link.</p>
                </article>
              ) : null}
            </section>
          ) : null}

          {view === 'notifications' ? (
            <section className="page-stack">
              <section className="title-row">
                <div>
                  <h1>Notifications</h1>
                  <p className="subtitle">Mentor request updates and other activity.</p>
                </div>
              </section>
              <article className="card">
                <p className="empty-copy">No notifications yet. When mentor requests are accepted or completed, they&apos;ll appear here.</p>
              </article>
            </section>
          ) : null}

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

                <label htmlFor="modal-hack-demo-url">Demo URL (required, https)</label>
                <input
                  id="modal-hack-demo-url"
                  type="url"
                  value={hackDemoUrl}
                  onChange={(event) => setHackDemoUrl(event.target.value)}
                  placeholder="https://..."
                />

                <label htmlFor="modal-hack-content">Content</label>
                <textarea
                  id="modal-hack-content"
                  value={hackContent}
                  onChange={(event) => setHackContent(event.target.value)}
                  placeholder="Prompt or config"
                />

                <label htmlFor="modal-hack-team-members">Team Members (comma separated)</label>
                <input
                  id="modal-hack-team-members"
                  value={hackTeamMembersInput}
                  onChange={(event) => setHackTeamMembersInput(event.target.value)}
                  placeholder="Alice, Ben, Priya"
                />

                <label htmlFor="modal-hack-source-event-id">Source HackDay Event ID (optional)</label>
                <input
                  id="modal-hack-source-event-id"
                  value={hackSourceEventId}
                  onChange={(event) => setHackSourceEventId(event.target.value)}
                  placeholder="event UUID or ID"
                />

                <label htmlFor="modal-hack-tags">Tags (comma separated)</label>
                <input
                  id="modal-hack-tags"
                  value={hackTagsInput}
                  onChange={(event) => setHackTagsInput(event.target.value)}
                  placeholder="ops-automation, reporting"
                />

                <label htmlFor="modal-hack-linked-artifacts">Linked Artifact IDs (comma separated)</label>
                <input
                  id="modal-hack-linked-artifacts"
                  value={hackLinkedArtifactIdsInput}
                  onChange={(event) => setHackLinkedArtifactIdsInput(event.target.value)}
                  placeholder="artifact-1, artifact-2"
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
    </Layout>
  );
}
