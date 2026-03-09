export const CONFIG_MODE_MOTD_PRIORITIES = new Set(['info', 'warning', 'urgent']);
export const CONFIG_MODE_MOTD_TITLE_MAX_LENGTH = 80;
export const CONFIG_MODE_MOTD_MESSAGE_MAX_LENGTH = 500;
export const CONFIG_MODE_BANNER_MESSAGE_MAX_LENGTH = 200;
export const CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH = 220;
export const CONFIG_MODE_SCHEDULE_EVENT_SIGNALS = new Set([
  'start',
  'deadline',
  'ceremony',
  'presentation',
  'judging',
  'neutral',
]);
export const CONFIG_MODE_THEME_PRESETS = new Set(['default', 'editorial', 'summit', 'studio']);
const NEW_TO_HACKDAY_ALLOWED_CONTENT_OVERRIDE_KEYS = [
  ['newToHackday.hero.label', 40],
  ['newToHackday.hero.title', 120],
  ['newToHackday.hero.subtitle', 320],
  ['newToHackday.hero.pathIdeas', 40],
  ['newToHackday.hero.pathBuild', 40],
  ['newToHackday.hero.pathSubmit', 40],
  ['newToHackday.hero.recommendedFlow', 180],

  ['newToHackday.stats.label', 40],
  ['newToHackday.stats.buildWindow.value', 16],
  ['newToHackday.stats.buildWindow.label', 40],
  ['newToHackday.stats.teamSize.value', 16],
  ['newToHackday.stats.teamSize.label', 40],
  ['newToHackday.stats.demoLimit.value', 16],
  ['newToHackday.stats.demoLimit.label', 40],

  ['newToHackday.first30.label', 40],
  ['newToHackday.first30.title', 120],
  ['newToHackday.first30.subtitle', 260],
  ['newToHackday.first30.step1.window', 24],
  ['newToHackday.first30.step1.title', 80],
  ['newToHackday.first30.step1.detail', 220],
  ['newToHackday.first30.step2.window', 24],
  ['newToHackday.first30.step2.title', 80],
  ['newToHackday.first30.step2.detail', 220],
  ['newToHackday.first30.step3.window', 24],
  ['newToHackday.first30.step3.title', 80],
  ['newToHackday.first30.step3.detail', 220],

  ['newToHackday.journey.label', 40],
  ['newToHackday.journey.title', 120],
  ['newToHackday.journey.subtitle', 280],
  ['newToHackday.journey.step1.estimatedTime', 24],
  ['newToHackday.journey.step1.title', 100],
  ['newToHackday.journey.step1.description', 260],
  ['newToHackday.journey.step1.outcome', 220],
  ['newToHackday.journey.step1.doNowLabel', 40],
  ['newToHackday.journey.step2.estimatedTime', 24],
  ['newToHackday.journey.step2.title', 100],
  ['newToHackday.journey.step2.description', 260],
  ['newToHackday.journey.step2.outcome', 220],
  ['newToHackday.journey.step2.doNowLabel', 40],
  ['newToHackday.journey.step3.estimatedTime', 24],
  ['newToHackday.journey.step3.title', 100],
  ['newToHackday.journey.step3.description', 260],
  ['newToHackday.journey.step3.outcome', 220],
  ['newToHackday.journey.step3.doNowLabel', 40],

  ['newToHackday.keyRules.label', 40],
  ['newToHackday.keyRules.title', 120],
  ['newToHackday.keyRules.subtitle', 260],
  ['newToHackday.keyRules.rule1.title', 90],
  ['newToHackday.keyRules.rule1.description', 220],
  ['newToHackday.keyRules.rule2.title', 90],
  ['newToHackday.keyRules.rule2.description', 220],
  ['newToHackday.keyRules.rule3.title', 90],
  ['newToHackday.keyRules.rule3.description', 220],

  ['newToHackday.socialProof.heading', 80],
  ['newToHackday.socialProof.item1.title', 90],
  ['newToHackday.socialProof.item1.description', 220],
  ['newToHackday.socialProof.item2.title', 90],
  ['newToHackday.socialProof.item2.description', 220],
  ['newToHackday.socialProof.item3.title', 90],
  ['newToHackday.socialProof.item3.description', 220],
  ['newToHackday.socialProof.quickStart.title', 80],
  ['newToHackday.socialProof.quickStart.subtitle', 180],
  ['newToHackday.socialProof.quickStart.step1', 120],
  ['newToHackday.socialProof.quickStart.step2', 120],
  ['newToHackday.socialProof.quickStart.step3', 120],

  ['newToHackday.faq.label', 40],
  ['newToHackday.faq.title', 120],
  ['newToHackday.faq.subtitle', 220],
  ['newToHackday.faq.item1.question', 140],
  ['newToHackday.faq.item1.answer', 420],
  ['newToHackday.faq.item2.question', 140],
  ['newToHackday.faq.item2.answer', 420],
  ['newToHackday.faq.item3.question', 140],
  ['newToHackday.faq.item3.answer', 420],
  ['newToHackday.faq.item4.question', 140],
  ['newToHackday.faq.item4.answer', 420],

  ['newToHackday.nextStep.label', 40],
  ['newToHackday.nextStep.title', 100],
  ['newToHackday.nextStep.subtitle', 180],
  ['newToHackday.mobileQuickStart.label', 40],
];

