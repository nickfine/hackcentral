/**
 * Profile Page - User Profile
 * Shows user profile, contributions, and settings
 */

import { useState } from 'react';
import { Settings, Award, BookOpen, Briefcase, X, UserPlus, Clock, Check, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUser } from '@clerk/clerk-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
  EXPERIENCE_LEVEL_LABELS,
  EXPERIENCE_LEVELS,
  VISIBILITY_OPTIONS,
  type ExperienceLevel,
  type Visibility,
} from '../constants/profile';
import { TabButton } from '../components/shared';
import { getInitials } from '../lib/utils';

type ActiveTab = 'contributions' | 'projects' | 'mentoring' | 'settings';

export default function Profile() {
  const { user } = useUser();
  const profile = useQuery(api.profiles.getCurrentProfile);
  const capabilityTags = useQuery(api.capabilityTags.list);
  const upsertProfile = useMutation(api.profiles.upsert);
  const updateMentorCapacity = useMutation(api.profiles.updateMentorCapacity);
  const updateRequestStatus = useMutation(api.mentorRequests.updateStatus);
  const cancelRequest = useMutation(api.mentorRequests.cancel);
  
  const requestsAsMentor = useQuery(api.mentorRequests.listForMentor, {});
  const requestsAsRequester = useQuery(api.mentorRequests.listForRequester, {});

  const [activeTab, setActiveTab] = useState<ActiveTab>('contributions');
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('curious');
  const [profileVisibility, setProfileVisibility] = useState<Visibility>('org');
  const [selectedTags, setSelectedTags] = useState<Id<'capabilityTags'>[]>([]);
  const [mentorCapacity, setMentorCapacity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openEditModal = () => {
    if (profile) {
      setFullName(profile.fullName ?? '');
      setExperienceLevel((profile.experienceLevel as ExperienceLevel) ?? 'curious');
      setProfileVisibility((profile.profileVisibility as Visibility) ?? 'org');
      setSelectedTags(profile.capabilityTags ?? []);
      setMentorCapacity(profile.mentorCapacity ?? 0);
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
      
      // Update mentor capacity if changed
      if (mentorCapacity !== profile?.mentorCapacity) {
        await updateMentorCapacity({ capacity: mentorCapacity });
      }
      
      toast.success('Profile updated!');
      setEditOpen(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptRequest = async (requestId: Id<'mentorRequests'>) => {
    try {
      await updateRequestStatus({ requestId, newStatus: 'accepted' });
      toast.success('Request accepted!');
    } catch (error) {
      console.error('Failed to accept request:', error);
      toast.error('Failed to accept request. Please try again.');
    }
  };

  const handleCompleteRequest = async (requestId: Id<'mentorRequests'>) => {
    try {
      await updateRequestStatus({ requestId, newStatus: 'completed' });
      toast.success('Session marked as complete!');
    } catch (error) {
      console.error('Failed to complete request:', error);
      toast.error('Failed to complete request. Please try again.');
    }
  };

  const handleCancelRequest = async (requestId: Id<'mentorRequests'>) => {
    try {
      await cancelRequest({ requestId });
      toast.success('Request cancelled');
    } catch (error) {
      console.error('Failed to cancel request:', error);
      toast.error('Failed to cancel request. Please try again.');
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
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-1">View and manage your contributions, projects, and settings</p>
      </div>

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

              {/* Mentor Capacity */}
              <div>
                <label className="label">
                  <span className="label-text font-semibold">Monthly Mentoring Availability</span>
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  Set how many mentoring sessions you can offer per month. Leave at 0 if you're not available for mentoring.
                </p>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={mentorCapacity}
                  onChange={(e) => setMentorCapacity(Math.min(20, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="input w-32"
                />
                {profile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Current usage: {profile.mentorSessionsUsed} / {profile.mentorCapacity} sessions used this month
                  </p>
                )}
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
                <h2 className="text-xl font-semibold">
                  {profile?.fullName || user?.fullName || 'Your Profile'}
                </h2>
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
          label="Completed Hacks"
          value="--"
        />
        <StatCard
          icon={<Briefcase className="h-5 w-5" />}
          label="Hacks In Progress"
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
        <TabButton active={activeTab === 'contributions'} onClick={() => setActiveTab('contributions')}>
          Activity
        </TabButton>
        <TabButton active={activeTab === 'projects'} onClick={() => setActiveTab('projects')}>
          Hacks In Progress
        </TabButton>
        <TabButton active={activeTab === 'mentoring'} onClick={() => setActiveTab('mentoring')}>
          Mentoring
        </TabButton>
        <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
          Settings
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'contributions' && (
        <div>
          <h2 className="text-xl font-semibold mb-1">Recent Activity</h2>
          <p className="text-sm text-muted-foreground mb-4">Your contributions from Completed Hacks and Hacks In Progress</p>
          <div className="space-y-3">
            <ContributionPlaceholder type="library" />
            <ContributionPlaceholder type="project" />
            <ContributionPlaceholder type="verification" />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Activity from Completed Hacks and Hacks In Progress will appear here once you contribute.
          </p>
        </div>
      )}

      {activeTab === 'projects' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">My Hacks In Progress</h2>
          <p className="text-muted-foreground">Project activity will appear here</p>
        </div>
      )}

      {activeTab === 'mentoring' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Requests I've Made</h2>
            {requestsAsRequester === undefined ? (
              <div className="text-muted-foreground">Loading requests...</div>
            ) : requestsAsRequester.length === 0 ? (
              <div className="card p-8 text-center">
                <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  You haven't requested any mentoring yet. Visit the People page to find mentors!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {['pending', 'accepted', 'completed'].map((status) => {
                  const requests = requestsAsRequester.filter((r) => r.status === status);
                  if (requests.length === 0) return null;
                  return (
                    <div key={status}>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                        {status}
                      </h3>
                      {requests.map((request) => (
                        <MentorRequestCard
                          key={request._id}
                          request={request}
                          profile={request.mentor}
                          role="requester"
                          onCancel={handleCancelRequest}
                          onComplete={handleCompleteRequest}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {profile && profile.mentorCapacity > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Mentoring I'm Providing</h2>
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">{profile.mentorSessionsUsed}</span> / {profile.mentorCapacity} sessions this month
                </div>
              </div>
              {requestsAsMentor === undefined ? (
                <div className="text-muted-foreground">Loading requests...</div>
              ) : requestsAsMentor.length === 0 ? (
                <div className="card p-8 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No mentoring requests yet. Others can find you on the People page!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {['pending', 'accepted', 'completed'].map((status) => {
                    const requests = requestsAsMentor.filter((r) => r.status === status);
                    if (requests.length === 0) return null;
                    return (
                      <div key={status}>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                          {status}
                        </h3>
                        {requests.map((request) => (
                          <MentorRequestCard
                            key={request._id}
                            request={request}
                            profile={request.requester}
                            role="mentor"
                            onAccept={handleAcceptRequest}
                            onCancel={handleCancelRequest}
                            onComplete={handleCompleteRequest}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {profile && profile.mentorCapacity === 0 && !requestsAsRequester?.length && (
            <div className="card p-8 text-center">
              <p className="text-muted-foreground mb-3">
                Set your mentor capacity in Settings to start mentoring others.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab('settings')}
              >
                Go to Settings
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
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
              Your capacity for mentoring others on AI topics. Update this in Edit Profile.
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
      )}
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

interface ContributionPlaceholderProps {
  type: 'library' | 'project' | 'verification'
}

function ContributionPlaceholder({ type }: ContributionPlaceholderProps) {
  const typeLabels = {
    library: 'Completed Hack',
    project: 'Project AI hack',
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

interface MentorRequestCardProps {
  request: {
    _id: Id<'mentorRequests'>;
    status: 'pending' | 'accepted' | 'completed' | 'cancelled';
    requestedDuration: number;
    topic?: string;
    scheduledAt?: number;
    _creationTime: number;
  };
  profile: {
    _id: Id<'profiles'>;
    fullName?: string;
    email: string;
    avatarUrl?: string;
    experienceLevel?: string;
  } | null;
  role: 'requester' | 'mentor';
  onAccept?: (requestId: Id<'mentorRequests'>) => void;
  onCancel?: (requestId: Id<'mentorRequests'>) => void;
  onComplete?: (requestId: Id<'mentorRequests'>) => void;
}

function MentorRequestCard({ request, profile, role, onAccept, onCancel, onComplete }: MentorRequestCardProps) {
  const statusColors = {
    pending: 'badge-warning',
    accepted: 'badge-info',
    completed: 'badge-success',
    cancelled: 'badge-outline',
  };

  const statusIcons = {
    pending: <Clock className="h-4 w-4" />,
    accepted: <Check className="h-4 w-4" />,
    completed: <Check className="h-4 w-4" />,
    cancelled: <XCircle className="h-4 w-4" />,
  };

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="avatar">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.fullName || 'User'} className="avatar-image" />
          ) : (
            <div className="avatar-fallback bg-primary/10 text-primary font-semibold">
              {getInitials(profile?.fullName, profile?.email)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold">{profile?.fullName || profile?.email || 'User not found'}</h4>
            <span className={`badge ${statusColors[request.status]} badge-sm`}>
              {statusIcons[request.status]}
              <span className="ml-1">{request.status}</span>
            </span>
          </div>
          {request.topic && (
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-medium">Topic:</span> {request.topic}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{request.requestedDuration} minutes</span>
            <span>•</span>
            <span>
              {new Date(request._creationTime).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        {role === 'mentor' && request.status === 'pending' && onAccept && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onAccept(request._id)}
          >
            Accept
          </button>
        )}
        {request.status === 'pending' && onCancel && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onCancel(request._id)}
          >
            Cancel
          </button>
        )}
        {request.status === 'accepted' && onComplete && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onComplete(request._id)}
          >
            Mark Complete
          </button>
        )}
      </div>
    </div>
  );
}
