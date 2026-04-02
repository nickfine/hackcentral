import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const layoutPath = path.resolve(process.cwd(), 'forge-native/static/frontend/src/components/Layout.tsx');
const navPath = path.resolve(process.cwd(), 'forge-native/static/frontend/src/constants/nav.ts');
const appPath = path.resolve(process.cwd(), 'forge-native/static/frontend/src/App.tsx');

describe('HackCentral global nav shell', () => {
  it('defines the expected primary and overflow navigation groups', () => {
    const navSource = fs.readFileSync(navPath, 'utf8');

    expect(navSource).toContain("export const PRIMARY_NAV_ITEMS");
    expect(navSource).toContain("{ id: 'dashboard', label: 'Home'");
    expect(navSource).toContain("{ id: 'hacks', label: 'Hacks'");
    expect(navSource).toContain("{ id: 'problem_exchange', label: 'Pains'");
    expect(navSource).toContain("{ id: 'hackdays', label: 'HackDays'");
    expect(navSource).toContain("{ id: 'pipeline', label: 'Pipeline'");

    expect(navSource).toContain("export const OVERFLOW_NAV_ITEMS");
    expect(navSource).toContain("{ id: 'library', label: 'AI Tooling'");
    expect(navSource).toContain("{ id: 'team_up', label: 'Team Up'");
    expect(navSource).toContain("{ id: 'team_pulse', label: 'Team Pulse'");
    expect(navSource).toContain("{ id: 'guide', label: 'Guide'");
    expect(navSource).toContain("{ id: 'onboarding', label: 'Get Started'");
    expect(navSource).not.toContain("{ id: 'profile',");
  });

  it('renders the shell from a horizontal tab strip instead of a sidebar', () => {
    const layoutSource = fs.readFileSync(layoutPath, 'utf8');

    expect(layoutSource).toContain('className="tab-strip"');
    expect(layoutSource).toContain('className="tab-nav"');
    expect(layoutSource).toContain("className={`tab-link ${view === item.id ? 'tab-link-active' : ''}`}");
    expect(layoutSource).toContain('aria-label="Primary navigation"');
    expect(layoutSource).toContain('aria-label="More sections"');
    expect(layoutSource).toContain('role="menuitem"');
    expect(layoutSource).not.toContain('className="sidebar"');
    expect(layoutSource).not.toContain('<aside');
  });

  it('keeps header actions wired to the existing view state', () => {
    const layoutSource = fs.readFileSync(layoutPath, 'utf8');

    expect(layoutSource).toContain("onClick={() => setView('create_hackday')}");
    expect(layoutSource).toContain("onClick={() => setView('notifications')}");
    expect(layoutSource).toContain("onClick={() => setView('profile')}");
    expect(layoutSource).toContain('<button type="button" className="btn btn-primary top-primary-cta"');
    expect(layoutSource).toContain('aria-label="Notifications"');
    expect(layoutSource).toContain('aria-label="Open profile"');
  });

  it('preserves search and app-switcher entry points in the shell', () => {
    const layoutSource = fs.readFileSync(layoutPath, 'utf8');

    expect(layoutSource).toContain("setView('search');");
    expect(layoutSource).toContain('className="search-suggestions"');
    expect(layoutSource).toContain('id="global-app-switcher-menu"');
    expect(layoutSource).toContain('className="switcher-menu"');
    expect(layoutSource).toContain('void navigateToSwitcherPage(targetPageId);');
  });

  it('still exposes every navigation destination in App.tsx', () => {
    const appSource = fs.readFileSync(appPath, 'utf8');

    expect(appSource).toContain("{view === 'dashboard' ? (");
    expect(appSource).toContain("{view === 'hacks' ? (");
    expect(appSource).toContain("{view === 'problem_exchange' ? (");
    expect(appSource).toContain("{view === 'hackdays' ? (");
    expect(appSource).toContain("{view === 'pipeline' ? (");
    expect(appSource).toContain("{view === 'library' ? (");
    expect(appSource).toContain("{view === 'team_up' ? (");
    expect(appSource).toContain("{view === 'team_pulse' ? (");
    expect(appSource).toContain("{view === 'guide' ? (");
    expect(appSource).toContain("{view === 'onboarding' ? (");
    expect(appSource).toContain("{view === 'create_hackday' ? (");
    expect(appSource).toContain("{view === 'notifications' ? (");
    expect(appSource).toContain("{view === 'search' ? (");
  });
});
