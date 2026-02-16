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
const WIZARD_STORAGE_KEY_PREFIX = 'hdc-create-wizard:';

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface WizardDraftState {
  eventName: string;
  eventIcon: string;
  eventTagline: string;
  primaryAdminEmail: string;
  coAdminsInput: string;
  timezone: string;
  hackingStartsAt: string;
  submissionDeadlineAt: string;
  allowCrossTeamMentoring: boolean;
  maxTeamSize: string;
  requireDemoLink: boolean;
  judgingModel: 'panel' | 'popular_vote' | 'hybrid';
  bannerMessage: string;
  accentColor: string;
  bannerImageUrl: string;
}

function wizardStorageKey(pageId: string): string {
  return `${WIZARD_STORAGE_KEY_PREFIX}${pageId}`;
}

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

function isAdaptavistEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith('@adaptavist.com');
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
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [wizardLoaded, setWizardLoaded] = useState(false);
  const [pendingCreateRequestId, setPendingCreateRequestId] = useState<string | null>(null);
  const [createDraftTimedOut, setCreateDraftTimedOut] = useState(false);
  const [timezone, setTimezone] = useState('Europe/London');
  const [hackingStartsAt, setHackingStartsAt] = useState('');
  const [submissionDeadlineAt, setSubmissionDeadlineAt] = useState('');
  const [allowCrossTeamMentoring, setAllowCrossTeamMentoring] = useState(true);
  const [maxTeamSize, setMaxTeamSize] = useState('6');
  const [requireDemoLink, setRequireDemoLink] = useState(false);
  const [judgingModel, setJudgingModel] = useState<'panel' | 'popular_vote' | 'hybrid'>('hybrid');
  const [bannerMessage, setBannerMessage] = useState('');
  const [accentColor, setAccentColor] = useState('#0f766e');
  const [bannerImageUrl, setBannerImageUrl] = useState('');

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
  const isPrimaryAdmin = Boolean(context?.permissions.isPrimaryAdmin);

  const sortedRegistry = useMemo(
    () => [...(context?.registry ?? [])].sort((a, b) => a.eventName.localeCompare(b.eventName)),
    [context?.registry]
  );

  const wizardDraft = useMemo<WizardDraftState>(
    () => ({
      eventName,
      eventIcon,
      eventTagline,
      primaryAdminEmail,
      coAdminsInput,
      timezone,
      hackingStartsAt,
      submissionDeadlineAt,
      allowCrossTeamMentoring,
      maxTeamSize,
      requireDemoLink,
      judgingModel,
      bannerMessage,
      accentColor,
      bannerImageUrl,
    }),
    [
      accentColor,
      allowCrossTeamMentoring,
      bannerImageUrl,
      bannerMessage,
      coAdminsInput,
      eventIcon,
      eventName,
      eventTagline,
      hackingStartsAt,
      judgingModel,
      maxTeamSize,
      primaryAdminEmail,
      requireDemoLink,
      submissionDeadlineAt,
      timezone,
    ]
  );

  const resetWizard = useCallback(
    (clearSaved: boolean) => {
      setWizardStep(1);
      setEventName('');
      setEventIcon('🚀');
      setEventTagline('');
      setEventNameError('');
      setPrimaryAdminEmail('');
      setCoAdminsInput('');
      setTimezone('Europe/London');
      setHackingStartsAt('');
      setSubmissionDeadlineAt('');
      setAllowCrossTeamMentoring(true);
      setMaxTeamSize('6');
      setRequireDemoLink(false);
      setJudgingModel('hybrid');
      setBannerMessage('');
      setAccentColor('#0f766e');
      setBannerImageUrl('');
      setPendingCreateRequestId(null);
      setCreateDraftTimedOut(false);

      if (clearSaved && context?.pageType === 'parent' && typeof window !== 'undefined') {
        window.localStorage.removeItem(wizardStorageKey(context.pageId));
      }
    },
    [context?.pageId, context?.pageType]
  );

  useEffect(() => {
    if (wizardLoaded) return;
    if (LOCAL_PREVIEW) {
      setWizardLoaded(true);
      return;
    }
    if (!context || context.pageType !== 'parent') return;
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(wizardStorageKey(context.pageId));
    if (!raw) {
      setWizardLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<WizardDraftState>;
      if (typeof parsed.eventName === 'string') setEventName(parsed.eventName);
      if (typeof parsed.eventIcon === 'string' && parsed.eventIcon.trim()) setEventIcon(parsed.eventIcon);
      if (typeof parsed.eventTagline === 'string') setEventTagline(parsed.eventTagline);
      if (typeof parsed.primaryAdminEmail === 'string') setPrimaryAdminEmail(parsed.primaryAdminEmail);
      if (typeof parsed.coAdminsInput === 'string') setCoAdminsInput(parsed.coAdminsInput);
      if (typeof parsed.timezone === 'string' && parsed.timezone.trim()) setTimezone(parsed.timezone);
      if (typeof parsed.hackingStartsAt === 'string') setHackingStartsAt(parsed.hackingStartsAt);
      if (typeof parsed.submissionDeadlineAt === 'string') setSubmissionDeadlineAt(parsed.submissionDeadlineAt);
      if (typeof parsed.allowCrossTeamMentoring === 'boolean') {
        setAllowCrossTeamMentoring(parsed.allowCrossTeamMentoring);
      }
      if (typeof parsed.maxTeamSize === 'string') setMaxTeamSize(parsed.maxTeamSize);
      if (typeof parsed.requireDemoLink === 'boolean') setRequireDemoLink(parsed.requireDemoLink);
      if (parsed.judgingModel === 'panel' || parsed.judgingModel === 'popular_vote' || parsed.judgingModel === 'hybrid') {
        setJudgingModel(parsed.judgingModel);
      }
      if (typeof parsed.bannerMessage === 'string') setBannerMessage(parsed.bannerMessage);
      if (typeof parsed.accentColor === 'string' && parsed.accentColor.trim()) setAccentColor(parsed.accentColor);
      if (typeof parsed.bannerImageUrl === 'string') setBannerImageUrl(parsed.bannerImageUrl);
    } catch {
      window.localStorage.removeItem(wizardStorageKey(context.pageId));
    } finally {
      setWizardLoaded(true);
    }
  }, [context, wizardLoaded]);

  useEffect(() => {
    if (!wizardLoaded) return;
    if (!context || context.pageType !== 'parent') return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(wizardStorageKey(context.pageId), JSON.stringify(wizardDraft));
  }, [context, wizardDraft, wizardLoaded]);

  const goToNextStep = useCallback(() => {
    setError('');
    setEventNameError('');

    if (wizardStep === 1) {
      if (!eventName.trim()) {
        setEventNameError('Event name is required.');
        return;
      }
      if (primaryAdminEmail.trim() && !isAdaptavistEmail(primaryAdminEmail)) {
        setError('Primary admin email must be an @adaptavist.com address.');
        return;
      }
      const invalidCoAdmin = coAdminsInput
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .some((email) => !isAdaptavistEmail(email));
      if (invalidCoAdmin) {
        setError('All co-admin emails must be @adaptavist.com addresses.');
        return;
      }
    }

    if (wizardStep === 2 && hackingStartsAt && submissionDeadlineAt && hackingStartsAt > submissionDeadlineAt) {
      setError('Submission deadline must be after the hacking start time.');
      return;
    }

    setWizardStep((step) => (step < 5 ? ((step + 1) as WizardStep) : step));
  }, [coAdminsInput, eventName, hackingStartsAt, primaryAdminEmail, submissionDeadlineAt, wizardStep]);

  const goToPreviousStep = useCallback(() => {
    setError('');
    setEventNameError('');
    setWizardStep((step) => (step > 1 ? ((step - 1) as WizardStep) : step));
  }, []);

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
        rules: {
          allowCrossTeamMentoring,
          maxTeamSize: Math.max(1, Math.floor(Number(maxTeamSize) || 1)),
          requireDemoLink,
          judgingModel,
        },
        branding: {
          bannerMessage: bannerMessage.trim() || undefined,
          accentColor: accentColor.trim() || undefined,
          bannerImageUrl: bannerImageUrl.trim() || undefined,
        },
      };

      const result = await withTimeout(
        invokeTyped('hdcCreateInstanceDraft', payload),
        CREATE_DRAFT_TIMEOUT_MS,
        `Creation timed out after ${CREATE_DRAFT_TIMEOUT_MS / 1000} seconds.`
      );
      setMessage(`Draft created. Child page id: ${result.childPageId}`);
      setCreateDraftTimedOut(false);
      resetWizard(true);

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
    allowCrossTeamMentoring,
    maxTeamSize,
    requireDemoLink,
    judgingModel,
    bannerMessage,
    accentColor,
    bannerImageUrl,
    hackingStartsAt,
    loadContext,
    pendingCreateRequestId,
    primaryAdminEmail,
    resetWizard,
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

  const handleDeleteDraft = useCallback(async () => {
    if (!context?.event) {
      setError('No instance selected to delete.');
      return;
    }
    if (!isPrimaryAdmin) {
      setError('Only the primary admin can delete this draft.');
      return;
    }
    if (context.event.lifecycleStatus !== 'draft') {
      setError('Only draft instances can be deleted.');
      return;
    }
    if (LOCAL_PREVIEW) {
      setMessage('Local preview mode: draft deletion is disabled.');
      return;
    }
    if (!window.confirm('Delete this draft instance? This cannot be undone.')) {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await invokeTyped('hdcDeleteDraftInstance', { eventId: context.event.id });
      setMessage('Draft deleted.');
      await loadContext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete draft instance.');
    } finally {
      setSaving(false);
    }
  }, [context?.event, isPrimaryAdmin, loadContext]);

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
            <div className="wizard-steps" role="list" aria-label="Create instance steps">
              {[
                ['1', 'Basic'],
                ['2', 'Schedule'],
                ['3', 'Rules'],
                ['4', 'Branding'],
                ['5', 'Review'],
              ].map(([step, label]) => (
                <span
                  key={step}
                  className={`wizard-step ${Number(step) === wizardStep ? 'active' : ''} ${
                    Number(step) < wizardStep ? 'done' : ''
                  }`}
                  role="listitem"
                >
                  {step}. {label}
                </span>
              ))}
            </div>

            <p className="meta">Step {wizardStep} of 5 {wizardLoaded ? '' : '· loading saved draft…'}</p>

            {wizardStep === 1 ? (
              <>
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
              </>
            ) : null}

            {wizardStep === 2 ? (
              <>
                <label>
                  Timezone
                  <input value={timezone} onChange={(event) => setTimezone(event.target.value)} />
                </label>
                <label>
                  Hacking Period Start
                  <input
                    type="datetime-local"
                    value={hackingStartsAt}
                    onChange={(event) => setHackingStartsAt(event.target.value)}
                  />
                </label>
                <label>
                  Submission Deadline
                  <input
                    type="datetime-local"
                    value={submissionDeadlineAt}
                    onChange={(event) => setSubmissionDeadlineAt(event.target.value)}
                  />
                </label>
              </>
            ) : null}

            {wizardStep === 3 ? (
              <>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={allowCrossTeamMentoring}
                    onChange={(event) => setAllowCrossTeamMentoring(event.target.checked)}
                  />
                  Allow cross-team mentoring during hack week
                </label>
                <label>
                  Max Team Size
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={maxTeamSize}
                    onChange={(event) => setMaxTeamSize(event.target.value)}
                  />
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={requireDemoLink} onChange={(event) => setRequireDemoLink(event.target.checked)} />
                  Require demo link on final submission
                </label>
                <label>
                  Judging Model
                  <select value={judgingModel} onChange={(event) => setJudgingModel(event.target.value as 'panel' | 'popular_vote' | 'hybrid')}>
                    <option value="panel">Panel judges</option>
                    <option value="popular_vote">Popular vote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </label>
              </>
            ) : null}

            {wizardStep === 4 ? (
              <>
                <label>
                  Banner Message
                  <input
                    value={bannerMessage}
                    onChange={(event) => setBannerMessage(event.target.value)}
                    placeholder="Build boldly. Share what works."
                  />
                </label>
                <label>
                  Accent Color
                  <input value={accentColor} onChange={(event) => setAccentColor(event.target.value)} placeholder="#0f766e" />
                </label>
                <label>
                  Banner Image URL
                  <input
                    value={bannerImageUrl}
                    onChange={(event) => setBannerImageUrl(event.target.value)}
                    placeholder="https://..."
                  />
                </label>
              </>
            ) : null}

            {wizardStep === 5 ? (
              <section className="review">
                <p>Confirm the draft setup before creating the child page.</p>
                <p><strong>Name:</strong> {eventName || '—'}</p>
                <p><strong>Tagline:</strong> {eventTagline || '—'}</p>
                <p><strong>Admins:</strong> {primaryAdminEmail || 'current user'} {coAdminsInput ? `+ ${coAdminsInput}` : ''}</p>
                <p><strong>Schedule:</strong> {timezone} · {hackingStartsAt || 'start TBD'} → {submissionDeadlineAt || 'deadline TBD'}</p>
                <p>
                  <strong>Rules:</strong> max team size {Math.max(1, Math.floor(Number(maxTeamSize) || 1))},{' '}
                  {allowCrossTeamMentoring ? 'cross-team mentoring on' : 'cross-team mentoring off'}, judging: {judgingModel}
                </p>
                <p><strong>Branding:</strong> {bannerMessage || '—'} · {accentColor || '—'} · {bannerImageUrl || '—'}</p>
              </section>
            ) : null}

            <div className="wizard-actions">
              <button type="button" className="button-muted" disabled={wizardStep === 1 || saving} onClick={goToPreviousStep}>
                Back
              </button>
              <button type="button" className="button-muted" disabled={saving} onClick={() => resetWizard(true)}>
                Reset
              </button>
              {wizardStep < 5 ? (
                <button type="button" disabled={saving} onClick={goToNextStep}>
                  Next
                </button>
              ) : (
                <button disabled={saving || !context.permissions.canCreateInstances} onClick={() => void handleCreateDraft()}>
                  {saving ? 'Creating…' : createDraftTimedOut ? 'Retry Create Draft' : 'Create Draft'}
                </button>
              )}
            </div>
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
            <p>
              Rules: max team size {context.event.rules.maxTeamSize}, judging {context.event.rules.judgingModel},{' '}
              {context.event.rules.allowCrossTeamMentoring ? 'cross-team mentoring on' : 'cross-team mentoring off'}
            </p>
            <p>
              Branding: {context.event.branding.bannerMessage || 'no banner message'} · accent {context.event.branding.accentColor}
            </p>
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
            <button
              disabled={saving || !isPrimaryAdmin || context.event.lifecycleStatus !== 'draft'}
              className="button-danger"
              onClick={() => void handleDeleteDraft()}
            >
              {saving ? 'Deleting…' : 'Delete Draft'}
            </button>
          </article>
        </section>
      ) : null}
    </main>
  );
}
