/**
 * People Page - People Directory
 * Shows profiles, AI helpers, and enables mentor matching
 */

import { Search, UserPlus } from 'lucide-react'

export default function People() {
  return (
    <div className="space-y-6">
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
            className="input pl-10"
          />
        </div>
        <select className="input w-48">
          <option value="">All Experience Levels</option>
          <option value="newbie">AI Newbie</option>
          <option value="curious">AI Curious</option>
          <option value="comfortable">AI Comfortable</option>
          <option value="power_user">AI Power User</option>
          <option value="expert">AI Expert</option>
        </select>
      </div>

      {/* AI Helpers Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">AI Helpers</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PlaceholderCard />
          <PlaceholderCard />
          <PlaceholderCard />
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Connect to Supabase to see real profiles
        </p>
      </div>

      {/* All People Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">All People</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PlaceholderCard />
          <PlaceholderCard />
          <PlaceholderCard />
          <PlaceholderCard />
          <PlaceholderCard />
          <PlaceholderCard />
        </div>
      </div>
    </div>
  )
}

function PlaceholderCard() {
  return (
    <div className="card p-4">
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
