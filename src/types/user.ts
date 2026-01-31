/**
 * User-related types
 */

import type {
  Profile,
  CapabilityTag,
  ExperienceLevel,
  Visibility,
} from './database'

/**
 * Profile with related data (capability tags)
 */
export interface ProfileWithTags extends Profile {
  capability_tags?: CapabilityTag[]
}

/**
 * Current user context
 */
export interface CurrentUser {
  id: string
  email: string | null
  profile: ProfileWithTags | null
  isAuthenticated: boolean
}

/**
 * Auth state
 */
export interface AuthState {
  user: CurrentUser | null
  isLoading: boolean
  error: string | null
}

/**
 * Profile form data for creating/updating profiles
 */
export interface ProfileFormData {
  full_name: string
  avatar_url?: string
  experience_level: ExperienceLevel
  profile_visibility: Visibility
  capability_tag_ids: string[]
  mentor_capacity: number
}

/**
 * User for display in lists/cards (minimal data)
 */
export interface UserSummary {
  id: string
  full_name: string | null
  avatar_url: string | null
  experience_level: ExperienceLevel | null
}

/**
 * User with contribution stats
 */
export interface UserWithStats extends ProfileWithTags {
  contribution_count?: number
  assets_created?: number
  assets_verified?: number
  projects_count?: number
  mentor_sessions_completed?: number
}

/**
 * Mentor info for matching
 */
export interface MentorInfo {
  id: string
  full_name: string | null
  avatar_url: string | null
  experience_level: ExperienceLevel | null
  capability_tags: CapabilityTag[]
  mentor_capacity: number
  mentor_sessions_used: number
  available_slots: number
}

/**
 * AI Helper info for project recruitment
 */
export interface AIHelper {
  id: string
  full_name: string | null
  avatar_url: string | null
  experience_level: ExperienceLevel | null
  capability_tags: CapabilityTag[]
  assets_contributed: number
  top_asset_types: string[]
}

/**
 * Session data from Supabase Auth
 */
export interface Session {
  access_token: string
  refresh_token: string
  expires_at?: number
  user: {
    id: string
    email?: string
    user_metadata?: Record<string, unknown>
  }
}
