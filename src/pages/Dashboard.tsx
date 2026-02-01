/**
 * Dashboard Page - AI Maturity Dashboard
 * Shows org-wide metrics and maturity progress
 */

import { useQuery } from 'convex/react'
import { Activity, Users, Library, TrendingUp, GraduationCap, BookOpen } from 'lucide-react'
import { api } from '../../convex/_generated/api'

function formatRelativeTime(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`
  return `${Math.floor(sec / 604800)}w ago`
}

export default function Dashboard() {
  const metrics = useQuery(api.metrics.getDashboardMetrics)
  const recentActivity = useQuery(api.metrics.getRecentActivity)
  const topContributors = useQuery(api.metrics.getTopContributors)
  const topMentors = useQuery(api.metrics.getTopMentors)
  const mostReusedAssets = useQuery(api.metrics.getMostReusedAssets)

  const aiContributorValue = metrics !== undefined ? String(metrics.aiContributorCount) : '--'
  const aiContributorDesc =
    metrics !== undefined && metrics.aiContributorPercentage !== undefined
      ? `${metrics.aiContributorPercentage.toFixed(1)}% of employees with AI contributions`
      : 'Employees with AI contributions'

  const projectsWithAiValue =
    metrics !== undefined ? String(metrics.projectsWithAiCount) : '--'
  const projectsWithAiDesc =
    metrics !== undefined && metrics.projectsWithAiPercentage !== undefined
      ? `${metrics.projectsWithAiPercentage.toFixed(1)}% of projects using AI artefacts`
      : 'Projects using AI artefacts'

  const libraryAssetValue =
    metrics !== undefined ? String(metrics.libraryAssetCount) : '--'
  const weeklyActiveValue =
    metrics !== undefined ? String(metrics.weeklyActiveCount) : '--'

  const maturityWidth =
    metrics !== undefined &&
    metrics.aiContributorPercentage !== undefined &&
    metrics.projectsWithAiPercentage !== undefined
      ? Math.min(
          100,
          (metrics.aiContributorPercentage + metrics.projectsWithAiPercentage) / 2
        )
      : 25

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Maturity Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track your organization's AI adoption progress
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="AI Contributors"
          value={aiContributorValue}
          description={aiContributorDesc}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Projects with AI"
          value={projectsWithAiValue}
          description={projectsWithAiDesc}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Library Assets"
          value={libraryAssetValue}
          description="Reusable AI assets"
          icon={<Library className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Weekly Active"
          value={weeklyActiveValue}
          description="Active AI contributors this week"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Maturity Stage */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Maturity Stage</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="badge badge-experimenting">Experimenting</span>
              <span className="badge badge-repeating">Repeating</span>
              <span className="badge badge-scaling">Scaling</span>
              <span className="badge badge-transforming">Transforming</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${maturityWidth}%` }}
              />
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          {metrics !== undefined
            ? `Based on contributor and project adoption (${maturityWidth.toFixed(0)}% maturity proxy)`
            : 'Metrics will populate once you have activity'}
        </p>
      </div>

      {/* Recent Activity & Top Contributors */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-semibold mb-2">Recent Activity</h3>
          {recentActivity === undefined ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recent activity. Add library assets or project artefacts to see contributions here.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((item) => (
                <li key={item._id} className="text-sm flex flex-wrap gap-x-1 items-baseline">
                  <span className="font-medium text-foreground">{item.userName}</span>
                  <span className="text-muted-foreground">—</span>
                  <span className="text-muted-foreground">{item.typeLabel}</span>
                  {(item.assetTitle ?? item.projectName) && (
                    <span className="text-muted-foreground truncate">
                      ({item.assetTitle ?? item.projectName})
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs ml-auto shrink-0">
                    {formatRelativeTime(item._creationTime)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-2">Top Contributors</h3>
          {topContributors === undefined ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : topContributors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No contributors yet. Contributions from the last 30 days will appear here.
            </p>
          ) : (
            <ul className="space-y-2">
              {topContributors.map((entry, i) => (
                <li key={entry.userId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-5">{i + 1}.</span>
                    <span className="font-medium">{entry.name}</span>
                  </span>
                  <span className="text-muted-foreground">{entry.count} contributions</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recognition: Top Mentors & Most Reused Assets */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            Top Mentors
          </h3>
          {topMentors === undefined ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : topMentors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed mentor sessions in the last 30 days. Complete mentoring sessions to appear here.
            </p>
          ) : (
            <ul className="space-y-2">
              {topMentors.map((entry, i) => (
                <li key={entry.mentorId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-5">{i + 1}.</span>
                    <span className="font-medium">{entry.name}</span>
                  </span>
                  <span className="text-muted-foreground">{entry.count} session{entry.count !== 1 ? 's' : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Most Reused Assets
          </h3>
          {mostReusedAssets === undefined ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : mostReusedAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reuse events in the last 30 days. Record &quot;I used this&quot; on library assets to see them here.
            </p>
          ) : (
            <ul className="space-y-2">
              {mostReusedAssets.map((entry, i) => (
                <li key={entry.assetId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                    <span className="font-medium truncate" title={entry.title}>{entry.title}</span>
                  </span>
                  <span className="text-muted-foreground shrink-0 ml-2">{entry.count} reuse{entry.count !== 1 ? 's' : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  description: string
  icon: React.ReactNode
}

function MetricCard({ title, value, description, icon }: MetricCardProps) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon}
      </div>
      <div className="mt-2">
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}
