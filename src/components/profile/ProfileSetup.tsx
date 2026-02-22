import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  EXPERIENCE_LEVELS,
  VISIBILITY_OPTIONS,
  type ExperienceLevel,
  type Visibility,
} from '@/constants/profile';
import toast from 'react-hot-toast';

export function ProfileSetup() {
  const { user } = useUser();
  const capabilityTags = useQuery(api.capabilityTags.list);
  const upsertProfile = useMutation(api.profiles.upsert);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('curious');
  const [profileVisibility, setProfileVisibility] = useState<Visibility>('org');
  const [selectedTags, setSelectedTags] = useState<Id<'capabilityTags'>[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await upsertProfile({
        email: user?.primaryEmailAddress?.emailAddress || '',
        fullName,
        avatarUrl: user?.imageUrl,
        experienceLevel,
        profileVisibility,
        capabilityTags: selectedTags,
      });

      toast.success('Profile created! Redirecting...');
      // Redirect to dashboard or reload
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to create profile:', error);
      toast.error('Failed to create profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tagId: Id<'capabilityTags'>) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (!capabilityTags) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  // Group tags by category
  const tagsByCategory = capabilityTags.reduce((acc, tag) => {
    const category = tag.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, typeof capabilityTags>);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to HackDay Central!
        </h1>
        <p className="text-gray-600 mb-8">
          Let's set up your profile to get started
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Your name"
            />
          </div>

          {/* Experience Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Experience Level
            </label>
            <div className="space-y-2">
              {EXPERIENCE_LEVELS.map((level) => (
                <label
                  key={level.value}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="experienceLevel"
                    value={level.value}
                    checked={experienceLevel === level.value}
                    onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                    className="mr-3"
                  />
                  <span className="text-gray-900">{level.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Profile Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Visibility
            </label>
            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="profileVisibility"
                    value={option.value}
                    checked={profileVisibility === option.value}
                    onChange={(e) => setProfileVisibility(e.target.value as Visibility)}
                    className="mr-3 mt-1"
                  />
                  <div>
                    <div className="text-gray-900 font-medium">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Capability Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Skills & Interests (Optional)
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Select tags that describe your AI skills and interests
            </p>
            <div className="space-y-4">
              {Object.entries(tagsByCategory).map(([category, tags]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                    {category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag._id}
                        type="button"
                        onClick={() => toggleTag(tag._id)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedTags.includes(tag._id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating Profile...' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
