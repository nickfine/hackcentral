/**
 * Dashboard Page - AI Maturity Dashboard
 * Cultural heartbeat: hero journey, featured wins showcase, stats with micro-stories, quick actions
 */

import { useState } from 'react';
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
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAuth } from '../hooks/useAuth';
import {
  HeroJourneyVisualization,
  FeaturedWinsShowcase,
  EnhancedMetricCard,
  GiniRadialProgress,
  QuickActionsPanel,
  PersonalizedNudge,
  TabbedRecognition,
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

  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyHeadline, setStoryHeadline] = useState('');
  const [storyText, setStoryText] = useState('');
  const [storyProjectId, setStoryProjectId] = useState<Id<'projects'> | ''>('');
  const [storyAssetId, setStoryAssetId] = useState<Id<'libraryAssets'> | ''>('');
  const [isSubmittingStory, setIsSubmittingStory] = useState(false);

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
      ? `1 pioneer sparking ${metrics.aiContributorPercentage?.toFixed(0) ?? 0}% — add your spark?`
      : metrics !== undefined && metrics.aiContributorCount > 0
        ? `${metrics.aiContributorCount} pioneers building momentum — every contributor inspires more. Add your spark?`
        : undefined;

  const projectsWithAiMicroStory =
    metrics !== undefined && metrics.projectsWithAiCount > 0
      ? 'Join the wildfire — add your project to the count.'
      : undefined;

  const weeklyActiveMicroStory =
    metrics !== undefined
      ? 'Be the one this week — contribute to stay active.'
      : undefined;

  const topAssetMicroStory =
    mostReusedAssets != null && mostReusedAssets.length > 0
      ? `"${mostReusedAssets[0].title}" — Battle-tested in ${mostReusedAssets[0].count} projects. Copy risk-free.`
      : undefined;

  return (
    <div className="space-y-6">
      {showFirstTimeCTA && (
        <div className="card border-primary/20 bg-primary/5 p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-lg bg-primary/10 p-2">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="mb-1 text-lg font-semibold">Get started</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                New to HackDay Central? Explore the Library for reusable AI
                assets, or create your first project to track your work.
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
            </div>
          </div>
        </div>
      )}

      {nudgeAddLibrary && (
        <div className="card border-primary/10 bg-primary/5 p-4">
          <p className="mb-2 text-sm text-foreground">
            You have projects but no library assets yet. Add a prompt or template
            from the Library to your project to boost adoption metrics.
          </p>
          <Link to="/library" className="btn btn-outline btn-sm">
            <Library className="mr-2 h-4 w-4" />
            Explore Library
          </Link>
        </div>
      )}
      {nudgeCreateProject && (
        <div className="card border-primary/10 bg-primary/5 p-4">
          <p className="mb-2 text-sm text-foreground">
            You&apos;ve added library assets. Create a project to track your AI
            work and attach assets for visibility.
          </p>
          <Link to="/projects" className="btn btn-outline btn-sm">
            <Activity className="mr-2 h-4 w-4" />
            Create a project
          </Link>
        </div>
      )}
      {nudgeShareStory && (
        <div className="card border-primary/10 bg-primary/5 p-4">
          <p className="mb-2 text-sm text-foreground">
            Share how AI helped your work — it inspires others and surfaces on
            the Dashboard.
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setStoryModalOpen(true)}
          >
            <PenLine className="mr-2 h-4 w-4" />
            Share your story
          </button>
        </div>
      )}

      {profile != null && userCounts != null && (
        <PersonalizedNudge
          profile={profile}
          userCounts={userCounts}
          derivedBadges={derivedBadges}
        />
      )}

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
                  placeholder="e.g. How a prompt template saved 12 hours per week"
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

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            AI Maturity Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Track your organization&apos;s AI adoption progress
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm inline-flex items-center gap-2"
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
        >
          <Download className="h-4 w-4" />
          Export metrics
        </button>
      </div>

      <HeroJourneyVisualization
        currentProgress={maturityWidth}
        metrics={{
          aiContributorPercentage: metrics?.aiContributorPercentage ?? 0,
          projectsWithAiPercentage: metrics?.projectsWithAiPercentage ?? 0,
        }}
      />

      <FeaturedWinsShowcase onShareStory={() => setStoryModalOpen(true)} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}
