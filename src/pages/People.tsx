/**
 * Team Up Page - Team Directory & Bulletin Board
 * Shows HackCentral Helpers, Hackers, bulletin board for help requests, and enables mentor matching
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, UserPlus, GraduationCap, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { EXPERIENCE_LEVEL_LABELS } from '@/constants/profile';
import { getInitials } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { EmptyState, SectionHeader, ModalWrapper, SkeletonGrid, PersonCard } from '@/components/shared';
import type { PersonCardProfile } from '@/components/shared';
import { BulletinBoard } from '@/components/team/BulletinBoard';

type MentorFilter = 'all' | 'available' | 'seeking';

function toPersonCardProfile(
  profile: {
    _id: Id<'profiles'>;
    fullName?: string;
    email: string;
    avatarUrl?: string;
    experienceLevel?: string;
    mentorCapacity: number;
    mentorSessionsUsed: number;
    capabilityTags: Id<'capabilityTags'>[];
  },
  capabilityTags: Array<{ _id: Id<'capabilityTags'>; code: string; displayLabel: string }>
): PersonCardProfile {
  const tags = capabilityTags
    .filter((t) => profile.capabilityTags.includes(t._id))
    .map((t) => ({ id: t._id, label: t.displayLabel }));
  return {
    _id: profile._id,
    avatarUrl: profile.avatarUrl,
    fullName: profile.fullName,
    email: profile.email,
    experienceLevel: profile.experienceLevel,
    capabilityTags: tags,
    mentorCapacity: profile.mentorCapacity,
    mentorSessionsUsed: profile.mentorSessionsUsed,
  };
}

export default function People() {
  const [searchParams] = useSearchParams();
  const qFromUrl = searchParams.get('q') ?? '';
  const [searchQuery, setSearchQuery] = useState(qFromUrl);
  const debouncedSearch = useDebounce(searchQuery);

  useEffect(() => {
    setSearchQuery(qFromUrl);
  }, [qFromUrl]);
  const [experienceFilter, setExperienceFilter] = useState('');
  const [mentorFilter, setMentorFilter] = useState<MentorFilter>('all');
  const [selectedProfileId, setSelectedProfileId] = useState<Id<'profiles'> | null>(null);
  const [mentorRequestOpen, setMentorRequestOpen] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState<Id<'profiles'> | null>(null);
  const [profileLimit, setProfileLimit] = useState(30);

  const profiles = useQuery(api.profiles.list, { limit: profileLimit });
  const capabilityTags = useQuery(api.capabilityTags.list);
  const availableMentors = useQuery(api.mentorRequests.getAvailableMentors);
  const createMentorRequest = useMutation(api.mentorRequests.create);

  const openMentorRequest = (mentorId?: Id<'profiles'>) => {
    if (mentorId) {
      setSelectedMentorId(mentorId);
    }
    setMentorRequestOpen(true);
  };

  return (
    <div className="min-w-0 space-y-6">
      {/* Profile Detail Modal */}
      {selectedProfileId !== null && (
        <ProfileDetailModal
          profileId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
          capabilityTags={capabilityTags ?? []}
          onRequestMentor={openMentorRequest}
        />
      )}
      <SectionHeader
        variant="page"
        title="Team Up"
        description="Connect with HackCentral Helpers, find teammates, and get help"
        action={{
          label: 'Get Paired with Mentor',
          icon: <UserPlus className="h-4 w-4" />,
          onClick: () => openMentorRequest(),
        }}
      />

      {/* Mentor Request Modal */}
      {mentorRequestOpen && (
        <MentorRequestModal
          mentorId={selectedMentorId}
          availableMentors={availableMentors ?? []}
          onClose={() => {
            setMentorRequestOpen(false);
            setSelectedMentorId(null);
          }}
          onCreate={createMentorRequest}
        />
      )}

      {/* Bulletin Board Section */}
      <div>
        <SectionHeader
          variant="section"
          title="Bulletin Board"
          description="Ask for help or offer to help others"
        />
        <BulletinBoard />
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <select 
          className="input w-48"
          value={experienceFilter}
          onChange={(e) => setExperienceFilter(e.target.value)}
        >
          <option value="">All Experience Levels</option>
          <option value="newbie">AI Newbie</option>
          <option value="curious">AI Curious</option>
          <option value="comfortable">AI Comfortable</option>
          <option value="power_user">AI Power User</option>
          <option value="expert">AI Expert</option>
        </select>
        <select
          value={mentorFilter}
          onChange={(e) => setMentorFilter(e.target.value as MentorFilter)}
          className="input w-52"
        >
          <option value="all">Hackers</option>
          <option value="available">Available Mentors</option>
          <option value="seeking">Seeking Mentors</option>
        </select>
      </div>

      {profiles === undefined ? (
        <SkeletonGrid count={6} columns={3} variant="compact" />
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={<UserPlus />}
          title="No profiles yet"
          description="Be the first to set up your profile!"
        />
      ) : (
        <div className="space-y-10">
          {/* HackCentral Helpers Section */}
          {mentorFilter === 'all' && !debouncedSearch && !experienceFilter && (() => {
            const aiHelpers = profiles.filter(p => 
              p.mentorCapacity > 0 || 
              p.capabilityTags.length > 0
            );
            
            return aiHelpers.length > 0 ? (
              <div>
                <SectionHeader
                  variant="section"
                  title="HackCentral Helpers"
                  titleSuffix={<span className="badge badge-outline text-sm">({aiHelpers.length})</span>}
                />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {aiHelpers.slice(0, 6).map((profile) => (
                    <PersonCard
                      key={profile._id}
                      profile={toPersonCardProfile(profile, capabilityTags ?? [])}
                      onClick={() => setSelectedProfileId(profile._id)}
                    />
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* Hackers Section */}
          <div>
            {(() => {
              const filteredProfiles = profiles.filter(p => {
                // Experience filter
                if (experienceFilter && p.experienceLevel !== experienceFilter) return false;
                
                // Mentor filter
                if (mentorFilter === 'available') {
                  if (p.mentorCapacity <= p.mentorSessionsUsed) return false;
                } else if (mentorFilter === 'seeking') {
                  const seeksMentor = capabilityTags?.some(
                    tag => p.capabilityTags.includes(tag._id) && tag.code === 'seeking_mentor'
                  );
                  if (!seeksMentor) return false;
                }
                
                // Search filter
                if (debouncedSearch) {
                  const searchLower = debouncedSearch.toLowerCase();
                  return (
                    p.fullName?.toLowerCase().includes(searchLower) ||
                    p.email.toLowerCase().includes(searchLower)
                  );
                }
                return true;
              });
              const sectionTitle =
                mentorFilter === 'available' ? 'Available Mentors' :
                mentorFilter === 'seeking' ? 'Seeking Mentors' : 'Hackers';
              return (
                <>
                  <SectionHeader
                    variant="section"
                    title={sectionTitle}
                    titleSuffix={<span className="badge badge-outline text-sm">({filteredProfiles.length})</span>}
                  />
                  {filteredProfiles.length === 0 ? (
                    <EmptyState
                      icon={<Search />}
                      title="No people match your filters"
                      description="Try adjusting your search, experience level, or mentor availability filter."
                    />
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredProfiles.map((profile) => (
                          <PersonCard
                            key={profile._id}
                            profile={toPersonCardProfile(profile, capabilityTags ?? [])}
                            onClick={() => setSelectedProfileId(profile._id)}
                          />
                        ))}
                      </div>
                      {profiles != null && profiles.length === profileLimit && (
                        <div className="mt-4 flex justify-center">
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => setProfileLimit((prev) => prev + 30)}
                          >
                            Load more
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

/** Profile detail modal: full profile info, tags, mentor status. */
function ProfileDetailModal({
  profileId,
  onClose,
  capabilityTags,
  onRequestMentor,
}: {
  profileId: Id<'profiles'>;
  onClose: () => void;
  capabilityTags: Array<{ _id: Id<'capabilityTags'>; code: string; displayLabel: string }>;
  onRequestMentor?: (mentorId: Id<'profiles'>) => void;
}) {
  const profile = useQuery(api.profiles.getById, { profileId });
  const hasPendingRequest = useQuery(
    api.mentorRequests.hasPendingRequestWith,
    profile ? { mentorId: profileId } : 'skip'
  );

  const userTags = profile
    ? capabilityTags.filter((tag) => profile.capabilityTags.includes(tag._id))
    : [];
  
  const isMentor = profile && profile.mentorCapacity > 0;
  const availableSlots = profile ? profile.mentorCapacity - profile.mentorSessionsUsed : 0;
  const hasCapacity = availableSlots > 0;

  return (
    <ModalWrapper
      isOpen
      onClose={onClose}
      title={profile === undefined ? 'Loading...' : profile === null ? 'Profile not found' : 'Profile'}
      titleId="profile-detail-title"
      maxWidth="md"
    >
      {profile === undefined ? (
        <p className="text-muted-foreground py-4">Loading profile</p>
      ) : profile === null ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            This profile may be private or no longer available.
          </p>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <>
            <div className="flex items-center gap-3 mb-4">
              <div className="avatar">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName ?? 'Profile'}
                    className="avatar-image"
                  />
                ) : (
                  <div className="avatar-fallback bg-primary/10 text-primary font-semibold">
                    {getInitials(profile.fullName, profile.email)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">
                  {profile.fullName || profile.email}
                </h3>
                {profile.fullName && (
                  <p className="text-sm text-muted-foreground truncate">
                    {profile.email}
                  </p>
                )}
              </div>
            </div>
            {profile.experienceLevel && (
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Experience level
                </p>
                <p className="font-medium">
                  {EXPERIENCE_LEVEL_LABELS[profile.experienceLevel] ?? profile.experienceLevel}
                </p>
              </div>
            )}
            {userTags.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Capability tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {userTags.map((tag) => (
                    <span
                      key={tag._id}
                      className="badge badge-outline text-xs"
                    >
                      {tag.displayLabel}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {isMentor && (
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap className="h-5 w-5 shrink-0" />
                  <p className="font-medium">
                    {hasCapacity ? 'Available for mentoring' : 'Mentoring (Fully Booked)'}
                  </p>
                </div>
                <p className="text-sm opacity-90">
                  {availableSlots} of {profile.mentorCapacity} slots available this month
                </p>
              </div>
            )}
            <div className="mt-6 flex gap-2">
              {isMentor && hasCapacity && !hasPendingRequest && onRequestMentor && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestMentor(profileId);
                    onClose();
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Request Mentoring
                </button>
              )}
              {hasPendingRequest && (
                <button type="button" className="btn btn-outline" disabled>
                  <Clock className="h-4 w-4 mr-2" />
                  Request Pending
                </button>
              )}
              {!isMentor || !hasCapacity ? (
                <button type="button" className="btn btn-primary" onClick={onClose}>
                  Close
                </button>
              ) : (
                <button type="button" className="btn btn-outline" onClick={onClose}>
                  Close
                </button>
              )}
            </div>
          </>
        )}
    </ModalWrapper>
  );
}

/** Mentor Request Modal: Request mentoring from available mentors */
function MentorRequestModal({
  mentorId,
  availableMentors,
  onClose,
  onCreate,
}: {
  mentorId: Id<'profiles'> | null;
  availableMentors: Array<{
    _id: Id<'profiles'>;
    fullName?: string;
    email: string;
    avatarUrl?: string;
    experienceLevel?: string;
    mentorCapacity: number;
    mentorSessionsUsed: number;
    availableSlots: number;
    capabilityTags: Id<'capabilityTags'>[];
  }>;
  onClose: () => void;
  onCreate: (args: {
    mentorId: Id<'profiles'>;
    requestedDuration: number;
    topic?: string;
  }) => Promise<Id<'mentorRequests'>>;
}) {
  const [selectedMentor, setSelectedMentor] = useState<Id<'profiles'> | null>(mentorId);
  const [duration, setDuration] = useState<number>(60);
  const [topic, setTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedMentorProfile = availableMentors.find((m) => m._id === selectedMentor);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onCreate({
        mentorId: selectedMentor,
        requestedDuration: duration,
        topic: topic.trim() || undefined,
      });
      toast.success(`Mentoring request sent to ${selectedMentorProfile?.fullName || 'mentor'}!`);
      onClose();
    } catch (error) {
      console.error('Failed to create mentor request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper
      isOpen
      onClose={onClose}
      title="Request Mentoring"
      titleId="mentor-request-title"
      maxWidth="2xl"
    >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mentor Selection */}
          {!mentorId && (
            <div>
              <label className="label">
                <span className="label-text font-semibold">Select Mentor</span>
              </label>
              {availableMentors.length === 0 ? (
                <div className="card p-6 text-center">
                  <UserPlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No mentors available at the moment</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableMentors.map((mentor) => (
                    <div
                      key={mentor._id}
                      className={`card p-3 cursor-pointer transition-all ${
                        selectedMentor === mentor._id
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedMentor(mentor._id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-sm">
                          {mentor.avatarUrl ? (
                            <img src={mentor.avatarUrl} alt={mentor.fullName} className="avatar-image" />
                          ) : (
                            <div className="avatar-fallback bg-primary/10 text-primary font-semibold text-sm">
                              {getInitials(mentor.fullName, mentor.email)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm">{mentor.fullName || mentor.email}</h4>
                          <p className="text-xs text-muted-foreground">
                            {mentor.availableSlots} {mentor.availableSlots === 1 ? 'slot' : 'slots'} available
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Mentor Info */}
          {selectedMentorProfile && (
            <div className="card p-4 bg-muted">
              <div className="flex items-center gap-3 mb-2">
                <div className="avatar">
                  {selectedMentorProfile.avatarUrl ? (
                    <img src={selectedMentorProfile.avatarUrl} alt={selectedMentorProfile.fullName} className="avatar-image" />
                  ) : (
                    <div className="avatar-fallback bg-primary/10 text-primary font-semibold">
                      {getInitials(selectedMentorProfile.fullName, selectedMentorProfile.email)}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold">{selectedMentorProfile.fullName || selectedMentorProfile.email}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedMentorProfile.availableSlots} {selectedMentorProfile.availableSlots === 1 ? 'slot' : 'slots'} available
                  </p>
                </div>
              </div>
              {selectedMentorProfile.availableSlots === 1 && (
                <p className="text-xs text-warning">
                  Note: This mentor has only 1 slot remaining this month
                </p>
              )}
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">Session Duration</span>
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="input w-full"
              required
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          {/* Topic */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">Topic (Optional)</span>
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What would you like help with?"
              className="textarea w-full h-24 resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {topic.length}/500 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectedMentor || isSubmitting || availableMentors.length === 0}
            >
              {isSubmitting ? 'Sending...' : 'Request Mentoring'}
            </button>
          </div>
        </form>
    </ModalWrapper>
  );
}
