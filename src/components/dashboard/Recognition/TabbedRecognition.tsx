import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, BookOpen } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface RecentActivityItem {
  _id: string;
  _creationTime: number;
  typeLabel: string;
  userName: string;
  assetTitle?: string;
  projectName?: string;
}

interface TopContributorEntry {
  userId: string;
  name: string;
  count: number;
}

interface TopMentorEntry {
  mentorId: string;
  name: string;
  count: number;
}

interface MostReusedAssetEntry {
  assetId: string;
  title: string;
  count: number;
}

type TabId = 'activity' | 'contributors' | 'mentors' | 'assets';

interface TabbedRecognitionProps {
  recentActivity: RecentActivityItem[] | undefined;
  topContributors: TopContributorEntry[] | undefined;
  topMentors: TopMentorEntry[] | undefined;
  mostReusedAssets: MostReusedAssetEntry[] | undefined;
}

export function TabbedRecognition({
  recentActivity,
  topContributors,
  topMentors,
  mostReusedAssets,
}: TabbedRecognitionProps) {
  const [activeTab, setActiveTab] = useState<TabId>('activity');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'activity', label: 'Recent Activity' },
    { id: 'contributors', label: 'Top Contributors' },
    { id: 'mentors', label: 'Top Mentors' },
    { id: 'assets', label: 'Most Reused Hacks' },
  ];

  return (
    <div className="card p-6">
      <div
        className="-mb-px mb-6 flex gap-2 overflow-x-auto border-b border-border scrollbar-hide"
        role="tablist"
        aria-label="Recognition and activity sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              activeTab === tab.id
                ? '-mb-px border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'activity' && (
              <>
                {recentActivity === undefined ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No recent activity. Add completed hacks or hacks in progress activity to
                    see contributions here.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {recentActivity.slice(0, 10).map((item) => (
                      <li
                        key={item._id}
                        className="flex flex-wrap items-baseline gap-x-1 text-sm"
                      >
                        <span className="font-medium text-foreground">
                          {item.userName}
                        </span>
                        <span className="text-muted-foreground">—</span>
                        <span className="text-muted-foreground">
                          {item.typeLabel}
                        </span>
                        {(item.assetTitle ?? item.projectName) && (
                          <span className="truncate text-muted-foreground">
                            ({item.assetTitle ?? item.projectName})
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {formatRelativeTime(item._creationTime)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {activeTab === 'contributors' && (
              <>
                {topContributors === undefined ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : topContributors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No contributors yet. Contributions from the last 30 days will
                    appear here.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {topContributors.slice(0, 5).map((entry, i) => (
                      <li
                        key={entry.userId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-5 text-muted-foreground">
                            {i + 1}.
                          </span>
                          <span className="font-medium">{entry.name}</span>
                        </span>
                        <span className="text-muted-foreground">
                          {entry.count} contributions
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {activeTab === 'mentors' && (
              <>
                {topMentors === undefined ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : topMentors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No completed mentor sessions in the last 30 days. Complete
                    mentoring sessions to appear here.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {topMentors.slice(0, 5).map((entry, i) => (
                      <li
                        key={entry.mentorId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span className="w-5 text-muted-foreground">
                            {i + 1}.
                          </span>
                          <span className="font-medium">{entry.name}</span>
                        </span>
                        <span className="text-muted-foreground">
                          {entry.count} session{entry.count !== 1 ? 's' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {activeTab === 'assets' && (
              <>
                {mostReusedAssets === undefined ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : mostReusedAssets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No reuse events in the last 30 days. Record &quot;I used
                    this&quot; on completed hacks to see them here.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {mostReusedAssets.slice(0, 5).map((entry, i) => (
                      <li
                        key={entry.assetId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="w-5 shrink-0 text-muted-foreground">
                            {i + 1}.
                          </span>
                          <span
                            className="truncate font-medium"
                            title={entry.title}
                          >
                            {entry.title}
                          </span>
                        </span>
                        <span className="ml-2 shrink-0 text-muted-foreground">
                          {entry.count} reuse{entry.count !== 1 ? 's' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
