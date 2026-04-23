/**
 * Shared pain point sub-components and helpers.
 * Used by PainPointsSection (dashboard widget) and PainPoints (full page).
 */

import { useState } from 'react';
import { getCategoryColour } from '../../lib/painCategoryColours';

// ─── helpers ─────────────────────────────────────────────────────────────────

export function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - (typeof ts === 'number' ? ts : new Date(ts).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export const PAIN_CATEGORIES = [
  { label: 'UX', keywords: [
    'ux', 'ui', 'interface', 'design', 'usability', 'accessibility', 'a11y',
    'click', 'button', 'confusing', 'flow', 'navigation', 'layout', 'form',
    'label', 'modal', 'tooltip', 'menu', 'sidebar', 'filter', 'table',
    'wizard', 'onboarding', 'prototype', 'wireframe', 'figma', 'experience',
    'journey', 'friction', 'frustrating', 'hard to find', 'clunky', 'unclear',
    'cluttered', 'inconsistent', 'visual', 'responsive', 'mobile', 'loading',
    'slow to load', 'spinner', 'skeleton', 'animation', 'typography', 'colour',
    'color', 'contrast', 'font', 'icon', 'overwhelming', 'lost', 'confuse',
  ] },
  { label: 'Atlassian', keywords: [
    'atlassian', 'jira', 'confluence', 'bitbucket', 'trello', 'bamboo',
    'opsgenie', 'statuspage', 'compass', 'forge', 'rovo', 'loom', 'atlas',
    'atlassian intelligence', 'atlassian cloud', 'atlassian marketplace',
    'confluence page', 'confluence space', 'confluence macro', 'confluence template',
    'jira board', 'jira backlog', 'jira epic', 'jira story', 'jira ticket',
    'jira project', 'jira workflow', 'jira filter', 'jira dashboard',
    'bitbucket pipeline', 'bitbucket repo', 'pull request',
    'atlassian app', 'atlassian plugin', 'atlassian admin', 'atlassian connect',
    'data center', 'atlassian server', 'cloud migration',
  ] },
  { label: 'Process', keywords: [
    'process', 'workflow', 'approval', 'review', 'meeting', 'manual', 'ticket',
    'sprint', 'jira', 'blocker', 'standup', 'retro', 'retrospective', 'planning',
    'handoff', 'handover', 'escalation', 'sign-off', 'signoff', 'stakeholder',
    'bureaucracy', 'red tape', 'bottleneck', 'dependency', 'waiting', 'sign off',
    'inefficient', 'redundant', 'repetitive', 'overhead', 'status update',
    'audit', 'compliance', 'policy', 'procedure', 'checklist', 'runbook',
    'change management', 'release process', 'procurement', 'slow process',
    'too many steps', 'too many approvals', 'unnecessary', 'ceremony',
  ] },
  { label: 'Automation', keywords: [
    'automate', 'automated', 'automation', 'manually', 'no automation',
    'script', 'scripting', 'bot', 'bots', 'cron', 'scheduled', 'scheduler',
    'trigger', 'triggered', 'job', 'batch job', 'task runner', 'orchestration',
    'rpa', 'robotic process', 'no-code', 'low-code', 'zapier', 'make.com',
    'n8n', 'airflow', 'celery', 'worker', 'queue', 'background job',
    'tedious', 'time-consuming', 'time consuming', 'error prone', 'human error',
    'copy and paste', 'routine task', 'daily task', 'recurring', 'repeat',
    'still doing this by hand', 'doing this manually', 'manually every',
  ] },
  { label: 'Tech Debt', keywords: [
    'tech debt', 'legacy', 'deprecated', 'refactor', 'hack', 'workaround',
    'dirty', 'spaghetti', 'outdated', 'unmaintained', 'brittle', 'fragile',
    'flaky', 'unreliable', 'duplicate code', 'copy paste', 'monolith',
    'hard-coded', 'hardcoded', 'magic number', 'no tests', 'untested',
    'test coverage', 'regression', 'rewrite', 'migration', 'upgrade',
    'old code', 'technical debt', 'messy', 'complex codebase', 'dead code',
    'unused', 'bloat', 'coupling', 'tightly coupled', 'anti-pattern',
    'code smell', 'maintainability', 'unreadable', 'no documentation',
  ] },
  { label: 'Infra', keywords: [
    'infra', 'infrastructure', 'server', 'deploy', 'deployment', 'ci', 'cd',
    'pipeline', 'build', 'crash', 'down', 'scaling', 'cloud', 'kubernetes',
    'k8s', 'docker', 'container', 'microservice', 'latency', 'performance',
    'timeout', 'outage', 'incident', 'alert', 'monitoring', 'observability',
    'logging', 'metrics', 'grafana', 'datadog', 'aws', 'gcp', 'azure',
    'terraform', 'provisioning', 'staging', 'production', 'environment',
    'database', 'storage', 'network', 'certificate', 'ssl', 'dns',
    'load balancer', 'auto-scaling', 'throttle', 'quota', 'uptime',
    'availability', 'reliability', 'flaky build', 'broken build', 'slow build',
  ] },
  { label: 'Integration', keywords: [
    'integration', 'integrate', 'integrated', 'connector', 'connect',
    'api', 'webhook', 'webhook', 'third party', 'third-party', 'external system',
    'external service', 'plugin', 'middleware', 'adapter', 'bridge',
    'data sync', 'sync', 'syncing', 'out of sync', 'kafka', 'rabbitmq',
    'event bus', 'message queue', 'pub/sub', 'pubsub', 'event-driven',
    'rest api', 'graphql', 'grpc', 'soap', 'oauth', 'saml', 'sso',
    'single sign-on', 'payload', 'schema', 'mapping', 'transform', 'etl',
    'data pipeline', 'interoperability', 'compatibility', 'breaking change',
    'salesforce', 'hubspot', 'slack', 'teams', 'servicenow', 'workday',
    'doesn\'t talk to', 'can\'t connect', 'no integration', 'siloed', 'silo',
    'two systems', 'multiple systems', 'disconnected', 'not connected',
  ] },
  { label: 'Customer', keywords: [
    'customer', 'client', 'churn', 'complaint', 'feedback', 'satisfaction',
    'onboard', 'support', 'retention', 'acquisition', 'conversion', 'nps',
    'survey', 'rating', 'help desk', 'service desk', 'sla', 'response time',
    'resolution', 'end user', 'external user', 'drop-off', 'abandonment',
    'renewal', 'account', 'customer success', 'sales', 'demo', 'trial',
    'billing', 'invoice', 'refund', 'escalation', 'user pain', 'user complaint',
    'user confusion', 'user frustration', 'lost customer', 'bad review',
  ] },
  { label: 'Tooling', keywords: [
    'tool', 'tooling', 'ide', 'editor', 'dev tool',
    'local', 'dx', 'cli', 'command line', 'terminal', 'shell', 'makefile',
    'npm', 'yarn', 'pnpm', 'package', 'version manager', 'virtualenv',
    'homebrew', 'setup', 'install', 'configure', 'config', 'dotenv',
    'workspace', 'boilerplate', 'scaffold', 'linter', 'eslint', 'prettier',
    'formatter', 'typecheck', 'test runner', 'jest', 'pytest', 'coverage',
    'debugger', 'local setup', 'dev environment', 'developer experience',
    'slow tests', 'local dev', 'setup time', 'onboarding setup',
  ] },
  { label: 'Eng', keywords: [] },
];

export function inferCategoryLabel(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  for (const cat of PAIN_CATEGORIES) {
    if (cat.keywords.some((kw) => text.includes(kw))) return cat.label;
  }
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return PAIN_CATEGORIES[h % PAIN_CATEGORIES.length].label;
}

// ─── UpvoteButton ─────────────────────────────────────────────────────────────

export function UpvoteButton({ count, voted, onVote, disabled, compact = false }) {
  return (
    <button
      type="button"
      onClick={onVote}
      disabled={disabled}
      aria-label={`Upvote — ${count} votes`}
      className={`flex shrink-0 flex-col items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] px-2 text-cyan-300 transition-colors hover:bg-cyan-400/10 disabled:cursor-not-allowed ${
        compact ? 'w-14 py-2' : 'w-16 py-3'
      }`}
      style={{
        borderColor: voted ? 'rgba(34,211,238,0.45)' : undefined,
        background: voted ? 'rgba(34,211,238,0.12)' : undefined,
      }}
    >
      <div className={`font-semibold leading-none ${compact ? 'text-xl' : 'text-2xl'}`}>{count}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45">Up</div>
    </button>
  );
}

// ─── PainItem ─────────────────────────────────────────────────────────────────

export function PainItem({ pp, onReact, variant = 'default' }) {
  const [reacting, setReacting] = useState(false);
  const [localCount, setLocalCount] = useState(pp.reactionCount || 0);
  const [reacted, setReacted] = useState(pp.hasReacted ?? false);

  const handleVote = async () => {
    if (reacting || reacted) return;
    setReacting(true);
    setLocalCount((c) => c + 1);
    setReacted(true);
    try {
      await onReact(pp._id);
    } catch {
      setLocalCount((c) => c - 1);
      setReacted(false);
    } finally {
      setReacting(false);
    }
  };

  const tagLabel = inferCategoryLabel(pp.title, pp.description);
  const timeAgo = pp._creationTime ? relativeTime(pp._creationTime) : '';
  const authorName = pp.submitterName || 'Anonymous';
  const colour = getCategoryColour(tagLabel);
  const isBoard = variant === 'board';

  return (
    <article
      className={`flex gap-3 border border-white/8 bg-white/[0.03] shadow-[var(--card-inner-edge)] transition ${
        isBoard
          ? 'rounded-[18px] p-3 hover:border-cyan-400/25 hover:bg-white/[0.045]'
          : 'rounded-[24px] p-4 hover:border-cyan-400/20 hover:bg-white/[0.045]'
      }`}
    >
      <UpvoteButton
        count={localCount}
        voted={reacted}
        onVote={handleVote}
        disabled={reacting || reacted}
        compact={isBoard}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
          <span
            className="rounded-full px-2.5 py-1 font-medium"
            style={{ color: colour.text, background: colour.bg }}
          >
            {tagLabel}
          </span>
          <span className="font-medium text-white/75">{authorName}</span>
          {timeAgo && <span>{timeAgo}</span>}
        </div>
        <h3 className={`mt-2 font-medium text-white ${isBoard ? 'text-base' : 'text-lg'}`}>
          {pp.title}
        </h3>
        {pp.description && (
          <p className={`mt-2 line-clamp-2 leading-5 text-white/60 ${isBoard ? 'text-xs' : 'text-sm leading-6'}`}>
            {pp.description}
          </p>
        )}
        {!isBoard && pp.teams?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pp.teams.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 py-0.5 text-xs text-cyan-200"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
