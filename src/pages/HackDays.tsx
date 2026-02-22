/**
 * HackDays Page — Phase 1 hub
 * Lists all HackDay instances (from Supabase) and provides "Create HackDay" deep-link to Confluence.
 */

import { useState, useEffect } from 'react';
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

export default function HackDays() {
  const listEvents = useAction(api.hackdays.listHackDayEvents);
  const getParentUrl = useAction(api.hackdays.getConfluenceParentPageUrl);

  const [events, setEvents] = useState<HackDayEventItem[]>([]);
  const [parentPageUrl, setParentPageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([listEvents(), getParentUrl()])
      .then(([eventList, parentUrl]) => {
        if (cancelled) return;
        setEvents(eventList);
        setParentPageUrl(parentUrl ?? '');
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
  }, [listEvents, getParentUrl]);

  const handleCreateHackDay = () => {
    if (parentPageUrl) {
      window.open(parentPageUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      <SectionHeader
        variant="page"
        title="HackDays"
        description="Create and open HackDay events. Each runs on its own Confluence page."
        action={
          parentPageUrl
            ? {
                label: 'Create HackDay',
                icon: <Plus className="h-4 w-4" />,
                onClick: handleCreateHackDay,
              }
            : undefined
        }
      />

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {error}
          {!parentPageUrl && events.length === 0 && (
            <p className="mt-2 text-xs">
              Ensure Convex env vars are set: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and optionally CONFLUENCE_HDC_PARENT_PAGE_URL for the Create button.
            </p>
          )}
        </div>
      )}

      {!parentPageUrl && !error && (
        <p className="text-sm text-muted-foreground">
          Set CONFLUENCE_HDC_PARENT_PAGE_URL in Convex to show the &quot;Create HackDay&quot; button.
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card animate-pulse rounded-lg border p-4"
              aria-hidden
            >
              <div className="mb-2 h-5 w-3/4 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted" />
              <div className="mt-2 h-4 w-1/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="card rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <Rocket className="mx-auto h-10 w-10 opacity-50" />
          <p className="mt-2 font-medium">No HackDays yet</p>
          <p className="mt-1 text-sm">
            {parentPageUrl
              ? 'Click "Create HackDay" to open Confluence and create your first event.'
              : 'Set CONFLUENCE_HDC_PARENT_PAGE_URL and open that page in Confluence to create a HackDay.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="card rounded-lg border p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight">{event.name}</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {LIFECYCLE_LABELS[event.lifecycleStatus] ?? event.lifecycleStatus}
                </span>
              </div>
              <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
                {event.primaryAdminEmail && (
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{event.primaryAdminEmail}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>{formatDate(event.createdAt)}</span>
                </div>
              </dl>
              <div className="mt-3">
                {event.confluencePageUrl ? (
                  <a
                    href={event.confluencePageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Open in Confluence
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : event.confluencePageId ? (
                  <span className="text-sm text-muted-foreground">
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
