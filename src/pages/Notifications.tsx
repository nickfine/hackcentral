/**
 * Notifications Page - In-app notifications (mentor requests, etc.)
 */

import { Link } from 'react-router-dom';
import { Bell, ArrowLeft } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { formatRelativeTime } from '../lib/utils';
import { SectionHeader, EmptyState, SkeletonCard } from '@/components/shared';

export default function Notifications() {
  const notifications = useQuery(api.mentorRequests.getNotificationsForUser);

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard"
          className="btn btn-ghost btn-sm inline-flex items-center gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
      <SectionHeader
        title="Notifications"
        description="Mentor request updates and other activity."
      />
      {notifications === undefined ? (
        <SkeletonCard variant="wide" />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell />}
          title="No notifications yet"
          description="When mentor requests are accepted or completed, they'll appear here."
          variant="compact"
        />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                to={n.link}
                className="card p-4 block hover:bg-accent/50 transition-colors rounded-lg"
              >
                <span className="font-medium">{n.title}</span>
                <span className="text-muted-foreground text-sm ml-2">
                  {formatRelativeTime(new Date(n.createdAt))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
