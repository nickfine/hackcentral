/**
 * Dashboard Page - AI Maturity Dashboard
 * Shows org-wide metrics and maturity progress
 */

import { Activity, Users, Library, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Maturity Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track your organization's AI adoption progress
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="AI Contributors"
          value="--"
          description="Employees with AI contributions"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Projects with AI"
          value="--"
          description="Projects using AI artefacts"
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Library Assets"
          value="--"
          description="Reusable AI assets"
          icon={<Library className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Weekly Active"
          value="--"
          description="Active AI contributors this week"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Maturity Stage */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Maturity Stage</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="badge badge-experimenting">Experimenting</span>
              <span className="badge badge-repeating">Repeating</span>
              <span className="badge badge-scaling">Scaling</span>
              <span className="badge badge-transforming">Transforming</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: '25%' }}
              />
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Connect to Supabase to see real metrics
        </p>
      </div>

      {/* Placeholder for more dashboard content */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-semibold mb-2">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">
            Activity feed will appear here once connected
          </p>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-2">Top Contributors</h3>
          <p className="text-sm text-muted-foreground">
            Leaderboard will appear here once connected
          </p>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  description: string
  icon: React.ReactNode
}

function MetricCard({ title, value, description, icon }: MetricCardProps) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon}
      </div>
      <div className="mt-2">
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}
