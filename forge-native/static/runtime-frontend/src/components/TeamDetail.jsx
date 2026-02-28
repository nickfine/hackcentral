/**
 * TeamDetail Component
 * Full team/idea detail page with captain controls, member management, and join requests.
 */

import { useState, useMemo, useEffect, useContext } from 'react';
import {
  ChevronRight,
  Crown,
  Check,
  XCircle,
  Edit3,
  ArrowRightLeft,
  MoreVertical,
  Lightbulb,
} from 'lucide-react';
import { cn, DESIGN_SYSTEM_CARD } from '../lib/design-system';
import { ThemeStateContext } from '../contexts/ThemeContext';
import {
  Button,
  Badge,
  Avatar,
  Input,
  Modal,
  Alert,
  IconButton,
  Select,
  MultiSelect,
} from './ui';
import { BackButton } from './shared';
import { SKILLS } from '../data/constants';

const CONTENT_HELPERS = {
  goal: 'What are you building? Describe it in one sentence',
  problem: 'What user problem does this solve?',
  moreInfo: 'Links, resources or additional context for judges',
};

/** Section labels: identical across left and right columns. No teal or warm tint. */
const SECTION_LABEL_CLASS = 'pb-2 text-xs font-semibold tracking-wider text-text-secondary uppercase';

const TEAM_VIBE_OPTIONS = [
  { value: 'brainstorming', icon: '💡', label: 'Brainstorming', className: 'team-detail-vibe-pill team-detail-vibe-pill--brainstorming' },
  { value: 'building', icon: '🔨', label: 'Building', className: 'team-detail-vibe-pill team-detail-vibe-pill--building' },
  { value: 'on_fire', icon: '🔥', label: 'On fire', className: 'team-detail-vibe-pill team-detail-vibe-pill--on-fire' },
  { value: 'need_help', icon: '👋', label: 'Need help', className: 'team-detail-vibe-pill team-detail-vibe-pill--need-help' },
  { value: 'chilling', icon: '❄️', label: 'Chilling', className: 'team-detail-vibe-pill team-detail-vibe-pill--chilling' },
];

const REACTION_OPTIONS = [
  { key: 'love', icon: '❤️', label: 'Love this idea' },
  { key: 'join', icon: '🙋', label: 'Would join' },
  { key: 'innovative', icon: '💡', label: 'Innovative' },
  { key: 'ambitious', icon: '🚀', label: 'Ambitious' },
];

const RECRUITMENT_ROLE_RULES = [
  {
    label: 'Developer',
    skills: [
      'frontend development',
      'backend development',
      'machine learning',
      'data science',
      'devops',
      'hardware/iot',
    ],
  },
  {
    label: 'UI/UX Design',
    skills: ['ui/ux design', 'graphic design', 'product design'],
  },
  {
    label: 'Product Manager',
    skills: ['product management', 'project management'],
  },
  {
    label: 'QA',
    skills: ['qa', 'quality assurance', 'testing'],
  },
  {
    label: 'Mobile Development',
    skills: ['mobile development', 'ios', 'android', 'react native', 'flutter'],
  },
  {
    label: 'Security',
    skills: ['security', 'application security', 'threat modeling'],
  },
];

function normalizeRoleKey(value) {
  return String(value || '').trim().toLowerCase();
}

function toDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateLabel(value, includeTime = false) {
  const date = toDateOrNull(value);
  if (!date) return null;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

function getLastUpdatedDate(team) {
  const timestamps = [
    team?.updatedAt,
    team?.updated_at,
    team?.createdAt,
    team?.created_at,
    ...(team?.joinRequests || []).map((request) => request?.timestamp),
  ]
    .map(toDateOrNull)
    .filter(Boolean);

  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.reduce((latest, candidate) => (candidate > latest ? candidate : latest));
}

function deriveSkillGaps(members = [], lookingFor = []) {
  const normalizedMemberSkills = new Set(
    members
      .flatMap((member) => member?.skills || [])
      .map((skill) => normalizeRoleKey(skill))
      .filter(Boolean)
  );

  const inferredGaps = RECRUITMENT_ROLE_RULES
    .filter((rule) => !rule.skills.some((skill) => normalizedMemberSkills.has(skill)))
    .map((rule) => rule.label);

  const merged = [];
  const seen = new Set();

  for (const inferred of inferredGaps) {
    const key = normalizeRoleKey(inferred);
    if (!seen.has(key)) {
      merged.push(inferred);
      seen.add(key);
    }
  }

  for (const explicit of lookingFor || []) {
    const trimmed = String(explicit || '').trim();
    if (!trimmed) continue;
    const key = normalizeRoleKey(trimmed);
    if (!seen.has(key)) {
      merged.push(trimmed);
      seen.add(key);
    }
  }

  return merged;
}

function getCoverageStateByCategory(members = [], missingSkillSignals = []) {
  const memberSkills = new Set(
    members.flatMap((member) => member?.skills || []).map((skill) => normalizeRoleKey(skill))
  );
  const neededSignals = new Set((missingSkillSignals || []).map((signal) => normalizeRoleKey(signal)));

  return RECRUITMENT_ROLE_RULES.map((category) => {
    const normalizedLabel = normalizeRoleKey(category.label);
    const skillsInCategory = category.skills || [];
    const filledCount = skillsInCategory.filter((skill) => memberSkills.has(skill)).length;
    const totalCount = skillsInCategory.length;
    const fillPercent = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;
    const isCovered = filledCount > 0;
    const isGap = !isCovered && (
      neededSignals.has(normalizedLabel)
      || category.skills.some((skill) => neededSignals.has(skill))
      || [...neededSignals].some((need) => normalizedLabel.includes(need) || need.includes(normalizedLabel))
    );
    const membersWithSkillCount = members.filter((m) =>
      (m?.skills || []).some((s) =>
        skillsInCategory.some((c) => normalizeRoleKey(c) === normalizeRoleKey(s))
      )
    ).length;
    const totalDots = Math.max(membersWithSkillCount, 3);

    return {
      label: category.label,
      isCovered,
      isGap,
      fillPercent,
      membersWithSkillCount,
      totalDots,
    };
  });
}

function matchesTeamNeed(skill, missingSkillSignals = []) {
  const normalizedSkill = normalizeRoleKey(skill);
  const needs = new Set((missingSkillSignals || []).map((need) => normalizeRoleKey(need)));

  if (needs.has(normalizedSkill)) {
    return true;
  }

  return RECRUITMENT_ROLE_RULES.some((rule) => {
    const needsRule = needs.has(normalizeRoleKey(rule.label))
      || rule.skills.some((ruleSkill) => needs.has(ruleSkill));
    return needsRule && rule.skills.includes(normalizedSkill);
  });
}

function buildInitialReactionCounts(team) {
  const seededCounts = team?.reactionCounts && typeof team.reactionCounts === 'object'
    ? team.reactionCounts
    : {};

  return REACTION_OPTIONS.reduce((acc, reaction) => {
    const nextValue = Number(seededCounts[reaction.key]);
    acc[reaction.key] = Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 0;
    return acc;
  }, {});
}

function TeamDetail({
  team,
  user,
  onNavigate,
  onUpdateTeam,
  onDeleteTeam,
  onJoinRequest,
  onRequestResponse,
  onLeaveTeam,
  eventPhase = 'signup',
}) {
  // State for editing
  const [moreInfoText, setMoreInfoText] = useState(team?.moreInfo || '');
  const [isEditingMoreInfo, setIsEditingMoreInfo] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState(team?.name || '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState(team?.description || '');
  const [isEditingProblem, setIsEditingProblem] = useState(false);
  const [problemInput, setProblemInput] = useState(team?.problem || '');
  const [isSavingProblem, setIsSavingProblem] = useState(false);
  const [isSavingMoreInfo, setIsSavingMoreInfo] = useState(false);
  const [isEditingLookingFor, setIsEditingLookingFor] = useState(false);
  const [lookingForInput, setLookingForInput] = useState(team?.lookingFor || []);
  const [isEditingMaxMembers, setIsEditingMaxMembers] = useState(false);
  const [maxMembersInput, setMaxMembersInput] = useState(team?.maxMembers || 5);

  // State for modals and action menus
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState(null);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [memberToTransfer, setMemberToTransfer] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [teamActionStatus, setTeamActionStatus] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);
  const [showCaptainActionMenu, setShowCaptainActionMenu] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // TODO(hd26-pass4): Persist team vibe on Team.team_vibe when backend schema support is added.
  const [teamVibe, setTeamVibe] = useState(team?.teamVibe || 'building');
  // TODO(hd26-pass4): Replace local reactions state with team_reactions(team_id,user_id,reaction_type,created_at).
  const [reactionCounts, setReactionCounts] = useState(() => buildInitialReactionCounts(team));
  const [userReactions, setUserReactions] = useState({});

  const isCaptain = user?.id === team?.captainId;
  const isMember = isCaptain || team?.members?.some((m) => m.id === user?.id);
  const hasPendingRequest = team?.joinRequests?.some((r) => r.userId === user?.id);
  const pendingRequestCount = team?.joinRequests?.length || 0;
  const isTeamFull = (team?.members?.length || 0) >= (team?.maxMembers || 5);
  const hasCompletedSignup = user?.name && user?.skills?.length > 0;
  const memberCount = team?.members?.length || 0;
  const maxMembers = team?.maxMembers || 5;
  const capacityPercent = Math.min(100, Math.round((memberCount / Math.max(maxMembers, 1)) * 100));
  const canDelete = isCaptain && (eventPhase === 'signup' || eventPhase === 'team_formation');
  const missingSkillSignals = useMemo(
    () => deriveSkillGaps(team?.members || [], team?.lookingFor || []),
    [team?.members, team?.lookingFor]
  );

  const selectedTeamVibe = TEAM_VIBE_OPTIONS.find((option) => option.value === teamVibe) || TEAM_VIBE_OPTIONS[1];
  const coverageByCategory = useMemo(
    () => getCoverageStateByCategory(team?.members || [], missingSkillSignals),
    [team?.members, missingSkillSignals]
  );
  const viewerSkillMatch = useMemo(
    () => !isMember && (user?.skills || []).some((skill) => matchesTeamNeed(skill, missingSkillSignals)),
    [isMember, user?.skills, missingSkillSignals]
  );

  const themeState = useContext(ThemeStateContext);
  const resolvedTheme = themeState?.resolvedTheme ?? 'dark';
  const isLightMode = resolvedTheme === 'light';
  const createdLabel = formatDateLabel(team?.createdAt || team?.created_at);
  const lastUpdatedLabel = formatDateLabel(getLastUpdatedDate(team), true) || 'recently';
  const editsThisWeek = Number(team?.editsThisWeek);

  useEffect(() => {
    setTeamVibe(team?.teamVibe || 'building');
    setReactionCounts(buildInitialReactionCounts(team));
    setUserReactions({});
  }, [team?.id, team?.teamVibe, team?.reactionCounts]);

  useEffect(() => {
    setLookingForInput(team?.lookingFor || []);
    setMaxMembersInput(team?.maxMembers || 5);
    setTeamNameInput(team?.name || '');
    setDescriptionInput(team?.description || '');
    setProblemInput(team?.problem || '');
    setMoreInfoText(team?.moreInfo || '');
  }, [team?.id, team?.lookingFor, team?.maxMembers, team?.name, team?.description, team?.problem, team?.moreInfo]);

  if (!team) {
    return (
      <div className="p-6">
        <BackButton onClick={() => onNavigate('marketplace')} />
        <div className="text-center py-16">
          <p className="text-text-secondary">Team not found</p>
        </div>
      </div>
    );
  }

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setRequestMessage('');
  };

  const toggleReaction = (reactionKey) => {
    if (!user?.id) return;

    const hasReacted = Boolean(userReactions[reactionKey]);
    setUserReactions((prev) => ({
      ...prev,
      [reactionKey]: !hasReacted,
    }));
    setReactionCounts((prev) => ({
      ...prev,
      [reactionKey]: Math.max(0, (prev[reactionKey] || 0) + (hasReacted ? -1 : 1)),
    }));
  };

  const handleSubmitRequest = async () => {
    if (!user || !onJoinRequest) return;

    setIsSubmittingRequest(true);
    setJoinRequestStatus(null);
    try {
      await onJoinRequest(team.id, {
        message: requestMessage.trim(),
      });
      closeRequestModal();
      setJoinRequestStatus({
        type: 'success',
        message: 'Join request sent. It is now pending captain approval.',
      });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to send join request. Please try again.';
      setJoinRequestStatus({ type: 'error', message });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleRespondToRequest = async (requestId, accepted) => {
    if (!team?.id || !onRequestResponse) return;

    setActiveRequestId(requestId);
    setJoinRequestStatus(null);
    try {
      await onRequestResponse(team.id, requestId, accepted);
      setJoinRequestStatus({
        type: 'success',
        message: accepted ? 'Join request accepted.' : 'Join request declined.',
      });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to update join request.';
      setJoinRequestStatus({ type: 'error', message });
    } finally {
      setActiveRequestId(null);
    }
  };

  const handleSaveTeamName = () => {
    const trimmedName = teamNameInput.trim();
    if (trimmedName.length >= 3 && trimmedName !== team.name && onUpdateTeam) {
      onUpdateTeam(team.id, { name: trimmedName });
    }
    setIsEditingName(false);
  };

  const handleSaveDescription = () => {
    const trimmedDesc = descriptionInput.trim();
    if (trimmedDesc.length >= 10 && trimmedDesc !== team.description && onUpdateTeam) {
      onUpdateTeam(team.id, { description: trimmedDesc });
    }
    setIsEditingDescription(false);
  };

  const handleSaveLookingFor = () => {
    if (onUpdateTeam) {
      onUpdateTeam(team.id, { lookingFor: lookingForInput });
    }
    setIsEditingLookingFor(false);
  };

  const handleSaveMaxMembers = () => {
    const newMax = Number(maxMembersInput);
    const currentMembers = team?.members?.length || 0;

    // Can't set max below current member count
    if (newMax >= currentMembers && newMax !== team.maxMembers && onUpdateTeam) {
      onUpdateTeam(team.id, { maxMembers: newMax });
    }
    setIsEditingMaxMembers(false);
  };

  const handleSaveProblem = async () => {
    const trimmedProblem = problemInput.trim();
    if (trimmedProblem.length < 10) {
      return;
    }
    if (trimmedProblem === team.problem) {
      setIsEditingProblem(false);
      return;
    }
    if (!onUpdateTeam) {
      setIsEditingProblem(false);
      return;
    }

    setIsSavingProblem(true);
    setIsEditingProblem(false);
    try {
      await onUpdateTeam(team.id, { problem: trimmedProblem });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to save problem statement.';
      setProblemInput(trimmedProblem);
      setIsEditingProblem(true);
      setTeamActionStatus({ type: 'error', message });
    } finally {
      setIsSavingProblem(false);
    }
  };

  const handleSaveMoreInfo = async () => {
    if (moreInfoText === team.moreInfo) {
      setIsEditingMoreInfo(false);
      return;
    }
    if (!onUpdateTeam) {
      setIsEditingMoreInfo(false);
      return;
    }

    setIsSavingMoreInfo(true);
    setIsEditingMoreInfo(false);
    try {
      await onUpdateTeam(team.id, { moreInfo: moreInfoText });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to save additional information.';
      setIsEditingMoreInfo(true);
      setTeamActionStatus({ type: 'error', message });
    } finally {
      setIsSavingMoreInfo(false);
    }
  };

  const handleTransferCaptain = () => {
    if (!memberToTransfer || !isCaptain || !onUpdateTeam) return;
    onUpdateTeam(team.id, { captainId: memberToTransfer.id });
    setShowTransferModal(false);
    setMemberToTransfer(null);
  };

  const handleDeleteTeam = async () => {
    if (!isCaptain || !onDeleteTeam || !team?.id) return;
    if (deleteConfirmText !== team.name) return;

    setIsDeletingTeam(true);
    setTeamActionStatus(null);
    try {
      await onDeleteTeam(team.id);
      setShowDeleteModal(false);
      setShowCaptainActionMenu(false);
      setDeleteConfirmText('');
      onNavigate('marketplace', { tab: 'teams' });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to delete team.';
      setTeamActionStatus({ type: 'error', message });
      setShowDeleteModal(false);
    } finally {
      setIsDeletingTeam(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!team?.id || !onLeaveTeam) return;

    setIsLeavingTeam(true);
    setTeamActionStatus(null);
    try {
      await onLeaveTeam(team.id);
      setShowLeaveModal(false);
      onNavigate('marketplace', { tab: 'teams' });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to leave team.';
      setTeamActionStatus({ type: 'error', message });
      setShowLeaveModal(false);
    } finally {
      setIsLeavingTeam(false);
    }
  };

  return (
    <div className={cn('team-detail-page p-4 sm:p-6', isLightMode && 'team-detail-theme-light')}>
      <div className="mb-6">
        <BackButton onClick={() => onNavigate('marketplace')} />
      </div>

      {teamActionStatus && (
        <Alert
          variant={teamActionStatus.type}
          className="mb-4"
          dismissible
          onDismiss={() => setTeamActionStatus(null)}
        >
          {teamActionStatus.message}
        </Alert>
      )}

      {joinRequestStatus && (
        <Alert
          variant={joinRequestStatus.type}
          className="mb-4"
          dismissible
          onDismiss={() => setJoinRequestStatus(null)}
        >
          {joinRequestStatus.message}
        </Alert>
      )}

      {/* Zone A - Team Identity Header (design system: solid surface only, no gradient) */}
      <div
        className={cn(
          'team-detail-hero-card p-5 mb-6 border-l-2 border-teal-500 rounded-xl',
          'border border-arena-border'
        )}
      >
        <div className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex items-start gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center bg-teal-500/10 text-teal-500 shrink-0">
                <Lightbulb className="w-5 h-5 text-teal-500" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-text-primary break-words">
                    {team.name}
                  </h1>
                  {isCaptain && (
                    <Badge
                      variant="default"
                      size="sm"
                      className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30"
                    >
                      Team Captain
                    </Badge>
                  )}
                  {isMember && (
                    <Badge
                      variant="outline"
                      size="sm"
                      className="team-detail-membership-pill"
                    >
                      You&apos;re on this team
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="relative self-start">
              <div className="flex items-center gap-2 md:justify-end">
                {isCaptain && !isEditingName && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="border border-gray-300 dark:border-gray-600 rounded-lg"
                      onClick={() => {
                        setTeamNameInput(team.name);
                        setIsEditingName(true);
                      }}
                      leftIcon={<Edit3 className="w-4 h-4" />}
                    >
                      Edit Idea
                    </Button>
                    {canDelete && (
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={<MoreVertical className="w-4 h-4" />}
                        label="Team actions"
                        onClick={() => setShowCaptainActionMenu((prev) => !prev)}
                      />
                    )}
                  </>
                )}

                {!isCaptain && isMember && (
                  <Button
                    variant="primary"
                    size="md"
                    className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                    onClick={() => setShowLeaveModal(true)}
                  >
                    Leave Team
                  </Button>
                )}

                {!isMember && hasPendingRequest && (
                  <Button variant="secondary" size="md" className="border border-gray-300 dark:border-gray-600 rounded-lg" disabled>
                    Request Pending Approval
                  </Button>
                )}

                {!isMember && !hasPendingRequest && isTeamFull && (
                  <Button variant="secondary" size="md" className="border border-gray-300 dark:border-gray-600 rounded-lg" disabled>
                    Team Is Full
                  </Button>
                )}

                {!isMember && !hasPendingRequest && !isTeamFull && !hasCompletedSignup && (
                  <Button
                    variant="primary"
                    size="md"
                    className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                    onClick={() => onNavigate('signup')}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Complete Signup
                  </Button>
                )}

                {!isMember && !hasPendingRequest && !isTeamFull && hasCompletedSignup && (
                  <button
                    type="button"
                    className="team-detail-cta-join inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-2.5 py-2 transition-colors border-0"
                    style={{ borderRadius: '0.5rem' }}
                    onClick={() => setShowRequestModal(true)}
                  >
                    <span>Request to Join</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {showCaptainActionMenu && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10"
                    onClick={() => setShowCaptainActionMenu(false)}
                    aria-label="Close team actions menu"
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden">
                    {canDelete && (
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          setShowDeleteModal(true);
                          setDeleteConfirmText('');
                          setShowCaptainActionMenu(false);
                        }}
                      >
                        Delete Idea
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 flex-1">
              <p className="text-xs text-text-secondary whitespace-nowrap">
                {memberCount}/{maxMembers} members
              </p>
              <div className="team-detail-progress-track h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 transition-all duration-500"
                  style={{ width: `${capacityPercent}%` }}
                  aria-hidden="true"
                />
              </div>
              {isCaptain && (
                <button
                  type="button"
                  aria-label="Edit max team size"
                  className="p-1 rounded-md text-text-secondary hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                  onClick={() => {
                    setMaxMembersInput(team.maxMembers || 5);
                    setIsEditingMaxMembers(true);
                  }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span
                data-testid="team-vibe-pill"
                className="team-detail-vibe-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-text-primary text-xs font-semibold"
              >
                <span aria-hidden="true">{selectedTeamVibe.icon}</span>
                <span>{selectedTeamVibe.label}</span>
              </span>

              {isCaptain && (
                <select
                  aria-label="Team vibe"
                  className="team-detail-vibe-select text-xs rounded-md border px-2 py-1 focus-ring-control"
                  value={teamVibe}
                  onChange={(event) => setTeamVibe(event.target.value)}
                >
                  {TEAM_VIBE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {viewerSkillMatch && (
        <div className="mt-4 pt-4 mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 px-5 py-3 text-center text-sm font-medium text-amber-600 dark:text-amber-400">
          This team is looking for your skills!
        </div>
      )}

      {/* Zone 2 - Team Requirements (full width) */}
      <div data-testid="team-detail-requirements-strip" className={cn(DESIGN_SYSTEM_CARD, 'team-detail-content-card p-5 mb-6')}>
        <div className="flex flex-col md:flex-row md:gap-6">
          <div className="flex-1 min-w-0 md:max-w-[55%]">
            <div className="flex items-start justify-between gap-2">
              <p className={SECTION_LABEL_CLASS}>Looking For</p>
              {isCaptain && !isEditingLookingFor && (
                <button
                  type="button"
                  aria-label="Edit skills needed"
                  className="p-1.5 rounded-md text-text-secondary hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                  onClick={() => {
                    setLookingForInput(team.lookingFor || []);
                    setIsEditingLookingFor(true);
                  }}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>
            {isEditingLookingFor ? (
              <div className="space-y-3 mt-2">
                <MultiSelect
                  options={SKILLS.map(skill => ({ value: skill, label: skill }))}
                  value={lookingForInput}
                  onChange={setLookingForInput}
                  placeholder="Select skills needed..."
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="border border-gray-300 dark:border-gray-600 rounded-lg"
                    onClick={() => {
                      setLookingForInput(team.lookingFor || []);
                      setIsEditingLookingFor(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                    onClick={handleSaveLookingFor}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {missingSkillSignals.map((signal) => {
                const hasMembers = (team?.members?.length ?? 0) > 0;
                const isMatch = !isMember && hasMembers && (user?.skills || []).some((s) => normalizeRoleKey(s) === normalizeRoleKey(signal));
                return (
                  <span
                    key={signal}
                    data-testid="team-detail-looking-for-tag"
                    className={cn(
                      'team-detail-looking-for-tag inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium transition-colors duration-150',
                      isMatch && 'team-detail-looking-for-tag--match',
                      isMatch
                        ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-text-primary border-gray-200 dark:border-gray-600',
                      !isMember && 'cursor-pointer hover:opacity-90'
                    )}
                  >
                    {signal}
                  </span>
                );
              })}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 mt-4 md:mt-0 md:max-w-[45%]">
            <p className={SECTION_LABEL_CLASS}>Skill Coverage</p>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5" data-testid="team-skill-coverage">
              {coverageByCategory.map((category) => {
                const lit = category.membersWithSkillCount ?? 0;
                const total = category.totalDots ?? 3;
                const isFullyCovered = total > 0 && lit >= total;
                return (
                  <div key={category.label} className="flex items-center gap-2">
                    <span
                      className={cn(
                        'shrink-0 text-sm font-normal min-w-[120px] whitespace-nowrap',
                        isFullyCovered ? 'text-text-muted' : 'text-text-primary'
                      )}
                    >
                      {category.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: total }, (_, i) => (
                        <span
                          key={`${category.label}-${i}`}
                          className={cn(
                            'w-2.5 h-2.5 rounded-full shrink-0',
                            i < lit ? 'bg-teal-500' : 'team-detail-dot-empty'
                          )}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Zone B - Action Workspace */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div
          data-testid="team-workspace-card"
          className={cn(DESIGN_SYSTEM_CARD, 'team-detail-content-card order-1 lg:order-1 lg:col-span-3 p-0 overflow-hidden')}
        >
          <h2 className="sr-only">Team Workspace</h2>

          <div>
            <section className="px-5 pt-4 pb-4 border-b border-arena-border">
              <div className="flex items-start justify-between gap-2">
                <h3 className={SECTION_LABEL_CLASS}>
                  Project Goal
                </h3>
                {isCaptain && !isEditingDescription && (
                  <button
                    type="button"
                    aria-label="Edit project goal"
                    className="p-1.5 rounded-md text-text-secondary hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    onClick={() => {
                      setDescriptionInput(team.description || '');
                      setIsEditingDescription(true);
                    }}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isEditingDescription ? (
                <div className="space-y-3 mt-1.5">
                  <textarea
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    placeholder={CONTENT_HELPERS.goal}
                    className={cn(
                      'w-full p-3 border-2 focus-ring-control text-base resize-none transition-colors',
                      'bg-gray-50 dark:bg-gray-800 text-text-primary placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-lg',
                      descriptionInput.trim().length < 10
                        ? 'border-error/50'
                        : 'border-gray-200 dark:border-gray-600 focus:border-teal-500'
                    )}
                    rows={3}
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between">
                    {descriptionInput.trim().length < 10 ? (
                      <p className="text-xs text-error">Must be at least 10 characters</p>
                    ) : (
                      <span />
                    )}
                    <p className="text-xs text-text-secondary">{descriptionInput.length}/500</p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="border border-gray-300 dark:border-gray-600 rounded-lg"
                      onClick={() => {
                        setDescriptionInput(team.description || '');
                        setIsEditingDescription(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                      onClick={handleSaveDescription}
                      disabled={descriptionInput.trim().length < 10}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-normal text-text-primary mt-1.5">
                  {team.description || (
                    <span className="text-text-secondary italic">{CONTENT_HELPERS.goal}</span>
                  )}
                </p>
              )}
            </section>

            <section className="px-5 py-4 border-b border-arena-border">
              <div className="flex items-start justify-between gap-2">
                <h3 className={SECTION_LABEL_CLASS}>
                  Problem to Solve
                </h3>
                {isCaptain && !isEditingProblem && (
                  <button
                    type="button"
                    aria-label="Edit problem statement"
                    className="p-1.5 rounded-md text-text-secondary hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    onClick={() => {
                      setProblemInput(team.problem || '');
                      setIsEditingProblem(true);
                    }}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isEditingProblem ? (
                <div className="space-y-3 mt-1.5">
                  <textarea
                    value={problemInput}
                    onChange={(e) => setProblemInput(e.target.value)}
                    placeholder={CONTENT_HELPERS.problem}
                    className={cn(
                      'w-full p-3 border-2 focus-ring-control text-base resize-none transition-colors',
                      'bg-gray-50 dark:bg-gray-800 text-text-primary placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-lg',
                      problemInput.trim().length < 10
                        ? 'border-error/50'
                        : 'border-gray-200 dark:border-gray-600 focus:border-teal-500'
                    )}
                    rows={3}
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between">
                    {problemInput.trim().length < 10 ? (
                      <p className="text-xs text-error">Must be at least 10 characters</p>
                    ) : (
                      <span />
                    )}
                    <p className="text-xs text-text-secondary">{problemInput.length}/500</p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="border border-gray-300 dark:border-gray-600 rounded-lg"
                      onClick={() => {
                        setProblemInput(team.problem || '');
                        setIsEditingProblem(false);
                      }}
                      disabled={isSavingProblem}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                      onClick={handleSaveProblem}
                      disabled={problemInput.trim().length < 10 || isSavingProblem}
                      loading={isSavingProblem}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-normal text-text-primary mt-1.5">
                  {team.problem || (
                    <span className="text-text-secondary italic">{CONTENT_HELPERS.problem}</span>
                  )}
                </p>
              )}
            </section>

            <section className="px-5 py-4 border-b border-arena-border">
              <div className="flex items-start justify-between gap-2">
                <h3 className={SECTION_LABEL_CLASS}>
                  More Info
                </h3>
                {isCaptain && !isEditingMoreInfo && (
                  <button
                    type="button"
                    aria-label="Edit additional context"
                    className="p-1.5 rounded-md text-text-secondary hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    onClick={() => setIsEditingMoreInfo(true)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isEditingMoreInfo ? (
                <div className="space-y-3 mt-1.5">
                  <textarea
                    value={moreInfoText}
                    onChange={(e) => setMoreInfoText(e.target.value)}
                    placeholder={CONTENT_HELPERS.moreInfo}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-text-primary placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-lg resize-none focus-ring-control transition-all"
                    rows={4}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="border border-gray-300 dark:border-gray-600 rounded-lg"
                      onClick={() => {
                        setMoreInfoText(team.moreInfo || '');
                        setIsEditingMoreInfo(false);
                      }}
                      disabled={isSavingMoreInfo}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                      onClick={handleSaveMoreInfo}
                      disabled={isSavingMoreInfo}
                      loading={isSavingMoreInfo}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-normal text-text-primary mt-1.5">
                  {team.moreInfo || (
                    <span className="text-text-secondary italic">{CONTENT_HELPERS.moreInfo}</span>
                  )}
                </p>
              )}
            </section>

            <section className="px-5 py-4">
              <h3 className={SECTION_LABEL_CLASS}>
                Quick Reactions
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {REACTION_OPTIONS.map((reaction) => {
                  const isActive = Boolean(userReactions[reaction.key]);
                  return (
                    <button
                      key={reaction.key}
                      type="button"
                      className={cn(
                        'team-detail-reaction-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm font-normal transition-transform transition-colors',
                        'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-text-primary',
                        isActive && 'scale-105 bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400'
                      )}
                      onClick={() => toggleReaction(reaction.key)}
                    >
                      <span aria-hidden="true">{reaction.icon}</span>
                      <span>{reaction.label}</span>
                      <span>{reactionCounts[reaction.key] || 0}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        <div
          data-testid="team-members-card"
          className={cn(
            DESIGN_SYSTEM_CARD,
            'team-detail-content-card order-2 lg:order-2 lg:col-span-2 p-5 [&>*:first-child]:mt-0',
            !isMember && 'transition-shadow duration-200 hover:shadow-md'
          )}
        >
          {isCaptain && pendingRequestCount > 0 && (
            <div className="flex items-center justify-end gap-2 mb-4">
              <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                {pendingRequestCount} pending
              </span>
            </div>
          )}
          {isCaptain && (
            <div className="mt-4">
              {pendingRequestCount === 0 ? (
                <p className="team-detail-pending-empty text-xs italic text-text-secondary">No pending requests</p>
              ) : (
                <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 p-3 space-y-3">
                  {(team.joinRequests || []).map((request) => (
                    <div key={request.id} className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <Avatar name={request.userName} size="md" />
                          <div className="min-w-0">
                            <p className="font-semibold text-text-primary break-words">{request.userName}</p>
                            <p className="text-xs text-text-secondary">
                              {new Date(request.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {request.userSkills?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {request.userSkills.map((skill) => (
                            <Badge key={`${request.id}-${skill}`} variant="default" size="xs" className="team-detail-join-request-skill">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {request.message && (
                        <p className="mt-3 text-sm text-text-primary italic">
                          &quot;{request.message}&quot;
                        </p>
                      )}

                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1 bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                          onClick={() => handleRespondToRequest(request.id, true)}
                          disabled={activeRequestId === request.id}
                          leftIcon={<Check className="w-4 h-4" />}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg"
                          onClick={() => handleRespondToRequest(request.id, false)}
                          disabled={activeRequestId === request.id}
                          leftIcon={<XCircle className="w-4 h-4" />}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className={cn(SECTION_LABEL_CLASS, 'pb-2')}>
            Team Members
          </p>
          {(team.members || []).length === 0 ? (
            <p className="text-xs text-text-secondary">No members yet</p>
          ) : (
          <div
            className={cn(
              'mt-2',
              (team.members || []).length > 1 && 'divide-y divide-arena-border'
            )}
          >
            {(team.members || []).map((member, index) => (
              <div key={member.id} className={cn('py-4', index === 0 && 'pt-0', index === (team.members || []).length - 1 && 'pb-0')}>
                <div className="flex items-start gap-3">
                  <Avatar name={member.name} size="md" />

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary break-words">{member.name}</p>

                    {member.callsign && (
                      <p className="mt-0.5 text-xs text-text-secondary break-words">
                        &quot;{member.callsign}&quot;
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {member.id === team.captainId && (
                        <span className="inline-flex items-center rounded-lg bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-600 dark:text-teal-400">
                          Captain
                        </span>
                      )}
                      {(member.skills || []).map((skill) => (
                        <span
                          key={`${member.id}-${skill}`}
                          className="team-detail-member-skill-tag inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-700 text-text-primary px-2 py-0.5 text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                      {member.id !== team.captainId && (member.skills || []).length === 0 && (
                        <p className="text-xs text-text-secondary italic">No skills listed</p>
                      )}
                    </div>
                  </div>

                  {isCaptain && member.id !== team.captainId && (
                    <button
                      type="button"
                      onClick={() => {
                        setMemberToTransfer(member);
                        setShowTransferModal(true);
                      }}
                      className="p-2 text-text-secondary hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-500/10 rounded-md transition-colors flex-shrink-0"
                      title="Make Captain"
                    >
                      <Crown className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      <div className="mt-6 px-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-text-secondary">
        <span>
          {createdLabel ? `Created ${createdLabel} · ` : ''}
          {`Last updated ${lastUpdatedLabel}`}
          {Number.isFinite(editsThisWeek) && editsThisWeek >= 0 ? ` · ${editsThisWeek} edits this week` : ''}
        </span>
        <button
          type="button"
          className="text-sm font-medium text-text-primary hover:text-gray-900 dark:hover:text-white transition-colors text-left sm:text-right"
          onClick={() => onNavigate('marketplace', { tab: 'teams' })}
        >
          Back to all teams
        </button>
      </div>

      {/* Request to Join Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={closeRequestModal}
        title="Request to Join"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-primary">
            Send a message to <span className="font-semibold text-text-primary">{team.name}</span> captain:
          </p>
          <textarea
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            placeholder="Tell the team why you'd like to join and what you can contribute..."
            className="w-full p-3 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-text-primary placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-lg resize-none focus-ring-control transition-all"
            rows={4}
          />

          <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Your Skills
            </p>
            <div className="flex flex-wrap gap-1">
              {user?.skills?.length > 0 ? (
                user.skills.map((skill) => (
                  <span
                    key={skill}
                    className="team-detail-member-skill-tag inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-700 text-text-primary px-2 py-0.5 text-xs"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-text-secondary italic">No skills added</span>
              )}
            </div>
          </div>
        </div>

        <Modal.Footer>
          <Button
            variant="secondary"
            className="border border-gray-300 dark:border-gray-600 rounded-lg"
            onClick={closeRequestModal}
            disabled={isSubmittingRequest}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
            onClick={handleSubmitRequest}
            loading={isSubmittingRequest}
            disabled={isSubmittingRequest}
          >
            Send Request
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Idea Modal */}
      <Modal
        isOpen={isEditingName}
        onClose={() => {
          setTeamNameInput(team.name || '');
          setIsEditingName(false);
        }}
        title="Edit Idea"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Project Idea
            </label>
            <input
              type="text"
              value={teamNameInput}
              onChange={(e) => setTeamNameInput(e.target.value)}
              placeholder="Enter project idea"
              maxLength={50}
              className={cn(
                'w-full px-3 py-3 border-2 focus-ring-control transition-colors text-base',
                'bg-gray-50 dark:bg-gray-800 text-text-primary placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-lg',
                teamNameInput.trim().length < 3
                  ? 'border-error/50'
                  : 'border-gray-200 dark:border-gray-600 focus:border-teal-500'
              )}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && teamNameInput.trim().length >= 3) handleSaveTeamName();
                if (e.key === 'Escape') {
                  setTeamNameInput(team.name || '');
                  setIsEditingName(false);
                }
              }}
            />
            <div className="flex items-center justify-between mt-1">
              {teamNameInput.trim().length < 3 ? (
                <p className="text-xs text-error">Must be at least 3 characters</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-text-secondary">{teamNameInput.length}/50</p>
            </div>
          </div>
        </div>

        <Modal.Footer>
          <Button
            variant="secondary"
            className="border border-gray-300 dark:border-gray-600 rounded-lg"
            onClick={() => {
              setTeamNameInput(team.name || '');
              setIsEditingName(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
            onClick={handleSaveTeamName}
            disabled={teamNameInput.trim().length < 3}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Transfer Captain Modal */}
      <Modal
        isOpen={showTransferModal && !!memberToTransfer}
        onClose={() => {
          setShowTransferModal(false);
          setMemberToTransfer(null);
        }}
        title="Transfer Captain Role"
        size="md"
      >
        {memberToTransfer && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-center gap-4 py-4">
                <div className="text-center">
                  <div className="relative mx-auto mb-2">
                    <Avatar name={user?.name || 'You'} size="lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-warning rounded-full flex items-center justify-center shadow-sm">
                      <Crown className="w-3.5 h-3.5 text-warning-foreground" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-text-primary">You</p>
                  <p className="text-xs text-text-muted">Current Captain</p>
                </div>

                <div className="flex flex-col items-center">
                  <ArrowRightLeft className="w-6 h-6 text-text-muted" />
                </div>

                <div className="text-center">
                  <Avatar name={memberToTransfer.name} size="lg" className="mx-auto mb-2" />
                  <p className="text-sm font-medium text-text-primary">{memberToTransfer.name}</p>
                  <p className="text-xs text-text-muted">New Captain</p>
                </div>
              </div>

              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <p className="text-sm text-warning">
                  <span className="font-semibold">Are you sure?</span> This will transfer all captain privileges to{' '}
                  <span className="font-semibold">{memberToTransfer.name}</span>. You will become a regular team member.
                </p>
              </div>
            </div>

            <Modal.Footer>
              <Button
                variant="secondary"
                className="border border-gray-300 dark:border-gray-600 rounded-lg"
                onClick={() => {
                  setShowTransferModal(false);
                  setMemberToTransfer(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                onClick={handleTransferCaptain}
              >
                <Crown className="w-4 h-4 mr-2" />
                Transfer Captain
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* Leave Team Modal */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Leave Team"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-primary">
            You are about to leave <strong className="text-text-primary">{team.name}</strong>. You can request to join another team afterwards.
          </p>
          <Alert variant="warning">
            Captain role cannot be left from this action.
          </Alert>
        </div>
        <Modal.Footer>
          <Button
            variant="secondary"
            className="border border-gray-300 dark:border-gray-600 rounded-lg"
            onClick={() => setShowLeaveModal(false)}
            disabled={isLeavingTeam}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
            onClick={handleLeaveTeam}
            loading={isLeavingTeam}
            disabled={isLeavingTeam}
          >
            Leave Team
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Idea Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmText('');
        }}
        title="Delete Idea"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-primary">
            This will permanently delete{' '}
            <strong className="text-text-primary">{team.name}</strong>
            , including members, pending requests, invites, and linked project data.
          </p>
          <Alert variant="warning">
            This action cannot be undone.
          </Alert>
          <Input
            label={`Type "${team.name}" to confirm`}
            value={deleteConfirmText}
            onChange={(event) => setDeleteConfirmText(event.target.value)}
            placeholder={team.name}
          />
        </div>
        <Modal.Footer>
          <Button
            variant="secondary"
            className="border border-gray-300 dark:border-gray-600 rounded-lg"
            onClick={() => {
              setShowDeleteModal(false);
              setDeleteConfirmText('');
            }}
            disabled={isDeletingTeam}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteTeam}
            loading={isDeletingTeam}
            disabled={isDeletingTeam || deleteConfirmText !== team.name}
          >
            Delete Idea
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Max Team Size Modal */}
      <Modal
        isOpen={isEditingMaxMembers}
        onClose={() => {
          setIsEditingMaxMembers(false);
          setMaxMembersInput(team.maxMembers || 5);
        }}
        title="Edit Team Size"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Set the maximum number of members for your team (2-5 members).
          </p>
          {memberCount > 0 && (
            <p className="text-sm text-text-primary">
              Current members: <strong>{memberCount}</strong>
            </p>
          )}
          <Select
            label="Max team size"
            value={String(maxMembersInput)}
            onChange={(val) => setMaxMembersInput(Number(val))}
            options={[
              { value: '2', label: '2 members', disabled: memberCount > 2 },
              { value: '3', label: '3 members', disabled: memberCount > 3 },
              { value: '4', label: '4 members', disabled: memberCount > 4 },
              { value: '5', label: '5 members', disabled: memberCount > 5 },
            ]}
          />
          {maxMembersInput < memberCount && (
            <Alert variant="warning">
              Cannot set max size below current member count ({memberCount}).
            </Alert>
          )}
        </div>
        <Modal.Footer>
          <Button
            variant="secondary"
            className="border border-gray-300 dark:border-gray-600 rounded-lg"
            onClick={() => {
              setIsEditingMaxMembers(false);
              setMaxMembersInput(team.maxMembers || 5);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
            onClick={handleSaveMaxMembers}
            disabled={maxMembersInput < memberCount}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default TeamDetail;
