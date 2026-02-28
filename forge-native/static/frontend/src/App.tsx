import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from './utils/forgeBridge';
import { DEFAULT_TIMEZONE } from './types';
import type {
  BootstrapData,
  CreateHackInput,
  CreateInstanceDraftInput,
  CreateProjectInput,
  EventDuration,
  FeaturedHack,
  PersonSnapshot,
  ProjectSnapshot,
  ScheduleEventType,
  ThemePreference,
  UpdateMentorProfileInput,
  WizardStep,
} from './types';
import {
  buildConfluencePagePath,
  buildSwitcherSections,
  isNavigableRegistryItem,
  readSwitcherRegistryCache,
  runSwitcherNavigation,
  summarizeSwitcherNavigability,
  switcherRowMetaText,
  writeSwitcherRegistryCache,
} from './appSwitcher';
import { invokeTyped } from './hooks/useForgeData';
import { NAV_ITEMS, type View, type HackTab, type HackTypeFilter, type HackStatusFilter, type MentorFilter, type ModalView, type RecognitionTab } from './constants/nav';
import { Layout } from './components/Layout';
import { WelcomeHero, StatCards } from './components/Dashboard';
import { HackCard, ProjectCard, PersonCard } from './components/shared/Cards';
import { getInitials } from './utils/format';
import { ScheduleBuilderV2, ScheduleBuilderV2Preview } from './components/schedule-builder-v2';
import type {
  ScheduleBuilderOutput as ScheduleBuilderV2Output,
  ScheduleBuilderState as ScheduleBuilderV2State,
} from './types/scheduleBuilderV2';
import { EventSelectionPanel } from './components/EventSelectionPanel';
import { getDefaultSelections } from './data/scheduleEvents';

/** Bump when deploying to help bust Atlassian CDN cache; check console to confirm loaded bundle */
const HACKCENTRAL_UI_VERSION = '0.6.16';
if (typeof console !== 'undefined' && console.log) {
  console.log('[HackCentral Confluence UI] loaded', HACKCENTRAL_UI_VERSION);
}

const BOOTSTRAP_TIMEOUT_MS = 15000;
const LOCAL_PREVIEW_HOSTS = new Set(['localhost', '127.0.0.1']);
const HACKS_SCOPE_NOTE = '';
const TEAM_PULSE_PLACEHOLDER_NOTE = '';
const CREATE_DRAFT_TIMEOUT_MS = 15_000;
const ALLOWED_EMAIL_DOMAIN = '@adaptavist.com';

function isAdaptavistEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

function isDateRangeInvalid(start: string, end: string): boolean {
  return Boolean(start && end && start > end);
}

const ACTIVE_HACKDAY_LIFECYCLE_STATUSES = new Set([
  'registration',
  'team_formation',
  'hacking',
  'submission',
  'voting',
  'judging',
  'results',
]);

