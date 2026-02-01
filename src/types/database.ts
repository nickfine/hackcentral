/**
 * Database types for Supabase
 * This file will be replaced with auto-generated types from Supabase CLI
 * For now, we define the types manually based on ROADMAP.md schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          experience_level: ExperienceLevel | null
          mentor_capacity: number
          mentor_sessions_used: number
          profile_visibility: Visibility
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          experience_level?: ExperienceLevel | null
          mentor_capacity?: number
          mentor_sessions_used?: number
          profile_visibility?: Visibility
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          experience_level?: ExperienceLevel | null
          mentor_capacity?: number
          mentor_sessions_used?: number
          profile_visibility?: Visibility
          created_at?: string
          updated_at?: string
        }
      }
      capability_tags: {
        Row: {
          id: string
          code: string
          display_label: string
          category: string | null
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          display_label: string
          category?: string | null
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          display_label?: string
          category?: string | null
          display_order?: number
          created_at?: string
        }
      }
      profile_capability_tags: {
        Row: {
          profile_id: string
          tag_id: string
        }
        Insert: {
          profile_id: string
          tag_id: string
        }
        Update: {
          profile_id?: string
          tag_id?: string
        }
      }
      library_assets: {
        Row: {
          id: string
          title: string
          description: string | null
          asset_type: AssetType
          content: Json
          status: QualityGateStatus
          author_id: string | null
          verified_by_id: string | null
          verified_at: string | null
          metadata: AssetMetadata | null
          visibility: Visibility
          created_at: string
          updated_at: string
          is_arsenal: boolean
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          asset_type: AssetType
          content: Json
          status?: QualityGateStatus
          author_id?: string | null
          verified_by_id?: string | null
          verified_at?: string | null
          metadata?: AssetMetadata | null
          visibility?: Visibility
          created_at?: string
          updated_at?: string
          is_arsenal?: boolean
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          asset_type?: AssetType
          content?: Json
          status?: QualityGateStatus
          author_id?: string | null
          verified_by_id?: string | null
          verified_at?: string | null
          metadata?: AssetMetadata | null
          visibility?: Visibility
          created_at?: string
          updated_at?: string
          is_arsenal?: boolean
        }
      }
      projects: {
        Row: {
          id: string
          title: string
          description: string | null
          status: ProjectStatus
          owner_id: string | null
          ai_impact_hypothesis: string | null
          ai_tools_used: string[] | null
          time_saved_estimate: number | null
          failures_and_lessons: string | null
          workflow_transformed: boolean
          visibility: Visibility
          is_anonymous: boolean
          hack_type: HackType | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: ProjectStatus
          owner_id?: string | null
          ai_impact_hypothesis?: string | null
          ai_tools_used?: string[] | null
          time_saved_estimate?: number | null
          failures_and_lessons?: string | null
          workflow_transformed?: boolean
          visibility?: Visibility
          is_anonymous?: boolean
          hack_type?: HackType | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: ProjectStatus
          owner_id?: string | null
          ai_impact_hypothesis?: string | null
          ai_tools_used?: string[] | null
          time_saved_estimate?: number | null
          failures_and_lessons?: string | null
          workflow_transformed?: boolean
          visibility?: Visibility
          is_anonymous?: boolean
          hack_type?: HackType | null
          created_at?: string
          updated_at?: string
        }
      }
      project_library_assets: {
        Row: {
          id: string
          project_id: string
          asset_id: string
          attached_by: string | null
          attached_at: string
          attachment_type: AttachmentType
        }
        Insert: {
          id?: string
          project_id: string
          asset_id: string
          attached_by?: string | null
          attached_at?: string
          attachment_type: AttachmentType
        }
        Update: {
          id?: string
          project_id?: string
          asset_id?: string
          attached_by?: string | null
          attached_at?: string
          attachment_type?: AttachmentType
        }
      }
      mentor_requests: {
        Row: {
          id: string
          requester_id: string | null
          mentor_id: string | null
          status: MentorRequestStatus
          requested_duration: number
          topic: string | null
          scheduled_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          requester_id?: string | null
          mentor_id?: string | null
          status?: MentorRequestStatus
          requested_duration?: number
          topic?: string | null
          scheduled_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          requester_id?: string | null
          mentor_id?: string | null
          status?: MentorRequestStatus
          requested_duration?: number
          topic?: string | null
          scheduled_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      library_reuse_events: {
        Row: {
          id: string
          asset_id: string | null
          user_id: string | null
          project_id: string | null
          reuse_type: ReuseType
          created_at: string
        }
        Insert: {
          id?: string
          asset_id?: string | null
          user_id?: string | null
          project_id?: string | null
          reuse_type: ReuseType
          created_at?: string
        }
        Update: {
          id?: string
          asset_id?: string | null
          user_id?: string | null
          project_id?: string | null
          reuse_type?: ReuseType
          created_at?: string
        }
      }
      ai_contributions: {
        Row: {
          id: string
          user_id: string | null
          contribution_type: ContributionType
          asset_id: string | null
          project_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          contribution_type: ContributionType
          asset_id?: string | null
          project_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          contribution_type?: ContributionType
          asset_id?: string | null
          project_id?: string | null
          created_at?: string
        }
      }
      recognition_badges: {
        Row: {
          id: string
          user_id: string | null
          badge_type: BadgeType
          metric_value: number | null
          period_start: string
          period_end: string
          validation_metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          badge_type: BadgeType
          metric_value?: number | null
          period_start: string
          period_end: string
          validation_metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          badge_type?: BadgeType
          metric_value?: number | null
          period_start?: string
          period_end?: string
          validation_metadata?: Json | null
          created_at?: string
        }
      }
      impact_stories: {
        Row: {
          id: string
          user_id: string | null
          asset_id: string | null
          project_id: string | null
          headline: string
          story_text: string | null
          metrics: ImpactMetrics | null
          featured: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          asset_id?: string | null
          project_id?: string | null
          headline: string
          story_text?: string | null
          metrics?: ImpactMetrics | null
          featured?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          asset_id?: string | null
          project_id?: string | null
          headline?: string
          story_text?: string | null
          metrics?: ImpactMetrics | null
          featured?: boolean
          created_at?: string
        }
      }
      project_comments: {
        Row: {
          id: string
          project_id: string
          author_id: string | null
          content: string
          is_ai_related: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          author_id?: string | null
          content: string
          is_ai_related?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          author_id?: string | null
          content?: string
          is_ai_related?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      project_support_events: {
        Row: {
          id: string
          project_id: string
          supporter_id: string | null
          support_type: SupportType
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          supporter_id?: string | null
          support_type: SupportType
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          supporter_id?: string | null
          support_type?: SupportType
          created_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string | null
          role: ProjectMemberRole
          joined_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id?: string | null
          role: ProjectMemberRole
          joined_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string | null
          role?: ProjectMemberRole
          joined_at?: string
        }
      }
      idea_recruitment_requests: {
        Row: {
          id: string
          project_id: string
          requester_id: string | null
          target_user_id: string | null
          message: string | null
          status: RecruitmentStatus
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          requester_id?: string | null
          target_user_id?: string | null
          message?: string | null
          status?: RecruitmentStatus
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          requester_id?: string | null
          target_user_id?: string | null
          message?: string | null
          status?: RecruitmentStatus
          created_at?: string
        }
      }
    }
    Views: {
      library_asset_reuse_counts: {
        Row: {
          asset_id: string
          distinct_user_reuses: number
          distinct_project_reuses: number
          total_reuse_events: number
        }
      }
    }
    Functions: {
      get_ai_contributor_percentage: {
        Args: Record<string, never>
        Returns: number
      }
      get_projects_with_ai_percentage: {
        Args: Record<string, never>
        Returns: number
      }
      get_weekly_active_contributors: {
        Args: Record<string, never>
        Returns: number
      }
      get_early_adopter_gini: {
        Args: Record<string, never>
        Returns: number
      }
      accept_mentor_request: {
        Args: {
          request_id: string
          mentor_user_id: string
        }
        Returns: boolean
      }
      refresh_reuse_counts: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: {
      experience_level: ExperienceLevel
      asset_type: AssetType
      quality_gate_status: QualityGateStatus
      project_status: ProjectStatus
      visibility: Visibility
      mentor_request_status: MentorRequestStatus
      reuse_type: ReuseType
      contribution_type: ContributionType
      badge_type: BadgeType
      support_type: SupportType
      project_member_role: ProjectMemberRole
      recruitment_status: RecruitmentStatus
      attachment_type: AttachmentType
    }
  }
}

// Enum types
export type ExperienceLevel =
  | 'newbie'
  | 'curious'
  | 'comfortable'
  | 'power_user'
  | 'expert'

export type AssetType =
  | 'prompt'
  | 'template'
  | 'agent_blueprint'
  | 'guardrail'
  | 'evaluation_rubric'
  | 'structured_output'

export type QualityGateStatus = 'draft' | 'verified' | 'deprecated'

export type ProjectStatus =
  | 'idea'
  | 'building'
  | 'incubation'
  | 'completed'
  | 'archived'

export type HackType =
  | 'prompt'
  | 'app'
  | 'extension'
  | 'skill'
  | 'template'
  | 'agent_flow'
  | 'playbook'

export type Visibility = 'private' | 'org' | 'public'

export type MentorRequestStatus =
  | 'pending'
  | 'accepted'
  | 'completed'
  | 'cancelled'

export type ReuseType = 'referenced' | 'copied' | 'linked' | 'attached'

export type ContributionType =
  | 'library_asset'
  | 'project_ai_artefact'
  | 'verification'
  | 'improvement'

export type BadgeType =
  | 'most_reused'
  | 'most_verified'
  | 'fastest_pull_through'
  | 'mentor_champion'

export type SupportType =
  | 'like'
  | 'offer_help'
  | 'ai_related_comment'
  | 'resource_shared'

export type ProjectMemberRole =
  | 'owner'
  | 'collaborator'
  | 'mentor'
  | 'supporter'

export type RecruitmentStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'

export type AttachmentType = 'referenced' | 'copied' | 'linked' | 'attached'

// JSON types for metadata fields
export interface AssetMetadata {
  intended_user?: string
  context?: string
  limitations?: string
  risk_notes?: string
  example_input?: string
  example_output?: string
}

export interface ImpactMetrics {
  time_saved?: number
  error_reduction?: number
  throughput_gain?: number
}

export interface ValidationMetadata {
  distinct_projects_count?: number
  distinct_users_count?: number
  quality_gate_passed?: boolean
}

// Helper types for table rows
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type CapabilityTag = Database['public']['Tables']['capability_tags']['Row']

export type LibraryAsset = Database['public']['Tables']['library_assets']['Row']
export type LibraryAssetInsert = Database['public']['Tables']['library_assets']['Insert']
export type LibraryAssetUpdate = Database['public']['Tables']['library_assets']['Update']

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type MentorRequest = Database['public']['Tables']['mentor_requests']['Row']

export type ProjectComment = Database['public']['Tables']['project_comments']['Row']

export type ProjectMember = Database['public']['Tables']['project_members']['Row']

export type ImpactStory = Database['public']['Tables']['impact_stories']['Row']

export type RecognitionBadge = Database['public']['Tables']['recognition_badges']['Row']
