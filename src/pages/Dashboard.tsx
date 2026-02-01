/**
 * Dashboard Page - AI Maturity Dashboard
 * Shows org-wide metrics and maturity progress
 */

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { Activity, Users, Library, TrendingUp, GraduationCap, BookOpen, PenLine, X, Award } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useAuth } from '../hooks/useAuth'

function formatRelativeTime(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`
  return `${Math.floor(sec / 604800)}w ago`
}

export default function Dashboard() {
  const { isAuthenticated } = useAuth()
  const metrics = useQuery(api.metrics.getDashboardMetrics)
  const recentActivity = useQuery(api.metrics.getRecentActivity)
  const topContributors = useQuery(api.metrics.getTopContributors)
  const topMentors = useQuery(api.metrics.getTopMentors)
  const mostReusedAssets = useQuery(api.metrics.getMostReusedAssets)
  const impactStories = useQuery(api.impactStories.list, { limit: 10 })
  const createStory = useMutation(api.impactStories.create)
  const projects = useQuery(api.projects.list)
  const libraryAssets = useQuery(api.libraryAssets.list)
  const derivedBadges = useQuery(api.recognition.getDerivedBadgesForCurrentUser)

  const [storyModalOpen, setStoryModalOpen] = useState(false)
  const [storyHeadline, setStoryHeadline] = useState('')
  const [storyText, setStoryText] = useState('')
  const [storyProjectId, setStoryProjectId] = useState<Id<'projects'> | ''>('')
  const [storyAssetId, setStoryAssetId] = useState<Id<'libraryAssets'> | ''>('')
  const [isSubmittingStory, setIsSubmittingStory] = useState(false)

  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storyHeadline.trim() || isSubmittingStory) return
    setIsSubmittingStory(true)
    try {
      await createStory({
        headline: storyHeadline.trim(),
        storyText: storyText.trim() || undefined,
        projectId: storyProjectId || undefined,
        assetId: storyAssetId || undefined,
      })
      toast.success('Impact story shared!')
      setStoryModalOpen(false)
      setStoryHeadline('')
      setStoryText('')
      setStoryProjectId('')
      setStoryAssetId('')
    } catch (err) {
      console.error('Failed to share story:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to share story. Please try again.')
    } finally {
      setIsSubmittingStory(false)
    }
  }

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
      {/* Share impact story modal */}
      {storyModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setStoryModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-story-title"
        >
          <div
            className="max-w-lg w-full max-h-[90vh] overflow-y-auto card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="share-story-title" className="text-xl font-semibold flex items-center gap-2">
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
                <label htmlFor="story-headline" className="block text-sm font-medium mb-1">
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
                <label htmlFor="story-text" className="block text-sm font-medium mb-1">
                  Your story (optional)
                </label>
                <textarea
                  id="story-text"
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  className="input w-full min-h-[100px]"
                  placeholder="Share what worked, what you learned..."
                  rows={4}
                />
              </div>
              <div>
                <label htmlFor="story-project" className="block text-sm font-medium mb-1">
                  Link to project (optional)
                </label>
                <select
                  id="story-project"
                  value={storyProjectId}
                  onChange={(e) => setStoryProjectId((e.target.value || '') as Id<'projects'> | '')}
                  className="input w-full"
                >
                  <option value="">None</option>
                  {projects?.map((p) => (
                    <option key={p._id} value={p._id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="story-asset" className="block text-sm font-medium mb-1">
                  Link to library asset (optional)
                </label>
                <select
                  id="story-asset"
                  value={storyAssetId}
                  onChange={(e) => setStoryAssetId((e.target.value || '') as Id<'libraryAssets'> | '')}
                  className="input w-full"
                >
                  <option value="">None</option>
                  {libraryAssets?.map((a) => (
                    <option key={a._id} value={a._id}>{a.title}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
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

      {/* Your recognition (authenticated) */}
      {isAuthenticated && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-muted-foreground" />
            Your recognition
          </h2>
          {derivedBadges === undefined ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : derivedBadges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Complete mentor sessions, verify library assets, or get reuses on your assets to earn badges.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {derivedBadges.map((badge) => (
                <span
                  key={badge.badgeType}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                  title={`${badge.label}: ${badge.metricValue}`}
                >
                  <Award className="h-4 w-4 shrink-0" />
                  {badge.label}
                  {badge.metricValue > 1 && (
                    <span className="text-muted-foreground">×{badge.metricValue}</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Impact Stories */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <PenLine className="h-5 w-5 text-muted-foreground" />
            Impact Stories
          </h2>
          {isAuthenticated && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setStoryModalOpen(true)}
            >
              <PenLine className="h-4 w-4 mr-2" />
              Share your story
            </button>
          )}
        </div>
        {impactStories === undefined ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : impactStories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No impact stories yet. Share how AI has helped your work to inspire others.
          </p>
        ) : (
          <ul className="space-y-4">
            {impactStories.map((story) => (
              <li key={story._id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <h3 className="font-semibold text-foreground">{story.headline}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {story.authorName}
                  {(story.projectTitle ?? story.assetTitle) && (
                    <span>
                      {' · '}
                      {[story.projectTitle, story.assetTitle].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {' · '}
                  {formatRelativeTime(story._creationTime)}
                </p>
                {story.storyText && (
                  <p className="text-sm mt-2 whitespace-pre-wrap text-foreground/90">{story.storyText}</p>
                )}
              </li>
            ))}
          </ul>
        )}
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
