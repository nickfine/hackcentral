/**
 * Dashboard Page - AI Maturity Dashboard
 *
 * Tabs: Wins (default) | Team pulse.
 *
 * Wins tab (hero first, then what to do):
 * 1. WelcomeHero — narrative "Copy a win, use it, share yours", CTAs, maturity pill (~25–35vh)
 * 2. Optional combined nudge (Get started / Next step: add library, create project, share story)
 * 3. PersonalizedNudge (badges, next steps)
 * 4. EngagementNudge — "Hey [Name], X new team assets — copy one?"
 * 5. Community Wins — FeaturedWinsShowcase (Starter badges, Live badge, carousel, WallOfThanksStrip)
 * 6. Your recognition (if authenticated) → Quick Actions
 *
 * Team pulse tab: Collective Progress card, Export, stat cards, Knowledge Distribution,
 * Frontline vs leader, Tabbed Recognition.
 *
 * Rationale: Hero-first hierarchy; maturity only in hero pill on Wins (no duplicate); leaders get full metrics in Pulse.
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import {
  Activity,
  Users,
  Library,
  TrendingUp,
  PenLine,
  X,
  Award,
  Sparkles,
  User,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { useReducedMotion } from 'framer-motion';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAuth } from '../hooks/useAuth';
import {
  WelcomeHero,
  CollectiveProgressCard,
  FeaturedWinsShowcase,
  EnhancedMetricCard,
  GiniRadialProgress,
  QuickActionsPanel,
  PersonalizedNudge,
  TabbedRecognition,
  EngagementNudge,
} from '../components/dashboard';

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const metrics = useQuery(api.metrics.getDashboardMetrics);
  const recentActivity = useQuery(api.metrics.getRecentActivity);
  const topContributors = useQuery(api.metrics.getTopContributors);
  const topMentors = useQuery(api.metrics.getTopMentors);
  const mostReusedAssets = useQuery(api.metrics.getMostReusedAssets);
  const impactStories = useQuery(api.impactStories.list, { limit: 10 });
  const createStory = useMutation(api.impactStories.create);
  const projects = useQuery(api.projects.list, {});
  const libraryAssets = useQuery(api.libraryAssets.list, {});
  const derivedBadges = useQuery(api.recognition.getDerivedBadgesForCurrentUser, {});
  const gini = useQuery(api.metrics.getEarlyAdopterGini);
  const frontlineLeaderGap = useQuery(api.metrics.getFrontlineLeaderGap);
  const profile = useQuery(api.profiles.getCurrentProfile);
  const userCounts = useQuery(api.profiles.getCurrentUserCounts);
  const pulse = useQuery(api.metrics.getActivityPulse);

  const [dashboardTab, setDashboardTab] = useState<'wins' | 'pulse'>('wins');
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyHeadline, setStoryHeadline] = useState('');
  const [storyText, setStoryText] = useState('');
  const [storyProjectId, setStoryProjectId] = useState<Id<'projects'> | ''>('');
  const [storyAssetId, setStoryAssetId] = useState<Id<'libraryAssets'> | ''>('');
  const [isSubmittingStory, setIsSubmittingStory] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const confettiFiredRef = useRef(false);

  // Optional micro-celebration when weekly active count increases (restrained, once per session)
  useEffect(() => {
    if (shouldReduceMotion || metrics?.weeklyActiveCount == null || confettiFiredRef.current) return;
    const current = metrics.weeklyActiveCount;
    const key = 'hackcentral_weekly_active';
    const prevStr = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
    const prev = prevStr != null ? parseInt(prevStr, 10) : null;
    if (prev != null && current > prev) {
      confettiFiredRef.current = true;
      const fire = (opts: Parameters<typeof confetti>[0]) => confetti(opts);
      fire({ particleCount: 30, spread: 60, origin: { y: 0.7 }, colors: ['#06b6d4', '#d946ef', '#a855f7'] });
      setTimeout(() => fire({ particleCount: 20, spread: 100, origin: { y: 0.6 } }), 200);
    }
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, String(current));
  }, [metrics?.weeklyActiveCount, shouldReduceMotion]);

  // First-copy confetti (session-only, restrained)
  const handleFirstCopySuccess = () => {
    if (shouldReduceMotion) return;
    const key = 'hackcentral_first_copy_done';
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    confetti({ particleCount: 24, spread: 50, origin: { y: 0.6 }, colors: ['#06b6d4', '#d946ef'] });
  };

  const scrollToCommunityWins = () => {
    document.getElementById('community-wins')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyHeadline.trim() || isSubmittingStory) return;
    setIsSubmittingStory(true);
    try {
      await createStory({
        headline: storyHeadline.trim(),
        storyText: storyText.trim() || undefined,
        projectId: storyProjectId || undefined,
        assetId: storyAssetId || undefined,
      });
      toast.success('Impact story shared!');
      setStoryModalOpen(false);
      setStoryHeadline('');
      setStoryText('');
      setStoryProjectId('');
      setStoryAssetId('');
    } catch (err) {
      console.error('Failed to share story:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to share story. Please try again.'
      );
    } finally {
      setIsSubmittingStory(false);
    }
  };

  const aiContributorValue =
    metrics !== undefined ? String(metrics.aiContributorCount) : '--';
  const aiContributorDesc =
    metrics !== undefined && metrics.aiContributorPercentage !== undefined
      ? `${metrics.aiContributorPercentage.toFixed(1)}% of employees with AI contributions`
      : 'Employees with AI contributions';

  const projectsWithAiValue =
    metrics !== undefined ? String(metrics.projectsWithAiCount) : '--';
  const projectsWithAiDesc =
    metrics !== undefined && metrics.projectsWithAiPercentage !== undefined
      ? `${metrics.projectsWithAiPercentage.toFixed(1)}% of projects using AI assets`
      : 'Projects using AI assets';

  const libraryAssetValue =
    metrics !== undefined ? String(metrics.libraryAssetCount) : '--';
  const weeklyActiveValue =
    metrics !== undefined ? String(metrics.weeklyActiveCount) : '--';

  const maturityWidth =
    metrics !== undefined &&
    metrics.aiContributorPercentage !== undefined &&
    metrics.projectsWithAiPercentage !== undefined
      ? Math.min(
          100,
          (metrics.aiContributorPercentage + metrics.projectsWithAiPercentage) / 2
        )
      : 25;

  const maturityStages = [
    { name: 'Spark', threshold: 25 },
    { name: 'Momentum', threshold: 50 },
    { name: 'Scale', threshold: 75 },
    { name: 'Transformation', threshold: 100 },
  ];
  const currentStageIndex =
    maturityStages.findIndex((s) => maturityWidth < s.threshold) === -1
      ? maturityStages.length - 1
      : maturityStages.findIndex((s) => maturityWidth < s.threshold);
  const currentStage = maturityStages[currentStageIndex] ?? maturityStages[maturityStages.length - 1];
  const nextStage = maturityStages[currentStageIndex + 1];
  const nextMilestoneCopy =
    nextStage && maturityWidth < 100
      ? `${Math.max(0, Math.round(nextStage.threshold - maturityWidth))}% to ${nextStage.name}`
      : undefined;

  const showFirstTimeCTA =
    recentActivity !== undefined && recentActivity.length === 0;
  const showGraduatedNudge =
    !showFirstTimeCTA &&
    profile != null &&
    userCounts != null &&
    (userCounts.projectCount > 0 || userCounts.libraryAssetCount > 0);
  const nudgeAddLibrary =
    showGraduatedNudge &&
    userCounts &&
    userCounts.projectCount > 0 &&
    userCounts.libraryAssetCount === 0;
  const nudgeCreateProject =
    showGraduatedNudge &&
    userCounts &&
    userCounts.projectCount === 0 &&
    userCounts.libraryAssetCount > 0;
  const nudgeShareStory =
    showGraduatedNudge &&
    userCounts &&
    userCounts.projectCount > 0 &&
    userCounts.libraryAssetCount > 0;

  const giniInterpretation =
    gini === undefined
      ? '—'
      : gini < 0.7
        ? 'Low concentration'
        : gini < 0.8
          ? 'Moderate concentration'
          : 'High concentration';

  const aiContributorMicroStory =
    metrics !== undefined && metrics.aiContributorCount === 1
      ? `1 pioneer sparked ${metrics.aiContributorPercentage?.toFixed(0) ?? 0}% — add your spark today?`
      : metrics !== undefined && metrics.aiContributorCount > 0
        ? `${metrics.aiContributorCount} pioneers building momentum — add your spark today?`
        : undefined;

  const projectsWithAiMicroStory =
    metrics !== undefined && metrics.projectsWithAiCount > 0
      ? 'Join the wildfire — add your project to the count.'
      : undefined;

  const weeklyActiveMicroStory =
    metrics !== undefined && metrics.weeklyActiveCount === 1
      ? '1 active this week — be #2 and unlock the next milestone!'
      : metrics !== undefined && metrics.weeklyActiveCount > 0
        ? `${metrics.weeklyActiveCount} active this week — every copy counts.`
        : metrics !== undefined
          ? 'Be the one this week — contribute to stay active.'
          : undefined;

  const topAssetMicroStory =
    mostReusedAssets != null && mostReusedAssets.length > 0
      ? `"${mostReusedAssets[0].title}" — Battle-tested in ${mostReusedAssets[0].count} projects. Copy risk-free.`
      : undefined;

  const showCombinedNudge = showFirstTimeCTA || nudgeAddLibrary || nudgeCreateProject || nudgeShareStory;

  return (
    <div className="min-w-0 space-y-6">
      {storyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setStoryModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-story-title"
        >
          <div
            className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="share-story-title"
                className="flex items-center gap-2 text-xl font-semibold"
              >
                <PenLine className="h-5 w-5" />
                Share your impact story
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-icon shrink-0"
                onClick={() => setStoryModalOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleStorySubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="story-headline"
                  className="mb-1 block text-sm font-medium"
                >
                  Headline <span className="text-destructive">*</span>
                </label>
                <input
                  id="story-headline"
                  type="text"
                  required
                  value={storyHeadline}
                  onChange={(e) => setStoryHeadline(e.target.value)}
                  className="input w-full"
                  placeholder="e.g. How a win saved 12 hours per week"
                />
              </div>
              <div>
                <label
                  htmlFor="story-text"
                  className="mb-1 block text-sm font-medium"
                >
                  Your story (optional)
                </label>
                <textarea
                  id="story-text"
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  className="input min-h-[100px] w-full"
                  placeholder="Share what worked, what you learned..."
                  rows={4}
                />
              </div>
              <div>
                <label
                  htmlFor="story-project"
                  className="mb-1 block text-sm font-medium"
                >
                  Link to project (optional)
                </label>
                <select
                  id="story-project"
                  value={storyProjectId}
                  onChange={(e) =>
                    setStoryProjectId((e.target.value || '') as Id<'projects'> | '')
                  }
                  className="input w-full"
                >
                  <option value="">None</option>
                  {projects?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="story-asset"
                  className="mb-1 block text-sm font-medium"
                >
                  Link to library asset (optional)
                </label>
                <select
                  id="story-asset"
                  value={storyAssetId}
                  onChange={(e) =>
                    setStoryAssetId(
                      (e.target.value || '') as Id<'libraryAssets'> | ''
                    )
                  }
                  className="input w-full"
                >
                  <option value="">None</option>
                  {libraryAssets?.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setStoryModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingStory || !storyHeadline.trim()}
                >
                  {isSubmittingStory ? 'Sharing…' : 'Share story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dashboard tabs: Wins (default) vs Team pulse */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setDashboardTab('wins')}
          className={`btn btn-sm ${dashboardTab === 'wins' ? 'btn-primary' : 'btn-ghost'}`}
          aria-pressed={dashboardTab === 'wins'}
          aria-label="Wins tab"
        >
          Wins
        </button>
        <button
          type="button"
          onClick={() => setDashboardTab('pulse')}
          className={`btn btn-sm ${dashboardTab === 'pulse' ? 'btn-primary' : 'btn-ghost'}`}
          aria-pressed={dashboardTab === 'pulse'}
          aria-label="Team pulse tab"
        >
          Team pulse
        </button>
      </div>

      {dashboardTab === 'wins' && (
        <>
          <WelcomeHero
            onShareStory={() => setStoryModalOpen(true)}
            currentProgress={maturityWidth}
            currentStageName={currentStage?.name}
            nextMilestoneCopy={nextMilestoneCopy}
          />

          {showCombinedNudge && (
            <div className="card border-primary/20 bg-primary/5 p-4 sm:p-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  {showFirstTimeCTA ? (
                    <>
                      <h2 className="mb-1 text-base font-semibold">Get started</h2>
                      <p className="mb-3 text-sm text-muted-foreground">
                        New to HackDay Central? Copy a win from the Library or create your first project.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Link to="/library" className="btn btn-primary btn-sm">
                          <Library className="mr-2 h-4 w-4" />
                          Explore Library
                        </Link>
                        <Link to="/projects" className="btn btn-outline btn-sm">
                          <Activity className="mr-2 h-4 w-4" />
                          View Projects
                        </Link>
                        <Link to="/profile" className="btn btn-ghost btn-sm">
                          <User className="mr-2 h-4 w-4" />
                          Complete profile
                        </Link>
                        <Link to="/onboarding" className="btn btn-ghost btn-sm">
                          See all options
                        </Link>
                        <Link to="/guide" className="btn btn-ghost btn-sm">
                          AI 101 guide
                        </Link>
                      </div>
                    </>
                  ) : nudgeAddLibrary ? (
                    <>
                      <h2 className="mb-1 text-base font-semibold">Next step</h2>
                      <p className="mb-3 text-sm text-muted-foreground">
                        You have projects but no library assets yet. Add a win from the Library to your project.
                      </p>
                      <Link to="/library" className="btn btn-primary btn-sm">
                        <Library className="mr-2 h-4 w-4" />
                        Explore Library
                      </Link>
                    </>
                  ) : nudgeCreateProject ? (
                    <>
                      <h2 className="mb-1 text-base font-semibold">Next step</h2>
                      <p className="mb-3 text-sm text-muted-foreground">
                        You&apos;ve added library assets. Create a project to track your work and attach assets.
                      </p>
                      <Link to="/projects" className="btn btn-primary btn-sm">
                        <Activity className="mr-2 h-4 w-4" />
                        Create a project
                      </Link>
                    </>
                  ) : (
                    <>
                      <h2 className="mb-1 text-base font-semibold">Next step</h2>
                      <p className="mb-3 text-sm text-muted-foreground">
                        Share how AI helped your work — it inspires others and surfaces on the Dashboard.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setStoryModalOpen(true)}
                      >
                        <PenLine className="mr-2 h-4 w-4" />
                        Share your story
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {profile != null && userCounts != null && (
            <PersonalizedNudge
              profile={profile}
              userCounts={userCounts}
              derivedBadges={derivedBadges}
            />
          )}

          <EngagementNudge
            displayName={profile?.fullName}
            newAssetsCount={pulse?.newAssetsThisWeek ?? 0}
            onScrollToWins={scrollToCommunityWins}
          />

          <div id="community-wins" className="scroll-mt-6">
            <FeaturedWinsShowcase
              onShareStory={() => setStoryModalOpen(true)}
              onCopySuccess={handleFirstCopySuccess}
              starterCount={4}
            />
          </div>

          {isAuthenticated && (
            <div className="card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                <Award className="h-5 w-5 text-muted-foreground" />
                Your recognition
              </h2>
              {derivedBadges === undefined ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : derivedBadges.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Complete mentor sessions, verify library assets, or get reuses on
                  your assets to earn badges.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {derivedBadges.map((badge) => (
                    <span
                      key={badge.badgeType}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                      title={`${badge.label}: ${badge.metricValue}`}
                    >
                      <Award className="h-4 w-4 shrink-0" />
                      {badge.label}
                      {badge.metricValue > 1 && (
                        <span className="text-muted-foreground">
                          ×{badge.metricValue}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <QuickActionsPanel onShareStory={() => setStoryModalOpen(true)} />
        </>
      )}

      {dashboardTab === 'pulse' && (
        <div className="min-w-0 space-y-6">
          <h2 className="text-xl font-semibold">Team pulse</h2>
          <CollectiveProgressCard
            currentProgress={maturityWidth}
            metrics={{
              aiContributorPercentage: metrics?.aiContributorPercentage ?? 0,
              projectsWithAiPercentage: metrics?.projectsWithAiPercentage ?? 0,
            }}
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center gap-2 sm:min-h-0 sm:min-w-0"
              onClick={() => {
                const exportData = {
                  exportedAt: new Date().toISOString(),
                  metrics: metrics ?? null,
                  gini: gini ?? null,
                  giniInterpretation:
                    gini !== undefined ? giniInterpretation : null,
                  frontlineLeaderGap: frontlineLeaderGap ?? null,
                  topContributors: topContributors ?? [],
                  topMentors: topMentors ?? [],
                  mostReusedAssets: mostReusedAssets ?? [],
                  impactStoriesCount: impactStories?.length ?? 0,
                };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dashboard-metrics-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              aria-label="Export dashboard metrics as JSON"
            >
              <Download className="h-4 w-4" aria-hidden />
              Export metrics
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <EnhancedMetricCard
              title="AI Contributors"
              value={aiContributorValue}
              description={aiContributorDesc}
              icon={<Users className="h-5 w-5 text-muted-foreground" />}
              microStory={aiContributorMicroStory}
            />
            <EnhancedMetricCard
              title="Projects with AI"
              value={projectsWithAiValue}
              description={projectsWithAiDesc}
              icon={<Activity className="h-5 w-5 text-muted-foreground" />}
              microStory={projectsWithAiMicroStory}
            />
            <EnhancedMetricCard
              title="Library Assets"
              value={libraryAssetValue}
              description="Reusable AI assets"
              icon={<Library className="h-5 w-5 text-muted-foreground" />}
              microStory={topAssetMicroStory}
            />
            <EnhancedMetricCard
              title="Weekly Active"
              value={weeklyActiveValue}
              description="Active AI contributors this week"
              icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
              microStory={weeklyActiveMicroStory}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-6">
              <h2 className="mb-4 text-xl font-semibold">
                Knowledge Distribution
              </h2>
              {gini === undefined ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <GiniRadialProgress gini={gini} interpretation={giniInterpretation} />
              )}
            </div>
            {frontlineLeaderGap !== undefined && (
              <div className="card p-6">
                <h2 className="mb-4 text-xl font-semibold">
                  Frontline vs leader contributions
                </h2>
                <p className="mb-3 text-sm text-muted-foreground">
                  Contributions in the last 30 days by experience level (frontline =
                  newbie/curious/comfortable; leader = power user/expert).
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                  <div>
                    <span className="font-medium text-foreground">Frontline</span>
                    <p className="text-muted-foreground">
                      {frontlineLeaderGap.frontlineContributions} contributions from{' '}
                      {frontlineLeaderGap.frontlineUsers} active user
                      {frontlineLeaderGap.frontlineUsers !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Leader</span>
                    <p className="text-muted-foreground">
                      {frontlineLeaderGap.leaderContributions} contributions from{' '}
                      {frontlineLeaderGap.leaderUsers} active user
                      {frontlineLeaderGap.leaderUsers !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Other</span>
                    <p className="text-muted-foreground">
                      {frontlineLeaderGap.otherContributions} contributions from{' '}
                      {frontlineLeaderGap.otherUsers} active user
                      {frontlineLeaderGap.otherUsers !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <TabbedRecognition
            recentActivity={recentActivity}
            topContributors={topContributors}
            topMentors={topMentors}
            mostReusedAssets={mostReusedAssets}
          />
        </div>
      )}
    </div>
  );
}