function formatHackdayLifecycleStatus(status: string): string {
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
    setActionMessage('');

    const requestId = wPendingRequestId || crypto.randomUUID();
    if (!wPendingRequestId) setWPendingRequestId(requestId);

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
    };

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        invokeTyped('hdcCreateInstanceDraft', payload),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`Creation timed out after ${CREATE_DRAFT_TIMEOUT_MS / 1000}s. Retry to continue.`)), CREATE_DRAFT_TIMEOUT_MS);
        }),
      ]);
      clearTimeout(timeoutId);
      setActionMessage(
        `HackDay created! Child page: ${result.childPageId}. Open that page, then click "Open App View" for the full HackDay runtime.`
      );
      setWPendingRequestId(null);
      resetWizard();
      await loadBootstrap();
      setView('hackdays');
      const childPageId = typeof result.childPageId === 'string' ? result.childPageId.trim() : '';
      const childPagePath = childPageId ? buildConfluencePagePath(childPageId) : '';
      const absoluteChildTarget =
        childPagePath && typeof window !== 'undefined'
          ? `${window.location.origin}${childPagePath}`
          : childPagePath;

      if (childPagePath) {
        setActionMessage('HackDay created. Opening child page now. Once there, use "Open App View" in the page header.');
        try {
          await router.navigate(childPagePath);
          return;
        } catch {
          // Fall through to broader navigation options.
        }

        if (absoluteChildTarget) {
          try {
            await router.open(absoluteChildTarget);
            return;
          } catch {
            if (typeof window !== 'undefined') {
              window.location.assign(absoluteChildTarget);
              return;
            }
          }
        }
      }

      if (result.childPageUrl) {
        setActionMessage('HackDay created. Opening child page now. Once there, use "Open App View" in the page header.');
        try {
          await router.navigate(result.childPageUrl);
          return;
        } catch {
          // Fall through to full-page navigation.
        }
        if (typeof window !== 'undefined') {
          window.location.assign(result.childPageUrl);
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : 'Failed to create HackDay.';
      if (msg.includes('already exists')) {
        setWEventNameError('An instance with this name already exists under this parent page.');
        setWPendingRequestId(null);
      } else {
        setActionError(msg);
      }
    } finally {
      setSaving(false);
    }
  }, [bootstrap?.parentPageId, getWizardValidationError, loadBootstrap, previewMode, resetWizard, wAccentColor, wAllowCrossTeamMentoring, wBannerImageUrl, wBannerMessage, wCategoriesInput, wCoAdminsInput, wEventIcon, wEventName, wEventTagline, wHackingStartsAt, wJudgingModel, wMaxTeamSize, wMinTeamSize, wPendingRequestId, wPrimaryAdminEmail, wPrizesText, wRegistrationClosesAt, wRegistrationOpensAt, wRequireDemoLink, wResultsAnnounceAt, wStep, wSubmissionDeadlineAt, wTeamFormationEndsAt, wTeamFormationStartsAt, wThemePreference, wTimezone, wVotingEndsAt, wVotingStartsAt]);

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
                <h1>Featured Hacks & Projects</h1>
                <button type="button" className="btn btn-primary" onClick={() => setModalView('submit_hack')}>
                  + Submit Hack
                </button>
              </section>

              {hackTab === 'completed' && HACKS_SCOPE_NOTE ? <section className="message message-preview">{HACKS_SCOPE_NOTE}</section> : null}

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
                  <h1>Library</h1>
                  <p className="subtitle">Reusable AI assets — prompts, skills, and apps</p>
                </div>
              </section>
              <section className="section-head-row">
                <div>
                  <h2>Featured Hacks</h2>
                  <p>High-trust, curated collection</p>
                </div>
              </section>
              {featuredHacks.length > 0 ? (
                <section className="grid hacks-grid">
                  {featuredHacks.map((hack) => (
                    <HackCard key={hack.id} item={hack} />
                  ))}
                </section>
              ) : (
                <p className="empty-copy">No library assets yet. Submit a hack to get started.</p>
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

              {registry.length > 0 ? (
                <div className="grid hacks-grid">
                  {registry.map((event) => (
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

          {view === 'projects' ? (
            <section className="page-stack">
              <section className="title-row">
                <div>
                  <h1>Projects</h1>
                  <p className="subtitle">Recent projects</p>
                </div>
              </section>
              {allProjects.length > 0 ? (
                <section className="grid hacks-grid">
                  {allProjects.map((project) => (
                    <ProjectCard key={project.id} item={project} />
                  ))}
                </section>
              ) : (
                <p className="empty-copy">No projects yet.</p>
              )}
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
                  <h1>AI 101 micro-guide</h1>
                  <p className="subtitle">A short intro to AI hacks and how to use HackDay Central.</p>
                </div>
              </section>
              <article className="card guide-content">
                <h2>What are AI hacks?</h2>
                <p>AI hacks are reusable building blocks for AI-assisted work: prompts, skills, and apps. They live in <strong>Completed Hacks</strong> and can be attached to <strong>Hacks In Progress</strong> so your team reuses what works.</p>
                <h2>How do I reuse a hack?</h2>
                <p>Go to Completed Hacks and open Featured Hacks for curated, verified hacks. Use &quot;I used this&quot; to record that you copied or referenced it.</p>
                <h2>How do I contribute?</h2>
                <p>Submit a new hack from Completed Hacks. Start as In progress, then mark it verified when it&apos;s ready. Attach hacks to Hacks In Progress so your work is visible on the Dashboard.</p>
                <h2>Where to go next</h2>
                <ul>
                  <li><button type="button" className="link-btn" onClick={() => { setView('hacks'); setHackTab('completed'); }}>Completed Hacks</button> — Browse and submit AI hacks</li>
                  <li><button type="button" className="link-btn" onClick={() => { setView('hacks'); setHackTab('completed'); }}>Featured Hacks</button> — Curated, high-trust hacks</li>
                  <li><button type="button" className="link-btn" onClick={() => { setView('hacks'); setHackTab('in_progress'); }}>Hacks In Progress</button> — Create projects and attach hacks</li>
                  <li><button type="button" className="link-btn" onClick={() => setView('onboarding')}>Get started</button> — All onboarding paths</li>
                </ul>
                <div className="guide-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setView('dashboard')}>
                    Back to Dashboard
                  </button>
                </div>
              </article>
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
    </Layout>
  );
}
