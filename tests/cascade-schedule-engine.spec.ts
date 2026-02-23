import { describe, expect, it } from 'vitest';
import {
  CASCADE_PHASE_ORDER,
  CASCADE_RULES,
  computeSuggestedSchedule,
  getAnchorPhaseId,
  mergeWithOverrides,
  phaseDateMapToSchedule,
} from '../src/components/create/CascadeScheduleEngine';
import type { PhaseDateMap, ScheduleStepPhaseId } from '../src/components/create/types';

/** Parse ISO string to Date. */
function parseISO(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid ISO: ${iso}`);
  return d;
}

describe('CascadeScheduleEngine', () => {
  const timezone = 'Europe/London';
  // Fixed anchor: 2026-03-15 09:00 in London (UTC in winter = same as local)
  const anchorISO = '2026-03-15T09:00:00.000Z';
  const anchor = parseISO(anchorISO);

  describe('CASCADE_RULES and order', () => {
    it('has 9 phases in display order', () => {
      expect(CASCADE_RULES).toHaveLength(9);
      expect(CASCADE_PHASE_ORDER).toHaveLength(9);
      expect(CASCADE_PHASE_ORDER).toEqual(CASCADE_RULES.map((r) => r.phaseId));
    });

    it('anchor phase is hackingStartsAt with offset 0', () => {
      expect(getAnchorPhaseId()).toBe('hackingStartsAt');
      const anchorRule = CASCADE_RULES.find((r) => r.phaseId === 'hackingStartsAt');
      expect(anchorRule?.offsetDays).toBe(0);
    });

    it('registration opens -14 days, results +5 days', () => {
      const regOpen = CASCADE_RULES.find((r) => r.phaseId === 'registrationOpensAt');
      const results = CASCADE_RULES.find((r) => r.phaseId === 'resultsAnnounceAt');
      expect(regOpen?.offsetDays).toBe(-14);
      expect(results?.offsetDays).toBe(5);
    });
  });

  describe('computeSuggestedSchedule', () => {
    it('returns a map with all 9 phase IDs', () => {
      const suggested = computeSuggestedSchedule(anchor, timezone);
      expect(suggested.size).toBe(9);
      for (const phaseId of CASCADE_PHASE_ORDER) {
        expect(suggested.has(phaseId)).toBe(true);
        const iso = suggested.get(phaseId)!;
        expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
      }
    });

    it('anchor phase (hackingStartsAt) equals anchor time', () => {
      const suggested = computeSuggestedSchedule(anchor, timezone);
      const hackingIso = suggested.get('hackingStartsAt')!;
      expect(parseISO(hackingIso).getTime()).toBe(anchor.getTime());
    });

    it('registration opens -14 days at same time-of-day', () => {
      const suggested = computeSuggestedSchedule(anchor, timezone);
      const regOpenIso = suggested.get('registrationOpensAt')!;
      const regOpen = parseISO(regOpenIso);
      // 2026-03-15 - 14 days = 2026-03-01 09:00
      expect(regOpen.toISOString()).toMatch(/2026-03-01T09:00/);
    });

    it('results announced +5 days at same time-of-day', () => {
      const suggested = computeSuggestedSchedule(anchor, timezone);
      const resultsIso = suggested.get('resultsAnnounceAt')!;
      const results = parseISO(resultsIso);
      // 2026-03-15 + 5 days = 2026-03-20 09:00
      expect(results.toISOString()).toMatch(/2026-03-20T09:00/);
    });

    it('anchor and nearby phases have expected order (anchor at index 4)', () => {
      const suggested = computeSuggestedSchedule(anchor, timezone);
      const dates = CASCADE_PHASE_ORDER.map((id) => parseISO(suggested.get(id)!));
      // Display order is not strictly chronological (e.g. team formation starts -5d before registration closes -3d)
      // Just assert anchor is in the middle and all dates are valid
      const anchorIdx = CASCADE_PHASE_ORDER.indexOf('hackingStartsAt');
      expect(anchorIdx).toBe(4);
      expect(dates[anchorIdx].getTime()).toBe(anchor.getTime());
      expect(dates[0].getTime()).toBeLessThan(anchor.getTime());
      expect(dates[dates.length - 1].getTime()).toBeGreaterThan(anchor.getTime());
    });

    it('uses UTC when timezone is empty string', () => {
      const suggested = computeSuggestedSchedule(anchor, '');
      expect(suggested.size).toBe(9);
      const regOpen = suggested.get('registrationOpensAt')!;
      expect(parseISO(regOpen).toISOString()).toMatch(/2026-03-01T09:00/);
    });
  });

  describe('mergeWithOverrides', () => {
    it('returns suggested when overrides is empty', () => {
      const suggested = computeSuggestedSchedule(anchor, timezone);
      const merged = mergeWithOverrides(suggested, new Map());
      expect(merged.size).toBe(9);
      for (const phaseId of CASCADE_PHASE_ORDER) {
        expect(merged.get(phaseId)).toBe(suggested.get(phaseId));
      }
    });

    it('replaces suggested with override for specified phase', () => {
      const suggested = computeSuggestedSchedule(anchor, timezone);
      const overridden: PhaseDateMap = new Map();
      const customRegistration = '2026-02-20T10:00:00.000Z';
      overridden.set('registrationOpensAt', customRegistration);
      const merged = mergeWithOverrides(suggested, overridden);
      expect(merged.get('registrationOpensAt')).toBe(customRegistration);
      expect(merged.get('hackingStartsAt')).toBe(suggested.get('hackingStartsAt'));
    });

    it('multiple overrides applied, rest from suggested', () => {
      const suggested = computeSuggestedSchedule(anchor, timezone);
      const overrides = new Map<ScheduleStepPhaseId, string>([
        ['registrationOpensAt', '2026-02-20T09:00:00.000Z'],
        ['votingEndsAt', '2026-03-25T18:00:00.000Z'],
      ]);
      const merged = mergeWithOverrides(suggested, overrides);
      expect(merged.get('registrationOpensAt')).toBe('2026-02-20T09:00:00.000Z');
      expect(merged.get('votingEndsAt')).toBe('2026-03-25T18:00:00.000Z');
      expect(merged.get('hackingStartsAt')).toBe(suggested.get('hackingStartsAt'));
      expect(merged.get('teamFormationStartsAt')).toBe(suggested.get('teamFormationStartsAt'));
    });
  });

  describe('phaseDateMapToSchedule', () => {
    it('produces object with timezone and all 9 ISO fields', () => {
      const suggested = computeSuggestedSchedule(anchor, timezone);
      const schedule = phaseDateMapToSchedule(suggested, timezone);
      expect(schedule.timezone).toBe(timezone);
      expect(schedule.registrationOpensAt).toBeDefined();
      expect(schedule.hackingStartsAt).toBeDefined();
      expect(schedule.resultsAnnounceAt).toBeDefined();
      expect(Object.keys(schedule).length).toBe(10); // timezone + 9 phases
    });

    it('schedule shape matches CreateHackDayWizardPayload.schedule', () => {
      const suggested = computeSuggestedSchedule(anchor, timezone);
      const schedule = phaseDateMapToSchedule(suggested, timezone);
      const payloadSchedule = schedule as {
        timezone: string;
        registrationOpensAt?: string;
        registrationClosesAt?: string;
        teamFormationStartsAt?: string;
        teamFormationEndsAt?: string;
        hackingStartsAt?: string;
        submissionDeadlineAt?: string;
        votingStartsAt?: string;
        votingEndsAt?: string;
        resultsAnnounceAt?: string;
      };
      expect(payloadSchedule.timezone).toBe(timezone);
      expect(typeof payloadSchedule.registrationOpensAt).toBe('string');
      expect(typeof payloadSchedule.hackingStartsAt).toBe('string');
      expect(typeof payloadSchedule.resultsAnnounceAt).toBe('string');
    });
  });
});
