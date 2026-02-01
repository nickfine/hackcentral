/**
 * Notifications Page - In-app notifications (mentor requests, etc.)
 */

import { Link } from 'react-router-dom';
import { Bell, ArrowLeft } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { formatRelativeTime } from '../lib/utils';

export default function Notifications() {
  const notifications = useQuery(api.mentorRequests.getNotificationsForUser);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard"
          className="btn btn-ghost btn-sm inline-flex items-center gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-7 w-7 text-muted-foreground" />
          Notifications
        </h1>
        <p className="text-muted-foreground mt-1">
          Mentor request updates and other activity.
        </p>
      </div>
      {notifications === undefined ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : notifications.length === 0 ? (
        <div className="card p-8 text-center text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No notifications yet.</p>
          <p className="text-sm mt-1">
            When mentor requests are accepted or completed, they&apos;ll appear here.
          </p>
        </div>
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
