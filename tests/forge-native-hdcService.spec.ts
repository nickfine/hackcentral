import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateInstanceDraftInput, ViewerContext } from '../forge-native/src/shared/types';
import type { HdcService } from '../forge-native/src/backend/hdcService';

const createChildPageUnderParentMock = vi.fn();
const deletePageMock = vi.fn();
const getCurrentUserEmailMock = vi.fn();

vi.mock('../forge-native/src/backend/confluencePages', () => ({
  createChildPageUnderParent: createChildPageUnderParentMock,
  deletePage: deletePageMock,
  getCurrentUserEmail: getCurrentUserEmailMock,
}));

type RepoMock = {
  ensureUser: ReturnType<typeof vi.fn>;
  getEventByCreationRequestId: ReturnType<typeof vi.fn>;
  getUserByAccountId: ReturnType<typeof vi.fn>;
  getEventNameConflicts: ReturnType<typeof vi.fn>;
  getEventByConfluencePageId: ReturnType<typeof vi.fn>;
  getEventById: ReturnType<typeof vi.fn>;
  listEventsByParentPageId: ReturnType<typeof vi.fn>;
  ensureUserByEmail: ReturnType<typeof vi.fn>;
  createEvent: ReturnType<typeof vi.fn>;
  createMilestones: ReturnType<typeof vi.fn>;
  addEventAdmin: ReturnType<typeof vi.fn>;
  upsertSyncState: ReturnType<typeof vi.fn>;
  logAudit: ReturnType<typeof vi.fn>;
  updateEventLifecycle: ReturnType<typeof vi.fn>;
  listEventAdmins: ReturnType<typeof vi.fn>;
  listEventHackProjects: ReturnType<typeof vi.fn>;
  getDerivedProfile: ReturnType<typeof vi.fn>;
  submitHack: ReturnType<typeof vi.fn>;
  listProjectsByEventId: ReturnType<typeof vi.fn>;
  deleteEventCascade: ReturnType<typeof vi.fn>;
  getSyncState: ReturnType<typeof vi.fn>;
  completeAndSync: ReturnType<typeof vi.fn>;
  createHackdayTemplateSeed: ReturnType<typeof vi.fn>;
  getHackdayTemplateSeedByConfluencePageId: ReturnType<typeof vi.fn>;
};

function createRepoMock(): RepoMock {
  return {
    ensureUser: vi.fn(),
    getEventByCreationRequestId: vi.fn(),
    getUserByAccountId: vi.fn(),
    getEventNameConflicts: vi.fn(),
    getEventByConfluencePageId: vi.fn(),
    getEventById: vi.fn(),
    listEventsByParentPageId: vi.fn(),
    ensureUserByEmail: vi.fn(),
    createEvent: vi.fn(),
    createMilestones: vi.fn().mockResolvedValue(undefined),
    addEventAdmin: vi.fn(),
    upsertSyncState: vi.fn(),
    logAudit: vi.fn(),
    updateEventLifecycle: vi.fn(),
    listEventAdmins: vi.fn(),
    listEventHackProjects: vi.fn(),
    getDerivedProfile: vi.fn().mockResolvedValue({
      userId: 'mock-user',
      submittedHacks: 0,
      syncedHacks: 0,
      activeInstances: 0,
      completedInstances: 0,
      reputationScore: 0,
      reputationTier: 'bronze',
      calculatedAt: '2026-02-18T00:00:00.000Z',
      cacheTtlMs: 300000,
    }),
    submitHack: vi.fn(),
    listProjectsByEventId: vi.fn(),
    deleteEventCascade: vi.fn(),
    getSyncState: vi.fn(),
    completeAndSync: vi.fn(),
    createHackdayTemplateSeed: vi.fn().mockResolvedValue({ provision_status: 'provisioned' }),
    getHackdayTemplateSeedByConfluencePageId: vi.fn().mockResolvedValue(null),
  };
}

const viewer: ViewerContext = {
  accountId: 'acc-1',
  siteUrl: 'https://example.atlassian.net',
  timezone: 'UTC',
};

const baseCreateInput: CreateInstanceDraftInput = {
  parentPageId: 'parent-page-1',
  creationRequestId: 'req-123',
  basicInfo: {
    eventName: 'HackDay Spring 2026',
    eventIcon: '🚀',
    primaryAdminEmail: 'owner@adaptavist.com',
  },
  schedule: {
    timezone: 'Europe/London',
  },
};

