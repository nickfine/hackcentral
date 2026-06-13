/**
 * Submission Page
 * Two states: EDITING (form) and SUBMITTED (read-only summary).
 * Countdown timer to submission deadline.
 * Auto-save on change (debounced 2s, draft only).
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  Check,
  CheckCircle2,
  FileText,
  Video,
  Github,
  Globe,
  Users,
  Edit3,
  ExternalLink,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../lib/design-system';
import { Card, Button, Input, TextArea, Alert } from './ui';
import { BackButton } from './shared';
import { VStack, HStack } from './layout';
import { EmptyState } from './ui/ErrorState';

// ============================================================================
// FIELDS CONFIG
// ============================================================================

const SUBMISSION_FIELDS = [
  {
    id: 'projectName',
    label: 'Project Name',
    required: true,
    icon: FileText,
    type: 'text',
    subtext: 'The name of your project — pre-filled from your team name.',
  },
  {
    id: 'description',
    label: 'Project Description',
    required: true,
    icon: FileText,
    type: 'textarea',
    subtext: 'A short summary of what you built, the problem it solves and how.',
  },
  {
    id: 'demoVideoUrl',
    label: 'Pitch',
    required: true,
    icon: Video,
    type: 'url',
    placeholder: 'https://youtube.com/...',
    subtext: 'Submit your pitch as a YouTube link, Confluence page or Infographic. Video max 3 mins.',
  },
  {
    id: 'repoUrl',
    label: 'Repository URL',
    required: false,
    icon: Github,
    type: 'url',
    placeholder: 'https://github.com/...',
    subtext: 'Link to your code repository — optional but useful for technical judges.',
  },
  {
    id: 'liveDemoUrl',
    label: 'Live Demo URL',
    required: false,
    icon: Globe,
    type: 'url',
    placeholder: 'https://your-project.com',
    subtext: 'A working link to your project if it is hosted anywhere.',
  },
];

// ============================================================================
// DEADLINE COUNTDOWN
// ============================================================================

function getTimeLeft(deadlineIso) {
  if (!deadlineIso) return null;
  const diff = new Date(deadlineIso).getTime() - Date.now();
  if (diff <= 0) return { expired: true, diff: 0 };
  const totalSeconds = Math.floor(diff / 1000);
  return {
    expired: false,
    diff,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function useCountdown(deadlineIso) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(deadlineIso));
  useEffect(() => {
    if (!deadlineIso) return;
    const id = setInterval(() => setTimeLeft(getTimeLeft(deadlineIso)), 1000);
    return () => clearInterval(id);
  }, [deadlineIso]);
  return timeLeft;
}

function DeadlineCountdown({ deadlineIso }) {
  const timeLeft = useCountdown(deadlineIso);
  if (!deadlineIso || !timeLeft) return null;

  if (timeLeft.expired) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 mb-6 rounded-card bg-error/15 border border-error/30 text-error text-sm font-bold">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        Submissions are closed
      </div>
    );
  }

  const isUrgent = timeLeft.diff < 2 * 60 * 60 * 1000;
  const isWarning = timeLeft.diff < 24 * 60 * 60 * 1000;

  const parts = [];
  if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`);
  if (timeLeft.hours > 0 || timeLeft.days > 0) parts.push(`${timeLeft.hours}h`);
  parts.push(`${String(timeLeft.minutes).padStart(2, '0')}m`);
  if (isUrgent) parts.push(`${String(timeLeft.seconds).padStart(2, '0')}s`);

  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-3 mb-6 rounded-card border text-sm font-medium',
      isUrgent  ? 'bg-error/15 border-error/30 text-error' :
      isWarning ? 'bg-warning/15 border-warning/30 text-warning' :
                  'bg-arena-card border-arena-border text-text-secondary'
    )}>
      <Clock className="w-4 h-4 flex-shrink-0" />
      <span>
        Submissions close in{' '}
        <span className="font-black font-mono">{parts.join(' ')}</span>
      </span>
    </div>
  );
}

// ============================================================================
// SUBMITTED VIEW (read-only summary)
// ============================================================================

function SubmittedView({ formData, submissionPageHref, onEdit, isDeadlineExpired, deadlineIso, votingOpensAt }) {
  const timeLeft = useCountdown(deadlineIso);

  const countdownLabel = (() => {
    if (!timeLeft || timeLeft.expired) return null;
    const parts = [];
    if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`);
    if (timeLeft.hours > 0 || timeLeft.days > 0) parts.push(`${timeLeft.hours}h`);
    parts.push(`${String(timeLeft.minutes).padStart(2, '0')}m`);
    if (timeLeft.diff < 2 * 60 * 60 * 1000) parts.push(`${String(timeLeft.seconds).padStart(2, '0')}s`);
    return parts.join(' ');
  })();

  return (
    <div>
      {/* Status header — countdown lives inside here */}
      <div className="flex items-center gap-3 mb-6 p-5 rounded-card bg-green-500/20 border-2 border-green-500/40">
        <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-lg font-black text-green-700 dark:text-green-300">Submitted</p>
          <p className="text-sm text-green-600 dark:text-green-400">
            {isDeadlineExpired
              ? 'Submissions are now closed.'
              : countdownLabel
              ? <><span className="font-black font-mono">{countdownLabel}</span> until the deadline.</>
              : 'You can still edit until the deadline.'}
          </p>
        </div>
        {!isDeadlineExpired && onEdit && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onEdit}
            leftIcon={<Edit3 className="w-3 h-3" />}
          >
            Edit
          </Button>
        )}
      </div>

      {/* Summary */}
      <Card padding="lg" className="mb-4">
        <VStack gap="4">
          {SUBMISSION_FIELDS.map((field) => {
            const value = formData[field.id];
            if (!value) return null;
            return (
              <div key={field.id} className="border-b border-arena-border pb-4 last:border-0 last:pb-0">
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
                  {field.label}
                </p>
                {field.type === 'url' ? (
                  <button
                    type="button"
                    onClick={() => window.open(value, '_blank', 'noopener,noreferrer')}
                    className="text-sm text-blue-500 hover:underline break-all inline-flex items-center gap-1 text-left"
                  >
                    {value}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </button>
                ) : (
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{value}</p>
                )}
              </div>
            );
          })}
        </VStack>
      </Card>

      {/* Confluence link */}
      {submissionPageHref && (
        <div className="mb-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open(submissionPageHref, '_blank', 'noopener,noreferrer')}
            leftIcon={<ExternalLink className="w-3 h-3" />}
          >
            View submission page
          </Button>
        </div>
      )}

      {/* Voting nudge */}
      {votingOpensAt && !isDeadlineExpired && (
        <p className="text-sm text-text-muted">
          Voting opens{' '}
          {new Date(votingOpensAt).toLocaleDateString('en-GB', {
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/London',
          })}
          .
        </p>
      )}
    </div>
  );
}

