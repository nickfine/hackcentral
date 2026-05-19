/**
 * Submission Page
 * Project submission form for team captains
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Send,
  Save,
  Check,
  Circle,
  FileText,
  Video,
  Github,
  Globe,
  Users,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import { cn } from '../lib/design-system';
import { Card, Button, Input, TextArea, Badge, Progress, Alert } from './ui';
import { BackButton } from './shared';
import { VStack, HStack } from './layout';
import { EmptyState } from './ui/ErrorState';

// ============================================================================
// SUBMISSION REQUIREMENTS
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
    subtext: 'Submit your pitch as either a YouTube link, Confluence page or Infographic. Video max 3 mins. Less is more.',
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
// SUB-COMPONENTS
// ============================================================================

function ReviewScreen({ formData, onEdit, onConfirm, isSaving }) {
  return (
    <Card padding="lg">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-text-primary mb-1">
          This is what we have from you
        </h2>
        <p className="text-text-secondary">
          This is what you are submitting and will be judged on.
        </p>
      </div>

      <VStack gap="4" className="mb-8">
        {SUBMISSION_FIELDS.map((field) => {
          const value = formData[field.id];
          if (!value) return null;
          return (
            <div
              key={field.id}
              className="border-b border-arena-border pb-4 last:border-0 last:pb-0"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
                {field.label}
              </p>
              {field.type === 'url' ? (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline break-all"
                >
                  {value}
                </a>
              ) : (
                <p className="text-sm text-text-primary whitespace-pre-wrap">{value}</p>
              )}
            </div>
          );
        })}
      </VStack>

      <HStack gap="3">
        <Button
          variant="secondary"
          onClick={onEdit}
          disabled={isSaving}
          leftIcon={<Edit3 className="w-4 h-4" />}
        >
          Edit
        </Button>
        <Button
          onClick={onConfirm}
          loading={isSaving}
          leftIcon={!isSaving ? <Send className="w-4 h-4" /> : undefined}
        >
          Confirm &amp; Submit
        </Button>
      </HStack>
    </Card>
  );
}

function SubmitActions({ onSaveDraft, onSubmitClick, isSaving, canSubmit }) {
  return (
    <HStack gap="2" justify="end">
      <Button
        variant="secondary"
        onClick={onSaveDraft}
        loading={isSaving}
        leftIcon={<Save className="w-4 h-4" />}
      >
        Save Draft
      </Button>
      <Button
        onClick={onSubmitClick}
        disabled={!canSubmit || isSaving}
        leftIcon={<Send className="w-4 h-4" />}
      >
        Review &amp; Submit
      </Button>
    </HStack>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

function Submission({ user, teams = [], onNavigate, onSubmitProject, eventPhase }) {
  const userTeam = useMemo(() => {
    return teams.find(
      (team) => team.captainId === user?.id || team.members?.some((m) => m.id === user?.id)
    );
  }, [teams, user?.id]);

  const isCaptain = userTeam?.captainId === user?.id;

  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    demoVideoUrl: '',
    repoUrl: '',
    liveDemoUrl: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveMessageVariant, setSaveMessageVariant] = useState('success');
  const [errors, setErrors] = useState({});
  const [submissionPageLink, setSubmissionPageLink] = useState({ pageId: null, pageUrl: null });
  const [showReview, setShowReview] = useState(false);

  // Initialise form — auto-populate projectName from team name
  useEffect(() => {
    if (!userTeam) return;
    setFormData({
      projectName: userTeam.submission?.projectName || userTeam.name || '',
      description: userTeam.submission?.description || '',
      demoVideoUrl: userTeam.submission?.demoVideoUrl || '',
      repoUrl: userTeam.submission?.repoUrl || '',
      liveDemoUrl: userTeam.submission?.liveDemoUrl || '',
    });
    if (userTeam.submission) {
      setSubmissionPageLink({
        pageId: userTeam.submission.submissionPageId || null,
        pageUrl: userTeam.submission.submissionPageUrl || null,
      });
    }
  }, [userTeam]);

  const requiredFields = SUBMISSION_FIELDS.filter((f) => f.required);
  const completedRequired = SUBMISSION_FIELDS.filter(
    (f) => f.required && formData[f.id]?.trim()
  );
  const canSubmit = completedRequired.length === requiredFields.length;
  const progressPercent = (completedRequired.length / requiredFields.length) * 100;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const isValidUrl = (url) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateUrls = () => {
    const newErrors = {};
    ['demoVideoUrl', 'repoUrl', 'liveDemoUrl'].forEach((field) => {
      if (formData[field] && !isValidUrl(formData[field])) {
        newErrors[field] = 'Please enter a valid URL';
      }
    });
    return newErrors;
  };

  const handleSaveDraft = async () => {
    if (!userTeam || !isCaptain) return;
    setIsSaving(true);
    setSaveMessage('');
    try {
      const result = await onSubmitProject(userTeam.id, { ...formData, status: 'draft' });
      if (result?.submissionPageId || result?.submissionPageUrl) {
        setSubmissionPageLink({
          pageId: result.submissionPageId || null,
          pageUrl: result.submissionPageUrl || null,
        });
      }
      setSaveMessageVariant('success');
      setSaveMessage('Draft saved!');
    } catch (err) {
      console.error('Failed to save draft:', err);
      setSaveMessageVariant('error');
      setSaveMessage('Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleSubmitClick = () => {
    if (!canSubmit) return;
    const urlErrors = validateUrls();
    if (Object.keys(urlErrors).length > 0) {
      setErrors(urlErrors);
      return;
    }
    setShowReview(true);
  };

  const handleConfirmSubmit = async () => {
    if (!userTeam || !isCaptain) return;
    setIsSaving(true);
    setSaveMessage('');
    try {
      const result = await onSubmitProject(userTeam.id, { ...formData, status: 'submitted' });
      if (result?.submissionPageId || result?.submissionPageUrl) {
        setSubmissionPageLink({
          pageId: result.submissionPageId || null,
          pageUrl: result.submissionPageUrl || null,
        });
      }
      setSaveMessageVariant('success');
      setSaveMessage("Project submitted! Don't forget to vote on hacks tomorrow.");
      setShowReview(false);
    } catch (err) {
      console.error('Failed to submit project:', err);
      setSaveMessageVariant('error');
      setSaveMessage('Failed to submit. Please try again.');
      setShowReview(false);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'submitted':
        return { label: 'Submitted', variant: 'success', icon: CheckCircle2 };
      case 'draft':
        return { label: 'Draft', variant: 'warning', icon: Edit3 };
      default:
        return { label: 'Not Started', variant: 'default', icon: Circle };
    }
  };

  const submissionStatus = userTeam?.submission?.status || 'not_started';
  const statusInfo = getStatusInfo(submissionStatus);
  const StatusIcon = statusInfo.icon;
  const submissionPageHref =
    submissionPageLink.pageUrl ||
    (submissionPageLink.pageId
      ? `/wiki/pages/viewpage.action?pageId=${encodeURIComponent(submissionPageLink.pageId)}`
      : '');

  const isSubmissionPhase = eventPhase === 'hacking' || eventPhase === 'submission';
  if (!isSubmissionPhase) {
    return (
      <div className="p-4 sm:p-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <Card padding="lg" className="max-w-3xl mx-auto mt-6">
          <EmptyState
            icon={Send}
            title="Submissions open during the hack"
            message="Project submission is available when the event reaches the Hacking or Submission phase. Check back then or go to the Dashboard for the current phase."
            action={() => onNavigate('dashboard')}
            actionText="Go to Dashboard"
          />
        </Card>
      </div>
    );
  }

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

  if (!isCaptain) {
    return (
      <div className="p-4 sm:p-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <div className="max-w-2xl mx-auto">
          <Alert variant="info" title="Team Members">
            <p className="mb-2">
              Only team captains can submit projects. Ask{' '}
              <span className="font-bold">{userTeam.captainName || 'your captain'}</span> to handle
              the submission.
            </p>
          </Alert>
          {userTeam.submission && (
            <Card padding="lg" className="mt-6">
              <Card.Title>Current Submission Status</Card.Title>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant={statusInfo.variant}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
              {userTeam.submission.projectName && (
                <p className="text-text-primary font-bold">{userTeam.submission.projectName}</p>
              )}
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Project Submission
            </p>
            <Badge variant={statusInfo.variant}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary mb-2">
            Submission Check
          </h1>
          <p className="text-text-secondary max-w-2xl">
            Submitting for <span className="font-bold">{userTeam.name}</span>
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-text-secondary">Completion Progress</span>
          <span className="text-sm font-mono text-text-muted">
            {completedRequired.length}/{requiredFields.length} required fields
          </span>
        </div>
        <Progress value={progressPercent} variant={canSubmit ? 'success' : 'default'} />
        {saveMessage && (
          <Alert variant={saveMessageVariant} className="mt-4">
            {saveMessage}
          </Alert>
        )}
        {submissionPageHref ? (
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => window.open(submissionPageHref, '_blank', 'noopener,noreferrer')}
            >
              Open submission page
            </Button>
          </div>
        ) : null}
      </Card>

      {/* Review screen or Form */}
      {showReview ? (
        <ReviewScreen
          formData={formData}
          onEdit={() => setShowReview(false)}
          onConfirm={handleConfirmSubmit}
          isSaving={isSaving}
        />
      ) : (
        <Card padding="lg">
          {/* Top CTAs */}
          <div className="mb-6 pb-6 border-b border-arena-border">
            <SubmitActions
              onSaveDraft={handleSaveDraft}
              onSubmitClick={handleSubmitClick}
              isSaving={isSaving}
              canSubmit={canSubmit}
            />
          </div>

          {/* Fields */}
          <VStack gap="6">
            {SUBMISSION_FIELDS.map((field) => {
              const Icon = field.icon;
              const isCompleted = formData[field.id]?.trim();

              return (
                <div key={field.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon
                      className={cn(
                        'w-4 h-4',
                        isCompleted ? 'text-success' : 'text-text-muted'
                      )}
                    />
                    {isCompleted && <Check className="w-4 h-4 text-success" />}
                  </div>
                  {field.type === 'textarea' ? (
                    <TextArea
                      label={field.label}
                      value={formData[field.id]}
                      onChange={(e) => handleChange(field.id, e.target.value)}
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
                      onChange={(e) => handleChange(field.id, e.target.value)}
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

          {/* Bottom CTAs */}
          <div className="mt-8 pt-6 border-t border-arena-border">
            <SubmitActions
              onSaveDraft={handleSaveDraft}
              onSubmitClick={handleSubmitClick}
              isSaving={isSaving}
              canSubmit={canSubmit}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

export default Submission;
