/**
 * Dashboard Page — HackDay Central Homepage (Firsthand design system v3)
 *
 * Sections:
 * 1. HeroNav — pill-shaped in-page navigation
 * 2. HeroSection — two-column hero with stats + feature pills
 * 3. PainPointsSection — pain submission + trending (placeholder until data model exists)
 * 4. PipelineFunnel — five-stage funnel from pain to product candidate
 * 5. EventsToolsRow — upcoming events + recently added tools
 * 6. MentoringSection — support & mentoring CTAs
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import toast from 'react-hot-toast';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { HackDayEventItem } from '../../convex/hackdays';
import { useAuth } from '@/hooks/useAuth';
import { ModalWrapper } from '@/components/shared';
import {
  HeroNav,
  HeroSection,
  PainPointsSection,
  PipelineFunnel,
  EventsToolsRow,
  MentoringSection,
} from '@/components/homepage';

export default function Dashboard() {
  const { isAuthenticated } = useAuth();

  // ── Data queries ──
  const projects = useQuery(api.projects.list, {});
  const libraryAssets = useQuery(api.libraryAssets.list, {});

  // HackDay events (Convex action → local state)
  const listHackDayEvents = useAction(api.hackdays.listHackDayEvents);
  const [events, setEvents] = useState<HackDayEventItem[] | null>(null);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    listHackDayEvents()
      .then((result) => {
        if (!cancelled) setEvents(result);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });
    return () => { cancelled = true; };
  }, [listHackDayEvents]);

  // ── Derived counts for hero stat row ──
  const hacksActive = projects
    ? projects.filter((p) => p.status === 'idea' || p.status === 'building').length
    : 0;
  const prototypes = projects
    ? projects.filter((p) => p.status === 'completed').length
    : 0;
  const eventsComing = events?.length ?? 0;

  // ── Story modal (kept from previous dashboard) ──
  const createStory = useMutation(api.impactStories.create);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyHeadline, setStoryHeadline] = useState('');
  const [storyText, setStoryText] = useState('');
  const [storyProjectId, setStoryProjectId] = useState<Id<'projects'> | ''>('');
  const [storyAssetId, setStoryAssetId] = useState<Id<'libraryAssets'> | ''>('');
  const [isSubmittingStory, setIsSubmittingStory] = useState(false);

  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyHeadline.trim() || isSubmittingStory) return;
    setIsSubmittingStory(true);
    try {
      await createStory({
        headline: storyHeadline.trim(),
        storyText: storyText.trim() || undefined,
        projectId: storyProjectId || undefined,
        assetId: storyAssetId || undefined,
      });
      toast.success('Impact story shared!');
      setStoryModalOpen(false);
      setStoryHeadline('');
      setStoryText('');
      setStoryProjectId('');
      setStoryAssetId('');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to share story. Please try again.'
      );
    } finally {
      setIsSubmittingStory(false);
    }
  };

  return (
    <>
      <div className="min-w-0 space-y-5">
        <HeroNav />
        <HeroSection
          hacksActive={hacksActive}
          prototypes={prototypes}
          eventsComing={eventsComing}
        />
        <PainPointsSection />
        <PipelineFunnel projects={projects ?? undefined} />
        <EventsToolsRow
          events={events}
          eventsLoading={eventsLoading}
          assets={libraryAssets ?? undefined}
        />
        <MentoringSection />
      </div>

      {/* Story modal */}
      <ModalWrapper
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        title="Share your impact story"
        maxWidth="lg"
        titleId="share-story-title"
      >
        <form onSubmit={handleStorySubmit} className="space-y-4">
          <div>
            <label htmlFor="story-headline" className="mb-1 block text-sm font-medium">
              Headline <span className="text-destructive">*</span>
            </label>
            <input
              id="story-headline"
              type="text"
              required
              value={storyHeadline}
              onChange={(e) => setStoryHeadline(e.target.value)}
              className="input w-full"
              placeholder="e.g. How a hack saved 12 hours per week"
            />
          </div>
          <div>
            <label htmlFor="story-text" className="mb-1 block text-sm font-medium">
              Your story (optional)
            </label>
            <textarea
              id="story-text"
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              className="textarea min-h-[100px] w-full"
              placeholder="Share what worked, what you learned..."
              rows={4}
            />
          </div>
          <div>
            <label htmlFor="story-project" className="mb-1 block text-sm font-medium">
              Link to project (optional)
            </label>
            <select
              id="story-project"
              value={storyProjectId}
              onChange={(e) =>
                setStoryProjectId((e.target.value || '') as Id<'projects'> | '')
              }
              className="input w-full"
            >
              <option value="">None</option>
              {projects?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="story-asset" className="mb-1 block text-sm font-medium">
              Link to hack (optional)
            </label>
            <select
              id="story-asset"
              value={storyAssetId}
              onChange={(e) =>
                setStoryAssetId((e.target.value || '') as Id<'libraryAssets'> | '')
              }
              className="input w-full"
            >
              <option value="">None</option>
              {libraryAssets?.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setStoryModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmittingStory || !storyHeadline.trim()}
            >
              {isSubmittingStory ? 'Sharing…' : 'Share story'}
            </button>
          </div>
        </form>
      </ModalWrapper>
    </>
  );
}
