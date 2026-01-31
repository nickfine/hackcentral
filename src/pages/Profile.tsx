/**
 * Profile Page - User Profile
 * Shows user profile, contributions, and settings
 */

import { useState } from 'react';
import { Settings, Award, BookOpen, Briefcase, X } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  newbie: 'AI Newbie',
  curious: 'AI Curious',
  comfortable: 'AI Comfortable',
  power_user: 'AI Power User',
  expert: 'AI Expert',
};

const EXPERIENCE_LEVELS = [
  { value: 'newbie', label: 'AI Newbie - Just starting to explore' },
  { value: 'curious', label: 'Curious - Trying things out' },
  { value: 'comfortable', label: 'Comfortable - Using AI regularly' },
  { value: 'power_user', label: 'Power User - Advanced usage' },
  { value: 'expert', label: 'Expert - Building AI solutions' },
] as const;

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private', description: 'Only you can see your profile' },
  { value: 'org', label: 'Organization', description: 'Visible to colleagues' },
  { value: 'public', label: 'Public', description: 'Visible to everyone' },
] as const;

type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]['value'];
type Visibility = (typeof VISIBILITY_OPTIONS)[number]['value'];

export default function Profile() {
  const { user } = useUser();
  const profile = useQuery(api.profiles.getCurrentProfile);
  const capabilityTags = useQuery(api.capabilityTags.list);
  const upsertProfile = useMutation(api.profiles.upsert);

  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('curious');
  const [profileVisibility, setProfileVisibility] = useState<Visibility>('org');
  const [selectedTags, setSelectedTags] = useState<Id<'capabilityTags'>[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openEditModal = () => {
    if (profile) {
      setFullName(profile.fullName ?? '');
      setExperienceLevel((profile.experienceLevel as ExperienceLevel) ?? 'curious');
      setProfileVisibility((profile.profileVisibility as Visibility) ?? 'org');
      setSelectedTags(profile.capabilityTags ?? []);
      setEditOpen(true);
    }
  };

  const closeEditModal = () => {
    setEditOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? '';
    if (!email || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await upsertProfile({
        email,
        fullName: fullName.trim() || undefined,
        experienceLevel,
        profileVisibility,
        capabilityTags: selectedTags,
      });
      setEditOpen(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tagId: Id<'capabilityTags'>) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const tagsByCategory =
    capabilityTags?.reduce((acc, tag) => {
      const category = tag.category ?? 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(tag);
      return acc;
    }, {} as Record<string, typeof capabilityTags>) ?? {};

  return (
    <div className="space-y-6">
      {/* Edit Profile Modal */}
      {editOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={closeEditModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
        >
          <div
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 id="edit-profile-title" className="text-xl font-semibold">
                Edit Profile
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-icon shrink-0"
                onClick={closeEditModal}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div>
                <label htmlFor="edit-fullName" className="block text-sm font-medium mb-1">
                  Full Name
                </label>
                <input
                  id="edit-fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input w-full"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">AI Experience Level</label>
                <div className="space-y-2">
                  {EXPERIENCE_LEVELS.map((level) => (
                    <label
                      key={level.value}
                      className="flex items-center p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="experienceLevel"
                        value={level.value}
                        checked={experienceLevel === level.value}
                        onChange={(e) =>
                          setExperienceLevel(e.target.value as ExperienceLevel)
                        }
                        className="mr-3"
                      />
                      <span className="text-foreground">{level.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Profile Visibility</label>
                <div className="space-y-2">
                  {VISIBILITY_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-start p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="profileVisibility"
                        value={option.value}
                        checked={profileVisibility === option.value}
                        onChange={(e) =>
                          setProfileVisibility(e.target.value as Visibility)
                        }
                        className="mr-3 mt-1"
                      />
                      <div>
                        <div className="font-medium text-foreground">{option.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Skills &amp; Interests (Optional)
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select tags that describe your AI skills and interests
                </p>
                <div className="space-y-4">
                  {Object.entries(tagsByCategory).map(([category, tags]) => (
                    <div key={category}>
                      <h3 className="text-sm font-medium text-foreground mb-2 capitalize">
                        {category}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <button
                            key={tag._id}
                            type="button"
                            onClick={() => toggleTag(tag._id)}
                            className={`btn btn-sm ${
                              selectedTags.includes(tag._id)
                                ? 'btn-primary'
                                : 'btn-outline'
                            }`}
                          >
                            {tag.displayLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" className="btn btn-outline" onClick={closeEditModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={openEditModal}
                >
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
          Contributions will appear here once you have activity
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
