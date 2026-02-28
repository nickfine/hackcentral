/**
 * AdminPanel Page
 * Admin controls for event management
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Shield,
  Settings,
  Users,
  Trophy,
  Clock,
  BarChart3,
  Activity,
  MousePointerClick,
  Target,
  Gavel,
  Megaphone,
  Vote,
  Star,
  Palette,
  Download,
  Trash2,
} from 'lucide-react';
import { cn } from '../lib/design-system';
import { Card, Button, Badge, Input, TextArea, SearchInput, Select, Alert, Tabs, Progress, Modal } from './ui';
import { BackButton } from './shared';
import { HStack, VStack } from './layout';
import { EmptyState } from './ui/ErrorState';
import { EVENT_PHASES, EVENT_PHASE_ORDER } from '../data/constants';
import { useConfigMode } from '../configMode/ConfigModeContext';

// ============================================================================
// ROLE CONFIGURATION
// ============================================================================

/** Doc: primary accent teal only; no green/amber/red as decoration (roles are not status). */
const ROLE_CONFIG = {
  participant: { label: 'Participant', icon: Users, color: 'gray' },
  ambassador: { label: 'Ambassador', icon: Megaphone, color: 'gray' },
  judge: { label: 'Judge', icon: Gavel, color: 'gray' },
  admin: { label: 'Admin', icon: Shield, color: 'teal' },
};

const MESSAGE_PRIORITY_OPTIONS = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'urgent', label: 'Urgent' },
];

/** HackDay Design System: section labels (inside cards), doc §4 */
const ADMIN_SECTION_LABEL =
  'text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase pb-2';
/** Doc: standard card — white/gray-800, gray border, rounded-xl, shadow-sm light only */
const ADMIN_CARD_CLASS =
  'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm dark:shadow-none';
/** Doc: inner block (metric box, phase row container) */
const ADMIN_INNER_BLOCK =
  'p-5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl';
/** Doc: primary button — teal only, rounded-lg */
const ADMIN_PRIMARY_BUTTON = '!bg-teal-500 hover:!bg-teal-600 !text-white !rounded-lg';
/** Doc: current phase / accent highlight */
const ADMIN_ACCENT_BLOCK = 'p-5 bg-teal-500/10 border border-teal-500/30 rounded-xl';
/** Doc: metric label/number (Event Pulse pattern) */
const ADMIN_METRIC_LABEL = 'text-sm font-normal text-gray-600 dark:text-gray-300';
const ADMIN_METRIC_NUMBER = 'text-sm font-semibold text-gray-900 dark:text-white';

import { normalizeAdminMessage } from '../lib/normalizeAdminMessage';

