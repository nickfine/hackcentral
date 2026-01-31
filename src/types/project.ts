/**
 * Project-related types
 */

import type {
  Project,
  ProjectComment,
  ProjectMember,
  ProjectStatus,
  Visibility,
  ProjectMemberRole,
  SupportType,
  LibraryAssetWithReuse,
  UserSummary,
} from './index'

/**
 * Project with owner info
 */
export interface ProjectWithOwner extends Project {
  owner?: UserSummary | null
}

/**
 * Project with all related data
 */
export interface ProjectWithDetails extends ProjectWithOwner {
  members?: ProjectMemberWithUser[]
  comments?: ProjectCommentWithAuthor[]
  attached_assets?: LibraryAssetWithReuse[]
  support_counts?: {
    likes: number
    help_offers: number
    ai_comments: number
  }
  current_user_support?: SupportType[]
}

/**
 * Project member with user info
 */
export interface ProjectMemberWithUser extends ProjectMember {
  user?: UserSummary | null
}

/**
 * Project comment with author info
 */
export interface ProjectCommentWithAuthor extends ProjectComment {
  author?: UserSummary | null
}

/**
 * Form data for creating/updating projects
 */
export interface ProjectFormData {
  title: string
  description: string
  status: ProjectStatus
  visibility: Visibility
  is_anonymous: boolean
  ai_impact_hypothesis?: string
  ai_tools_used?: string[]
}

/**
 * Form data for project close/archive
 */
export interface ProjectCloseFormData {
  ai_usage_summary?: string
  ai_tools_used: string[]
  time_saved_estimate?: number
  failures_and_lessons?: string
  workflow_transformed: boolean
}

/**
 * Search/filter parameters for projects
 */
export interface ProjectSearchParams {
  query?: string
  statuses?: ProjectStatus[]
  visibility?: Visibility[]
  owner_id?: string
  has_ai_artefacts?: boolean
  workflow_transformed?: boolean
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'support_count'
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

/**
 * Project search results
 */
export interface ProjectSearchResults {
  items: ProjectWithDetails[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

/**
 * AI Readiness check data
 */
export interface AIReadinessCheck {
  has_impact_hypothesis: boolean
  impact_hypothesis_valid: boolean
  has_risk_assessment: boolean
  risk_assessment: RiskAssessment | null
}

/**
 * Risk assessment data
 */
export interface RiskAssessment {
  bias_risk: RiskLevel
  bias_mitigation?: string
  privacy_risk: RiskLevel
  privacy_mitigation?: string
  misuse_risk: RiskLevel
  misuse_mitigation?: string
  completed_at: string
  completed_by: string
}

/**
 * Risk level
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'not_assessed'

/**
 * Support event to create
 */
export interface CreateSupportEvent {
  project_id: string
  support_type: SupportType
}

/**
 * Comment to create
 */
export interface CreateComment {
  project_id: string
  content: string
  is_ai_related: boolean
}

/**
 * Member to add
 */
export interface AddProjectMember {
  project_id: string
  user_id: string
  role: ProjectMemberRole
}

/**
 * Project timeline event
 */
export interface ProjectTimelineEvent {
  id: string
  type: 'created' | 'status_changed' | 'comment' | 'support' | 'member_joined' | 'asset_attached'
  timestamp: string
  user?: UserSummary | null
  details?: Record<string, unknown>
}

/**
 * Project statistics
 */
export interface ProjectStats {
  total_projects: number
  by_status: Record<ProjectStatus, number>
  with_ai_artefacts: number
  workflow_transformed: number
  avg_time_saved: number
}
