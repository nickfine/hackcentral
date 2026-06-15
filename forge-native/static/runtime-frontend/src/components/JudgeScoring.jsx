/**
 * JudgeScoring Page
 * Judge interface for scoring submitted projects
 */

import { useState, useMemo } from 'react';
import {
  Gavel,
  CheckCircle2,
  Circle,
  ChevronRight,
  Save,
  Video,
  Github,
  Monitor,
  Users,
  Star,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../lib/design-system';
import { invokeEventScopedResolver } from '../lib/appModeResolverPayload';
import { Card, Button, TextArea, Progress, Alert } from './ui';
import { BackButton } from './shared';
import { HStack, VStack } from './layout';
import { EmptyState } from './ui/ErrorState';

// ============================================================================
// DEFAULT JUDGE CRITERIA
// ============================================================================

const DEFAULT_CRITERIA = [
  { id: 'innovation', label: 'Innovation', description: 'How original, creative, and forward-thinking the idea is in addressing the chosen pain point.' },
  { id: 'execution', label: 'Execution', description: 'How effectively and completely the idea has been implemented, including quality, functionality, and readiness.' },
  { id: 'design', label: 'Design', description: 'How clear, intuitive, and well-crafted the user experience, interface, and submission are.' },
  { id: 'relevance', label: 'Relevance', description: 'How the submission is linked to the pain point.' },
  { id: 'tagValues', label: 'TAG Values', description: 'Alignment with TAG Values of Trust, Pragmatism, Teamwork, Humility and Curiosity.' },
];

function getScoreLabel(score) {
  if (score === 0) return '';
  if (score <= 2) return 'Poor';
  if (score <= 4) return 'Fair';
  if (score <= 6) return 'Good';
  if (score <= 8) return 'Great';
  return 'Excellent';
}

// ============================================================================
// SCORE INPUT COMPONENT
// ============================================================================

function ScoreInput({ criterion, value, onChange, maxScore = 10 }) {
  const score = value || 0;
  const pct = (score / maxScore) * 100;

  return (
    <div className="p-5 bg-arena-elevated rounded-xl border border-arena-border transition-all duration-200 hover:border-brand/30">
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-4">
          <h4 className="font-black text-text-primary tracking-tight">{criterion.label}</h4>
          <p className="text-xs text-text-muted mt-0.5">{criterion.description}</p>
        </div>
        <div className="flex items-baseline gap-1 flex-shrink-0">
          <span className="text-4xl font-black text-brand leading-none tabular-nums">{score}</span>
          <span className="text-sm text-text-muted font-medium">/ {maxScore}</span>
        </div>
      </div>

      {/* Custom slider track */}
      <div className="relative select-none" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
        {/* Track background */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border, #e2e8f0)' }}>
          {/* Fill */}
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{ width: `${pct}%`, background: 'var(--accent-brand, #f97316)' }}
          />
        </div>
        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full shadow-md border-2 border-white pointer-events-none transition-all duration-150"
          style={{ left: `${pct}%`, background: 'var(--accent-brand, #f97316)' }}
        />
        {/* Invisible range input for interaction */}
        <input
          type="range"
          min={0}
          max={maxScore}
          value={score}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: '100%' }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs mt-1">
        <span className="text-text-muted font-medium">0</span>
        <span className="text-text-muted/60 text-center">{getScoreLabel(score)}</span>
        <span className="text-text-muted font-medium">{maxScore}</span>
      </div>
    </div>
  );
}

// ============================================================================
// LINK CHIP COMPONENT
// ============================================================================

