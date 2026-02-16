import { describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from '../forge-native/src/backend/supabase/repositories';

const baseCreateEventInput = {
  eventName: 'HackDay Config Test',
  icon: '🚀',
  tagline: 'Test event',
  timezone: 'Europe/London',
  lifecycleStatus: 'draft',
  confluencePageId: 'child-200',
  confluencePageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-200',
  confluenceParentPageId: 'parent-200',
  hackingStartsAt: '2026-03-01T09:00:00.000Z',
  submissionDeadlineAt: '2026-03-02T17:00:00.000Z',
  creationRequestId: 'req-200',
  createdByUserId: 'user-200',
  eventRules: {
    allowCrossTeamMentoring: false,
    maxTeamSize: 5,
    requireDemoLink: true,
    judgingModel: 'panel',
  },
  eventBranding: {
    bannerMessage: 'Build boldly',
    accentColor: '#123abc',
    bannerImageUrl: 'https://cdn.example.com/banner.png',
  },
} as const;

describe('SupabaseRepository.createEvent event config persistence', () => {
  it('writes event_rules and event_branding when config columns are available', async () => {
    const insert = vi.fn().mockResolvedValue({
      id: 'event-200',
      name: baseCreateEventInput.eventName,
      icon: baseCreateEventInput.icon,
      tagline: baseCreateEventInput.tagline,
      timezone: baseCreateEventInput.timezone,
      lifecycle_status: baseCreateEventInput.lifecycleStatus,
      confluence_page_id: baseCreateEventInput.confluencePageId,
      confluence_page_url: baseCreateEventInput.confluencePageUrl,
      confluence_parent_page_id: baseCreateEventInput.confluenceParentPageId,
      hacking_starts_at: baseCreateEventInput.hackingStartsAt,
      submission_deadline_at: baseCreateEventInput.submissionDeadlineAt,
      creation_request_id: baseCreateEventInput.creationRequestId,
      created_by_user_id: baseCreateEventInput.createdByUserId,
      event_rules: baseCreateEventInput.eventRules,
      event_branding: baseCreateEventInput.eventBranding,
    });

    const fakeRepo = { client: { insert } };
    const result = await SupabaseRepository.prototype.createEvent.call(fakeRepo, baseCreateEventInput);

    expect(result.event_rules).toEqual(baseCreateEventInput.eventRules);
    expect(result.event_branding).toEqual(baseCreateEventInput.eventBranding);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(
      'Event',
      expect.objectContaining({
        event_rules: baseCreateEventInput.eventRules,
        event_branding: baseCreateEventInput.eventBranding,
      })
    );
  });

  it('falls back to legacy insert payload when event config columns are missing', async () => {
    const insert = vi
      .fn()
      .mockRejectedValueOnce(new Error('Supabase POST Event failed (400): {"message":"column Event.event_rules does not exist"}'))
      .mockResolvedValueOnce({
        id: 'event-201',
        name: baseCreateEventInput.eventName,
        icon: baseCreateEventInput.icon,
        tagline: baseCreateEventInput.tagline,
        timezone: baseCreateEventInput.timezone,
        lifecycle_status: baseCreateEventInput.lifecycleStatus,
        confluence_page_id: baseCreateEventInput.confluencePageId,
        confluence_page_url: baseCreateEventInput.confluencePageUrl,
        confluence_parent_page_id: baseCreateEventInput.confluenceParentPageId,
        hacking_starts_at: baseCreateEventInput.hackingStartsAt,
        submission_deadline_at: baseCreateEventInput.submissionDeadlineAt,
        creation_request_id: baseCreateEventInput.creationRequestId,
        created_by_user_id: baseCreateEventInput.createdByUserId,
      });

    const fakeRepo = { client: { insert } };
    const result = await SupabaseRepository.prototype.createEvent.call(fakeRepo, baseCreateEventInput);

    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[1][1]).not.toHaveProperty('event_rules');
    expect(insert.mock.calls[1][1]).not.toHaveProperty('event_branding');
    expect(result.event_rules).toBeNull();
    expect(result.event_branding).toBeNull();
  });
});