describe('HdcService hardening behavior', () => {
  let ServiceClass: typeof HdcService;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.HACKDAY_TEMPLATE_APP_ID = 'ari:cloud:ecosystem::app/d2f1f15e-9202-43b2-99e5-83722dedc1b2';
    process.env.HACKDAY_TEMPLATE_ENVIRONMENT_ID = 'b003228b-aafa-414e-9ab8-9e1ab5aaf5ae';
    process.env.HACKDAY_TEMPLATE_MACRO_KEY = 'hackday-2026-customui';
    ({ HdcService: ServiceClass } = await import('../forge-native/src/backend/hdcService'));
  });

  it('returns existing draft for same creationRequestId without creating a new child page', async () => {
    const repo = createRepoMock();
    repo.getEventByCreationRequestId.mockResolvedValue({
      id: 'event-1',
      confluence_page_id: 'child-100',
      confluence_page_url: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-100',
    });

    const service = new ServiceClass(repo as never);
    const result = await service.createInstanceDraft(viewer, baseCreateInput);

    expect(result).toEqual({
      eventId: 'event-1',
      childPageId: 'child-100',
      childPageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-100',
      templateProvisionStatus: null,
    });
    expect(createChildPageUnderParentMock).not.toHaveBeenCalled();
    expect(repo.getEventNameConflicts).not.toHaveBeenCalled();
  });

  it('persists normalized rules and branding from wizard payload', async () => {
    const repo = createRepoMock();
    repo.getEventByCreationRequestId.mockResolvedValue(null);
    repo.getEventNameConflicts.mockResolvedValue([]);
    repo.ensureUser.mockResolvedValue({ id: 'user-creator' });
    repo.createEvent.mockResolvedValue({
      id: 'event-created',
      name: 'HackDay Spring 2026',
      confluence_page_id: 'child-901',
      confluence_page_url: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-901',
    });
    repo.addEventAdmin.mockResolvedValue(undefined);
    repo.upsertSyncState.mockResolvedValue(undefined);
    repo.logAudit.mockResolvedValue(undefined);
    getCurrentUserEmailMock.mockResolvedValue('owner@adaptavist.com');
    createChildPageUnderParentMock.mockResolvedValue({
      pageId: 'child-901',
      pageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-901',
    });

    const service = new ServiceClass(repo as never);
    const result = await service.createInstanceDraft(viewer, {
      ...baseCreateInput,
      rules: {
        allowCrossTeamMentoring: false,
        minTeamSize: 3,
        maxTeamSize: 99,
        requireDemoLink: true,
        judgingModel: 'panel',
        submissionRequirements: ['video_demo', 'documentation'],
        categories: [' Innovation ', 'Business Impact', 'Innovation'],
        prizesText: '  First place: innovation budget  ',
      },
      branding: {
        bannerMessage: '  Build boldly  ',
        accentColor: '  #123abc  ',
        bannerImageUrl: '  https://cdn.example.com/banner.png  ',
        themePreference: 'dark',
      },
    });

    expect(result).toEqual({
      eventId: 'event-created',
      childPageId: 'child-901',
      childPageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-901',
      templateProvisionStatus: 'provisioned',
    });
    expect(repo.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventRules: {
          allowCrossTeamMentoring: false,
          minTeamSize: 3,
          maxTeamSize: 20,
          requireDemoLink: true,
          judgingModel: 'panel',
          submissionRequirements: ['video_demo', 'documentation'],
          categories: ['Innovation', 'Business Impact'],
          prizesText: 'First place: innovation budget',
        },
        eventBranding: {
          bannerMessage: 'Build boldly',
          accentColor: '#123abc',
          bannerImageUrl: 'https://cdn.example.com/banner.png',
          themePreference: 'dark',
        },
      })
    );
    expect(repo.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'event_created',
        newValue: expect.objectContaining({
          rules: expect.objectContaining({
            maxTeamSize: 20,
            judgingModel: 'panel',
          }),
          branding: expect.objectContaining({
            accentColor: '#123abc',
          }),
        }),
      })
    );
  });

  it('persists schedule payload and promotes lifecycle on go_live launch mode', async () => {
    const repo = createRepoMock();
    repo.getEventByCreationRequestId.mockResolvedValue(null);
    repo.getEventNameConflicts.mockResolvedValue([]);
    repo.ensureUser.mockResolvedValue({ id: 'user-creator' });
    repo.createEvent.mockResolvedValue({
      id: 'event-live',
      name: 'HackDay Spring 2026',
      confluence_page_id: 'child-live',
      confluence_page_url: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-live',
    });
    repo.addEventAdmin.mockResolvedValue(undefined);
    repo.upsertSyncState.mockResolvedValue(undefined);
    repo.logAudit.mockResolvedValue(undefined);
    getCurrentUserEmailMock.mockResolvedValue('owner@adaptavist.com');
    createChildPageUnderParentMock.mockResolvedValue({
      pageId: 'child-live',
      pageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-live',
    });

    const service = new ServiceClass(repo as never);
    await service.createInstanceDraft(viewer, {
      ...baseCreateInput,
      completedStep: 5,
      launchMode: 'go_live',
      schedule: {
        timezone: 'Europe/London',
        registrationOpensAt: '2026-02-20T09:00',
        registrationClosesAt: '2026-02-27T17:00',
        teamFormationStartsAt: '2026-02-27T17:00',
        teamFormationEndsAt: '2026-03-01T09:00',
        hackingStartsAt: '2026-03-01T09:00',
        submissionDeadlineAt: '2026-03-02T17:00',
        votingStartsAt: '2026-03-03T09:00',
        votingEndsAt: '2026-03-04T17:00',
        resultsAnnounceAt: '2026-03-05T10:00',
      },
    });

    expect(repo.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        lifecycleStatus: 'registration',
        eventSchedule: expect.objectContaining({
          registrationOpensAt: '2026-02-20T09:00',
          registrationClosesAt: '2026-02-27T17:00',
          teamFormationStartsAt: '2026-02-27T17:00',
          teamFormationEndsAt: '2026-03-01T09:00',
          hackingStartsAt: '2026-03-01T09:00',
          submissionDeadlineAt: '2026-03-02T17:00',
          votingStartsAt: '2026-03-03T09:00',
          votingEndsAt: '2026-03-04T17:00',
          resultsAnnounceAt: '2026-03-05T10:00',
        }),
      })
    );
  });

  it('creates custom-event milestones for hdc_native instances while preserving schedule metadata', async () => {
    const repo = createRepoMock();
    repo.getEventByCreationRequestId.mockResolvedValue(null);
    repo.getEventNameConflicts.mockResolvedValue([]);
    repo.ensureUser.mockResolvedValue({ id: 'user-creator' });
    repo.createEvent.mockResolvedValue({
      id: 'event-hdc-native',
      name: 'HackDay Spring 2026',
      confluence_page_id: 'child-native',
      confluence_page_url: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-native',
    });
    repo.addEventAdmin.mockResolvedValue(undefined);
    repo.upsertSyncState.mockResolvedValue(undefined);
    repo.logAudit.mockResolvedValue(undefined);
    getCurrentUserEmailMock.mockResolvedValue('owner@adaptavist.com');
    createChildPageUnderParentMock.mockResolvedValue({
      pageId: 'child-native',
      pageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-native',
    });

    const service = new ServiceClass(repo as never);
    const result = await service.createInstanceDraft(viewer, {
      ...baseCreateInput,
      instanceRuntime: 'hdc_native',
      schedule: {
        timezone: 'Europe/London',
        duration: 2,
        registrationOpensAt: '2026-02-20T09:00:00.000Z',
        openingCeremonyAt: '2026-03-01T09:00:00.000Z',
        hackingStartsAt: '2026-03-01T09:30:00.000Z',
        submissionDeadlineAt: '2026-03-02T14:00:00.000Z',
        judgingStartsAt: '2026-03-02T16:30:00.000Z',
        presentationsAt: '2026-03-02T15:00:00.000Z',
        customEvents: [
          {
            name: 'Mentor Office Hours',
            description: 'Optional coaching',
            timestamp: '2026-02-28T10:00:00.000Z',
            signal: 'neutral',
          },
          {
            name: 'API Freeze Checkpoint',
            timestamp: '2026-03-02T13:00:00.000Z',
            signal: 'deadline',
          },
          {
            name: 'Judge Q&A',
            timestamp: '2026-03-02T16:00:00.000Z',
            signal: 'judging',
          },
          {
            name: 'Team Lunch',
            timestamp: '2026-03-01T12:00:00.000Z',
            signal: 'ceremony',
          },
        ],
      },
    });

    expect(result.templateProvisionStatus).toBeNull();
    expect(repo.createHackdayTemplateSeed).not.toHaveBeenCalled();

    expect(repo.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeType: 'hdc_native',
        eventSchedule: expect.objectContaining({
          customEvents: expect.arrayContaining([
            expect.objectContaining({ name: 'Mentor Office Hours', signal: 'neutral' }),
            expect.objectContaining({ name: 'API Freeze Checkpoint', signal: 'deadline' }),
          ]),
        }),
      })
    );

    const insertedMilestones = repo.createMilestones.mock.calls[0]?.[0] ?? [];
    const byTitle = new Map(insertedMilestones.map((m: { title: string }) => [m.title, m]));

    expect(byTitle.get('Opening Ceremony')).toBeDefined();
    expect(byTitle.get('Presentations')).toBeDefined();

    expect(byTitle.get('Mentor Office Hours')).toMatchObject({
      phase: 'REGISTRATION',
      startTime: '2026-02-28T10:00:00.000Z',
      description: 'Optional coaching',
    });
    expect(byTitle.get('API Freeze Checkpoint')).toMatchObject({
      phase: 'SUBMISSION',
      startTime: '2026-03-02T13:00:00.000Z',
    });
    expect(byTitle.get('Judge Q&A')).toMatchObject({
      phase: 'JUDGING',
      startTime: '2026-03-02T16:00:00.000Z',
    });
    expect(byTitle.get('Team Lunch')).toMatchObject({
      phase: 'HACKING',
      startTime: '2026-03-01T12:00:00.000Z',
    });
  });

  it('preserves Schedule Builder V2 metadata in event, seed, and audit payloads without turning custom events into milestones for hackday_template instances', async () => {
    const repo = createRepoMock();
    repo.getEventByCreationRequestId.mockResolvedValue(null);
    repo.getEventNameConflicts.mockResolvedValue([]);
    repo.ensureUser.mockResolvedValue({ id: 'user-creator' });
    repo.createEvent.mockResolvedValue({
      id: 'event-v2',
      name: 'HackDay Spring 2026',
      confluence_page_id: 'child-v2',
      confluence_page_url: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-v2',
    });
    repo.addEventAdmin.mockResolvedValue(undefined);
    repo.upsertSyncState.mockResolvedValue(undefined);
    repo.logAudit.mockResolvedValue(undefined);
    getCurrentUserEmailMock.mockResolvedValue('owner@adaptavist.com');
    createChildPageUnderParentMock.mockResolvedValue({
      pageId: 'child-v2',
      pageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-v2',
    });

    const service = new ServiceClass(repo as never);
    await service.createInstanceDraft(viewer, {
      ...baseCreateInput,
      instanceRuntime: 'hackday_template',
      schedule: {
        timezone: 'Europe/London',
        duration: 3,
        selectedEvents: ['opening', 'hacking-begins', 'presentations'],
        registrationOpensAt: '2026-02-20T09:00:00.000Z',
        openingCeremonyAt: '2026-03-01T09:00:00.000Z',
        hackingStartsAt: '2026-03-01T09:30:00.000Z',
        lunchBreakDay1At: '2026-03-01T12:00:00.000Z',
        lunchBreakDay2At: '2026-03-02T12:00:00.000Z',
        submissionDeadlineAt: '2026-03-03T14:00:00.000Z',
        presentationsAt: '2026-03-03T15:00:00.000Z',
        judgingStartsAt: '2026-03-03T16:30:00.000Z',
        resultsAnnounceAt: '2026-03-03T18:00:00.000Z',
        customEvents: [
          {
            name: 'Mentor Office Hours',
            description: '  Optional coaching  ',
            timestamp: '2026-03-02T10:00:00.000Z',
            signal: 'neutral',
          },
        ],
      },
    });

    const createEventArg = repo.createEvent.mock.calls[0]?.[0];
    expect(createEventArg?.eventSchedule).toEqual(
      expect.objectContaining({
        duration: 3,
        selectedEvents: ['opening', 'hacking-begins', 'presentations'],
        openingCeremonyAt: '2026-03-01T09:00:00.000Z',
        presentationsAt: '2026-03-03T15:00:00.000Z',
        judgingStartsAt: '2026-03-03T16:30:00.000Z',
        lunchBreakDay1At: '2026-03-01T12:00:00.000Z',
        lunchBreakDay2At: '2026-03-02T12:00:00.000Z',
        customEvents: [
          {
            name: 'Mentor Office Hours',
            description: 'Optional coaching',
            timestamp: '2026-03-02T10:00:00.000Z',
            signal: 'neutral',
          },
        ],
      })
    );

    expect(repo.createHackdayTemplateSeed).toHaveBeenCalledWith(
      expect.objectContaining({
        seedPayload: expect.objectContaining({
          schedule: expect.objectContaining({
            duration: 3,
            selectedEvents: ['opening', 'hacking-begins', 'presentations'],
            customEvents: [
              {
                name: 'Mentor Office Hours',
                description: 'Optional coaching',
                timestamp: '2026-03-02T10:00:00.000Z',
                signal: 'neutral',
              },
            ],
          }),
        }),
      })
    );

    expect(repo.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        newValue: expect.objectContaining({
          schedule: expect.objectContaining({
            duration: 3,
            presentationsAt: '2026-03-03T15:00:00.000Z',
            customEvents: [
              expect.objectContaining({
                name: 'Mentor Office Hours',
                signal: 'neutral',
              }),
            ],
          }),
        }),
      })
    );

    const milestoneTitles = (repo.createMilestones.mock.calls[0]?.[0] ?? []).map((m: { title: string }) => m.title);
    expect(milestoneTitles).toContain('Opening Ceremony');
    expect(milestoneTitles).toContain('Presentations');
    expect(milestoneTitles).not.toContain('Mentor Office Hours');
  });

  it('skips invalid custom-event timestamps for hdc_native milestones without failing createInstanceDraft', async () => {
    const repo = createRepoMock();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    repo.getEventByCreationRequestId.mockResolvedValue(null);
    repo.getEventNameConflicts.mockResolvedValue([]);
    repo.ensureUser.mockResolvedValue({ id: 'user-creator' });
    repo.createEvent.mockResolvedValue({
      id: 'event-invalid-custom-ts',
      name: 'HackDay Spring 2026',
      confluence_page_id: 'child-invalid-ts',
      confluence_page_url: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-invalid-ts',
    });
    repo.addEventAdmin.mockResolvedValue(undefined);
    repo.upsertSyncState.mockResolvedValue(undefined);
    repo.logAudit.mockResolvedValue(undefined);
    getCurrentUserEmailMock.mockResolvedValue('owner@adaptavist.com');
    createChildPageUnderParentMock.mockResolvedValue({
      pageId: 'child-invalid-ts',
      pageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-invalid-ts',
    });

    const service = new ServiceClass(repo as never);
    await expect(
      service.createInstanceDraft(viewer, {
        ...baseCreateInput,
        instanceRuntime: 'hdc_native',
        schedule: {
          timezone: 'Europe/London',
          hackingStartsAt: '2026-03-01T09:30:00.000Z',
          customEvents: [
            {
              name: 'Broken Timestamp Event',
              timestamp: 'not-a-real-date',
              signal: 'neutral',
            },
            {
              name: 'Valid Custom Event',
              timestamp: '2026-03-01T12:00:00.000Z',
              signal: 'start',
            },
          ],
        },
      })
    ).resolves.toEqual(
      expect.objectContaining({
        eventId: 'event-invalid-custom-ts',
        childPageId: 'child-invalid-ts',
      })
    );

    const milestoneTitles = (repo.createMilestones.mock.calls[0]?.[0] ?? []).map((m: { title: string }) => m.title);
    expect(milestoneTitles).toContain('Valid Custom Event');
    expect(milestoneTitles).not.toContain('Broken Timestamp Event');
    expect(warnSpy).toHaveBeenCalledWith(
      '[createInstanceDraft] Skipping custom schedule event milestone due to invalid timestamp',
      expect.stringContaining('Broken Timestamp Event')
    );

    warnSpy.mockRestore();
  });

  it('rejects invalid schedule ordering before creating a child page', async () => {
    const repo = createRepoMock();
    const service = new ServiceClass(repo as never);

    await expect(
      service.createInstanceDraft(viewer, {
        ...baseCreateInput,
        schedule: {
          timezone: 'Europe/London',
          registrationOpensAt: '2026-02-21T10:00',
          registrationClosesAt: '2026-02-20T10:00',
        },
      })
    ).rejects.toThrow('Registration close must be after registration open.');

    expect(createChildPageUnderParentMock).not.toHaveBeenCalled();
    expect(repo.getEventByCreationRequestId).not.toHaveBeenCalled();
  });

  it('rejects go_live launch mode when hacking/submission dates are missing', async () => {
    const repo = createRepoMock();
    const service = new ServiceClass(repo as never);

    await expect(
      service.createInstanceDraft(viewer, {
        ...baseCreateInput,
        launchMode: 'go_live',
        schedule: {
          timezone: 'Europe/London',
        },
      })
    ).rejects.toThrow('Go live requires hacking start and submission deadline.');

    expect(createChildPageUnderParentMock).not.toHaveBeenCalled();
    expect(repo.getEventByCreationRequestId).not.toHaveBeenCalled();
  });

  it('rejects invalid team-size bounds before creating a child page', async () => {
    const repo = createRepoMock();
    const service = new ServiceClass(repo as never);

    await expect(
      service.createInstanceDraft(viewer, {
        ...baseCreateInput,
        rules: {
          minTeamSize: 7,
          maxTeamSize: 3,
        },
      })
    ).rejects.toThrow('Minimum team size must be less than or equal to maximum team size.');

    expect(createChildPageUnderParentMock).not.toHaveBeenCalled();
    expect(repo.getEventByCreationRequestId).not.toHaveBeenCalled();
  });

  it('returns default rules and branding in context for legacy events without config fields', async () => {
    const repo = createRepoMock();
    const telemetrySpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    repo.getEventByConfluencePageId.mockResolvedValue({
      id: 'event-legacy',
      name: 'Legacy HackDay',
      icon: null,
      tagline: null,
      lifecycle_status: 'draft',
      confluence_page_id: '   ',
      confluence_parent_page_id: 'parent-legacy',
      hacking_starts_at: null,
      submission_deadline_at: null,
      event_rules: null,
      event_branding: null,
    });
    repo.ensureUser.mockResolvedValue({ id: 'user-ctx' });
    repo.listEventsByParentPageId.mockResolvedValue([]);
    repo.getSyncState.mockResolvedValue(null);
    repo.listEventAdmins.mockResolvedValue([]);

    const service = new ServiceClass(repo as never);
    const context = await service.getContext(viewer, 'child-legacy');

    expect(context.pageType).toBe('instance');
    expect(context.event?.rules).toEqual({
      allowCrossTeamMentoring: true,
      maxTeamSize: 6,
      requireDemoLink: false,
      judgingModel: 'hybrid',
    });
    expect(context.event?.branding).toEqual({
      accentColor: '#0f766e',
    });
    expect(context.event?.confluencePageId).toBeNull();
    expect(context.event?.isNavigable).toBe(false);
    expect(context.derivedProfile).toMatchObject({
      userId: 'mock-user',
      reputationTier: 'bronze',
    });
    expect(telemetrySpy).toHaveBeenCalledWith(
      '[hdc-switcher-telemetry]',
      expect.stringContaining('"source":"hdcGetContext"')
    );
    telemetrySpy.mockRestore();
  });

  it('emits parent-context navigability telemetry', async () => {
    const repo = createRepoMock();
    const telemetrySpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    repo.getEventByConfluencePageId.mockResolvedValue(null);
    repo.ensureUser.mockResolvedValue({ id: 'user-parent' });
    repo.listEventsByParentPageId.mockResolvedValue([
      {
        id: 'evt-1',
        eventName: 'No Page Yet',
        icon: '🚀',
        tagline: null,
        lifecycleStatus: 'draft',
        confluencePageId: null,
        isNavigable: false,
        confluenceParentPageId: 'parent-page',
        schedule: {},
        hackingStartsAt: null,
        submissionDeadlineAt: null,
        rules: {
          allowCrossTeamMentoring: true,
          maxTeamSize: 6,
          requireDemoLink: false,
          judgingModel: 'hybrid',
        },
        branding: {
          accentColor: '#0f766e',
        },
      },
    ]);

    const service = new ServiceClass(repo as never);
    const context = await service.getContext(viewer, 'parent-page');

    expect(context.pageType).toBe('parent');
    expect(telemetrySpy).toHaveBeenCalledWith(
      '[hdc-switcher-telemetry]',
      expect.stringContaining('"pageType":"parent"')
    );
    telemetrySpy.mockRestore();
  });

  it('preserves previous pushed/skipped counts when sync fails after moving to in_progress', async () => {
    const repo = createRepoMock();
    const telemetrySpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    repo.ensureUser.mockResolvedValue({ id: 'user-1' });
    repo.getEventById.mockResolvedValue({ id: 'event-1', lifecycle_status: 'results' });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-1', role: 'primary' }]);
    repo.listEventHackProjects.mockResolvedValue([{ id: 'project-1' }]);
    repo.getSyncState.mockResolvedValue({
      eventId: 'event-1',
      syncStatus: 'failed',
      pushedCount: 3,
      skippedCount: 2,
      lastError: 'old',
      lastAttemptAt: '2026-02-16T00:00:00.000Z',
      syncErrorCategory: 'unknown',
      retryable: true,
      retryGuidance: 'Retry sync once.',
    });
    repo.completeAndSync.mockRejectedValue(new Error('sync exploded'));
    repo.upsertSyncState.mockResolvedValue({
      eventId: 'event-1',
      syncStatus: 'failed',
      pushedCount: 3,
      skippedCount: 2,
      lastError: 'sync exploded',
      lastAttemptAt: '2026-02-16T01:00:00.000Z',
      syncErrorCategory: 'unknown',
      retryable: true,
      retryGuidance: 'Retry sync once.',
    });

    const service = new ServiceClass(repo as never);
    await expect(service.completeAndSync(viewer, 'event-1')).rejects.toThrow('sync exploded');

    expect(repo.upsertSyncState).toHaveBeenCalledTimes(2);
    expect(repo.upsertSyncState.mock.calls[0][0]).toBe('event-1');
    expect(repo.upsertSyncState.mock.calls[0][1]).toMatchObject({
      syncStatus: 'in_progress',
      pushedCount: 3,
      skippedCount: 2,
      lastError: null,
    });
    expect(repo.upsertSyncState.mock.calls[1][0]).toBe('event-1');
    expect(repo.upsertSyncState.mock.calls[1][1]).toMatchObject({
      syncStatus: 'failed',
      pushedCount: 3,
      skippedCount: 2,
      lastError: 'sync exploded',
    });
    expect(repo.logAudit).not.toHaveBeenCalled();
    expect(telemetrySpy).toHaveBeenCalledWith(
      '[hdc-performance-telemetry]',
      expect.stringContaining('"action":"completeAndSync"')
    );
    expect(telemetrySpy).toHaveBeenCalledWith(
      '[hdc-performance-telemetry]',
      expect.stringContaining('"outcome":"error"')
    );
    telemetrySpy.mockRestore();
  });

  it('records sync_partial audit action when repository returns partial sync', async () => {
    const repo = createRepoMock();
    const telemetrySpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    repo.ensureUser.mockResolvedValue({ id: 'user-7' });
    repo.getEventById.mockResolvedValue({ id: 'event-9', lifecycle_status: 'results' });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-7', role: 'co_admin' }]);
    repo.listEventHackProjects.mockResolvedValue([{ id: 'project-9' }]);
    repo.getSyncState.mockResolvedValue(null);
    repo.completeAndSync.mockResolvedValue({
      syncStatus: 'partial',
      pushedCount: 1,
      skippedCount: 1,
      lastError: 'Failed to sync 1 hack(s) (project-9).',
      syncErrorCategory: 'partial_failure',
      retryable: true,
      retryGuidance: 'Some hacks did not sync. Retry sync now; if failures repeat, review recent project updates and retry.',
    });
    repo.upsertSyncState.mockResolvedValue({
      eventId: 'event-9',
      syncStatus: 'in_progress',
      pushedCount: 0,
      skippedCount: 0,
      lastError: null,
      lastAttemptAt: '2026-02-16T01:00:00.000Z',
      syncErrorCategory: 'none',
      retryable: false,
      retryGuidance: null,
    });

    const service = new ServiceClass(repo as never);
    const result = await service.completeAndSync(viewer, 'event-9');

    expect(result).toEqual({
      syncStatus: 'partial',
      pushedCount: 1,
      skippedCount: 1,
      lastError: 'Failed to sync 1 hack(s) (project-9).',
      syncErrorCategory: 'partial_failure',
      retryable: true,
      retryGuidance: 'Some hacks did not sync. Retry sync now; if failures repeat, review recent project updates and retry.',
    });
    expect(repo.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'event-9',
        actorUserId: 'user-7',
        action: 'sync_partial',
      })
    );
    expect(telemetrySpy).toHaveBeenCalledWith(
      '[hdc-performance-telemetry]',
      expect.stringContaining('"action":"completeAndSync"')
    );
    expect(telemetrySpy).toHaveBeenCalledWith(
      '[hdc-performance-telemetry]',
      expect.stringContaining('"outcome":"success"')
    );
    telemetrySpy.mockRestore();
  });

  it('blocks completeAndSync when viewer is not an event admin', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-2' });
    repo.getEventById.mockResolvedValue({ id: 'event-2', lifecycle_status: 'results' });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'someone-else', role: 'primary' }]);

    const service = new ServiceClass(repo as never);
    await expect(service.completeAndSync(viewer, 'event-2')).rejects.toThrow(
      'Only event admins can complete and sync this instance.'
    );

    expect(repo.listEventHackProjects).not.toHaveBeenCalled();
    expect(repo.completeAndSync).not.toHaveBeenCalled();
  });

  it('blocks completeAndSync when no hacks have been submitted', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-3' });
    repo.getEventById.mockResolvedValue({ id: 'event-3', lifecycle_status: 'results' });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-3', role: 'primary' }]);
    repo.listEventHackProjects.mockResolvedValue([]);

    const service = new ServiceClass(repo as never);
    await expect(service.completeAndSync(viewer, 'event-3')).rejects.toThrow(
      'Cannot complete sync: at least one submitted hack is required.'
    );

    expect(repo.completeAndSync).not.toHaveBeenCalled();
    expect(repo.upsertSyncState).not.toHaveBeenCalled();
  });

  it('blocks submitHack when instance lifecycle is completed', async () => {
    const repo = createRepoMock();
    repo.getEventById.mockResolvedValue({
      id: 'event-complete',
      lifecycle_status: 'completed',
    });

    const service = new ServiceClass(repo as never);
    await expect(
      service.submitHack(viewer, {
        eventId: 'event-complete',
        title: 'Should fail',
      })
    ).rejects.toThrow('Instance is read-only after completion; hack submissions are disabled.');

    expect(repo.submitHack).not.toHaveBeenCalled();
  });

  it('blocks completeAndSync when instance lifecycle is completed', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-complete' });
    repo.getEventById.mockResolvedValue({ id: 'event-complete', lifecycle_status: 'completed' });

    const service = new ServiceClass(repo as never);
    await expect(service.completeAndSync(viewer, 'event-complete')).rejects.toThrow(
      'Instance is read-only after completion; sync actions are disabled.'
    );

    expect(repo.listEventAdmins).not.toHaveBeenCalled();
    expect(repo.completeAndSync).not.toHaveBeenCalled();
  });

  it('deletes draft instance only for primary admin with no projects', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-primary' });
    repo.getEventById.mockResolvedValue({
      id: 'event-draft',
      name: 'Draft Event',
      lifecycle_status: 'draft',
      confluence_page_id: 'child-draft',
    });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-primary', role: 'primary' }]);
    repo.listProjectsByEventId.mockResolvedValue([]);
    repo.logAudit.mockResolvedValue(undefined);
    repo.deleteEventCascade.mockResolvedValue(undefined);
    deletePageMock.mockResolvedValue(undefined);

    const service = new ServiceClass(repo as never);
    const result = await service.deleteDraftInstance(viewer, 'event-draft');

    expect(result).toEqual({ deleted: true });
    expect(deletePageMock).toHaveBeenCalledWith('child-draft');
    expect(repo.deleteEventCascade).toHaveBeenCalledWith('event-draft');
  });

  it('blocks draft deletion when caller is not primary admin', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-coadmin' });
    repo.getEventById.mockResolvedValue({
      id: 'event-draft',
      lifecycle_status: 'draft',
      confluence_page_id: 'child-draft',
    });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-coadmin', role: 'co_admin' }]);

    const service = new ServiceClass(repo as never);
    await expect(service.deleteDraftInstance(viewer, 'event-draft')).rejects.toThrow(
      'Only the primary admin can delete a draft instance.'
    );

    expect(repo.deleteEventCascade).not.toHaveBeenCalled();
  });

  it('advances lifecycle from draft to registration for co-admin launch action', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-coadmin' });
    repo.getEventById.mockResolvedValue({
      id: 'event-100',
      lifecycle_status: 'draft',
    });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-coadmin', role: 'co_admin' }]);
    repo.updateEventLifecycle.mockResolvedValue(undefined);
    repo.logAudit.mockResolvedValue(undefined);

    const service = new ServiceClass(repo as never);
    const result = await service.launchInstance(viewer, 'event-100');

    expect(result).toEqual({ lifecycleStatus: 'registration' });
    expect(repo.updateEventLifecycle).toHaveBeenCalledWith('event-100', 'registration');
  });

  it('blocks lifecycle transition when viewer is not an event admin', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-participant' });
    repo.getEventById.mockResolvedValue({
      id: 'event-101',
      lifecycle_status: 'registration',
    });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'another-user', role: 'primary' }]);

    const service = new ServiceClass(repo as never);
    await expect(service.launchInstance(viewer, 'event-101')).rejects.toThrow(
      'Only event admins can launch an instance.'
    );

    expect(repo.updateEventLifecycle).not.toHaveBeenCalled();
  });

  it('enforces complete sync before moving lifecycle from results to completed', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-admin' });
    repo.getEventById.mockResolvedValue({
      id: 'event-102',
      lifecycle_status: 'results',
    });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-admin', role: 'primary' }]);
    repo.getSyncState.mockResolvedValue({
      eventId: 'event-102',
      syncStatus: 'partial',
      lastError: null,
      lastAttemptAt: null,
      pushedCount: 0,
      skippedCount: 1,
      syncErrorCategory: 'partial_failure',
      retryable: true,
      retryGuidance: 'Some hacks did not sync. Retry sync now; if failures repeat, review recent project updates and retry.',
    });

    const service = new ServiceClass(repo as never);
    await expect(service.launchInstance(viewer, 'event-102')).rejects.toThrow(
      'Cannot move to completed until sync status is complete.'
    );
    expect(repo.updateEventLifecycle).not.toHaveBeenCalled();
  });

  it('moves lifecycle from results to completed when sync status is complete', async () => {
    const repo = createRepoMock();
    repo.ensureUser.mockResolvedValue({ id: 'user-admin' });
    repo.getEventById.mockResolvedValue({
      id: 'event-103',
      lifecycle_status: 'results',
    });
    repo.listEventAdmins.mockResolvedValue([{ user_id: 'user-admin', role: 'primary' }]);
    repo.getSyncState.mockResolvedValue({
      eventId: 'event-103',
      syncStatus: 'complete',
      lastError: null,
      lastAttemptAt: null,
      pushedCount: 1,
      skippedCount: 0,
      syncErrorCategory: 'none',
      retryable: false,
      retryGuidance: null,
    });
    repo.updateEventLifecycle.mockResolvedValue(undefined);
    repo.logAudit.mockResolvedValue(undefined);

    const service = new ServiceClass(repo as never);
    const result = await service.launchInstance(viewer, 'event-103');

    expect(result).toEqual({ lifecycleStatus: 'completed' });
    expect(repo.updateEventLifecycle).toHaveBeenCalledWith('event-103', 'completed');
  });
});
