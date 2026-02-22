/**
 * Dashboard Page - AI Maturity Dashboard
 *
 * Hero first, then what to do:
 * 1. WelcomeHero — big title + bold proposition; no buttons, no Spark/maturity info
 * 2. Optional combined nudge (Get started / Next step: add library, create project, share story)
 * 3. PersonalizedNudge (badges, next steps)
 * 4. Latest Hacks — FeaturedHacksShowcase (Starter badges, carousel, WallOfThanksStrip)
 * 5. Your recognition (if authenticated) → Quick Actions
 *
 * Team pulse is a separate page in the left nav (/team-pulse).
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import {
  Activity,
  Library,
  Award,
  Sparkles,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { useReducedMotion } from 'framer-motion';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAuth } from '@/hooks/useAuth';
import {
  WelcomeHero,
  FeaturedHacksShowcase,
  QuickActionsPanel,
  PersonalizedNudge,
  WallOfThanksStrip,
} from '@/components/dashboard';
import { ModalWrapper } from '@/components/shared';

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const metrics = useQuery(api.metrics.getDashboardMetrics);
  const recentActivity = useQuery(api.metrics.getRecentActivity);
  const createStory = useMutation(api.impactStories.create);
  const projects = useQuery(api.projects.list, {});
  const libraryAssets = useQuery(api.libraryAssets.list, {});
  const derivedBadges = useQuery(api.recognition.getDerivedBadgesForCurrentUser, {});
  const profile = useQuery(api.profiles.getCurrentProfile);
  const userCounts = useQuery(api.profiles.getCurrentUserCounts);

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
      fire({ particleCount: 30, spread: 60, origin: { y: 0.7 }, colors: ['#14b8a6', '#0d9488', '#99f6e4'] });
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
    confetti({ particleCount: 24, spread: 50, origin: { y: 0.6 }, colors: ['#14b8a6', '#0d9488'] });
  };

  const scrollToCommunityHacks = () => {
    document.getElementById('community-hacks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const showCombinedNudge = showFirstTimeCTA || nudgeAddLibrary || nudgeCreateProject || nudgeShareStory;

  return (
    <>
      {/* 8pt spacing: section gaps 40px/48px for premium breathing room */}
      <div className="min-w-0 space-y-10 lg:space-y-12">
      <ModalWrapper
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        title="Share your impact story"
        maxWidth="lg"
        titleId="share-story-title"
      >
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
                  placeholder="e.g. How a hack saved 12 hours per week"
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
                  className="textarea min-h-[100px] w-full"
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
                  Link to Completed Hacks hack (optional)
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
      </ModalWrapper>

      <>
          <WelcomeHero
            onScrollToHacks={scrollToCommunityHacks}
            currentProgress={maturityWidth}
            currentStageName={currentStage?.name}
            nextMilestoneCopy={nextMilestoneCopy}
          />

          {showCombinedNudge && (
            <div className="card border-primary/20 bg-primary/5 p-6 sm:p-8 rounded-xl">
              <div className="flex items-start gap-6">
                <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  {showFirstTimeCTA ? (
                    <>
                      <h2 className="mb-1 text-base font-semibold">Get started</h2>
                      <p className="mb-3 text-sm text-muted-foreground">
                        New to HackDay Central? Copy a hack from Completed Hacks or create your first hack in progress.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Link to="/hacks?tab=completed" className="btn btn-primary btn-sm">
                          <Library className="mr-2 h-4 w-4" />
                          Explore Completed Hacks
                        </Link>
                        <Link to="/hacks?tab=in_progress" className="btn btn-outline btn-sm">
                          <Activity className="mr-2 h-4 w-4" />
                          View Hacks In Progress
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
                        You have hacks in progress but no completed hacks yet. Add a hack from Completed Hacks to your project.
                      </p>
                      <Link to="/hacks?tab=completed" className="btn btn-primary btn-sm">
                        <Library className="mr-2 h-4 w-4" />
                        Explore Completed Hacks
                      </Link>
                    </>
                  ) : nudgeCreateProject ? (
                    <>
                      <h2 className="mb-1 text-base font-semibold">Next step</h2>
                      <p className="mb-3 text-sm text-muted-foreground">
                        You&apos;ve added completed hacks. Create a hack in progress to track your work and attach hacks.
                      </p>
                      <Link to="/hacks?tab=in_progress" className="btn btn-primary btn-sm">
                        <Activity className="mr-2 h-4 w-4" />
                        Create a project
                      </Link>
                    </>
                  ) : (
                    <>
                      <h2 className="mb-1 text-base font-semibold">Next step</h2>
                      <p className="mb-3 text-sm text-muted-foreground">
                        You&apos;re all set. Explore Completed Hacks or check Team pulse for metrics.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Link to="/hacks?tab=completed" className="btn btn-primary btn-sm">
                          <Library className="mr-2 h-4 w-4" />
                          Explore Completed Hacks
                        </Link>
                        <Link to="/team-pulse" className="btn btn-outline btn-sm">
                          <Activity className="mr-2 h-4 w-4" />
                          Team pulse
                        </Link>
                      </div>
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

          <div id="community-hacks" className="scroll-mt-6">
            <FeaturedHacksShowcase
              onCopySuccess={handleFirstCopySuccess}
              starterCount={4}
            />
          </div>

          {/* Two pods: Wall of Thanks (quotes) + Your recognition — 8pt gap, premium cards */}
          <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 md:items-stretch">
            <div className="min-w-0 h-full">
              <WallOfThanksStrip />
            </div>
            <div className="card min-w-0 p-8 lg:p-10 rounded-xl border border-border shadow-sm min-h-[220px] flex flex-col">
              <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold">
                <Award className="h-5 w-5 text-muted-foreground" />
                Your recognition
              </h2>
              {derivedBadges === undefined ? (
                <p className="text-sm text-muted-foreground mt-auto">Loading…</p>
              ) : derivedBadges.length > 0 ? (
                <div className="flex flex-wrap gap-3 mt-auto">
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
              ) : (
                <div className="flex flex-col flex-1">
                  <p className="mb-4 text-sm text-muted-foreground">
                    {!isAuthenticated
                      ? 'Sign in to see your real badges. Demo badges below:'
                      : 'Complete mentor sessions, verify hacks, or get reuses to earn badges. Demo badges below:'}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-auto">
                    {[
                      { badgeType: 'demo_rising_star', label: 'Rising Star', metricValue: 1 },
                      { badgeType: 'demo_mentor', label: 'Mentor Champion', metricValue: 3 },
                      { badgeType: 'demo_verifier', label: 'Verifier', metricValue: 5 },
                      { badgeType: 'demo_reused', label: 'Most Reused', metricValue: 12 },
                      { badgeType: 'demo_early', label: 'Early Adopter', metricValue: 1 },
                    ].map((badge) => (
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
                </div>
              )}
            </div>
          </div>

          <QuickActionsPanel />
      </>
      </div>
    </>
  );
}