function LinkChip({ href, icon: Icon, label }) {
  if (!href) return null;
  return (
    <a
      href={href}
      onClick={async (e) => {
        e.preventDefault();
        const { router } = await import('@forge/bridge');
        router.open(href);
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold bg-arena-elevated border border-arena-border rounded-lg hover:border-brand/50 hover:text-brand transition-colors cursor-pointer"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      <ExternalLink className="w-3 h-3 opacity-50" />
    </a>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

function JudgeScoring({
  user,
  teams = [],
  onNavigate,
  judgeCriteria = DEFAULT_CRITERIA,
  eventPhase,
  appModeResolverPayload = null,
}) {
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);

  const isJudge = user?.role === 'judge' || user?.role === 'admin';

  const submittedProjects = useMemo(() => {
    return teams.filter((team) => team.submission?.status === 'submitted');
  }, [teams]);

  const selectedTeam = useMemo(() => {
    return teams.find((t) => t.id === selectedTeamId);
  }, [teams, selectedTeamId]);

  const isOwnTeam = (team) => {
    if (!team || !user?.id) return false;
    return team.captainId === user.id || team.members?.some((member) => member.id === user.id);
  };

  const selectedTeamIsOwn = isOwnTeam(selectedTeam);

  const hasScored = (teamId) => {
    const team = teams.find((t) => t.id === teamId);
    return team?.submission?.judgeScores?.some((s) => s.judgeId === user?.id);
  };

  const progress = useMemo(() => {
    const scored = submittedProjects.filter((t) => hasScored(t.id)).length;
    return {
      scored,
      total: submittedProjects.length,
      percentage: submittedProjects.length > 0
        ? Math.round((scored / submittedProjects.length) * 100)
        : 0,
    };
  }, [submittedProjects, user]);

  const handleSelectTeam = (teamId) => {
    const team = teams.find((item) => item.id === teamId);
    if (isOwnTeam(team)) {
      setSaveStatus('own-team');
      return;
    }
    setSelectedTeamId(teamId);
    const initialScores = {};
    judgeCriteria.forEach((c) => { initialScores[c.id] = 0; });
    setScores(initialScores);
    setComments('');
    setSaveStatus(null);
  };

  const handleScoreChange = (criterionId, value) => {
    setScores((prev) => ({ ...prev, [criterionId]: Math.min(10, Math.max(0, value)) }));
    setSaveStatus(null);
  };

  const handleSave = async () => {
    if (!selectedTeamId || !user) return;
    if (selectedTeamIsOwn) { setSaveStatus('own-team'); return; }
    setSaveStatus('saving');
    try {
      const { invoke } = await import('@forge/bridge');
      await invokeEventScopedResolver(invoke, 'submitScore', appModeResolverPayload, { teamId: selectedTeamId, scoreData: { ...scores, comments } });
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save scores:', err);
      setSaveStatus('error');
    }
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const totalScore = useMemo(() => {
    return Object.values(scores).reduce((sum, score) => sum + score, 0);
  }, [scores]);

  const maxPossibleScore = judgeCriteria.length * 10;
  const totalPct = Math.round((totalScore / maxPossibleScore) * 100);

  if (!isJudge) {
    return (
      <div className="p-4 sm:p-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <EmptyState
          icon={Gavel}
          title="Judges Only"
          message="This page is only accessible to judges. Contact an admin if you believe this is an error."
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Judge Panel</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary mb-2">
            SCORE PROJECTS
          </h1>
        </div>
      </div>

      {/* Progress bar */}
      <Card padding="md" className="mb-6">
        <HStack justify="between" align="center" className="mb-2">
          <span className="text-sm font-bold text-text-secondary">Your scoring progress</span>
          <span className="text-sm font-mono font-bold text-brand">
            {progress.scored} / {progress.total}
          </span>
        </HStack>
        <Progress value={progress.percentage} variant="success" />
        <p className="text-xs text-text-muted mt-1.5">
          {progress.total - progress.scored} project{progress.total - progress.scored !== 1 ? 's' : ''} remaining
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project list */}
        <div className="lg:col-span-1">
          <Card padding="md">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
              Submitted Projects
            </p>
            {submittedProjects.length > 0 ? (
              <VStack gap="2">
                {submittedProjects.map((team) => {
                  const scored = hasScored(team.id);
                  const isSelected = selectedTeamId === team.id;
                  const teamIsOwn = isOwnTeam(team);

                  return (
                    <button
                      key={team.id}
                      onClick={() => handleSelectTeam(team.id)}
                      disabled={teamIsOwn}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                        isSelected
                          ? 'bg-brand/10 border-brand'
                          : scored
                          ? 'bg-arena-elevated border-arena-border opacity-70 hover:opacity-100'
                          : 'bg-arena-elevated border-arena-border hover:border-brand/40',
                        teamIsOwn && 'cursor-not-allowed opacity-40'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        scored ? 'bg-green-500/20' : 'bg-arena-card'
                      )}>
                        {scored ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-text-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-primary truncate text-sm">
                          {team.submission?.projectName || team.name}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {team.name}{teamIsOwn ? ' · Your team' : scored ? ' · Scored' : ''}
                        </p>
                      </div>
                      {!teamIsOwn && <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />}
                    </button>
                  );
                })}
              </VStack>
            ) : (
              <EmptyState
                icon={Gavel}
                title="No Projects"
                message="No projects have been submitted yet."
                compact
              />
            )}
          </Card>
        </div>

        {/* Scoring panel */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <Card padding="none" className="overflow-hidden">
              {/* Project header */}
              <div className="p-6 border-b border-arena-border bg-arena-elevated">
                <h2 className="text-2xl font-black text-text-primary mb-1">
                  {selectedTeam.submission?.projectName || 'Untitled'}
                </h2>
                <div className="flex items-center gap-1.5 text-sm text-text-muted mb-3">
                  <Users className="w-3.5 h-3.5" />
                  <span>{selectedTeam.name}</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  {selectedTeam.submission?.description || 'No description provided.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <LinkChip href={selectedTeam.submission?.demoVideoUrl} icon={Video} label="Demo Video" />
                  <LinkChip href={selectedTeam.submission?.repoUrl} icon={Github} label="Repository" />
                  <LinkChip href={selectedTeam.submission?.liveDemoUrl} icon={Monitor} label="Presentation" />
                </div>
              </div>

              <div className="p-6">
                {selectedTeamIsOwn && (
                  <Alert variant="warning" className="mb-6">
                    You cannot score your own team.
                  </Alert>
                )}

                {/* Criteria */}
                <VStack gap="3" className="mb-6">
                  {judgeCriteria.map((criterion) => (
                    <ScoreInput
                      key={criterion.id}
                      criterion={criterion}
                      value={scores[criterion.id]}
                      onChange={(value) => handleScoreChange(criterion.id, value)}
                    />
                  ))}
                </VStack>

                {/* Total score */}
                <div className="p-5 rounded-xl border-2 border-brand/30 bg-brand/5 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-0.5">Total Score</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-brand leading-none tabular-nums">{totalScore}</span>
                        <span className="text-base text-text-muted font-medium">/ {maxPossibleScore}</span>
                      </div>
                    </div>
                    <div className="w-16 h-16 rounded-full border-4 border-brand/20 flex items-center justify-center" style={{
                      background: `conic-gradient(var(--accent-brand, #f97316) ${totalPct * 3.6}deg, transparent 0deg)`
                    }}>
                      <div className="w-10 h-10 rounded-full bg-arena-card flex items-center justify-center">
                        <Star className="w-5 h-5 text-brand" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <TextArea
                  label="Comments (Optional)"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any feedback or notes about this project..."
                  rows={3}
                  className="mb-6"
                />

                {/* Save */}
                <HStack justify="between" align="center" gap="4">
                  <div className="flex-1">
                    {saveStatus === 'saved' && (
                      <Alert variant="success">Score saved successfully!</Alert>
                    )}
                    {saveStatus === 'error' && (
                      <Alert variant="warning">Failed to save score. Please try again.</Alert>
                    )}
                    {saveStatus === 'own-team' && (
                      <Alert variant="warning">You cannot score your own team.</Alert>
                    )}
                  </div>
                  <Button
                    onClick={handleSave}
                    disabled={selectedTeamIsOwn}
                    loading={saveStatus === 'saving'}
                    leftIcon={<Save className="w-4 h-4" />}
                    className="flex-shrink-0"
                  >
                    Save Score
                  </Button>
                </HStack>
              </div>
            </Card>
          ) : (
            <Card padding="lg" className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-arena-elevated border border-arena-border flex items-center justify-center mx-auto mb-4">
                  <Gavel className="w-8 h-8 text-text-muted" />
                </div>
                <p className="font-bold text-text-primary mb-1">Select a project</p>
                <p className="text-sm text-text-muted">Choose a project from the list to start scoring</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default JudgeScoring;
