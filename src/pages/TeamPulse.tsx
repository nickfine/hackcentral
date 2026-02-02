/**
 * Team Pulse Page - Collective progress, metrics, knowledge distribution, recognition
 */

import { useQuery } from 'convex/react';
import { Activity, Users, Library, TrendingUp, Download, Info } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import {
  CollectiveProgressCard,
  EnhancedMetricCard,
  GiniRadialProgress,
  TabbedRecognition,
} from '@/components/dashboard';
import { SectionHeader } from '@/components/shared';

export default function TeamPulse() {
  const metrics = useQuery(api.metrics.getDashboardMetrics);
  const recentActivity = useQuery(api.metrics.getRecentActivity);
  const topContributors = useQuery(api.metrics.getTopContributors);
  const topMentors = useQuery(api.metrics.getTopMentors);
  const mostReusedAssets = useQuery(api.metrics.getMostReusedAssets);
  const gini = useQuery(api.metrics.getEarlyAdopterGini);
  const frontlineLeaderGap = useQuery(api.metrics.getFrontlineLeaderGap);

  const maturityWidth =
    metrics !== undefined &&
    metrics.aiContributorPercentage !== undefined &&
    metrics.projectsWithAiPercentage !== undefined
      ? Math.min(
          100,
          (metrics.aiContributorPercentage + metrics.projectsWithAiPercentage) / 2
        )
      : 25;

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
      ? `${metrics.projectsWithAiPercentage.toFixed(1)}% of projects using AI hacks`
      : 'Projects using AI hacks';

  const libraryAssetValue =
    metrics !== undefined ? String(metrics.libraryAssetCount) : '--';
  const weeklyActiveValue =
    metrics !== undefined ? String(metrics.weeklyActiveCount) : '--';

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

  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      metrics: metrics ?? null,
      gini: gini ?? null,
      giniInterpretation: gini !== undefined ? giniInterpretation : null,
      frontlineLeaderGap: frontlineLeaderGap ?? null,
      topContributors: topContributors ?? [],
      topMentors: topMentors ?? [],
      mostReusedAssets: mostReusedAssets ?? [],
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
  };

  return (
    <div className="min-w-0 space-y-6">
      <SectionHeader
        variant="page"
        title="Team Pulse"
        action={{
          label: 'Export metrics',
          icon: <Download className="h-4 w-4" aria-hidden />,
          variant: 'outline',
          size: 'sm',
          onClick: handleExport,
        }}
      />
      <CollectiveProgressCard
        currentProgress={maturityWidth}
        metrics={{
          aiContributorPercentage: metrics?.aiContributorPercentage ?? 0,
          projectsWithAiPercentage: metrics?.projectsWithAiPercentage ?? 0,
        }}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <EnhancedMetricCard
          title="AI Contributors"
          value={aiContributorValue}
          description={aiContributorDesc}
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
          microStory={aiContributorMicroStory}
        />
        <EnhancedMetricCard
          title="Projects with AI"
          value={projectsWithAiValue}
          description={projectsWithAiDesc}
          icon={<Activity className="h-6 w-6 text-muted-foreground" />}
          microStory={projectsWithAiMicroStory}
        />
        <EnhancedMetricCard
          title="Completed Hacks"
          value={libraryAssetValue}
          description="Reusable AI hacks"
          icon={<Library className="h-6 w-6 text-muted-foreground" />}
          microStory={topAssetMicroStory}
        />
        <EnhancedMetricCard
          title="Weekly Active"
          value={weeklyActiveValue}
          description="Active AI contributors this week"
          icon={<TrendingUp className="h-6 w-6 text-muted-foreground" />}
          microStory={weeklyActiveMicroStory}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-xl font-semibold">
              Knowledge Distribution
            </h2>
            <span title="Gini coefficient: 0 = equal distribution, 1 = concentrated in few">
              <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </span>
          </div>
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
  );
}
