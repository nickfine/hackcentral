/**
 * Library-related types
 */

import type {
  LibraryAsset,
  AssetType,
  QualityGateStatus,
  Visibility,
  AssetMetadata,
  UserSummary,
} from './index'

/**
 * Library asset with author info
 */
export interface LibraryAssetWithAuthor extends LibraryAsset {
  author?: UserSummary | null
  verified_by?: UserSummary | null
}

/**
 * Library asset with reuse counts
 */
export interface LibraryAssetWithReuse extends LibraryAssetWithAuthor {
  reuse_counts?: {
    distinct_user_reuses: number
    distinct_project_reuses: number
    total_reuse_events: number
  }
}

/**
 * Form data for creating/updating library assets
 */
export interface LibraryAssetFormData {
  title: string
  description: string
  asset_type: AssetType
  content: AssetContent
  metadata: AssetMetadata
  visibility: Visibility
  is_arsenal: boolean
}

/**
 * Asset content structure (stored in JSONB)
 */
export interface AssetContent {
  // For prompts
  prompt_text?: string
  system_prompt?: string
  variables?: PromptVariable[]

  // For templates
  template_text?: string
  template_format?: 'markdown' | 'json' | 'yaml' | 'text'

  // For agent blueprints
  agent_config?: AgentConfig

  // For guardrails
  guardrail_rules?: GuardrailRule[]

  // For evaluation rubrics
  rubric_criteria?: RubricCriterion[]

  // For structured outputs
  output_schema?: Record<string, unknown>
  example_output?: string
}

/**
 * Prompt variable definition
 */
export interface PromptVariable {
  name: string
  description: string
  required: boolean
  default_value?: string
  type?: 'string' | 'number' | 'boolean' | 'array'
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  name: string
  description: string
  model?: string
  tools?: AgentTool[]
  system_prompt?: string
  max_iterations?: number
}

/**
 * Agent tool definition
 */
export interface AgentTool {
  name: string
  description: string
  parameters?: Record<string, unknown>
}

/**
 * Guardrail rule
 */
export interface GuardrailRule {
  id: string
  name: string
  description: string
  severity: 'error' | 'warning' | 'info'
  check_type: 'regex' | 'keyword' | 'semantic' | 'custom'
  check_value: string
}

/**
 * Evaluation rubric criterion
 */
export interface RubricCriterion {
  id: string
  name: string
  description: string
  weight: number
  scoring_guide: ScoringLevel[]
}

/**
 * Scoring level for rubric
 */
export interface ScoringLevel {
  score: number
  label: string
  description: string
}

/**
 * Search/filter parameters for library
 */
export interface LibrarySearchParams {
  query?: string
  asset_types?: AssetType[]
  statuses?: QualityGateStatus[]
  visibility?: Visibility[]
  is_arsenal?: boolean
  author_id?: string
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'reuse_count'
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

/**
 * Library search results
 */
export interface LibrarySearchResults {
  items: LibraryAssetWithReuse[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

/**
 * Verification form data
 */
export interface VerificationFormData {
  verified: boolean
  notes?: string
}

/**
 * Featured Hacks section data
 */
export interface AIArsenalSection {
  title: string
  description: string
  asset_type: AssetType
  assets: LibraryAssetWithReuse[]
}
