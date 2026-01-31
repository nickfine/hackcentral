/**
 * Profile Page - User Profile
 * Shows user profile, contributions, and settings
 */

import { Settings, Award, BookOpen, Briefcase } from 'lucide-react'

export default function Profile() {
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="card p-6">
        <div className="flex items-start gap-6">
          <div className="avatar w-24 h-24">
            <div className="avatar-fallback text-2xl bg-primary/10 text-primary">
              ?
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">Your Profile</h1>
              <span className="badge badge-curious">AI Curious</span>
            </div>
            <p className="text-muted-foreground mb-4">
              Sign in to see your profile
            </p>
            <div className="flex gap-2">
              <button className="btn btn-primary btn-sm">
                Sign In
              </button>
              <button className="btn btn-outline btn-sm">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Library Contributions"
          value="--"
        />
        <StatCard
          icon={<Briefcase className="h-5 w-5" />}
          label="Projects"
          value="--"
        />
        <StatCard
          icon={<Award className="h-5 w-5" />}
          label="Badges Earned"
          value="--"
        />
        <StatCard
          icon={<Award className="h-5 w-5" />}
          label="Mentor Sessions"
          value="--"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <TabButton active>Contributions</TabButton>
        <TabButton>Projects</TabButton>
        <TabButton>Badges</TabButton>
        <TabButton>Settings</TabButton>
      </div>

      {/* Contributions Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Contributions</h2>
        <div className="space-y-3">
          <ContributionPlaceholder type="library" />
          <ContributionPlaceholder type="project" />
          <ContributionPlaceholder type="verification" />
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Sign in and connect to Supabase to see your contributions
        </p>
      </div>

      {/* Capability Tags */}
      <div className="card p-6">
        <h3 className="font-semibold mb-3">Capability Tags</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add tags to help others find you for AI collaboration
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-outline">+ Add tags</span>
        </div>
      </div>

      {/* Mentor Settings */}
      <div className="card p-6">
        <h3 className="font-semibold mb-3">Mentor Availability</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Set your capacity for mentoring others on AI topics
        </p>
        <div className="flex items-center gap-4">
          <div>
            <label className="text-sm font-medium">Monthly Sessions</label>
            <input
              type="number"
              className="input w-24 mt-1"
              placeholder="0"
              disabled
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">0</span> / <span>0</span> sessions used this month
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  )
}

interface TabButtonProps {
  children: React.ReactNode
  active?: boolean
}

function TabButton({ children, active }: TabButtonProps) {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

interface ContributionPlaceholderProps {
  type: 'library' | 'project' | 'verification'
}

function ContributionPlaceholder({ type }: ContributionPlaceholderProps) {
  const typeLabels = {
    library: 'Library Asset',
    project: 'Project AI Artefact',
    verification: 'Verification',
  }

  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded bg-muted" />
      <div className="flex-1">
        <div className="h-4 bg-muted rounded w-48 mb-2" />
        <div className="flex items-center gap-2">
          <span className="badge badge-outline text-xs">{typeLabels[type]}</span>
          <span className="text-xs text-muted-foreground">-- ago</span>
        </div>
      </div>
    </div>
  )
}
