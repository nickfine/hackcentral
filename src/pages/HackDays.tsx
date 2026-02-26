/**
 * HackDays Page
 * Lists all HackDay instances (from Supabase). Create new HackDays via "Create in app".
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAction } from 'convex/react';
import { ExternalLink, Plus, Calendar, User, Rocket } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { HackDayEventItem } from '../../convex/hackdays';
import { SectionHeader } from '@/components/shared';

const LIFECYCLE_LABELS: Record<string, string> = {
  draft: 'Draft',
  registration: 'Registration',
  team_formation: 'Team formation',
  hacking: 'Hacking',
  submission: 'Submission',
  voting: 'Voting',
  judging: 'Judging',
  results: 'Results',
  completed: 'Completed',
  archived: 'Archived',
};

const ACTIVE_LIFECYCLE_STATUSES = new Set([
  'registration',
  'team_formation',
  'hacking',
  'submission',
  'voting',
  'judging',
  'results',
]);

const surfaceCardClass =
  'rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800';
const accentedSurfaceCardClass = `${surfaceCardClass} border-l-2 border-l-teal-500`;
const eventCardClass = `${accentedSurfaceCardClass} p-5 transition-shadow hover:shadow-md`;
const loadingCardClass = `${accentedSurfaceCardClass} p-5 animate-pulse`;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function getLifecycleBadgeClass(status: string): string {
  if (ACTIVE_LIFECYCLE_STATUSES.has(status)) {
    return 'rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300';
  }

  return 'rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200';
}

export default function HackDays() {
  const listEvents = useAction(api.hackdays.listHackDayEvents);

  const [events, setEvents] = useState<HackDayEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listEvents()
      .then((eventList) => {
        if (cancelled) return;
        setEvents(eventList);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load HackDays');
        setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listEvents]);

  return (
    <div className="min-w-0 space-y-6">
      <SectionHeader
        variant="page"
        title="HackDays"
        description="Create and open HackDay events. Each runs on its own Confluence page."
      />

      <div className={`${accentedSurfaceCardClass} p-5`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Manage HackDay events
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Create new HackDays and open each event on its Confluence page.
            </p>
          </div>
          <Link
            to="/hackdays/create"
            className="btn btn-sm btn-primary inline-flex items-center justify-center gap-2 sm:shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Create HackDay
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
          {events.length === 0 && (
            <p className="mt-2 text-xs">
              Ensure Convex env vars are set: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={loadingCardClass}
              aria-hidden
            >
              <div className="mb-3 h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="mt-4 h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <Rocket className="mx-auto h-10 w-10 text-teal-600/80 dark:text-teal-500/80" />
          <p className="mt-3 font-semibold text-gray-900 dark:text-gray-100">
            No HackDays yet
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Click &quot;Create HackDay&quot; above to create your first event.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className={eventCardClass}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold leading-tight text-gray-900 dark:text-gray-100">
                  {event.name}
                </h3>
                <span className={getLifecycleBadgeClass(event.lifecycleStatus)}>
                  {LIFECYCLE_LABELS[event.lifecycleStatus] ?? event.lifecycleStatus}
                </span>
              </div>
              <dl className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {event.primaryAdminEmail && (
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-500" />
                    <span className="truncate">{event.primaryAdminEmail}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-500" />
                  <span>{formatDate(event.createdAt)}</span>
                </div>
              </dl>
              <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
                {event.confluencePageUrl ? (
                  <a
                    href={event.confluencePageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline dark:text-teal-300"
                  >
                    Open in Confluence
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : event.confluencePageId ? (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page ID: {event.confluencePageId}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
