/**
 * People Page - People Directory
 * Shows profiles, AI helpers, and enables mentor matching
 */

import { useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { EXPERIENCE_LEVEL_LABELS } from '../constants/profile';
import { getInitials } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';

export default function People() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery);
  const [experienceFilter, setExperienceFilter] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<Id<'profiles'> | null>(null);

  const profiles = useQuery(api.profiles.list);
  const capabilityTags = useQuery(api.capabilityTags.list);

  return (
    <div className="space-y-6">
      {/* Profile Detail Modal */}
      {selectedProfileId !== null && (
        <ProfileDetailModal
          profileId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
          capabilityTags={capabilityTags ?? []}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">People</h1>
          <p className="text-muted-foreground mt-2">
            Find AI helpers and mentors in your organization
          </p>
        </div>
        <button className="btn btn-primary btn-md">
          <UserPlus className="h-4 w-4 mr-2" />
          Get Paired with Mentor
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
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
      </div>

      {profiles === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PlaceholderCard />
          <PlaceholderCard />
          <PlaceholderCard />
        </div>
      ) : profiles.length === 0 ? (
        <div className="card p-12 text-center">
          <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No profiles yet</h3>
          <p className="text-muted-foreground">Be the first to set up your profile!</p>
        </div>
      ) : (
        <>
          {/* AI Helpers Section */}
          {(() => {
            const aiHelpers = profiles.filter(p => 
              p.mentorCapacity > 0 || 
              p.capabilityTags.length > 0
            );
            
            return aiHelpers.length > 0 ? (
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  AI Helpers ({aiHelpers.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {aiHelpers.slice(0, 6).map((profile) => (
                    <ProfileCard 
                      key={profile._id} 
                      profile={profile} 
                      capabilityTags={capabilityTags || []}
                      onSelect={() => setSelectedProfileId(profile._id)}
                    />
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* All People Section */}
          <div>
            {(() => {
              const filteredProfiles = profiles.filter(p => {
                if (experienceFilter && p.experienceLevel !== experienceFilter) return false;
                if (debouncedSearch) {
                  const searchLower = debouncedSearch.toLowerCase();
                  return (
                    p.fullName?.toLowerCase().includes(searchLower) ||
                    p.email.toLowerCase().includes(searchLower)
                  );
                }
                return true;
              });
              return (
                <>
                  <h2 className="text-xl font-semibold mb-4">
                    All People ({filteredProfiles.length})
                  </h2>
                  {filteredProfiles.length === 0 ? (
                    <div className="card p-12 text-center">
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No people match your filters</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your search or experience level filter.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredProfiles.map((profile) => (
                        <ProfileCard 
                          key={profile._id} 
                          profile={profile}
                          capabilityTags={capabilityTags || []}
                          onSelect={() => setSelectedProfileId(profile._id)}
                        />
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  )
}

/** Profile detail modal: full profile info, tags, mentor status. */
function ProfileDetailModal({
  profileId,
  onClose,
  capabilityTags,
}: {
  profileId: Id<'profiles'>;
  onClose: () => void;
  capabilityTags: Array<{ _id: Id<'capabilityTags'>; code: string; displayLabel: string }>;
}) {
  const profile = useQuery(api.profiles.getById, { profileId });

  const userTags = profile
    ? capabilityTags.filter((tag) => profile.capabilityTags.includes(tag._id))
    : [];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-detail-title"
    >
      <div
        className="max-w-md w-full max-h-[90vh] overflow-y-auto card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {profile === undefined ? (
          <div className="py-8 text-center">
            <h2 id="profile-detail-title" className="text-xl font-semibold mb-2">
              Loading...
            </h2>
            <p className="text-muted-foreground">Loading profile</p>
          </div>
        ) : profile === null ? (
          <div className="space-y-4">
            <h2 id="profile-detail-title" className="text-xl font-semibold">
              Profile not found
            </h2>
            <p className="text-muted-foreground">
              This profile may be private or no longer available.
            </p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <h2 id="profile-detail-title" className="text-xl font-semibold">
                Profile
              </h2>
              <button
                type="button"
                className="p-1 rounded hover:bg-muted"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
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
            {profile.mentorCapacity > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary">
                <UserPlus className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Available for mentoring</p>
                  <p className="text-sm opacity-90">
                    {profile.mentorSessionsUsed} of {profile.mentorCapacity} sessions used this month
                  </p>
                </div>
              </div>
            )}
            <div className="mt-6">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PlaceholderCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="avatar">
          <div className="avatar-fallback bg-primary/10 text-primary">
            ?
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-muted rounded w-24 mb-2" />
          <div className="h-3 bg-muted rounded w-16" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <span className="badge badge-outline text-xs">Loading...</span>
      </div>
    </div>
  )
}

interface ProfileCardProps {
  profile: {
    _id: Id<"profiles">;
    fullName?: string;
    email: string;
    avatarUrl?: string;
    experienceLevel?: string;
    mentorCapacity: number;
    capabilityTags: Id<"capabilityTags">[];
  };
  capabilityTags: Array<{
    _id: Id<"capabilityTags">;
    code: string;
    displayLabel: string;
  }>;
  onSelect?: () => void;
}

function ProfileCard({ profile, capabilityTags, onSelect }: ProfileCardProps) {
  const userTags = capabilityTags.filter(tag => 
    profile.capabilityTags.includes(tag._id)
  );

  return (
    <div
      className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect();
        }
      }}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="avatar">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.fullName} className="avatar-image" />
          ) : (
            <div className="avatar-fallback bg-primary/10 text-primary font-semibold">
              {getInitials(profile.fullName, profile.email)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">
            {profile.fullName || profile.email}
          </h3>
          {profile.experienceLevel && (
            <p className="text-sm text-muted-foreground">
              {EXPERIENCE_LEVEL_LABELS[profile.experienceLevel]}
            </p>
          )}
        </div>
      </div>

      {/* Capability Tags */}
      {userTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {userTags.slice(0, 3).map((tag) => (
            <span key={tag._id} className="badge badge-outline text-xs">
              {tag.displayLabel}
            </span>
          ))}
          {userTags.length > 3 && (
            <span className="badge badge-muted text-xs">
              +{userTags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Mentor Indicator */}
      {profile.mentorCapacity > 0 && (
        <div className="flex items-center gap-2 text-xs text-primary">
          <UserPlus className="h-3 w-3" />
          <span>Available for mentoring</span>
        </div>
      )}
    </div>
  )
}
