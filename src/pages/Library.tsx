/**
 * Library Page - Library & AI Arsenal
 * Shows reusable AI assets, prompts, templates, and agent blueprints
 */

import { useState } from 'react';
import { Search, Plus, Sparkles, FileText, Bot, Shield, Award } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

export default function Library() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  const arsenalAssets = useQuery(api.libraryAssets.getArsenal);
  // Build query args - only include if value is set
  const queryArgs: {
    assetType?: "prompt" | "template" | "agent_blueprint" | "guardrail" | "evaluation_rubric" | "structured_output";
    status?: "draft" | "verified" | "deprecated";
    arsenalOnly?: boolean;
  } = {};
  
  if (selectedType) {
    queryArgs.assetType = selectedType as typeof queryArgs.assetType;
  }
  if (selectedStatus) {
    queryArgs.status = selectedStatus as typeof queryArgs.status;
  }
  
  const allAssets = useQuery(api.libraryAssets.list, queryArgs);
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select 
          className="input w-40"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="prompt">Prompts</option>
          <option value="template">Templates</option>
          <option value="agent_blueprint">Agent Blueprints</option>
          <option value="guardrail">Guardrails</option>
          <option value="evaluation_rubric">Evaluation Rubrics</option>
          <option value="structured_output">Structured Outputs</option>
        </select>
        <select 
          className="input w-36"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
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
        {arsenalAssets === undefined ? (
          <div className="text-center py-8">Loading arsenal...</div>
        ) : arsenalAssets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No arsenal assets yet. Run seedAIArsenal to populate.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <ArsenalCategory
                icon={<FileText className="h-5 w-5" />}
                title="Prompts"
                count={arsenalAssets.filter(a => a.assetType === 'prompt').length}
              />
              <ArsenalCategory
                icon={<FileText className="h-5 w-5" />}
                title="Templates"
                count={arsenalAssets.filter(a => a.assetType === 'template').length}
              />
              <ArsenalCategory
                icon={<Bot className="h-5 w-5" />}
                title="Agent Blueprints"
                count={arsenalAssets.filter(a => a.assetType === 'agent_blueprint').length}
              />
              <ArsenalCategory
                icon={<Shield className="h-5 w-5" />}
                title="Guardrails"
                count={arsenalAssets.filter(a => a.assetType === 'guardrail').length}
              />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {arsenalAssets.slice(0, 6).map((asset) => (
                <AssetCard key={asset._id} asset={asset} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* All Assets */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          All Assets {allAssets && `(${allAssets.length})`}
        </h2>
        
        {allAssets === undefined ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AssetPlaceholder />
            <AssetPlaceholder />
            <AssetPlaceholder />
          </div>
        ) : allAssets.length === 0 ? (
          <div className="card p-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No assets found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedType || selectedStatus 
                ? "Try adjusting your filters" 
                : "Be the first to contribute an AI asset!"
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allAssets
              .filter((asset) => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return (
                  asset.title.toLowerCase().includes(query) ||
                  asset.description?.toLowerCase().includes(query)
                );
              })
              .map((asset) => (
                <AssetCard key={asset._id} asset={asset} />
              ))}
          </div>
        )}
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
    <div className="card p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 bg-muted rounded w-32" />
        <span className="badge badge-draft text-xs">Loading</span>
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

interface AssetCardProps {
  asset: {
    _id: Id<"libraryAssets">;
    title: string;
    description?: string;
    assetType: string;
    status: string;
    isArsenal: boolean;
  };
}

function AssetCard({ asset }: AssetCardProps) {
  const typeIcons: Record<string, React.ReactNode> = {
    prompt: <FileText className="h-4 w-4" />,
    template: <FileText className="h-4 w-4" />,
    agent_blueprint: <Bot className="h-4 w-4" />,
    guardrail: <Shield className="h-4 w-4" />,
    evaluation_rubric: <Award className="h-4 w-4" />,
    structured_output: <FileText className="h-4 w-4" />,
  };

  const statusColors: Record<string, string> = {
    draft: 'badge-draft',
    verified: 'badge-success',
    deprecated: 'badge-muted',
  };

  return (
    <div className="card p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-primary/10 text-primary">
            {typeIcons[asset.assetType] || <FileText className="h-4 w-4" />}
          </div>
          <h3 className="font-semibold text-sm leading-tight">{asset.title}</h3>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className={`badge ${statusColors[asset.status]} text-xs`}>
            {asset.status}
          </span>
          {asset.isArsenal && (
            <span className="badge badge-secondary text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Arsenal
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {asset.description || 'No description'}
      </p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="capitalize">{asset.assetType.replace('_', ' ')}</span>
        {/* TODO: Add reuse count when tracking is implemented */}
      </div>
    </div>
  )
}
