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
  Globe,
  Users,
  Star,
} from 'lucide-react';
import { cn } from '../lib/design-system';
import { Card, Button, TextArea, Progress, Alert } from './ui';
import { BackButton } from './shared';
import { HStack, VStack } from './layout';
import { EmptyState } from './ui/ErrorState';

// ============================================================================
// DEFAULT JUDGE CRITERIA
// ============================================================================

const DEFAULT_CRITERIA = [
  { id: 'innovation', label: 'Innovation', description: 'How creative and original is the idea?' },
  { id: 'execution', label: 'Execution', description: 'How well was the project implemented?' },
  { id: 'design', label: 'Design', description: 'How polished is the user experience?' },
  { id: 'theme', label: 'Theme Adherence', description: 'How well does it fit the HackDay theme?' },
];

// ============================================================================
// SCORE INPUT COMPONENT
// ============================================================================

function ScoreInput({ criterion, value, onChange, maxScore = 10 }) {
  return (
    <div className="p-4 bg-arena-elevated rounded-lg border border-arena-border">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-bold text-text-primary">{criterion.label}</h4>
          <p className="text-xs text-text-muted">{criterion.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-brand">{value || 0}</span>
          <span className="text-sm text-text-muted">/ {maxScore}</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={maxScore}
        value={value || 0}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-arena-card rounded-lg appearance-none cursor-pointer accent-brand"
      />
      <div className="flex justify-between text-xs text-text-muted mt-1">
        <span>0</span>
        <span>{maxScore}</span>
      </div>
    </div>
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
}) {
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);

  // Check if user is a judge
  const isJudge = user?.role === 'judge' || user?.role === 'admin';

  // Get only submitted projects
  const submittedProjects = useMemo(() => {
    return teams.filter((team) => team.submission?.status === 'submitted');
  }, [teams]);

  // Get selected team
  const selectedTeam = useMemo(() => {
    return teams.find((t) => t.id === selectedTeamId);
  }, [teams, selectedTeamId]);

  // Check if user has already scored a team
  const hasScored = (teamId) => {
    const team = teams.find((t) => t.id === teamId);
    return team?.submission?.judgeScores?.some((s) => s.judgeId === user?.id);
  };

  // Calculate scoring progress
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

  // Handle selecting a team to score
  const handleSelectTeam = (teamId) => {
    setSelectedTeamId(teamId);
    // Initialize with empty scores
    const initialScores = {};
    judgeCriteria.forEach((c) => {
      initialScores[c.id] = 0;
    });
    setScores(initialScores);
    setComments('');
    setSaveStatus(null);
  };

  // Handle score change
  const handleScoreChange = (criterionId, value) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: Math.min(10, Math.max(0, value)),
    }));
    setSaveStatus(null);
  };

  // Handle save
  const handleSave = async () => {
    if (!selectedTeamId || !user) return;
    setSaveStatus('saving');
    try {
      const { invoke } = await import('@forge/bridge');
      await invoke('submitScore', {
        teamId: selectedTeamId,
        scoreData: { ...scores, comments },
      });
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save scores:', err);
      setSaveStatus('error');
    }
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // Calculate total score
  const totalScore = useMemo(() => {
    return Object.values(scores).reduce((sum, score) => sum + score, 0);
  }, [scores]);

  const maxPossibleScore = judgeCriteria.length * 10;

  // Not a judge
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
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            Judge Panel
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary mb-2">
            Score Projects
          </h1>
          <p className="text-text-secondary max-w-2xl">
            Evaluate each submitted project using the criteria below
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card padding="md" className="mb-6">
        <HStack justify="between" align="center" className="mb-2">
          <span className="text-sm font-bold text-text-secondary">
            Scoring Progress
          </span>
          <span className="text-sm font-mono text-text-muted">
            {progress.scored}/{progress.total} projects scored
          </span>
        </HStack>
        <Progress value={progress.percentage} variant="success" />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project List */}
        <div className="lg:col-span-1">
          <Card padding="md">
            <Card.Title className="mb-4">Submitted Projects</Card.Title>
            {submittedProjects.length > 0 ? (
              <VStack gap="2">
                {submittedProjects.map((team) => {
                  const scored = hasScored(team.id);
                  const isSelected = selectedTeamId === team.id;
                  
                  return (
                    <button
                      key={team.id}
                      onClick={() => handleSelectTeam(team.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                        isSelected
                          ? 'bg-brand/10 border-brand'
                          : 'bg-arena-elevated border-arena-border hover:border-arena-border-strong'
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-arena-card flex items-center justify-center">
                        {scored ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <Circle className="w-5 h-5 text-text-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-primary truncate">
                          {team.submission?.projectName || team.name}
                        </p>
                        <p className="text-xs text-text-muted">{team.name}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
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

        {/* Scoring Panel */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <Card padding="lg">
              {/* Project Header */}
              <div className="mb-6 pb-6 border-b border-arena-border">
                <h2 className="text-2xl font-black text-text-primary mb-2">
                  {selectedTeam.submission?.projectName || 'Untitled'}
                </h2>
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {selectedTeam.name}
                  </div>
                </div>
                <p className="mt-3 text-text-secondary">
                  {selectedTeam.submission?.description || 'No description provided.'}
                </p>

                {/* Links */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedTeam.submission?.demoVideoUrl && (
                    <a
                      href={selectedTeam.submission.demoVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-bold bg-arena-elevated rounded-lg hover:bg-arena-card"
                    >
                      <Video className="w-4 h-4" /> Demo Video
                    </a>
                  )}
                  {selectedTeam.submission?.repoUrl && (
                    <a
                      href={selectedTeam.submission.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-bold bg-arena-elevated rounded-lg hover:bg-arena-card"
                    >
                      <Github className="w-4 h-4" /> Repository
                    </a>
                  )}
                  {selectedTeam.submission?.liveDemoUrl && (
                    <a
                      href={selectedTeam.submission.liveDemoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-bold bg-arena-elevated rounded-lg hover:bg-arena-card"
                    >
                      <Globe className="w-4 h-4" /> Live Demo
                    </a>
                  )}
                </div>
              </div>

              {/* Scoring Criteria */}
              <VStack gap="4" className="mb-6">
                {judgeCriteria.map((criterion) => (
                  <ScoreInput
                    key={criterion.id}
                    criterion={criterion}
                    value={scores[criterion.id]}
                    onChange={(value) => handleScoreChange(criterion.id, value)}
                  />
                ))}
              </VStack>

              {/* Total Score */}
              <div className="p-4 bg-brand/10 rounded-lg border border-brand/30 mb-6">
                <HStack justify="between" align="center">
                  <span className="font-bold text-text-primary">Total Score</span>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-brand" />
                    <span className="text-2xl font-black text-brand">
                      {totalScore}
                    </span>
                    <span className="text-text-muted">/ {maxPossibleScore}</span>
                  </div>
                </HStack>
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

              {/* Save Button */}
              <HStack justify="between" align="center">
                {saveStatus === 'saved' && (
                  <Alert variant="success" className="flex-1 mr-4">
                    Score saved successfully!
                  </Alert>
                )}
                {saveStatus === 'error' && (
                  <Alert variant="warning" className="flex-1 mr-4">
                    Failed to save score. Please try again.
                  </Alert>
                )}
                <Button
                  onClick={handleSave}
                  loading={saveStatus === 'saving'}
                  leftIcon={<Save className="w-4 h-4" />}
                  className="ml-auto"
                >
                  Save Score
                </Button>
              </HStack>
            </Card>
          ) : (
            <Card padding="lg">
              <EmptyState
                icon={ChevronRight}
                title="Select a Project"
                message="Choose a project from the list to start scoring."
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default JudgeScoring;
