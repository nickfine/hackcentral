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
  AlertCircle,
  FileText,
  Video,
  Github,
  Globe,
  Clock,
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
  { id: 'projectName', label: 'Project Name', required: true, icon: FileText, type: 'text' },
  { id: 'description', label: 'Project Description', required: true, icon: FileText, type: 'textarea' },
  { id: 'demoVideoUrl', label: 'Demo Video URL', required: true, icon: Video, type: 'url', placeholder: 'https://youtube.com/...' },
  { id: 'repoUrl', label: 'Repository URL', required: true, icon: Github, type: 'url', placeholder: 'https://github.com/...' },
  { id: 'liveDemoUrl', label: 'Live Demo URL', required: false, icon: Globe, type: 'url', placeholder: 'https://your-project.com' },
];

// ============================================================================
// COMPONENT
// ============================================================================

function Submission({ user, teams = [], onNavigate, onSubmitProject, eventPhase }) {
  // Find the user's team (as captain or member)
  const userTeam = useMemo(() => {
    return teams.find(
      (team) => team.captainId === user?.id || team.members?.some((m) => m.id === user?.id)
    );
  }, [teams, user?.id]);
  
  const isCaptain = userTeam?.captainId === user?.id;
  
  // Form state
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    demoVideoUrl: '',
    repoUrl: '',
    liveDemoUrl: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [errors, setErrors] = useState({});

  // Initialize form with existing submission data
  useEffect(() => {
    if (userTeam?.submission) {
      setFormData({
        projectName: userTeam.submission.projectName || '',
        description: userTeam.submission.description || '',
        demoVideoUrl: userTeam.submission.demoVideoUrl || '',
        repoUrl: userTeam.submission.repoUrl || '',
        liveDemoUrl: userTeam.submission.liveDemoUrl || '',
      });
    }
  }, [userTeam]);

  // Calculate completion status
  const getCompletedFields = () => {
    return SUBMISSION_FIELDS.filter((field) => {
      const value = formData[field.id];
      return value && value.trim() !== '';
    });
  };

  const getRequiredFields = () => SUBMISSION_FIELDS.filter((f) => f.required);
  const completedFields = getCompletedFields();
  const requiredFields = getRequiredFields();
  const completedRequired = completedFields.filter((f) => f.required);
  const canSubmit = completedRequired.length === requiredFields.length;
  const progressPercent = (completedRequired.length / requiredFields.length) * 100;

  // Handle form changes
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Validate URL
  const isValidUrl = (url) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!userTeam || !isCaptain) return;
    setIsSaving(true);
    setSaveMessage('');
    try {
      await onSubmitProject(userTeam.id, { ...formData, status: 'draft' });
      setSaveMessage('Draft saved!');
    } catch (err) {
      console.error('Failed to save draft:', err);
      setSaveMessage('Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Submit project
  const handleSubmit = async () => {
    if (!userTeam || !isCaptain || !canSubmit) return;

    // Validate URLs
    const newErrors = {};
    ['demoVideoUrl', 'repoUrl', 'liveDemoUrl'].forEach((field) => {
      if (formData[field] && !isValidUrl(formData[field])) {
        newErrors[field] = 'Please enter a valid URL';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    setSaveMessage('');
    try {
      await onSubmitProject(userTeam.id, { ...formData, status: 'submitted' });
      setSaveMessage('Project submitted successfully!');
    } catch (err) {
      console.error('Failed to submit project:', err);
      setSaveMessage('Failed to submit. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get status display info
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

  // No Team State
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

  // Not Captain State
  if (!isCaptain) {
    return (
      <div className="p-4 sm:p-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <div className="max-w-2xl mx-auto">
          <Alert variant="info" title="Team Members">
            <p className="mb-2">
              Only team captains can submit projects. Ask{' '}
              <span className="font-bold">{userTeam.captainName || 'your captain'}</span> to handle the submission.
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
                <p className="text-text-primary font-bold">
                  {userTeam.submission.projectName}
                </p>
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
        
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
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
              Submit Your Project
            </h1>
            <p className="text-text-secondary max-w-2xl">
              Submitting for <span className="font-bold">{userTeam.name}</span>
            </p>
          </div>
          
          <HStack gap="2">
            <Button
              variant="secondary"
              onClick={handleSaveDraft}
              loading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Draft
            </Button>
            <Button
              onClick={handleSubmit}
              loading={isSaving}
              disabled={!canSubmit}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Submit Project
            </Button>
          </HStack>
        </div>
      </div>

      {/* Progress */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-text-secondary">
            Completion Progress
          </span>
          <span className="text-sm font-mono text-text-muted">
            {completedRequired.length}/{requiredFields.length} required fields
          </span>
        </div>
        <Progress value={progressPercent} variant={canSubmit ? 'success' : 'default'} />
        {saveMessage && (
          <Alert variant="success" className="mt-4">
            {saveMessage}
          </Alert>
        )}
      </Card>

      {/* Form */}
      <Card padding="lg">
        <VStack gap="6">
          {SUBMISSION_FIELDS.map((field) => {
            const Icon = field.icon;
            const isCompleted = formData[field.id]?.trim();
            
            return (
              <div key={field.id}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn(
                    'w-4 h-4',
                    isCompleted ? 'text-success' : 'text-text-muted'
                  )} />
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
              </div>
            );
          })}
        </VStack>
      </Card>
    </div>
  );
}

export default Submission;
