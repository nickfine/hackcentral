import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  deriveEffectiveEventPhase,
  hasCompletedRegistration,
  isProcessTriggeredTeamFormationEligible,
} from '../forge-native/static/runtime-frontend/src/lib/registrationState.js';

async function readSource(relativePath: string) {
  return fs.readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('runtime effective phase derivation', () => {
  it('treats completed participant registration as team formation during signup', () => {
    const user = {
      role: 'participant',
      name: 'Alex Chen',
      displayName: 'Alex Chen',
      skills: ['React'],
    };

    expect(hasCompletedRegistration(user)).toBe(true);
    expect(isProcessTriggeredTeamFormationEligible(user)).toBe(true);
    expect(deriveEffectiveEventPhase('signup', user)).toBe('team_formation');
  });

  it('treats completed ambassador registration as team formation during signup', () => {
    const user = {
      role: 'ambassador',
      name: 'Priya Nair',
      displayName: 'Priya Nair',
      skills: ['Facilitation'],
    };

    expect(deriveEffectiveEventPhase('signup', user)).toBe('team_formation');
  });

  it('keeps unregistered users in signup', () => {
    const user = {
      role: 'participant',
      name: 'Casey Bento',
      displayName: 'Casey Bento',
      skills: [],
    };

    expect(hasCompletedRegistration(user)).toBe(false);
    expect(deriveEffectiveEventPhase('signup', user)).toBe('signup');
  });

  it('keeps judges and admins on the global signup phase', () => {
    const judge = {
      role: 'judge',
      name: 'Jordan Lee',
      displayName: 'Jordan Lee',
      skills: ['Scoring'],
    };
    const admin = {
      role: 'admin',
      name: 'Pat Morgan',
      displayName: 'Pat Morgan',
      skills: ['Operations'],
    };

    expect(isProcessTriggeredTeamFormationEligible(judge)).toBe(false);
    expect(isProcessTriggeredTeamFormationEligible(admin)).toBe(false);
    expect(deriveEffectiveEventPhase('signup', judge)).toBe('signup');
    expect(deriveEffectiveEventPhase('signup', admin)).toBe('signup');
  });

  it('preserves later calendar-driven phases unchanged', () => {
    const user = {
      role: 'participant',
      name: 'Maya Rodriguez',
      displayName: 'Maya Rodriguez',
      skills: ['Node.js'],
    };

    expect(deriveEffectiveEventPhase('team_formation', user)).toBe('team_formation');
    expect(deriveEffectiveEventPhase('hacking', user)).toBe('hacking');
  });
});

describe('runtime effective phase app-shell contract', () => {
  it('routes participant-facing surfaces through effectiveEventPhase while keeping admin on the real phase', async () => {
    const source = await readSource('forge-native/static/runtime-frontend/src/App.jsx');

    expect(source).toContain("import { deriveEffectiveEventPhase, hasCompletedRegistration } from './lib/registrationState';");
    expect(source).toContain('const effectiveEventPhase = useMemo(');
    expect(source).toContain("() => deriveEffectiveEventPhase(eventPhase, effectiveUser),");
    expect(source).toContain('eventPhase: effectiveEventPhase,');
    expect(source).toContain('realEventPhase: eventPhase,');
    expect(source).toContain('<AdminPanel');
    expect(source).toContain('eventPhase={eventPhase}');
    expect(source).toContain('<AppLayout');
    expect(source).toContain('eventPhase={effectiveEventPhase}');
    expect(source).toContain('<Signup');
    expect(source).toContain('realEventPhase={eventPhase}');
    expect(source).toContain('<TeamDetail');
  });

  it('lets the localhost participant_guest simulation progress after signup completion', async () => {
    const source = await readSource('forge-native/static/runtime-frontend/src/App.jsx');

    expect(source).toContain("const [devParticipantGuestNeedsSignup, setDevParticipantGuestNeedsSignup] = useState(false);");
    expect(source).toContain('const handleDevRoleChange = useCallback((nextRole) => {');
    expect(source).toContain("setDevParticipantGuestNeedsSignup(nextRole === 'participant_guest');");
    expect(source).toContain("if (devRoleOverride === 'participant_guest') {");
    expect(source).toContain("if (!devParticipantGuestNeedsSignup && hasCompletedRegistration(user)) {");
    expect(source).toContain("id: `FREE_AGENT_${user.id}`");
    expect(source).toContain("id: `GUEST_${user.id}`");
    expect(source).toContain("if (devRoleOverride === 'participant_guest' && hasCompletedRegistration(nextUser)) {");
  });

  it('redirects completed participants out of the signup route without interrupting the success handoff', async () => {
    const source = await readSource('forge-native/static/runtime-frontend/src/components/Signup.jsx');

    expect(source).toContain("realEventPhase = eventPhase,");
    expect(source).toContain("if (showSuccess) return;");
    expect(source).toContain("if (realEventPhase !== 'signup') return;");
    expect(source).toContain("if (eventPhase !== 'team_formation') return;");
    expect(source).toContain("if (!hasCompletedRegistration(user)) return;");
    expect(source).toContain("onNavigate('dashboard', {}, { replace: true });");
  });

  it('keeps dev phase controls bound to the real phase and sends unregistered signup next actions to signup', async () => {
    const layoutSource = await readSource('forge-native/static/runtime-frontend/src/components/AppLayout.jsx');
    const dashboardSource = await readSource('forge-native/static/runtime-frontend/src/components/Dashboard.jsx');
    const missionContentSource = await readSource('forge-native/static/runtime-frontend/src/lib/missionBriefContent.js');

    expect(layoutSource).toContain('realEventPhase = eventPhase,');
    expect(layoutSource).toContain('value={realEventPhase}');
    expect(dashboardSource).toContain('function buildMyProgressModel({ eventPhase, userTeam, hasSubmitted, phaseEndDate, isRegisteredUser })');
    expect(dashboardSource).toContain("if (eventPhase === 'signup' && !isRegisteredUser) {");
    expect(dashboardSource).toContain("nextActionLabel: 'Sign Up Now'");
    expect(dashboardSource).toContain("nextActionRoute: 'signup'");
    expect(dashboardSource).not.toContain('const inlineFreeAgentAlert = useMemo(() => {');
    expect(dashboardSource).not.toContain("title: 'Free agent action'");
    expect(missionContentSource).toContain("status: 'Next step: sign up to unlock your HackDay workspace.'");
    expect(missionContentSource).toContain("primaryCTA: { label: 'Sign Up Now', action: 'signup' }");
  });
});
