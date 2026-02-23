/**
 * Create HackDay — Phase 3 in-app wizard
 * 5 steps: Basic → Schedule → Rules → Branding → Review. Submits via Convex to Forge web trigger.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAction } from 'convex/react';
import { ChevronLeft, ChevronRight, Rocket, Check } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { CreateHackDayWizardPayload } from '../../convex/hackdays';
import { SectionHeader } from '@/components/shared';
import { ScheduleStep } from '@/components/create/ScheduleStep';
import type { Schedule } from '@/components/create/types';

const STEPS = [
  { id: 1, label: 'Basic' },
  { id: 2, label: 'Schedule' },
  { id: 3, label: 'Rules' },
  { id: 4, label: 'Branding' },
  { id: 5, label: 'Review' },
];

const DEFAULT_TIMEZONE = 'Europe/London';

/** Map known server errors to user-friendly messages and optional step to fix. */
function getUserFriendlyCreateError(message: string): { message: string; step?: number } {
  const m = message.toLowerCase();
  if (m.includes('go live requires') && (m.includes('hacking start') || m.includes('submission deadline'))) {
    return {
      message: 'To go live, you need to set Hacking start and Submission deadline. Please fill those in the Schedule step (step 2).',
      step: 2,
    };
  }
  if (m.includes('must have an email') || m.includes('primary admin email')) {
    return {
      message: 'We need an email to create the HackDay. Sign in with an account that has an email, or enter a Primary Admin Email in the Basic info step (step 1).',
      step: 1,
    };
  }
  return { message };
}

