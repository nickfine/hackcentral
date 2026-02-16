import { useCallback, useEffect, useMemo, useState } from 'react';
import { invoke, router, view } from '@forge/bridge';
import type {
  CreateInstanceDraftInput,
  Defs,
  EventRegistryItem,
  HdcContextResponse,
  SyncResult,
} from './types';

const LOCAL_PREVIEW = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const CREATE_DRAFT_TIMEOUT_MS = 15_000;
const DUPLICATE_EVENT_NAME_ERROR = 'Event name must be unique under this HackDay Central parent page.';

const LOCAL_CONTEXT: HdcContextResponse = {
  pageType: 'parent',
  pageId: 'local-parent-page',
  event: null,
  registry: [],
  syncState: null,
  permissions: {
    canCreateInstances: true,
    isPrimaryAdmin: true,
    isCoAdmin: false,
  },
};

class RequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestTimeoutError';
  }
}

function isRequestTimeoutError(error: unknown): error is RequestTimeoutError {
  return error instanceof RequestTimeoutError;
}

function isDuplicateEventNameError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes(DUPLICATE_EVENT_NAME_ERROR);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new RequestTimeoutError(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

async function invokeTyped<K extends keyof Defs>(
  name: K,
  payload: Parameters<Defs[K]>[0]
): Promise<ReturnType<Defs[K]>> {
  return invoke(name as string, payload) as Promise<ReturnType<Defs[K]>>;
}

function formatLifecycle(status: EventRegistryItem['lifecycleStatus']): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function App(): JSX.Element {
  const [context, setContext] = useState<HdcContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [eventName, setEventName] = useState('');
  const [eventIcon, setEventIcon] = useState('🚀');
  const [eventTagline, setEventTagline] = useState('');
  const [eventNameError, setEventNameError] = useState('');
  const [primaryAdminEmail, setPrimaryAdminEmail] = useState('');
  const [coAdminsInput, setCoAdminsInput] = useState('');
  const [pendingCreateRequestId, setPendingCreateRequestId] = useState<string | null>(null);
  const [createDraftTimedOut, setCreateDraftTimedOut] = useState(false);
  const [timezone, setTimezone] = useState('Europe/London');
  const [hackingStartsAt, setHackingStartsAt] = useState('');
  const [submissionDeadlineAt, setSubmissionDeadlineAt] = useState('');

  const [hackTitle, setHackTitle] = useState('');
  const [hackDescription, setHackDescription] = useState('');

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (LOCAL_PREVIEW) {
        setContext(LOCAL_CONTEXT);
        return;
      }

      const bridgeContext = await view.getContext();
      const pageId = String(
        bridgeContext?.extension?.content?.id ??
          bridgeContext?.extension?.page?.id ??
          bridgeContext?.extension?.id ??
          ''
      );

      if (!pageId) {
        throw new Error('Could not determine Confluence page id from macro context.');
      }

      const payload = await invokeTyped('hdcGetContext', { pageId });
      setContext(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load macro context.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const canAdminInstance = Boolean(context?.permissions.isPrimaryAdmin || context?.permissions.isCoAdmin);

  const sortedRegistry = useMemo(
    () => [...(context?.registry ?? [])].sort((a, b) => a.eventName.localeCompare(b.eventName)),
    [context?.registry]
  );

  const handleCreateDraft = useCallback(async () => {
    if (!context || !eventName.trim()) {
      setEventNameError('Event name is required.');
      setError('Event name is required.');
      return;
    }
    if (LOCAL_PREVIEW) {
      setMessage('Local preview mode: create draft is disabled.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    setEventNameError('');

    const requestId = pendingCreateRequestId || crypto.randomUUID();
    if (!pendingCreateRequestId) {
      setPendingCreateRequestId(requestId);
    }

    try {
      const normalizedPrimaryAdminEmail = primaryAdminEmail.trim().toLowerCase();
      const coAdminEmails = coAdminsInput
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0);

      const payload: CreateInstanceDraftInput = {
        parentPageId: context.pageId,
        creationRequestId: requestId,
        basicInfo: {
          eventName: eventName.trim(),
          eventIcon: eventIcon || '🚀',
          eventTagline: eventTagline.trim() || undefined,
          primaryAdminEmail: normalizedPrimaryAdminEmail || undefined,
          coAdminEmails: coAdminEmails.length > 0 ? coAdminEmails : undefined,
        },
        schedule: {
          timezone,
          hackingStartsAt: hackingStartsAt || undefined,
          submissionDeadlineAt: submissionDeadlineAt || undefined,
        },
      };

      const result = await withTimeout(
        invokeTyped('hdcCreateInstanceDraft', payload),
        CREATE_DRAFT_TIMEOUT_MS,
        `Creation timed out after ${CREATE_DRAFT_TIMEOUT_MS / 1000} seconds.`
      );
      setMessage(`Draft created. Child page id: ${result.childPageId}`);
      setCreateDraftTimedOut(false);
      setPendingCreateRequestId(null);
      setEventName('');
      setEventTagline('');
      setPrimaryAdminEmail('');
      setCoAdminsInput('');

      if (result.childPageUrl) {
        setMessage('Draft created. Redirecting to the child page…');
        try {
          await router.navigate(result.childPageUrl);
          return;
        } catch {
          window.location.assign(result.childPageUrl);
          return;
        }
      }

      await loadContext();
    } catch (err) {
      if (isRequestTimeoutError(err)) {
        setCreateDraftTimedOut(true);
        setMessage(
          `Creation is taking longer than ${CREATE_DRAFT_TIMEOUT_MS / 1000} seconds. Retry to continue with the same request id.`
        );
        return;
      }
      if (isDuplicateEventNameError(err)) {
        setEventNameError('An instance with this name already exists under this parent page.');
        setPendingCreateRequestId(null);
        setCreateDraftTimedOut(false);
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to create draft instance.');
    } finally {
      setSaving(false);
    }
  }, [
    coAdminsInput,
    context,
    eventIcon,
    eventName,
    eventTagline,
    hackingStartsAt,
    loadContext,
    pendingCreateRequestId,
    primaryAdminEmail,
    submissionDeadlineAt,
    timezone,
  ]);

  const handleSubmitHack = useCallback(async () => {
    if (!context?.event) {
      setError('No instance context available for hack submission.');
      return;
    }
    if (!hackTitle.trim()) {
      setError('Hack title is required.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await invokeTyped('hdcSubmitHack', {
        eventId: context.event.id,
        title: hackTitle.trim(),
        description: hackDescription.trim() || undefined,
      });
      setMessage(`Hack submitted as project ${result.projectId}.`);
      setHackTitle('');
      setHackDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit hack.');
    } finally {
      setSaving(false);
    }
  }, [context?.event, hackDescription, hackTitle]);

  const runSync = useCallback(
    async (mode: 'complete' | 'retry') => {
      if (!context?.event) {
        setError('No instance selected for sync.');
        return;
      }

      setSaving(true);
      setError('');
      setMessage('');

      try {
        const result: SyncResult = await invokeTyped(
          mode === 'complete' ? 'hdcCompleteAndSync' : 'hdcRetrySync',
          { eventId: context.event.id }
        );
        setMessage(
          `Sync status: ${result.syncStatus}. Pushed: ${result.pushedCount}, skipped: ${result.skippedCount}.`
        );
        await loadContext();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sync failed.');
      } finally {
        setSaving(false);
      }
    },
    [context?.event, loadContext]
  );

  const handleLaunch = useCallback(async () => {
    if (!context?.event) {
      setError('No instance selected to launch.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await invokeTyped('hdcLaunchInstance', { eventId: context.event.id });
      setMessage(`Instance lifecycle updated to ${result.lifecycleStatus}.`);
      await loadContext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch instance.');
    } finally {
      setSaving(false);
    }
  }, [context?.event, loadContext]);

  if (loading) {
    return <main className="shell">Loading HackDay Central macro…</main>;
  }

  if (!context) {
    return <main className="shell error">{error || 'No context returned.'}</main>;
  }

  return (
    <main className="shell">
      <header className="top">
        <h1>HackDay Central</h1>
        <p>{context.pageType === 'parent' ? 'Parent page mode' : 'Instance page mode'}</p>
      </header>

      {LOCAL_PREVIEW ? <section className="note">Local preview mode: resolver calls are disabled.</section> : null}
      {message ? <section className="note success">{message}</section> : null}
      {error ? <section className="note error">{error}</section> : null}

      {context.pageType === 'parent' ? (
        <section className="grid">
          <article className="card">
            <h2>Create HackDay instance</h2>
            <label>
              Event Name
              <input
                className={eventNameError ? 'input-error' : ''}
                value={eventName}
                onChange={(event) => {
                  setEventName(event.target.value);
                  if (eventNameError) {
                    setEventNameError('');
                  }
                }}
                placeholder="Winter 2026 Innovation Sprint"
              />
            </label>
            {eventNameError ? <p className="field-error">{eventNameError}</p> : null}
            <label>
              Event Icon
              <input value={eventIcon} onChange={(event) => setEventIcon(event.target.value)} placeholder="🚀" />
            </label>
            <label>
              Primary Admin Email
              <input
                type="email"
                value={primaryAdminEmail}
                onChange={(event) => setPrimaryAdminEmail(event.target.value)}
                placeholder="Defaults to current @adaptavist.com user"
              />
            </label>
            <label>
              Co-Admin Emails
              <input
                value={coAdminsInput}
                onChange={(event) => setCoAdminsInput(event.target.value)}
                placeholder="Comma-separated @adaptavist.com emails"
              />
            </label>
            <label>
              Tagline
              <input
                value={eventTagline}
                onChange={(event) => setEventTagline(event.target.value)}
                placeholder="Optional mission statement"
              />
            </label>
            <label>
              Timezone
              <input value={timezone} onChange={(event) => setTimezone(event.target.value)} />
            </label>
            <label>
              Hacking Period Start
              <input type="datetime-local" value={hackingStartsAt} onChange={(event) => setHackingStartsAt(event.target.value)} />
            </label>
            <label>
              Submission Deadline
              <input
                type="datetime-local"
                value={submissionDeadlineAt}
                onChange={(event) => setSubmissionDeadlineAt(event.target.value)}
              />
            </label>
            <button disabled={saving || !context.permissions.canCreateInstances} onClick={() => void handleCreateDraft()}>
              {saving ? 'Creating…' : createDraftTimedOut ? 'Retry Create Draft' : 'Create Draft'}
            </button>
            {pendingCreateRequestId ? <p className="meta">Request ID: {pendingCreateRequestId}</p> : null}
          </article>

          <article className="card">
            <h2>Registry</h2>
            {sortedRegistry.length === 0 ? (
              <p>No instances yet.</p>
            ) : (
              <ul className="registry">
                {sortedRegistry.map((item) => (
                  <li key={item.id}>
                    <strong>
                      {item.icon} {item.eventName}
                    </strong>
                    <span>{formatLifecycle(item.lifecycleStatus)}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      ) : null}

      {context.pageType === 'instance' && context.event ? (
        <section className="grid">
          <article className="card">
            <h2>
              {context.event.icon} {context.event.eventName}
            </h2>
            <p>Status: {formatLifecycle(context.event.lifecycleStatus)}</p>
            <p>{context.event.tagline || 'No tagline provided.'}</p>

            <h3>Submit Hack</h3>
            <label>
              Title
              <input value={hackTitle} onChange={(event) => setHackTitle(event.target.value)} placeholder="Meeting Notes Summarizer" />
            </label>
            <label>
              Description
              <textarea
                value={hackDescription}
                onChange={(event) => setHackDescription(event.target.value)}
                placeholder="What does this hack solve?"
              />
            </label>
            <button disabled={saving} onClick={() => void handleSubmitHack()}>
              {saving ? 'Submitting…' : 'Submit Hack'}
            </button>
          </article>

          <article className="card">
            <h2>Instance Admin</h2>
            <p>Sync status: {context.syncState?.syncStatus || 'not_started'}</p>
            <p>
              Last run: {context.syncState?.lastAttemptAt || 'never'} | Pushed: {context.syncState?.pushedCount || 0} |
              Skipped: {context.syncState?.skippedCount || 0}
            </p>
            <button disabled={saving || !canAdminInstance} onClick={() => void handleLaunch()}>
              {saving ? 'Updating…' : 'Launch Instance'}
            </button>
            <button disabled={saving || !canAdminInstance} onClick={() => void runSync('complete')}>
              {saving ? 'Syncing…' : 'Complete + Sync'}
            </button>
            <button disabled={saving || !canAdminInstance} onClick={() => void runSync('retry')}>
              {saving ? 'Retrying…' : 'Retry Sync'}
            </button>
          </article>
        </section>
      ) : null}
    </main>
  );
}
