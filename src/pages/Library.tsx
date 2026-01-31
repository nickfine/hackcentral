/**
 * Library Page - Library & AI Arsenal
 * Shows reusable AI assets, prompts, templates, and agent blueprints
 */

import { Search, Plus, Sparkles, FileText, Bot, Shield } from 'lucide-react'

export default function Library() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Library</h1>
          <p className="text-muted-foreground mt-2">
            Reusable AI assets, prompts, and templates
          </p>
        </div>
        <button className="btn btn-primary btn-md">
          <Plus className="h-4 w-4 mr-2" />
          Submit Asset
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search library..."
            className="input pl-10"
          />
        </div>
        <select className="input w-40">
          <option value="">All Types</option>
          <option value="prompt">Prompts</option>
          <option value="template">Templates</option>
          <option value="agent_blueprint">Agent Blueprints</option>
          <option value="guardrail">Guardrails</option>
          <option value="evaluation_rubric">Evaluation Rubrics</option>
          <option value="structured_output">Structured Outputs</option>
        </select>
        <select className="input w-36">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="verified">Verified</option>
          <option value="deprecated">Deprecated</option>
        </select>
      </div>

      {/* AI Arsenal Section */}
      <div className="card p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">AI Arsenal</h2>
          <span className="badge badge-secondary text-xs">Curated</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          High-trust, curated collection of proven AI assets
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ArsenalCategory
            icon={<FileText className="h-5 w-5" />}
            title="Prompts"
            count={0}
          />
          <ArsenalCategory
            icon={<FileText className="h-5 w-5" />}
            title="Templates"
            count={0}
          />
          <ArsenalCategory
            icon={<Bot className="h-5 w-5" />}
            title="Agent Blueprints"
            count={0}
          />
          <ArsenalCategory
            icon={<Shield className="h-5 w-5" />}
            title="Guardrails"
            count={0}
          />
        </div>
      </div>

      {/* All Assets */}
      <div>
        <h2 className="text-xl font-semibold mb-4">All Assets</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AssetPlaceholder />
          <AssetPlaceholder />
          <AssetPlaceholder />
          <AssetPlaceholder />
          <AssetPlaceholder />
          <AssetPlaceholder />
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Connect to Supabase and seed data to see library assets
        </p>
      </div>
    </div>
  )
}

interface ArsenalCategoryProps {
  icon: React.ReactNode
  title: string
  count: number
}

function ArsenalCategory({ icon, title, count }: ArsenalCategoryProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors cursor-pointer">
      <div className="p-2 rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{count} assets</div>
      </div>
    </div>
  )
}

function AssetPlaceholder() {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 bg-muted rounded w-32" />
        <span className="badge badge-draft text-xs">Draft</span>
      </div>
      <div className="h-4 bg-muted rounded w-full mb-2" />
      <div className="h-4 bg-muted rounded w-3/4 mb-4" />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">-- reuses</span>
        <span className="text-muted-foreground">by --</span>
      </div>
    </div>
  )
}