export default function CreateHackDay() {
  const navigate = useNavigate();
  const createFromWeb = useAction(api.hackdays.createHackDayFromWeb);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventName, setEventName] = useState('');
  const [eventIcon, setEventIcon] = useState('🚀');
  const [eventTagline, setEventTagline] = useState('');
  const [primaryAdminEmail, setPrimaryAdminEmail] = useState('');
  const [coAdminEmails, setCoAdminEmails] = useState('');

  const [schedule, setSchedule] = useState<Schedule>({ timezone: DEFAULT_TIMEZONE });

  const [minTeamSize, setMinTeamSize] = useState(1);
  const [maxTeamSize, setMaxTeamSize] = useState(6);
  const [allowCrossTeamMentoring, setAllowCrossTeamMentoring] = useState(true);
  const [requireDemoLink, setRequireDemoLink] = useState(false);
  const [judgingModel, setJudgingModel] = useState<'panel' | 'popular_vote' | 'hybrid'>('hybrid');
  const [categoriesInput, setCategoriesInput] = useState('');
  const [prizesText, setPrizesText] = useState('');

  const [accentColor, setAccentColor] = useState('#0f766e');
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [themePreference, setThemePreference] = useState<'system' | 'light' | 'dark'>('system');
  const [launchMode, setLaunchMode] = useState<'draft' | 'go_live'>('draft');

  const canProceedStep1 = eventName.trim().length > 0;
  const coAdminList = coAdminEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  function buildPayload(): CreateHackDayWizardPayload {
    return {
      basicInfo: {
        eventName: eventName.trim(),
        eventIcon: eventIcon || '🚀',
        eventTagline: eventTagline.trim() || undefined,
        primaryAdminEmail: primaryAdminEmail.trim() || undefined,
        coAdminEmails: coAdminList.length > 0 ? coAdminList : undefined,
      },
      schedule: {
        timezone: schedule.timezone || DEFAULT_TIMEZONE,
        registrationOpensAt: schedule.registrationOpensAt?.trim() || undefined,
        registrationClosesAt: schedule.registrationClosesAt?.trim() || undefined,
        teamFormationStartsAt: schedule.teamFormationStartsAt?.trim() || undefined,
        teamFormationEndsAt: schedule.teamFormationEndsAt?.trim() || undefined,
        hackingStartsAt: schedule.hackingStartsAt?.trim() || undefined,
        submissionDeadlineAt: schedule.submissionDeadlineAt?.trim() || undefined,
        votingStartsAt: schedule.votingStartsAt?.trim() || undefined,
        votingEndsAt: schedule.votingEndsAt?.trim() || undefined,
        resultsAnnounceAt: schedule.resultsAnnounceAt?.trim() || undefined,
      },
      rules: {
        allowCrossTeamMentoring,
        minTeamSize,
        maxTeamSize,
        requireDemoLink,
        judgingModel,
        categories:
          categoriesInput
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean).length > 0
            ? categoriesInput.split(',').map((c) => c.trim()).filter(Boolean)
            : undefined,
        prizesText: prizesText.trim() || undefined,
      },
      branding: {
        accentColor: accentColor.trim() || undefined,
        bannerMessage: bannerMessage.trim() || undefined,
        bannerImageUrl: bannerImageUrl.trim() || undefined,
        themePreference,
      },
      launchMode,
    };
  }

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      const result = await createFromWeb({ payload: buildPayload() });
      if (result.childPageUrl) {
        window.open(result.childPageUrl, '_blank', 'noopener,noreferrer');
      }
      navigate('/hackdays', { replace: true });
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Failed to create HackDay';
      const { message: friendly, step: suggestStep } = getUserFriendlyCreateError(raw);
      setError(friendly);
      if (suggestStep !== undefined) setStep(suggestStep);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/hackdays" className="hover:text-foreground">
          HackDays
        </Link>
        <span>/</span>
        <span>Create</span>
      </div>

      <SectionHeader
        variant="page"
        title="Create HackDay"
        description="Set up a new HackDay event. It will run on its own Confluence page."
      />

      {/* Stepper - design system phase stepper: text-xs, active teal, no pill */}
      <div className="flex items-center gap-2 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(s.id)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium min-h-0 ${
                step === s.id
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : step > s.id
                    ? 'text-gray-600 dark:text-gray-300 bg-transparent'
                    : 'text-gray-600 dark:text-gray-400 bg-transparent'
              }`}
            >
              {step > s.id ? <Check className="h-3 w-3" /> : s.id}
              <span>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-gray-500 dark:text-gray-600" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="card rounded-xl border p-5 space-y-6">
        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Basic info</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Event name *
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Q1 HackDay 2026"
                  className="input w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Icon
                  </label>
                  <input
                    type="text"
                    value={eventIcon}
                    onChange={(e) => setEventIcon(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={eventTagline}
                    onChange={(e) => setEventTagline(e.target.value)}
                    placeholder="Short description"
                    className="input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Primary admin email
                </label>
                <input
                  type="email"
                  value={primaryAdminEmail}
                  onChange={(e) => setPrimaryAdminEmail(e.target.value)}
                  placeholder="Uses your email if blank"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Co-admin emails (comma-separated)
                </label>
                <input
                  type="text"
                  value={coAdminEmails}
                  onChange={(e) => setCoAdminEmails(e.target.value)}
                  placeholder="a@example.com, b@example.com"
                  className="input w-full"
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Schedule</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                  Timezone
                </label>
                <input
                  type="text"
                  value={schedule.timezone ?? DEFAULT_TIMEZONE}
                  onChange={(e) =>
                    setSchedule((prev) => ({ ...prev, timezone: e.target.value || DEFAULT_TIMEZONE }))
                  }
                  className="input w-full"
                />
              </div>
              <ScheduleStep
                timezone={schedule.timezone ?? DEFAULT_TIMEZONE}
                schedule={schedule}
                onScheduleChange={setSchedule}
              />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rules</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Min team size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={minTeamSize}
                    onChange={(e) => setMinTeamSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Max team size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={maxTeamSize}
                    onChange={(e) => setMaxTeamSize(Math.max(1, parseInt(e.target.value, 10) || 6))}
                    className="input w-full"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowCrossTeamMentoring}
                  onChange={(e) => setAllowCrossTeamMentoring(e.target.checked)}
                />
                <span className="text-sm">Allow cross-team mentoring</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={requireDemoLink}
                  onChange={(e) => setRequireDemoLink(e.target.checked)}
                />
                <span className="text-sm">Require demo link</span>
              </label>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Judging model
                </label>
                <select
                  value={judgingModel}
                  onChange={(e) => setJudgingModel(e.target.value as 'panel' | 'popular_vote' | 'hybrid')}
                  className="input w-full"
                >
                  <option value="panel">Panel</option>
                  <option value="popular_vote">Popular vote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Categories (comma-separated)
                </label>
                <input
                  type="text"
                  value={categoriesInput}
                  onChange={(e) => setCategoriesInput(e.target.value)}
                  placeholder="e.g. Innovation, Impact"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Prizes description
                </label>
                <textarea
                  value={prizesText}
                  onChange={(e) => setPrizesText(e.target.value)}
                  rows={2}
                  className="input w-full"
                />
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Branding</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Accent color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-14 rounded border"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="input flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Banner message
                </label>
                <input
                  type="text"
                  value={bannerMessage}
                  onChange={(e) => setBannerMessage(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Banner image URL
                </label>
                <input
                  type="url"
                  value={bannerImageUrl}
                  onChange={(e) => setBannerImageUrl(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Theme
                </label>
                <select
                  value={themePreference}
                  onChange={(e) => setThemePreference(e.target.value as 'system' | 'light' | 'dark')}
                  className="input w-full"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review</h2>
            <div className="space-y-3 text-sm">
              <p><strong>Name:</strong> {eventName || '—'}</p>
              <p><strong>Tagline:</strong> {eventTagline || '—'}</p>
              <p><strong>Primary admin:</strong> {primaryAdminEmail || '(your email)'}</p>
              <p><strong>Team size:</strong> {minTeamSize}–{maxTeamSize}</p>
              <p><strong>Judging:</strong> {judgingModel}</p>
              <p><strong>Launch as:</strong>{' '}
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="launchMode"
                    checked={launchMode === 'draft'}
                    onChange={() => setLaunchMode('draft')}
                  />
                  Draft
                </label>
                <label className="inline-flex items-center gap-2 ml-4">
                  <input
                    type="radio"
                    name="launchMode"
                    checked={launchMode === 'go_live'}
                    onChange={() => setLaunchMode('go_live')}
                  />
                  Go live (registration)
                </label>
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="btn btn-sm btn-outline inline-flex items-center gap-2"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </button>
        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 1 && !canProceedStep1}
            className="btn btn-sm btn-primary inline-flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !canProceedStep1}
            className="btn btn-sm btn-primary inline-flex items-center gap-2"
          >
            {saving ? 'Creating…' : 'Create HackDay'}
            <Rocket className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