export const CONFIG_MODE_ALLOWED_CONTENT_OVERRIDE_KEYS = new Map([
  ['dashboard.hero.title', 120],
  ['dashboard.hero.subtitlePrimary', 220],
  ['dashboard.hero.subtitleSecondary', 220],
  ['rules.header.title', 80],
  ['rules.header.subtitle', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.general.sectionTitle', 80],
  ['rules.general.timeLimit.title', 90],
  ['rules.general.timeLimit.description', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.general.teamSize.title', 90],
  ['rules.general.teamSize.description', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.general.originalWork.title', 90],
  ['rules.general.originalWork.description', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.general.submissionRequirements.title', 90],
  ['rules.general.submissionRequirements.description', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.general.judgingCriteria.title', 90],
  ['rules.general.judgingCriteria.description', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.general.codeOfConduct.title', 90],
  ['rules.general.codeOfConduct.description', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.allowed.sectionTitle', 80],
  ['rules.allowed.searchDocs.title', 100],
  ['rules.allowed.searchDocs.description', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.allowed.searchDocs.example', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.allowed.ideFeatures.title', 100],
  ['rules.allowed.ideFeatures.description', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.allowed.ideFeatures.example', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.allowed.librariesFrameworks.title', 100],
  ['rules.allowed.librariesFrameworks.description', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.allowed.librariesFrameworks.example', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.allowed.templatesBoilerplates.title', 100],
  ['rules.allowed.templatesBoilerplates.description', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.allowed.templatesBoilerplates.example', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.allowed.collaborationTools.title', 100],
  ['rules.allowed.collaborationTools.description', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.allowed.collaborationTools.example', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.notAllowed.sectionTitle', 80],
  ['rules.notAllowed.prebuiltProjects.title', 100],
  ['rules.notAllowed.prebuiltProjects.description', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.notAllowed.prebuiltProjects.example', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.notAllowed.purchasedSolutions.title', 100],
  ['rules.notAllowed.purchasedSolutions.description', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.notAllowed.purchasedSolutions.example', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.notAllowed.plagiarism.title', 100],
  ['rules.notAllowed.plagiarism.description', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.notAllowed.plagiarism.example', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.tips.sectionTitle', 80],
  ['rules.tips.tip1', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.tips.tip2', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.tips.tip3', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ['rules.tips.tip4', CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH],
  ...NEW_TO_HACKDAY_ALLOWED_CONTENT_OVERRIDE_KEYS,
]);

export function normalizeConfigModeContentOverridesEnvelope(value) {
  const normalizedValues = {};
  const sourceValues = value && typeof value === 'object' && value.values && typeof value.values === 'object'
    ? value.values
    : {};

  for (const [key, rawValue] of Object.entries(sourceValues)) {
    if (!CONFIG_MODE_ALLOWED_CONTENT_OVERRIDE_KEYS.has(key)) continue;
    if (typeof rawValue !== 'string') continue;
    const trimmed = rawValue.trim();
    const maxLength = CONFIG_MODE_ALLOWED_CONTENT_OVERRIDE_KEYS.get(key) || CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH;
    normalizedValues[key] = trimmed.slice(0, maxLength);
  }

  return {
    schemaVersion: 1,
    version: Number.isFinite(Number(value?.version)) ? Number(value.version) : 0,
    updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : null,
    updatedBy: value?.updatedBy && typeof value.updatedBy === 'object'
      ? {
          accountId: typeof value.updatedBy.accountId === 'string' ? value.updatedBy.accountId : null,
          displayName: typeof value.updatedBy.displayName === 'string' ? value.updatedBy.displayName : null,
        }
      : null,
    values: normalizedValues,
  };
}

export function normalizeConfigModeBrandingPatch(value) {
  if (!value || typeof value !== 'object') return {};

  const next = {};
  if (value.accentColor !== undefined) {
    next.accentColor = String(value.accentColor).trim().slice(0, 40);
  }
  if (value.bannerImageUrl !== undefined) {
    next.bannerImageUrl = String(value.bannerImageUrl).trim().slice(0, 500);
  }
  if (value.heroIconImageUrl !== undefined) {
    next.heroIconImageUrl = String(value.heroIconImageUrl).trim().slice(0, 500);
  }
  if (value.newToHackdayImageUrl !== undefined) {
    next.newToHackdayImageUrl = String(value.newToHackdayImageUrl).trim().slice(0, 500);
  }
  if (value.themePreference !== undefined) {
    const pref = String(value.themePreference).trim();
    next.themePreference = ['light', 'dark', 'system'].includes(pref) ? pref : 'system';
  }
  if (value.themePreset !== undefined) {
    const preset = String(value.themePreset).trim();
    if (!preset) {
      next.themePreset = 'default';
    } else if (CONFIG_MODE_THEME_PRESETS.has(preset)) {
      next.themePreset = preset;
    } else {
      throw new Error(`Invalid theme preset: ${preset}`);
    }
  }

  return next;
}

export function normalizeConfigModeMotdPatch(value) {
  if (!value || typeof value !== 'object') return {};

  const next = {};
  if (value.title !== undefined) {
    next.title = String(value.title).trim().slice(0, CONFIG_MODE_MOTD_TITLE_MAX_LENGTH);
  }
  if (value.message !== undefined) {
    next.message = String(value.message).trim().slice(0, CONFIG_MODE_MOTD_MESSAGE_MAX_LENGTH);
  }
  if (value.priority !== undefined) {
    const priority = String(value.priority).trim();
    next.priority = CONFIG_MODE_MOTD_PRIORITIES.has(priority) ? priority : 'info';
  }

  return next;
}

export function normalizeConfigModeContentOverridesPatch(value) {
  if (!value || typeof value !== 'object') return {};

  const next = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (!CONFIG_MODE_ALLOWED_CONTENT_OVERRIDE_KEYS.has(key)) {
      throw new Error(`Unsupported content override key: ${key}`);
    }
    const maxLength = CONFIG_MODE_ALLOWED_CONTENT_OVERRIDE_KEYS.get(key) || CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH;
    next[key] = String(rawValue ?? '').trim().slice(0, maxLength);
  }
  return next;
}

function normalizeConfigModeScheduleDuration(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const rounded = Math.floor(parsed);
  if (rounded < 1 || rounded > 3) return undefined;
  return rounded;
}

function normalizeConfigModeScheduleTimestamp(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
}

function normalizeConfigModeScheduleStringList(value) {
  if (!Array.isArray(value)) return undefined;
  const normalized = Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    )
  );
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeConfigModeScheduleCustomEvents(value) {
  if (!Array.isArray(value)) return undefined;

  const normalized = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const description = typeof item.description === 'string' ? item.description.trim() : '';
    const timestamp = normalizeConfigModeScheduleTimestamp(item.timestamp);
    const sourceEventId = typeof item.sourceEventId === 'string' ? item.sourceEventId.trim() : '';
    const sourcePhaseKey = typeof item.sourcePhaseKey === 'string' ? item.sourcePhaseKey.trim() : '';
    const signal =
      typeof item.signal === 'string' && CONFIG_MODE_SCHEDULE_EVENT_SIGNALS.has(item.signal)
        ? item.signal
        : null;
    if (!name || !timestamp || !signal) continue;
    normalized.push({
      name: name.slice(0, 120),
      ...(description ? { description: description.slice(0, 280) } : {}),
      timestamp,
      signal,
      ...(sourceEventId ? { sourceEventId: sourceEventId.slice(0, 120) } : {}),
      ...(sourcePhaseKey ? { sourcePhaseKey: sourcePhaseKey.slice(0, 120) } : {}),
    });
  }

  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeConfigModeSchedulePatch(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const next = {};
  const duration = normalizeConfigModeScheduleDuration(value.duration);
  if (duration !== undefined) {
    next.duration = duration;
  }

  if (value.timezone !== undefined) {
    const timezone = String(value.timezone ?? '').trim();
    next.timezone = timezone || 'Europe/London';
  }

  const selectedEvents = normalizeConfigModeScheduleStringList(value.selectedEvents);
  if (selectedEvents) {
    next.selectedEvents = selectedEvents;
  }

  const customEvents = normalizeConfigModeScheduleCustomEvents(value.customEvents);
  if (customEvents) {
    next.customEvents = customEvents;
  }

  const timestampFields = [
    'registrationOpensAt',
    'registrationClosesAt',
    'teamFormationStartsAt',
    'teamFormationEndsAt',
    'openingCeremonyAt',
    'hackingStartsAt',
    'lunchBreakDay1At',
    'afternoonCheckinDay1At',
    'dinnerBreakDay1At',
    'eveningCheckinDay1At',
    'lunchBreakDay2At',
    'afternoonCheckinDay2At',
    'dinnerBreakDay2At',
    'eveningCheckinDay2At',
    'lunchBreakDay3At',
    'afternoonCheckinDay3At',
    'dinnerBreakDay3At',
    'submissionDeadlineAt',
    'presentationsAt',
    'judgingStartsAt',
    'votingStartsAt',
    'votingEndsAt',
    'resultsAnnounceAt',
  ];

  for (const field of timestampFields) {
    if (value[field] === undefined) continue;
    const normalized = normalizeConfigModeScheduleTimestamp(value[field]);
    if (normalized) {
      next[field] = normalized;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

export function normalizeConfigModeDraftPatch(value, { strict = false } = {}) {
  if (!value || typeof value !== 'object') {
    return {
      branding: {},
      motdMessage: {},
      contentOverrides: {},
      schedule: undefined,
    };
  }

  const sourceKeys = Object.keys(value);
  if (strict) {
    for (const key of sourceKeys) {
      if (!['branding', 'motdMessage', 'contentOverrides', 'schedule'].includes(key)) {
        throw new Error(`Unsupported draft patch section: ${key}`);
      }
    }
  }

  return {
    branding: normalizeConfigModeBrandingPatch(value.branding),
    motdMessage: normalizeConfigModeMotdPatch(value.motdMessage),
    contentOverrides: normalizeConfigModeContentOverridesPatch(value.contentOverrides),
    schedule: normalizeConfigModeSchedulePatch(value.schedule),
  };
}

export function mergeConfigModeDraftPatches(basePatch, patchUpdates) {
  const base = normalizeConfigModeDraftPatch(basePatch);
  const updates = normalizeConfigModeDraftPatch(patchUpdates, { strict: true });
  return {
    branding: { ...base.branding, ...updates.branding },
    motdMessage: { ...base.motdMessage, ...updates.motdMessage },
    contentOverrides: { ...base.contentOverrides, ...updates.contentOverrides },
    schedule: updates.schedule !== undefined ? updates.schedule : base.schedule,
  };
}

export function normalizeConfigModeDraftEnvelope(value) {
  if (!value || typeof value !== 'object') return null;

  return {
    schemaVersion: 1,
    draftVersion: Number.isFinite(Number(value.draftVersion)) ? Number(value.draftVersion) : 0,
    basePublishedVersion: Number.isFinite(Number(value.basePublishedVersion)) ? Number(value.basePublishedVersion) : 0,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
    updatedBy: value.updatedBy && typeof value.updatedBy === 'object'
      ? {
          accountId: typeof value.updatedBy.accountId === 'string' ? value.updatedBy.accountId : null,
          displayName: typeof value.updatedBy.displayName === 'string' ? value.updatedBy.displayName : null,
        }
      : null,
    patch: normalizeConfigModeDraftPatch(value.patch),
  };
}

export function assertExpectedConfigModeDraftVersion({ currentDraft, expectedDraftVersion }) {
  const currentDraftVersion = currentDraft?.draftVersion ?? null;

  if (expectedDraftVersion === null || expectedDraftVersion === undefined) {
    if (currentDraft) {
      throw new Error('Draft conflict: a draft already exists. Reload and retry.');
    }
    return;
  }

  const parsedExpected = Number(expectedDraftVersion);
  if (!Number.isFinite(parsedExpected)) {
    throw new Error('expectedDraftVersion must be a number or null');
  }

  if ((currentDraftVersion ?? 0) !== parsedExpected) {
    throw new Error(`Draft conflict: expected version ${parsedExpected} but found ${currentDraftVersion ?? 0}`);
  }
}
