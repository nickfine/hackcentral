/**
 * Unified Hacks Page
 * Combines Completed Hacks (Library) and Hacks In Progress (Projects) under one roof.
 * Uses tabs to switch between the two views.
 */

import { useSearchParams, useNavigate } from 'react-router-dom';
import { TabButton } from '@/components/shared/TabButton';
import Library from './Library';
import Projects from './Projects';

type HacksTab = 'completed' | 'in_progress';

function isValidTab(value: string | null): value is HacksTab {
  return value === 'completed' || value === 'in_progress';
}

export default function Hacks() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabParam = searchParams.get('tab');
  const activeTab: HacksTab = isValidTab(tabParam) ? tabParam : 'completed';

  const handleTabChange = (tab: HacksTab) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    navigate(`/hacks?${newParams.toString()}`, { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* Page tabs */}
      <div className="flex border-b">
        <TabButton
          active={activeTab === 'completed'}
          onClick={() => handleTabChange('completed')}
        >
          Completed
        </TabButton>
        <TabButton
          active={activeTab === 'in_progress'}
          onClick={() => handleTabChange('in_progress')}
        >
          In progress
        </TabButton>
      </div>

      {/* Tab content */}
      {activeTab === 'in_progress' ? <Projects /> : <Library />}
    </div>
  );
}