// ============================================================================
// SUBMISSION FORM
// ============================================================================

function SubmissionForm({ formData, onChange, errors, isSaving, canSubmit, isDeadlineExpired, autoSaveStatus, onSubmit, onCancel, isEditingSubmitted }) {
  return (
    <Card padding="lg">
      <VStack gap="6">
        {SUBMISSION_FIELDS.map((field) => {
          const Icon = field.icon;
          const isCompleted = Boolean(formData[field.id]?.trim());
          return (
            <div key={field.id}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn('w-4 h-4', isCompleted ? 'text-green-600 dark:text-green-400' : 'text-text-muted')} />
                {isCompleted && <Check className="w-4 h-4 text-green-600 dark:text-green-400" />}
              </div>
              {field.type === 'textarea' ? (
                <TextArea
                  label={field.label}
                  value={formData[field.id]}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  required={field.required}
                  rows={4}
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                  error={errors[field.id]}
                />
              ) : (
                <Input
                  label={field.label}
                  type={field.type}
                  value={formData[field.id]}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  required={field.required}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                  error={errors[field.id]}
                />
              )}
              {field.subtext && (
                <p className="mt-1 text-xs text-text-muted">{field.subtext}</p>
              )}
            </div>
          );
        })}
      </VStack>

      <div className="mt-8 pt-6 border-t border-arena-border">
        <HStack justify="between" align="center">
          <span className="text-xs text-text-muted font-medium min-w-[60px]">
            {autoSaveStatus === 'saving' && 'Saving…'}
            {autoSaveStatus === 'saved'  && '✓ Saved'}
          </span>
          <HStack gap="3">
            {onCancel && (
              <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
            )}
            <Button
              onClick={onSubmit}
              disabled={!canSubmit || isSaving || isDeadlineExpired}
              loading={isSaving}
              leftIcon={!isSaving ? <Send className="w-4 h-4" /> : undefined}
            >
              {isEditingSubmitted ? 'Update submission' : 'Submit'}
            </Button>
          </HStack>
        </HStack>
      </div>
    </Card>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

function Submission({ user, teams = [], onNavigate, onSubmitProject, eventPhase, eventMeta }) {
  const userTeam = useMemo(() => (
    teams.find((t) => t.captainId === user?.id || t.members?.some((m) => m.id === user?.id))
  ), [teams, user?.id]);

  const isCaptain = userTeam?.captainId === user?.id;

  const submissionDeadline = eventMeta?.schedule?.submissionDeadlineAt ?? null;
  const votingOpensAt = eventMeta?.schedule?.customEvents?.find(
    (e) => e.signal === 'start' && e.name?.toLowerCase().includes('voting')
  )?.timestamp ?? null;

  const [formData, setFormData] = useState({
    projectName: '', description: '', demoVideoUrl: '', repoUrl: '', liveDemoUrl: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submissionPageLink, setSubmissionPageLink] = useState({ pageId: null, pageUrl: null });

  const autoSaveTimerRef = useRef(null);
  const lastSavedRef = useRef(null);
  const initDoneRef = useRef(false);
  const submittedSnapshotRef = useRef(null); // form data at last successful submit (for Cancel)

  // Initialise form from existing submission
  useEffect(() => {
    if (!userTeam) return;
    const data = {
      projectName: userTeam.submission?.projectName || userTeam.name || '',
      description:  userTeam.submission?.description  || '',
      demoVideoUrl: userTeam.submission?.demoVideoUrl  || '',
      repoUrl:      userTeam.submission?.repoUrl       || '',
      liveDemoUrl:  userTeam.submission?.liveDemoUrl   || '',
    };
    setFormData(data);
    lastSavedRef.current = data;
    if (userTeam.submission?.status === 'submitted') {
      submittedSnapshotRef.current = data;
    }
    if (userTeam.submission) {
      setSubmissionPageLink({
        pageId: userTeam.submission.submissionPageId ?? null,
        pageUrl: userTeam.submission.submissionPageUrl ?? null,
      });
    }
    initDoneRef.current = true;
  }, [userTeam?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submissionStatus = userTeam?.submission?.status ?? 'not_started';
  const isSubmitted = submissionStatus === 'submitted' && !isEditing;
  const isEditingSubmitted = isEditing && submittedSnapshotRef.current !== null;

  // Auto-save (debounced 2s, draft-only — not while editing a submitted submission)
  useEffect(() => {
    if (!initDoneRef.current || !isCaptain || !userTeam || isEditingSubmitted) return;
    if (submissionStatus === 'submitted') return;

    const dataStr = JSON.stringify(formData);
    if (dataStr === JSON.stringify(lastSavedRef.current)) return;
    if (!Object.values(formData).some((v) => v?.trim())) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus('');

    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        const result = await onSubmitProject(userTeam.id, { ...formData, status: 'draft' });
        if (result?.submissionPageId || result?.submissionPageUrl) {
          setSubmissionPageLink({
            pageId: result.submissionPageId ?? null,
            pageUrl: result.submissionPageUrl ?? null,
          });
        }
        lastSavedRef.current = { ...formData };
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(''), 3000);
      } catch {
        setAutoSaveStatus('');
      }
    }, 2000);

    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [formData]); // eslint-disable-line react-hooks/exhaustive-deps

  const deadlineExpired = (getTimeLeft(submissionDeadline)?.expired) ?? false;

  const requiredFields = SUBMISSION_FIELDS.filter((f) => f.required);
  const completedRequired = SUBMISSION_FIELDS.filter((f) => f.required && formData[f.id]?.trim());
  const canSubmit = completedRequired.length === requiredFields.length;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validateUrls = () => {
    const newErrors = {};
    ['demoVideoUrl', 'repoUrl', 'liveDemoUrl'].forEach((field) => {
      if (!formData[field]) return;
      try { new URL(formData[field]); }
      catch { newErrors[field] = 'Please enter a valid URL'; }
    });
    return newErrors;
  };

  const handleSubmit = async () => {
    if (!userTeam || !isCaptain || !canSubmit) return;
    const urlErrors = validateUrls();
    if (Object.keys(urlErrors).length > 0) { setErrors(urlErrors); return; }

    setIsSaving(true);
    setSubmitError('');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    try {
      const result = await onSubmitProject(userTeam.id, { ...formData, status: 'submitted' });
      if (result?.submissionPageId || result?.submissionPageUrl) {
        setSubmissionPageLink({
          pageId: result.submissionPageId ?? null,
          pageUrl: result.submissionPageUrl ?? null,
        });
      }
      lastSavedRef.current = { ...formData };
      submittedSnapshotRef.current = { ...formData };
      setIsEditing(false);
    } catch {
      setSubmitError('Failed to submit. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Restore form to the last submitted snapshot
    if (submittedSnapshotRef.current) {
      setFormData(submittedSnapshotRef.current);
      lastSavedRef.current = submittedSnapshotRef.current;
    }
    setErrors({});
    setSubmitError('');
    setIsEditing(false);
  };

  const submissionPageHref =
    submissionPageLink.pageUrl ||
    (submissionPageLink.pageId
      ? `/wiki/pages/viewpage.action?pageId=${encodeURIComponent(submissionPageLink.pageId)}`
      : '');

  // ---- Guard: wrong phase ----
  const isSubmissionPhase = eventPhase === 'hacking' || eventPhase === 'submission';
  if (!isSubmissionPhase) {
    return (
      <div className="p-4 sm:p-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <Card padding="lg" className="max-w-3xl mx-auto mt-6">
          <EmptyState
            icon={Send}
            title="Submissions open during the hack"
            message="Project submission is available when the event reaches the Hacking or Submission phase."
            action={() => onNavigate('dashboard')}
            actionText="Go to Dashboard"
          />
        </Card>
      </div>
    );
  }

  // ---- Guard: no team ----
  if (!userTeam) {
    return (
      <div className="p-4 sm:p-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <Card padding="lg" className="max-w-3xl mx-auto mt-6">
          <EmptyState
            icon={Users}
            title="No Team Yet"
            message="You need to join or create a team before you can submit a project."
            action={() => onNavigate('marketplace')}
            actionText="Browse Ideas"
          />
        </Card>
      </div>
    );
  }

  // ---- Non-captain view ----
  if (!isCaptain) {
    const isTeamSubmitted = submissionStatus === 'submitted';
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
            Project Submission
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary mb-6">
            {userTeam.name}
          </h1>
          {isTeamSubmitted ? (
            <SubmittedView
              formData={formData}
              submissionPageHref={submissionPageHref}
              onEdit={null}
              isDeadlineExpired={deadlineExpired}
              deadlineIso={submissionDeadline}
              votingOpensAt={votingOpensAt}
            />
          ) : (
            <>
              <DeadlineCountdown deadlineIso={submissionDeadline} />
              <Alert variant="info">
                <p>
                  Only the team captain can submit.{' '}
                  {userTeam.captainName && (
                    <span>Ask <span className="font-bold">{userTeam.captainName}</span> to handle it.</span>
                  )}
                </p>
                {submissionStatus === 'draft' && (
                  <p className="mt-1 text-xs opacity-80">
                    Draft in progress — {completedRequired.length}/{requiredFields.length} required fields complete.
                  </p>
                )}
              </Alert>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- Captain view ----
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
      <div className="mt-4 mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
          Project Submission · {userTeam.name}
        </p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary">
          {isSubmitted ? "You're in" : 'Submit your hack'}
        </h1>
      </div>

      {isSubmitted ? (
        <SubmittedView
          formData={formData}
          submissionPageHref={submissionPageHref}
          onEdit={() => setIsEditing(true)}
          isDeadlineExpired={deadlineExpired}
          deadlineIso={submissionDeadline}
          votingOpensAt={votingOpensAt}
        />
      ) : (
        <>
          <DeadlineCountdown deadlineIso={submissionDeadline} />
          <SubmissionForm
            formData={formData}
            onChange={handleChange}
            errors={errors}
            isSaving={isSaving}
            canSubmit={canSubmit}
            isDeadlineExpired={deadlineExpired}
            autoSaveStatus={autoSaveStatus}
            onSubmit={handleSubmit}
            onCancel={isEditingSubmitted ? handleCancelEdit : null}
            isEditingSubmitted={isEditingSubmitted}
          />
          {submitError && (
            <Alert variant="error" className="mt-3">{submitError}</Alert>
          )}
        </>
      )}
    </div>
  );
}

export default Submission;