const isForgeHost = () => {
  try {
    return window.parent !== window &&
      (window.location.ancestorOrigins?.length > 0 || document.referrer.includes('atlassian'));
  } catch {
    return false;
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

function AdminPanel({
  user,
  teams = [],
  onNavigate,
  eventPhase,
  onPhaseChange,
  allUsers = [],
  onUpdateUserRole,
  onEventSettingsUpdate,
  onIdeaSummaryChange,
  onRefreshUsers,
  eventBranding = {},
  isEventAdmin = false,
  onRefreshEventPhase,
}) {
  const configMode = useConfigMode();
  const [activeSection, setActiveSection] = useState('overview');
  const [userSearch, setUserSearch] = useState('');
  const [settings, setSettings] = useState({
    maxTeamSize: 6,
    maxVotesPerUser: 3,
  });
  const [motdMessage, setMotdMessage] = useState({
    title: '',
    message: '',
    priority: 'info',
    updatedAt: null,
    updatedBy: null,
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  const [settingsStatus, setSettingsStatus] = useState(null);
  const [messagingStatus, setMessagingStatus] = useState(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingMotd, setIsSavingMotd] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetStatus, setResetStatus] = useState(null);
  const [telemetry, setTelemetry] = useState({
    summary: null,
    topCtaActions: [],
    last7Days: [],
    signupStepMetrics: [],
    worstSignupStep: null,
    teamFormationPipeline: null,
  });
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryError, setTelemetryError] = useState(null);
  const [ideaSummary, setIdeaSummary] = useState([]);
  const [ideaSummaryLoading, setIdeaSummaryLoading] = useState(false);
  const [ideaSummaryError, setIdeaSummaryError] = useState(null);
  const [ideaSummaryStatus, setIdeaSummaryStatus] = useState(null);
  const [markingIdeaId, setMarkingIdeaId] = useState(null);
  const [brandingForm, setBrandingForm] = useState({
    accentColor: '',
    bannerImageUrl: '',
    themePreference: 'system',
    bannerMessage: '',
  });
  const [brandingSaveStatus, setBrandingSaveStatus] = useState(null);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteUserConfirmText, setDeleteUserConfirmText] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteUserStatus, setDeleteUserStatus] = useState(null);

  // Check if user is admin (role or event creator/co-admin from seed)
  const isAdmin = user?.role === 'admin' || isEventAdmin;
  const forgeHost = isForgeHost();
  const configModeActive = Boolean(configMode.isEnabled && configMode.canEdit);

  // Calculate stats including voting
  const stats = useMemo(() => {
    const submitted = teams.filter((t) => t.submission?.status === 'submitted').length;
    const totalMembers = teams.reduce((sum, t) => sum + (t.members?.length || 0), 0);
    
    // Calculate voting statistics
    const teamsWithVotes = teams.filter((t) => (t.submission?.participantVotes || 0) > 0);
    const totalVotes = teams.reduce((sum, t) => sum + (t.submission?.participantVotes || 0), 0);
    const maxVotes = Math.max(...teams.map((t) => t.submission?.participantVotes || 0), 0);
    const avgVotes = submitted > 0 ? (totalVotes / submitted).toFixed(1) : 0;
    
    // Get top voted projects
    const topVotedProjects = [...teams]
      .filter((t) => t.submission?.projectName)
      .sort((a, b) => (b.submission?.participantVotes || 0) - (a.submission?.participantVotes || 0))
      .slice(0, 5);
    
    // Calculate judge scoring statistics
    const scoredProjects = teams.filter((t) => t.submission?.judgeScores?.length > 0);
    const totalJudgeScores = teams.reduce((sum, t) => sum + (t.submission?.judgeScores?.length || 0), 0);
    
    return {
      totalTeams: teams.length,
      submittedProjects: submitted,
      totalParticipants: totalMembers,
      judges: allUsers.filter((u) => u.role === 'judge').length,
      admins: allUsers.filter((u) => u.role === 'admin').length,
      // Voting stats
      totalVotes,
      maxVotes,
      avgVotes,
      teamsWithVotes: teamsWithVotes.length,
      topVotedProjects,
      // Judge scoring stats
      scoredProjects: scoredProjects.length,
      totalJudgeScores,
    };
  }, [teams, allUsers]);

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!userSearch) return allUsers;
    const search = userSearch.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search) ||
        u.role?.toLowerCase().includes(search)
    );
  }, [allUsers, userSearch]);

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;
    const loadTelemetry = async () => {
      setTelemetryLoading(true);
      setTelemetryError(null);

      try {
        if (!forgeHost) {
          if (!isMounted) return;
          setTelemetry({
            summary: {
              totalEvents: 226,
              heroImpressions: 120,
              heroCtaClicks: 46,
              heroCtr: 38.3,
              welcomeImpressions: 92,
              registerClicks: 37,
              registerClickRate: 40.2,
              signupCompleted: 24,
              signupFailed: 3,
              clickToSignupRate: 64.9,
              signupFlowsStarted: 41,
              signupFlowsCompleted: 24,
              signupFlowsAbandoned: 12,
              signupAbandonRate: 29.3,
            },
            topCtaActions: [
              { action: 'signup', count: 37 },
              { action: 'new-to-hackday', count: 6 },
              { action: 'rules', count: 3 },
            ],
            signupStepMetrics: [
              { step: 1, views: 41, next: 34, dropoffs: 4, progressionRate: 82.9, dropoutRate: 9.8 },
              { step: 2, views: 34, next: 27, dropoffs: 5, progressionRate: 79.4, dropoutRate: 14.7 },
              { step: 3, views: 27, next: 24, dropoffs: 3, progressionRate: 88.9, dropoutRate: 11.1 },
            ],
            worstSignupStep: { step: 2, views: 34, next: 27, dropoffs: 5, progressionRate: 79.4, dropoutRate: 14.7 },
            teamFormationPipeline: {
              usersWithTrackedSignup: 41,
              usersWithTeamJoin: 26,
              avgHoursSignupToTeamJoin: 11.8,
              medianHoursSignupToTeamJoin: 7.5,
              joinedWithin24hRate: 58.5,
              eligibleFor24hCheck: 34,
              stillFreeAgentsAfter24h: 8,
              freeAgentAfter24hRate: 23.5,
              invitesToNewSignups: 19,
              acceptedInvitesToNewSignups: 9,
              inviteAcceptanceRateNewSignups: 47.4,
            },
            last7Days: [
              { day: '2026-02-07', heroImpressions: 12, heroCtaClicks: 4, signupCompleted: 2 },
              { day: '2026-02-08', heroImpressions: 19, heroCtaClicks: 6, signupCompleted: 3 },
              { day: '2026-02-09', heroImpressions: 16, heroCtaClicks: 7, signupCompleted: 3 },
              { day: '2026-02-10', heroImpressions: 22, heroCtaClicks: 8, signupCompleted: 4 },
              { day: '2026-02-11', heroImpressions: 17, heroCtaClicks: 7, signupCompleted: 4 },
              { day: '2026-02-12', heroImpressions: 20, heroCtaClicks: 8, signupCompleted: 5 },
              { day: '2026-02-13', heroImpressions: 14, heroCtaClicks: 6, signupCompleted: 3 },
            ],
          });
          return;
        }

        const { invoke } = await import('@forge/bridge');
        const result = await invoke('getTelemetryAnalytics');
        if (!isMounted) return;

        setTelemetry({
          summary: result?.summary || null,
          topCtaActions: result?.topCtaActions || [],
          last7Days: result?.last7Days || [],
          signupStepMetrics: result?.signupStepMetrics || [],
          worstSignupStep: result?.worstSignupStep || null,
          teamFormationPipeline: result?.teamFormationPipeline || null,
        });

        if (result?.error) {
          setTelemetryError(result.error);
        }
      } catch (err) {
        if (!isMounted) return;
        setTelemetryError(err?.message || 'Failed to load telemetry analytics');
      } finally {
        if (isMounted) {
          setTelemetryLoading(false);
        }
      }
    };

    loadTelemetry();
    return () => {
      isMounted = false;
    };
  }, [isAdmin, forgeHost]);

  // Sync branding form from eventBranding when opening Branding tab or when eventBranding updates
  useEffect(() => {
    if (activeSection === 'branding' || Object.keys(eventBranding || {}).length > 0) {
      const b = configModeActive
        ? {
            accentColor: configMode.getFieldValue('branding.accentColor', eventBranding?.accentColor || ''),
            bannerImageUrl: configMode.getFieldValue('branding.bannerImageUrl', eventBranding?.bannerImageUrl || ''),
            themePreference: configMode.getFieldValue('branding.themePreference', eventBranding?.themePreference || 'system') || 'system',
            bannerMessage: configMode.getFieldValue('branding.bannerMessage', eventBranding?.bannerMessage || ''),
          }
        : (eventBranding || {});
      setBrandingForm((prev) => ({
        accentColor: b.accentColor ?? prev.accentColor ?? '',
        bannerImageUrl: b.bannerImageUrl ?? prev.bannerImageUrl ?? '',
        themePreference: ['light', 'dark', 'system'].includes(b.themePreference) ? b.themePreference : (prev.themePreference || 'system'),
        bannerMessage: b.bannerMessage ?? prev.bannerMessage ?? '',
      }));
    }
  }, [activeSection, eventBranding, configModeActive, configMode.getFieldValue]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeSection !== 'settings' && activeSection !== 'messaging') return;
    if (configModeActive && activeSection === 'messaging') {
      setMotdMessage((prev) => ({
        ...prev,
        title: configMode.getFieldValue('dashboard.motd.title', prev.title || ''),
        message: configMode.getFieldValue('dashboard.motd.message', prev.message || ''),
        priority: configMode.getFieldValue('dashboard.motd.priority', prev.priority || 'info') || 'info',
      }));
      return;
    }
    if (!forgeHost) return;

    let isMounted = true;
    const loadEventSettings = async () => {
      setIsLoadingSettings(true);
      setSettingsError(null);

      try {
        const { invoke } = await import('@forge/bridge');
        const result = await invoke('getEventSettings');
        if (!isMounted) return;

        setSettings({
          maxTeamSize: Number(result?.maxTeamSize) || 5,
          maxVotesPerUser: Number(result?.maxVotesPerUser) || 3,
        });
        setMotdMessage(normalizeAdminMessage(result?.motdMessage, result?.motd || ''));
      } catch (err) {
        if (!isMounted) return;
        setSettingsError(err?.message || 'Failed to load event settings.');
      } finally {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
      }
    };

    loadEventSettings();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, activeSection, forgeHost, configModeActive, configMode.getFieldValue]);

  const telemetrySummary = telemetry?.summary || {};
  const signupStepMetrics = telemetry?.signupStepMetrics || [];
  const worstSignupStep = telemetry?.worstSignupStep || null;
  const teamFormationPipeline = telemetry?.teamFormationPipeline || {};
  const maxDailyImpressions = Math.max(
    1,
    ...(telemetry?.last7Days || []).map((day) => day.heroImpressions || 0)
  );

  // Handle phase change
  const handlePhaseChange = (newPhase) => {
    if (onPhaseChange) {
      onPhaseChange(newPhase);
    }
  };

  const loadIdeaSummary = useCallback(async () => {
    if (!isAdmin) return;

    setIdeaSummaryLoading(true);
    setIdeaSummaryError(null);

    try {
      if (!forgeHost) {
        const localIdeas = teams
          .filter((team) => team.id !== 'team-observers')
          .map((team) => ({
            id: team.id,
            name: team.name || '',
            description: team.description || '',
            captainName: team.captainName || 'Unassigned',
            memberCount: team.members?.length || 0,
            pendingCount: team.joinRequests?.length || 0,
            maxMembers: Number(team.maxMembers) || 5,
            lookingFor: Array.isArray(team.lookingFor) ? team.lookingFor : [],
            createdAt: team.createdAt || null,
            submissionStatus: team.submission?.status === 'submitted' ? 'submitted' : 'not_submitted',
            viabilityStatus: team.viabilityStatus || 'viable',
            notViableMeta: team.notViableMeta || null,
          }));

        setIdeaSummary(localIdeas);
        return;
      }

      const { invoke } = await import('@forge/bridge');
      const result = await invoke('getIdeaSummary');
      setIdeaSummary(result?.ideas || []);
    } catch (err) {
      setIdeaSummaryError(err?.message || 'Failed to load idea summary.');
      setIdeaSummary([]);
    } finally {
      setIdeaSummaryLoading(false);
    }
  }, [isAdmin, forgeHost, teams]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeSection !== 'idea-summary') return;
    loadIdeaSummary();
  }, [isAdmin, activeSection, loadIdeaSummary]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeSection !== 'users') return;
    onRefreshUsers?.();
  }, [isAdmin, activeSection, onRefreshUsers]);

  const handleMarkIdeaNotViable = useCallback(
    async (idea) => {
      if (!idea?.id) return;

      const confirmed = window.confirm(
        `Mark "${idea.name || 'this idea'}" as not viable? This will release all team members to free-agent status.`
      );
      if (!confirmed) return;

      setMarkingIdeaId(idea.id);
      setIdeaSummaryStatus(null);

      try {
        if (forgeHost) {
          const { invoke } = await import('@forge/bridge');
          await invoke('markIdeaNotViable', { teamId: idea.id });
        } else {
          setIdeaSummary((prev) =>
            prev.map((entry) =>
              entry.id === idea.id
                ? {
                    ...entry,
                    viabilityStatus: 'not_viable',
                    notViableMeta: {
                      markedAt: new Date().toISOString(),
                      markedByAccountId: user?.id || null,
                      reason: '',
                    },
                    memberCount: 0,
                  }
                : entry
            )
          );
        }

        await onIdeaSummaryChange?.();
        await loadIdeaSummary();
        setIdeaSummaryStatus({ type: 'success', message: 'Idea marked as not viable. Team members are now free agents.' });
      } catch (err) {
        setIdeaSummaryStatus({ type: 'error', message: err?.message || 'Failed to mark idea as not viable.' });
      } finally {
        setMarkingIdeaId(null);
      }
    },
    [forgeHost, loadIdeaSummary, onIdeaSummaryChange, user?.id]
  );

  const handleSaveSettings = async () => {
    const parsedMaxTeamSize = Number(settings.maxTeamSize);
    const parsedMaxVotesPerUser = Number(settings.maxVotesPerUser);

    if (!Number.isFinite(parsedMaxTeamSize) || parsedMaxTeamSize < 2 || parsedMaxTeamSize > 8) {
      setSettingsStatus({ type: 'error', message: 'Max Team Size must be between 2 and 8.' });
      return;
    }

    if (!Number.isFinite(parsedMaxVotesPerUser) || parsedMaxVotesPerUser < 1) {
      setSettingsStatus({ type: 'error', message: 'Max Votes per User must be a number greater than 0.' });
      return;
    }

    setSettingsStatus(null);
    setIsSavingSettings(true);

    try {
      if (forgeHost) {
        const { invoke } = await import('@forge/bridge');
        await invoke('updateEventSettings', {
          settings: {
            maxTeamSize: parsedMaxTeamSize,
            maxVotesPerUser: parsedMaxVotesPerUser,
          },
        });
      }

      setSettingsStatus({ type: 'success', message: 'Event settings saved.' });
      onEventSettingsUpdate?.({ maxVotesPerUser: parsedMaxVotesPerUser });
    } catch (err) {
      setSettingsStatus({ type: 'error', message: err?.message || 'Failed to save event settings.' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleResetAndSeedData = async () => {
    if (resetConfirmText !== 'RESET') {
      setResetStatus({ type: 'error', message: 'Type RESET exactly to confirm this action.' });
      return;
    }

    if (!forgeHost) {
      setResetStatus({ type: 'error', message: 'Reset is only available in Forge-hosted environments.' });
      return;
    }

    setResetStatus(null);
    setIsResettingData(true);
    try {
      const { invoke } = await import('@forge/bridge');
      const result = await invoke('adminResetEventData', {
        confirmText: 'RESET',
        seedProfile: 'balanced_v1',
      });

      const resetSummary = result?.resetSummary || {};
      const seedSummary = result?.seedSummary || {};
      setResetStatus({
        type: 'success',
        message: `Reset complete. Teams deleted: ${resetSummary.teamsDeleted || 0}, members deleted: ${resetSummary.teamMembersDeleted || 0}, seeded teams: ${seedSummary.teamsCreated || 0}, seeded free agents: ${seedSummary.freeAgentsCreated || 0}.`,
      });
      setResetConfirmText('');

      await onIdeaSummaryChange?.();
      await onRefreshUsers?.();
      await loadIdeaSummary();
    } catch (err) {
      setResetStatus({ type: 'error', message: err?.message || 'Failed to reset and seed event data.' });
    } finally {
      setIsResettingData(false);
    }
  };

  const handleSaveMessaging = async () => {
    const trimmedTitle = (motdMessage.title || '').trim();
    const trimmedMessage = (motdMessage.message || '').trim();
    const priority = motdMessage.priority || 'info';

    if (trimmedMessage.length > 500) {
      setMessagingStatus({ type: 'error', message: 'Message must be 500 characters or less.' });
      return;
    }
    if (trimmedTitle.length > 80) {
      setMessagingStatus({ type: 'error', message: 'Title must be 80 characters or less.' });
      return;
    }

    setMessagingStatus(null);
    setIsSavingMotd(true);

    try {
      if (configModeActive) {
        configMode.setFieldValue('dashboard.motd.title', trimmedTitle);
        configMode.setFieldValue('dashboard.motd.message', trimmedMessage);
        configMode.setFieldValue('dashboard.motd.priority', priority);
        const result = await configMode.saveDraft();
        if (!result?.success) {
          throw result?.error || new Error('Failed to save draft');
        }
        setMotdMessage((prev) => ({
          ...prev,
          title: trimmedTitle,
          message: trimmedMessage,
          priority,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.name || user?.displayName || 'Admin',
        }));
        setMessagingStatus({
          type: 'success',
          message: trimmedMessage ? 'Message saved to draft. Publish from the Config drawer when ready.' : 'Draft updated. Publish to hide the message pod for participants.',
        });
        return;
      }

      if (forgeHost) {
        const { invoke } = await import('@forge/bridge');
        const nextMessage = {
          title: trimmedTitle,
          message: trimmedMessage,
          priority,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.name || user?.displayName || 'Admin',
        };

        await invoke('updateEventSettings', {
          settings: {
            motdMessage: nextMessage,
            motd: trimmedMessage,
          },
        });

        setMotdMessage(nextMessage);
        onEventSettingsUpdate?.({ motd: trimmedMessage, motdMessage: nextMessage });
      } else {
        const nextMessage = {
          title: trimmedTitle,
          message: trimmedMessage,
          priority,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.name || user?.displayName || 'Admin',
        };
        setMotdMessage(nextMessage);
        onEventSettingsUpdate?.({ motd: trimmedMessage, motdMessage: nextMessage });
      }

      setMessagingStatus({
        type: 'success',
        message: trimmedMessage ? 'Message published to participant dashboard.' : 'Message cleared.',
      });
    } catch (err) {
      setMessagingStatus({ type: 'error', message: err?.message || 'Failed to save participant message.' });
    } finally {
      setIsSavingMotd(false);
    }
  };

  const handleExportResults = (format = 'csv') => {
    // Prepare results data
    const resultsData = teams
      .filter((t) => t.submission?.projectName)
      .map((team, index) => ({
        rank: index + 1,
        teamName: team.name,
        projectName: team.submission?.projectName || '',
        description: team.submission?.description || '',
        captainName: team.captainName || '',
        memberCount: team.members?.length || 0,
        participantVotes: team.submission?.participantVotes || 0,
        judgeScoresCount: team.submission?.judgeScores?.length || 0,
        avgJudgeScore: team.submission?.judgeScores?.length > 0
          ? (team.submission.judgeScores.reduce((sum, s) => sum + (s.totalScore || 0), 0) / team.submission.judgeScores.length).toFixed(2)
          : 'N/A',
        demoVideoUrl: team.submission?.demoVideoUrl || '',
        repoUrl: team.submission?.repoUrl || '',
        liveDemoUrl: team.submission?.liveDemoUrl || '',
        submittedAt: team.submission?.submittedAt || '',
      }))
      .sort((a, b) => {
        // Sort by votes first, then by judge scores
        if (b.participantVotes !== a.participantVotes) {
          return b.participantVotes - a.participantVotes;
        }
        const aScore = parseFloat(a.avgJudgeScore) || 0;
        const bScore = parseFloat(b.avgJudgeScore) || 0;
        return bScore - aScore;
      });

    if (resultsData.length === 0) {
      alert('No submitted projects to export.');
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `hackday-results-${timestamp}.${format}`;

    if (format === 'json') {
      // Export as JSON
      const json = JSON.stringify(resultsData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // Export as CSV
      const headers = [
        'Rank',
        'Team Name',
        'Project Name',
        'Description',
        'Captain',
        'Members',
        'Votes',
        'Judge Scores',
        'Avg Judge Score',
        'Demo Video',
        'Repo',
        'Live Demo',
        'Submitted At',
      ];

      const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = [
        headers.join(','),
        ...resultsData.map((row) =>
          [
            row.rank,
            row.teamName,
            row.projectName,
            row.description,
            row.captainName,
            row.memberCount,
            row.participantVotes,
            row.judgeScoresCount,
            row.avgJudgeScore,
            row.demoVideoUrl,
            row.repoUrl,
            row.liveDemoUrl,
            row.submittedAt,
          ]
            .map(escapeCSV)
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvRows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    if (deleteUserConfirmText !== 'DELETE') {
      setDeleteUserStatus({ type: 'error', message: 'Type DELETE exactly to confirm this action.' });
      return;
    }

    setDeleteUserStatus(null);
    setIsDeletingUser(true);

    try {
      if (forgeHost) {
        const { invoke } = await import('@forge/bridge');
        await invoke('adminDeleteRegistration', { userId: userToDelete.id });
      }

      setDeleteUserStatus({ type: 'success', message: `User "${userToDelete.name}" has been deleted successfully.` });
      setShowDeleteUserModal(false);
      setUserToDelete(null);
      setDeleteUserConfirmText('');

      // Refresh users list
      await onRefreshUsers?.();
    } catch (err) {
      setDeleteUserStatus({ type: 'error', message: err?.message || 'Failed to delete user registration.' });
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Not admin
  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <EmptyState
          icon={Shield}
          title="Admin Access Required"
          message="This page is only accessible to event administrators."
        />
      </div>
    );
  }

  const handleSaveBranding = useCallback(async () => {
    setIsSavingBranding(true);
    setBrandingSaveStatus(null);
    try {
      if (configModeActive) {
        configMode.setFieldValue('branding.accentColor', brandingForm.accentColor || '');
        configMode.setFieldValue('branding.bannerImageUrl', brandingForm.bannerImageUrl || '');
        configMode.setFieldValue('branding.themePreference', brandingForm.themePreference || 'system');
        configMode.setFieldValue('branding.bannerMessage', brandingForm.bannerMessage || '');
        const result = await configMode.saveDraft();
        if (!result?.success) {
          throw result?.error || new Error('Failed to save branding draft');
        }
        setBrandingSaveStatus({ type: 'success', message: 'Branding saved to draft. Publish from the Config drawer to apply to participants.' });
        return;
      }

      if (!forgeHost || !onRefreshEventPhase) return;
      const { invoke } = await import('@forge/bridge');
      await invoke('updateEventBranding', {
        accentColor: brandingForm.accentColor || undefined,
        bannerImageUrl: brandingForm.bannerImageUrl || undefined,
        themePreference: brandingForm.themePreference || undefined,
        bannerMessage: brandingForm.bannerMessage || undefined,
      });
      setBrandingSaveStatus({ type: 'success', message: 'Branding saved. Theme and banner will update on next load.' });
      onRefreshEventPhase();
    } catch (err) {
      setBrandingSaveStatus({ type: 'error', message: err?.message || 'Failed to save branding.' });
    } finally {
      setIsSavingBranding(false);
    }
  }, [forgeHost, onRefreshEventPhase, brandingForm, configModeActive, configMode]);

  const canRunReset = forgeHost && resetConfirmText === 'RESET' && !isResettingData && !isLoadingSettings;

  return (
    <div className="admin-panel p-4 sm:p-6">
      {/* Header — Tier 1 page title per HackDay Design System */}
      <div className="mb-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <div className="mt-4">
          <p className={ADMIN_SECTION_LABEL}>
            Admin Panel
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-2">
            Event Management
          </h1>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 max-w-3xl">
            Manage users, phases, voting progress, and event settings from one command center.
          </p>
        </div>
      </div>

      {configMode.canEdit && (
        <Card padding="md" className={cn(ADMIN_CARD_CLASS, 'mb-6 border-teal-500/20')}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className={ADMIN_SECTION_LABEL}>Config Mode (Phase 1 Pilot)</p>
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 max-w-3xl">
                Inline-edit participant-facing copy on Dashboard and Rules, then save as draft and publish when ready.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={configModeActive ? 'success' : 'default'}>
                  {configModeActive ? 'Config Mode On' : 'Config Mode Off'}
                </Badge>
                {configMode.hasUnsavedChanges && (
                  <Badge variant="warning">Unsaved changes</Badge>
                )}
                {!configMode.hasUnsavedChanges && configMode.hasDraft && (
                  <Badge variant="default">Draft ready</Badge>
                )}
                {configMode.conflict && (
                  <Badge variant="error">Draft conflict</Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={configModeActive ? 'secondary' : 'primary'}
                onClick={configModeActive ? configMode.exitConfigMode : configMode.enterConfigMode}
                loading={configMode.isLoading}
              >
                {configModeActive ? 'Exit Config Mode' : 'Enter Config Mode'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!configModeActive) configMode.enterConfigMode();
                  onNavigate('dashboard');
                }}
              >
                Open Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!configModeActive) configMode.enterConfigMode();
                  onNavigate('rules');
                }}
              >
                Open Rules
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Overview — 24px gap per doc */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
        <Card padding="md" className={ADMIN_CARD_CLASS}>
          <div className="text-center">
            <Users className="w-9 h-9 text-gray-500 dark:text-gray-400 mx-auto mb-3" />
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalParticipants}</p>
            <p className={ADMIN_METRIC_LABEL}>Participants</p>
          </div>
        </Card>
        <Card padding="md" className={ADMIN_CARD_CLASS}>
          <div className="text-center">
            <Trophy className="w-9 h-9 text-gray-500 dark:text-gray-400 mx-auto mb-3" />
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalTeams}</p>
            <p className={ADMIN_METRIC_LABEL}>Teams</p>
          </div>
        </Card>
        <Card padding="md" className={ADMIN_CARD_CLASS}>
          <div className="text-center">
            <BarChart3 className="w-9 h-9 text-gray-500 dark:text-gray-400 mx-auto mb-3" />
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.submittedProjects}</p>
            <p className={ADMIN_METRIC_LABEL}>Submissions</p>
          </div>
        </Card>
        <Card padding="md" className={ADMIN_CARD_CLASS}>
          <div className="text-center">
            <Gavel className="w-9 h-9 text-gray-500 dark:text-gray-400 mx-auto mb-3" />
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.judges}</p>
            <p className={ADMIN_METRIC_LABEL}>Judges</p>
          </div>
        </Card>
      </div>

      {/* Section Tabs */}
      <Tabs value={activeSection} onChange={setActiveSection} className="mb-6">
        <Tabs.List className="flex flex-wrap gap-x-1 gap-y-1">
          <Tabs.Tab value="overview" icon={<BarChart3 className="w-4 h-4" />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="branding" icon={<Palette className="w-4 h-4" />}>
            Branding
          </Tabs.Tab>
          <Tabs.Tab value="idea-summary" icon={<Users className="w-4 h-4" />}>
            Idea Summary
          </Tabs.Tab>
          <Tabs.Tab value="analytics" icon={<Activity className="w-4 h-4" />}>
            Analytics
          </Tabs.Tab>
          <Tabs.Tab value="phases" icon={<Clock className="w-4 h-4" />}>
            Phases
          </Tabs.Tab>
          <Tabs.Tab value="users" icon={<Users className="w-4 h-4" />}>
            Users
          </Tabs.Tab>
          <Tabs.Tab value="messaging" icon={<Megaphone className="w-4 h-4" />}>
            Messaging
          </Tabs.Tab>
          <Tabs.Tab value="settings" icon={<Settings className="w-4 h-4" />}>
            Settings
          </Tabs.Tab>
        </Tabs.List>

        {/* Idea Summary Panel */}
        <Tabs.Panel value="idea-summary">
          <Card padding="md" className={ADMIN_CARD_CLASS}>
            <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Idea Summary</Card.Title>
            <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-5">
              At-a-glance view of all ideas/teams and their current viability for this hackday.
            </p>

            {ideaSummaryStatus && (
              <Alert variant={ideaSummaryStatus.type === 'error' ? 'error' : 'success'} className="mb-4">
                {ideaSummaryStatus.message}
              </Alert>
            )}

            {ideaSummaryError && (
              <Alert variant="warning" className="mb-4">
                {ideaSummaryError}
              </Alert>
            )}

            {ideaSummaryLoading && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading idea summary...</p>
            )}

            {!ideaSummaryLoading && ideaSummary.length === 0 && (
              <EmptyState
                icon={Users}
                title="No Ideas Yet"
                message="Ideas will appear here as teams are created."
              />
            )}

            {!ideaSummaryLoading && ideaSummary.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-left">
                    <tr>
                      <th className={cn('px-3 py-2', ADMIN_SECTION_LABEL)}>Idea</th>
                      <th className={cn('px-3 py-2', ADMIN_SECTION_LABEL)}>Captain</th>
                      <th className={cn('px-3 py-2', ADMIN_SECTION_LABEL)}>Members</th>
                      <th className={cn('px-3 py-2', ADMIN_SECTION_LABEL)}>Created</th>
                      <th className={cn('px-3 py-2', ADMIN_SECTION_LABEL)}>Status</th>
                      <th className={cn('px-3 py-2 text-right', ADMIN_SECTION_LABEL)}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ideaSummary.map((idea) => {
                      const isNotViable = idea.viabilityStatus === 'not_viable';
                      const isMarking = markingIdeaId === idea.id;
                      const createdAtLabel = idea.createdAt
                        ? new Date(idea.createdAt).toLocaleDateString()
                        : 'Unknown';
                      return (
                        <tr key={idea.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-3 py-3 align-top">
                            <p className="font-bold text-gray-900 dark:text-white">{idea.name || 'Untitled Idea'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {idea.description || 'No description provided.'}
                            </p>
                          </td>
                          <td className="px-3 py-3 align-top text-gray-700 dark:text-gray-300">{idea.captainName || 'Unassigned'}</td>
                          <td className="px-3 py-3 align-top text-gray-700 dark:text-gray-300">
                            {idea.memberCount || 0}/{idea.maxMembers || 5}
                            {(idea.pendingCount || 0) > 0 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400"> ({idea.pendingCount} pending)</span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-gray-700 dark:text-gray-300">{createdAtLabel}</td>
                          <td className="px-3 py-3 align-top">
                            {isNotViable ? (
                              <Badge variant="error" size="sm">Not Viable</Badge>
                            ) : (
                              <Badge variant="success" size="sm">Viable</Badge>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-right">
                            <Button
                              size="sm"
                              variant={isNotViable ? 'secondary' : 'danger'}
                              disabled={isNotViable || isMarking}
                              loading={isMarking}
                              onClick={() => handleMarkIdeaNotViable(idea)}
                            >
                              {isNotViable ? 'Marked' : 'Mark Not Viable'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </Tabs.Panel>

        {/* Overview Panel */}
        <Tabs.Panel value="overview">
          <VStack gap="4">
            <Card padding="md" className={ADMIN_CARD_CLASS}>
              <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Event Overview</Card.Title>
              <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-5">
                Monitor current phase status and overall submission progress.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className={ADMIN_SECTION_LABEL}>Current Phase</p>
                  <div className={ADMIN_ACCENT_BLOCK}>
                    <p className="text-xl font-black text-teal-500">
                      {EVENT_PHASES[eventPhase]?.label || eventPhase}
                    </p>
                    <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300">
                      {EVENT_PHASES[eventPhase]?.description}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className={ADMIN_SECTION_LABEL}>Submission Progress</p>
                  <div className={ADMIN_INNER_BLOCK}>
                    <Progress 
                      variant="teal"
                      value={(stats.submittedProjects / Math.max(stats.totalTeams, 1)) * 100} 
                      showLabel 
                    />
                    <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mt-2">
                      {stats.submittedProjects} of {stats.totalTeams} teams submitted
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card padding="md" className={ADMIN_CARD_CLASS} data-testid="admin-operator-actions-card">
              <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Operator Actions</Card.Title>
              <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-5">
                Keep participant momentum high by publishing clear guidance and checking risk signals.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div className={ADMIN_INNER_BLOCK}>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">1. Publish a clear priority message</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    Use the participant bulletin to reduce confusion during active phases.
                  </p>
                </div>
                <div className={ADMIN_INNER_BLOCK}>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">2. Watch free-agent and submission risk</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    Prioritize interventions where team formation or handoff readiness is weak.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button size="sm" className={ADMIN_PRIMARY_BUTTON} onClick={() => setActiveSection('messaging')}>
                  Open Messaging
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setActiveSection('analytics')}>
                  Open Analytics
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setActiveSection('users')}>
                  Open User Controls
                </Button>
              </div>
            </Card>

            {/* Voting Statistics */}
            <Card padding="md" className={ADMIN_CARD_CLASS}>
              <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                <HStack gap="2" align="center">
                  <Vote className="w-5 h-5 text-teal-500" />
                  <span>Voting Statistics</span>
                </HStack>
              </Card.Title>
              <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-5">
                Track participation volume and which projects are leading.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalVotes}</p>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total Votes</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.teamsWithVotes}</p>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Projects Voted</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.avgVotes}</p>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Avg per Project</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-2xl font-black text-teal-500">{stats.maxVotes}</p>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Top Votes</p>
                </div>
              </div>

              {/* Top Voted Projects */}
              {stats.topVotedProjects.length > 0 && (
                <div>
                  <p className="text-base font-bold text-gray-500 dark:text-gray-400 mb-3">Top Voted Projects</p>
                  <VStack gap="2">
                    {stats.topVotedProjects.map((team, index) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                          index === 0 ? 'bg-teal-500/20 text-teal-500' :
                          index === 1 ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300' :
                          index === 2 ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300' :
                          'bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400'
                        )}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white truncate">
                            {team.submission?.projectName || team.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{team.name}</p>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1 bg-teal-500/10 rounded-lg">
                          <Star className="w-4 h-4 text-teal-500" />
                          <span className="font-bold text-teal-500">{team.submission?.participantVotes || 0}</span>
                        </div>
                      </div>
                    ))}
                  </VStack>
                </div>
              )}

              {stats.topVotedProjects.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Vote className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-base font-semibold">No votes cast yet</p>
                  <p className="text-sm">Voting statistics will appear here during the voting phase</p>
                </div>
              )}
            </Card>

            {/* Judge Scoring Progress */}
            <Card padding="md" className={ADMIN_CARD_CLASS}>
              <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                <HStack gap="2" align="center">
                  <Gavel className="w-5 h-5 text-teal-500" />
                  <span>Judge Scoring Progress</span>
                </HStack>
              </Card.Title>
              <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-5">
                See how many projects have received judge scores so far.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.judges}</p>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Active Judges</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.scoredProjects}</p>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Projects Scored</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalJudgeScores}</p>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total Scores</p>
                </div>
              </div>
              
              {stats.submittedProjects > 0 && (
                <div className="mt-4">
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-2">
                    Scoring progress: {stats.scoredProjects} of {stats.submittedProjects} projects
                  </p>
                  <Progress 
                    variant="teal"
                    value={(stats.scoredProjects / Math.max(stats.submittedProjects, 1)) * 100} 
                    showLabel 
                  />
                </div>
              )}
            </Card>

            {/* Export Results */}
            <Card padding="md" className={ADMIN_CARD_CLASS}>
              <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                <HStack gap="2" align="center">
                  <Download className="w-5 h-5 text-teal-500" />
                  <span>Export Results</span>
                </HStack>
              </Card.Title>
              <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-5">
                Download complete results data including team rankings, votes, judge scores, and project details.
              </p>

              {stats.submittedProjects > 0 ? (
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    className={ADMIN_PRIMARY_BUTTON}
                    onClick={() => handleExportResults('csv')}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Export as CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleExportResults('json')}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Export as JSON
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No submitted projects to export yet</p>
                </div>
              )}
            </Card>
          </VStack>
        </Tabs.Panel>

        {/* Analytics Panel */}
        <Tabs.Panel value="analytics">
          <VStack gap="4">
            <Card padding="md" className={ADMIN_CARD_CLASS}>
              <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Telemetry Analytics</Card.Title>
              <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-5">
                Real-time insight into hero visibility, CTA engagement, and signup conversion.
              </p>

              {telemetryLoading && (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading telemetry metrics...</p>
              )}

              {!telemetryLoading && telemetryError && (
                <Alert variant="warning" className="mb-4">
                  {telemetryError}
                </Alert>
              )}

              {!telemetryLoading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{telemetrySummary.heroImpressions || 0}</p>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Hero Impressions</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{telemetrySummary.heroCtaClicks || 0}</p>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Hero CTA Clicks</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                    <p className="text-2xl font-black text-teal-500">{telemetrySummary.heroCtr || 0}%</p>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Hero CTR</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{telemetrySummary.signupCompleted || 0}</p>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Signup Completed</p>
                  </div>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card padding="md" className={ADMIN_CARD_CLASS}>
                <Card.Title className="text-lg sm:text-xl mb-4">
                  <HStack gap="2" align="center">
                    <Target className="w-5 h-5 text-teal-500" />
                    <span>Signup Funnel</span>
                  </HStack>
                </Card.Title>
                <VStack gap="3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Welcome Hero to Register CTA: {telemetrySummary.registerClickRate || 0}%
                    </p>
                    <Progress variant="teal" value={telemetrySummary.registerClickRate || 0} showLabel />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Register CTA to Signup Complete: {telemetrySummary.clickToSignupRate || 0}%
                    </p>
                    <Progress variant="teal" value={telemetrySummary.clickToSignupRate || 0} showLabel />
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                      <p className="text-lg font-black text-gray-900 dark:text-white">{telemetrySummary.welcomeImpressions || 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.06em]">Welcome Views</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                      <p className="text-lg font-black text-gray-900 dark:text-white">{telemetrySummary.registerClicks || 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.06em]">Register Clicks</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                      <p className="text-lg font-black text-gray-900 dark:text-white">{telemetrySummary.signupFailed || 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.06em]">Signup Fails</p>
                    </div>
                  </div>
                </VStack>
              </Card>

              <Card padding="md" className={ADMIN_CARD_CLASS}>
                <Card.Title className="text-lg sm:text-xl mb-4">
                  <HStack gap="2" align="center">
                    <MousePointerClick className="w-5 h-5 text-teal-500" />
                    <span>Top CTA Actions</span>
                  </HStack>
                </Card.Title>
                {(telemetry.topCtaActions || []).length > 0 ? (
                  <VStack gap="2">
                    {telemetry.topCtaActions.map((item) => (
                      <div
                        key={item.action}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <p className="font-semibold text-gray-900 dark:text-white capitalize">{item.action.replace(/-/g, ' ')}</p>
                        <Badge variant="default">{item.count}</Badge>
                      </div>
                    ))}
                  </VStack>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No CTA activity captured yet.</p>
                )}
              </Card>
            </div>

            <Card padding="md" className={ADMIN_CARD_CLASS}>
              <Card.Title className="text-lg sm:text-xl mb-2">Signup Tab Drop-off (3 Steps)</Card.Title>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Dropout analysis across Identity, Skills, and Participation.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-xl font-black text-gray-900 dark:text-white">{telemetrySummary.signupFlowsStarted || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.06em]">Flows Started</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-xl font-black text-gray-900 dark:text-white">{telemetrySummary.signupFlowsCompleted || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.06em]">Flows Completed</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-xl font-black text-gray-900 dark:text-white">{telemetrySummary.signupFlowsAbandoned || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.06em]">Flows Abandoned</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-xl font-black text-teal-500">{telemetrySummary.signupAbandonRate || 0}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.06em]">Abandon Rate</p>
                </div>
              </div>

              {signupStepMetrics.length > 0 ? (
                <VStack gap="3">
                  {signupStepMetrics.map((stepMetric) => {
                    const stepName = stepMetric.step === 1
                      ? 'Identity'
                      : stepMetric.step === 2
                        ? 'Skills'
                        : 'Participation';

                    return (
                      <div key={stepMetric.step} className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-gray-900 dark:text-white">
                            Step {stepMetric.step}: {stepName}
                          </p>
                          <Badge variant="default">{stepMetric.dropoutRate || 0}% drop</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <p>Views: {stepMetric.views || 0}</p>
                          <p>Advanced: {stepMetric.next || 0}</p>
                          <p>Dropoffs: {stepMetric.dropoffs || 0}</p>
                        </div>
                        <Progress variant="teal" value={stepMetric.progressionRate || 0} showLabel />
                      </div>
                    );
                  })}
                </VStack>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No signup step telemetry captured yet.</p>
              )}

              {worstSignupStep && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-4">
                  Highest observed drop-off: Step {worstSignupStep.step} ({worstSignupStep.dropoutRate || 0}%).
                </p>
              )}
            </Card>

            <Card padding="md" className={ADMIN_CARD_CLASS}>
              <Card.Title className="text-lg sm:text-xl mb-2">Team Formation Pipeline</Card.Title>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                From signup completion to first team join, free-agent retention, and invite conversion.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-xl font-black text-gray-900 dark:text-white">{teamFormationPipeline.usersWithTrackedSignup || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.06em]">Tracked Signups</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-xl font-black text-gray-900 dark:text-white">{teamFormationPipeline.usersWithTeamJoin || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.06em]">Joined a Team</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-xl font-black text-teal-500">{teamFormationPipeline.avgHoursSignupToTeamJoin || 0}h</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.06em]">Avg Join Time</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                  <p className="text-xl font-black text-gray-900 dark:text-white">{teamFormationPipeline.medianHoursSignupToTeamJoin || 0}h</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.06em]">Median Join Time</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    Joined Team Within 24h: {teamFormationPipeline.joinedWithin24hRate || 0}%
                  </p>
                  <Progress variant="teal" value={teamFormationPipeline.joinedWithin24hRate || 0} showLabel />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Speed from signup completion to first accepted team membership.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    Still Free Agent After 24h: {teamFormationPipeline.freeAgentAfter24hRate || 0}%
                  </p>
                  <Progress variant="teal" value={teamFormationPipeline.freeAgentAfter24hRate || 0} showLabel />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {teamFormationPipeline.stillFreeAgentsAfter24h || 0} of {teamFormationPipeline.eligibleFor24hCheck || 0} eligible signups.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  Invite Acceptance (Newly Signed-Up Users): {teamFormationPipeline.inviteAcceptanceRateNewSignups || 0}%
                </p>
                <Progress variant="teal" value={teamFormationPipeline.inviteAcceptanceRateNewSignups || 0} showLabel />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {teamFormationPipeline.acceptedInvitesToNewSignups || 0} accepted out of {teamFormationPipeline.invitesToNewSignups || 0} invites sent within 24h of signup completion.
                </p>
              </div>
            </Card>

            <Card padding="md" className={ADMIN_CARD_CLASS}>
              <Card.Title className="text-lg sm:text-xl mb-4">7-Day Hero Trend</Card.Title>
              {(telemetry.last7Days || []).length > 0 ? (
                <VStack gap="2">
                  {telemetry.last7Days.map((day) => (
                    <div key={day.day} className="grid grid-cols-[88px_1fr_52px] items-center gap-3">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        {new Date(day.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${Math.max(4, Math.round(((day.heroImpressions || 0) / maxDailyImpressions) * 100))}%` }}
                        />
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white text-right">{day.heroImpressions || 0}</p>
                    </div>
                  ))}
                </VStack>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Not enough telemetry data yet for trend view.</p>
              )}
            </Card>
          </VStack>
        </Tabs.Panel>

        {/* Phases Panel */}
        <Tabs.Panel value="phases">
          <Card padding="md" className={ADMIN_CARD_CLASS}>
            <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Event Phases</Card.Title>
            <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-5">
              Move the event forward deliberately. Phase updates apply to all participants immediately.
            </p>
            <Alert variant="warning" className="mb-4">
              Changing the event phase affects all participants. Make sure you're ready before proceeding.
            </Alert>
            
            <VStack gap="3">
              {EVENT_PHASE_ORDER.map((phaseKey, index) => {
                const phase = EVENT_PHASES[phaseKey];
                const isCurrent = eventPhase === phaseKey;
                const isPast = EVENT_PHASE_ORDER.indexOf(eventPhase) > index;
                
                return (
                  <button
                    key={phaseKey}
                    onClick={() => handlePhaseChange(phaseKey)}
                    className={cn(
                      'w-full flex items-center gap-4 p-5 rounded-lg border transition-all text-left',
                      isCurrent
                        ? 'bg-teal-500/10 border-teal-500'
                        : isPast
                          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-bold text-base',
                      isCurrent
                        ? 'bg-teal-500 text-white'
                        : isPast
                          ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                          : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    )}>
                      {isPast ? '✓' : index + 1}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        'font-bold',
                        isCurrent ? 'text-teal-500' : 'text-gray-900 dark:text-white'
                      )}>
                        {phase.label}
                      </p>
                      <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{phase.description}</p>
                    </div>
                    {isCurrent && (
                      <Badge className="!bg-teal-500/20 !text-teal-500 border-0">Current</Badge>
                    )}
                  </button>
                );
              })}
            </VStack>
          </Card>
        </Tabs.Panel>

        {/* Users Panel */}
        <Tabs.Panel value="users">
          <Card padding="md" className={ADMIN_CARD_CLASS}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-1">User Management</Card.Title>
                <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300">
                  Search by name, email, or role, then update user permissions.
                </p>
              </div>
              <SearchInput
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onClear={() => setUserSearch('')}
                placeholder="Search users..."
                className="w-full sm:w-72"
              />
            </div>
            
            {filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className={cn('text-left py-3 px-4', ADMIN_SECTION_LABEL)}>Name</th>
                      <th className={cn('text-left py-3 px-4', ADMIN_SECTION_LABEL)}>Email</th>
                      <th className={cn('text-left py-3 px-4', ADMIN_SECTION_LABEL)}>Role</th>
                      <th className={cn('text-right py-3 px-4', ADMIN_SECTION_LABEL)}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.slice(0, 20).map((u) => (
                      <tr key={u.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-800/50">
                        <td className="py-4 px-4 text-base font-semibold text-gray-900 dark:text-white">{u.name}</td>
                        <td className="py-4 px-4 text-sm sm:text-base text-gray-700 dark:text-gray-300">{u.email}</td>
                        <td className="py-4 px-4">
                          <Badge variant="default" size="sm" className="capitalize">
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value={u.role}
                              onChange={(newRole) => onUpdateUserRole?.(u.id, newRole)}
                              options={Object.entries(ROLE_CONFIG).map(([key, config]) => ({
                                value: key,
                                label: config.label,
                              }))}
                              size="sm"
                              className="w-32"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setUserToDelete(u);
                                setShowDeleteUserModal(true);
                                setDeleteUserConfirmText('');
                                setDeleteUserStatus(null);
                              }}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              aria-label="Delete user"
                              title="Delete user registration"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length > 20 && (
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 text-center py-4">
                    Showing 20 of {filteredUsers.length} users. Use search to filter.
                  </p>
                )}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No Users Found"
                message={userSearch ? 'Try a different search term' : 'No users registered yet'}
                compact
              />
            )}
          </Card>
        </Tabs.Panel>

        {/* Messaging Panel */}
        <Tabs.Panel value="messaging">
          <Card padding="md" className={ADMIN_CARD_CLASS}>
            <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Participant Messaging</Card.Title>
            <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-5">
              Publish an admin message to show in a dedicated dashboard pod for all participants.
            </p>

            {settingsError && (
              <Alert variant="warning" className="mb-4">
                {settingsError}
              </Alert>
            )}

            {messagingStatus && (
              <Alert variant={messagingStatus.type} className="mb-4">
                {messagingStatus.message}
              </Alert>
            )}

            <VStack gap="5">
              <Input
                label="Message Title"
                value={motdMessage.title}
                onChange={(e) => setMotdMessage((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Optional short title..."
                helperText="Shown as the heading in the participant message panel."
                disabled={isSavingMotd || isLoadingSettings}
              />

              <Select
                label="Priority"
                value={motdMessage.priority}
                onChange={(value) => setMotdMessage((prev) => ({ ...prev, priority: value || 'info' }))}
                options={MESSAGE_PRIORITY_OPTIONS}
                disabled={isSavingMotd || isLoadingSettings}
              />

              <TextArea
                label="Message of the Day"
                value={motdMessage.message}
                onChange={(e) => setMotdMessage((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Share updates, reminders, or announcements for all participants..."
                helperText="This appears in a dashboard message pod only when a message is set."
                rows={4}
                disabled={isSavingMotd || isLoadingSettings}
              />

              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Leave blank and save to hide the message pod.</span>
                <span className={motdMessage.message.length > 500 ? 'text-error font-semibold' : ''}>
                  {motdMessage.message.length}/500
                </span>
              </div>

              {motdMessage.message.trim() && (
                <div className="p-5 rounded-xl border border-teal-500/30 bg-teal-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className={ADMIN_SECTION_LABEL}>
                      Preview
                    </p>
                    <Badge
                      variant={
                        motdMessage.priority === 'urgent'
                          ? 'error'
                          : motdMessage.priority === 'warning'
                            ? 'warning'
                            : 'default'
                      }
                    >
                      {(motdMessage.priority || 'info').toUpperCase()}
                    </Badge>
                  </div>
                  {(motdMessage.title || '').trim() && (
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{motdMessage.title.trim()}</p>
                  )}
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{motdMessage.message.trim()}</p>
                  {(motdMessage.updatedAt || motdMessage.updatedBy) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Last update: {motdMessage.updatedBy || 'Admin'}
                      {motdMessage.updatedAt ? ` • ${new Date(motdMessage.updatedAt).toLocaleString()}` : ''}
                    </p>
                  )}
                </div>
              )}

              <Button
                className={cn('mt-2', ADMIN_PRIMARY_BUTTON)}
                onClick={handleSaveMessaging}
                loading={isSavingMotd}
                disabled={isLoadingSettings || motdMessage.message.length > 500 || motdMessage.title.length > 80}
              >
                {isSavingMotd ? 'Saving...' : 'Save Message'}
              </Button>
            </VStack>
          </Card>
        </Tabs.Panel>

        {/* Settings Panel */}
        <Tabs.Panel value="settings">
          <Card padding="md" className={ADMIN_CARD_CLASS}>
            <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Event Settings</Card.Title>
            <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-5">
              Configure global event options.
            </p>

            {settingsError && (
              <Alert variant="warning" className="mb-4">
                {settingsError}
              </Alert>
            )}

            {settingsStatus && (
              <Alert variant={settingsStatus.type} className="mb-4">
                {settingsStatus.message}
              </Alert>
            )}
            
            <VStack gap="5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Max Team Size"
                  type="number"
                  value={settings.maxTeamSize}
                  onChange={(e) => setSettings((prev) => ({ ...prev, maxTeamSize: e.target.value }))}
                  min={2}
                  max={8}
                  helperText="Maximum number of members per team (2-8)"
                  disabled={isSavingSettings || isLoadingSettings}
                />
                <Input
                  label="Max Votes per User"
                  type="number"
                  value={settings.maxVotesPerUser}
                  onChange={(e) => setSettings((prev) => ({ ...prev, maxVotesPerUser: e.target.value }))}
                  min={1}
                  helperText="Number of votes each user can cast"
                  disabled={isSavingSettings || isLoadingSettings}
                />
              </div>
              
              <Button
                className={cn('mt-4', ADMIN_PRIMARY_BUTTON)}
                onClick={handleSaveSettings}
                loading={isSavingSettings}
                disabled={isLoadingSettings}
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </Button>

              <div className="mt-4 pt-6 border-t border-error/30">
                <div className="p-4 rounded-xl border border-error/40 bg-error/10">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-error mb-2">Danger Zone</p>
                  <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
                    Resets current event teams, members, projects, invites, votes, and scores, then reseeds realistic test data.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Existing admin identities and global event settings are preserved.
                  </p>

                  <Input
                    className="mt-4"
                    label="Type RESET to confirm"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="RESET"
                    disabled={isResettingData || isLoadingSettings}
                    helperText={
                      forgeHost
                        ? 'Type RESET in uppercase to enable reset.'
                        : 'Reset action is available only in Forge-hosted environments.'
                    }
                  />

                  {resetStatus && (
                    <Alert variant={resetStatus.type} className="mt-4">
                      {resetStatus.message}
                    </Alert>
                  )}

                  <Button
                    className="mt-4 bg-error text-white hover:bg-error/90"
                    onClick={handleResetAndSeedData}
                    loading={isResettingData}
                    disabled={!canRunReset}
                  >
                    {isResettingData ? 'Resetting and Seeding...' : 'Reset & Seed Test Data'}
                  </Button>
                </div>
              </div>
            </VStack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="branding">
          <Card padding="md" className={ADMIN_CARD_CLASS}>
            <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Palette className="w-5 h-5 text-teal-500" />
              Branding &amp; Theme
            </Card.Title>
            <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-5">
              Customize accent color, banner, and theme for this HackDay. Changes apply after save and refresh.
              {!isEventAdmin && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                  Only the event creator or co-admins can save changes.
                </span>
              )}
            </p>

            {brandingSaveStatus && (
                <Alert variant={brandingSaveStatus.type === 'error' ? 'error' : 'success'} className="mb-4">
                  {brandingSaveStatus.message}
                </Alert>
              )}

              <VStack gap="5">
                <Input
                  label="Accent color"
                  type="text"
                  value={brandingForm.accentColor}
                  onChange={(e) => setBrandingForm((prev) => ({ ...prev, accentColor: e.target.value }))}
                  placeholder="e.g. #f97316 or orange"
                  helperText="CSS color value for buttons and highlights"
                  disabled={isSavingBranding}
                />
                <Input
                  label="Banner image URL"
                  type="url"
                  value={brandingForm.bannerImageUrl}
                  onChange={(e) => setBrandingForm((prev) => ({ ...prev, bannerImageUrl: e.target.value }))}
                  placeholder="https://..."
                  helperText="Optional header/banner image"
                  disabled={isSavingBranding}
                />
                <Select
                  label="Theme"
                  value={brandingForm.themePreference}
                  onChange={(value) => setBrandingForm((prev) => ({ ...prev, themePreference: value }))}
                  options={[
                    { value: 'system', label: 'System (follow device)' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                  disabled={isSavingBranding}
                />
                <TextArea
                  label="Banner message"
                  value={brandingForm.bannerMessage}
                  onChange={(e) => setBrandingForm((prev) => ({ ...prev, bannerMessage: e.target.value }))}
                  placeholder="Optional short message shown in the banner"
                  rows={2}
                  disabled={isSavingBranding}
                />
                <Button
                  className={ADMIN_PRIMARY_BUTTON}
                  onClick={handleSaveBranding}
                  loading={isSavingBranding}
                  disabled={isSavingBranding || !isEventAdmin}
                >
                  {isSavingBranding ? 'Saving...' : isEventAdmin ? 'Save branding' : 'Save (creator/co-admin only)'}
                </Button>
              </VStack>
            </Card>
          </Tabs.Panel>
      </Tabs>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={showDeleteUserModal}
        onClose={() => {
          setShowDeleteUserModal(false);
          setUserToDelete(null);
          setDeleteUserConfirmText('');
          setDeleteUserStatus(null);
        }}
        title="Delete User Registration"
        size="md"
      >
        <div className="space-y-4">
          {deleteUserStatus && (
            <Alert variant={deleteUserStatus.type === 'error' ? 'error' : 'success'}>
              {deleteUserStatus.message}
            </Alert>
          )}

          <p className="text-sm text-text-primary">
            This will permanently delete the registration for{' '}
            <strong className="text-text-primary">{userToDelete?.name}</strong>
            {' '}({userToDelete?.email}) and remove them from:
          </p>

          <ul className="text-sm text-text-primary list-disc list-inside space-y-1 ml-2">
            <li>All team memberships and pending join requests</li>
            <li>All notifications</li>
            <li>Team captain roles (if applicable)</li>
            <li>Judge scores and votes (if applicable)</li>
          </ul>

          <Alert variant="error">
            This action cannot be undone. The user will need to re-register to participate.
          </Alert>

          <Input
            label='Type "DELETE" to confirm'
            value={deleteUserConfirmText}
            onChange={(e) => setDeleteUserConfirmText(e.target.value)}
            placeholder="DELETE"
          />
        </div>

        <Modal.Footer>
          <Button
            variant="secondary"
            className="border border-gray-300 dark:border-gray-600 rounded-lg"
            onClick={() => {
              setShowDeleteUserModal(false);
              setUserToDelete(null);
              setDeleteUserConfirmText('');
              setDeleteUserStatus(null);
            }}
            disabled={isDeletingUser}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteUser}
            loading={isDeletingUser}
            disabled={isDeletingUser || deleteUserConfirmText !== 'DELETE'}
          >
            Delete User
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default AdminPanel;
