/**
 * Profile Page - User Profile
 * Shows user profile, contributions, and settings
 */

import { Settings, Award, BookOpen, Briefcase } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  newbie: 'AI Newbie',
  curious: 'AI Curious',
  comfortable: 'AI Comfortable',
  power_user: 'AI Power User',
  expert: 'AI Expert',
};

export default function Profile() {
  const { user } = useUser();
  const profile = useQuery(api.profiles.getCurrentProfile);
  const capabilityTags = useQuery(api.capabilityTags.list);
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="card p-6">
        {profile === undefined ? (
          <div className="animate-pulse">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-8 bg-muted rounded w-48 mb-2" />
                <div className="h-4 bg-muted rounded w-64 mb-4" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-6">
            <div className="avatar w-24 h-24">
              {profile?.avatarUrl || user?.imageUrl ? (
                <img 
                  src={profile?.avatarUrl || user?.imageUrl} 
                  alt={profile?.fullName || 'User'} 
                  className="avatar-image"
                />
              ) : (
                <div className="avatar-fallback text-2xl bg-primary/10 text-primary">
                  {profile?.fullName?.[0]?.toUpperCase() || user?.firstName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">
                  {profile?.fullName || user?.fullName || 'Your Profile'}
                </h1>
                {profile?.experienceLevel && (
                  <span className={`badge badge-${profile.experienceLevel}`}>
                    {EXPERIENCE_LEVEL_LABELS[profile.experienceLevel]}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mb-4">
                {profile?.email || user?.primaryEmailAddress?.emailAddress}
              </p>
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        )}
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
          Tags help others find you for AI collaboration
        </p>
        {profile && capabilityTags ? (
          <div className="flex flex-wrap gap-2">
            {profile.capabilityTags.length > 0 ? (
              capabilityTags
                .filter(tag => profile.capabilityTags.includes(tag._id))
                .map((tag) => (
                  <span key={tag._id} className="badge badge-primary">
                    {tag.displayLabel}
                  </span>
                ))
            ) : (
              <span className="text-sm text-muted-foreground">No tags added yet</span>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <span className="badge badge-outline animate-pulse">Loading...</span>
          </div>
        )}
      </div>

      {/* Mentor Settings */}
      <div className="card p-6">
        <h3 className="font-semibold mb-3">Mentor Availability</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your capacity for mentoring others on AI topics
        </p>
        {profile ? (
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium">Monthly Sessions</label>
              <div className="text-2xl font-bold mt-1">{profile.mentorCapacity}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{profile.mentorSessionsUsed}</span> / 
              <span> {profile.mentorCapacity}</span> sessions used this month
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">Loading...</div>
        )}
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
