import React, { type ReactNode, type Ref } from 'react';
import adaptaLogo from '../assets/adaptalogo.jpg';
import type { EventRegistryItem } from '../types';
import { isNavigableRegistryItem, runSwitcherNavigation, switcherRowMetaText } from '../appSwitcher';
import { NAV_ITEMS, type View } from '../constants/nav';

export interface SwitcherGroup {
  title: string;
  items: EventRegistryItem[];
}

export interface LayoutProps {
  view: View;
  setView: (v: View) => void;
  setHackTab: (t: 'completed' | 'in_progress') => void;
  globalSearch: string;
  setGlobalSearch: (v: string) => void;
  switcherOpen: boolean;
  setSwitcherOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  switcherRef: Ref<HTMLDivElement | null>;
  switcherMenuRef: Ref<HTMLDivElement | null>;
  onSwitcherMenuKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  switcherGroups: SwitcherGroup[];
  navigateToSwitcherPage: (targetPageId: string) => Promise<void>;
  profileInitial: string;
  accountId: string;
  switcherWarning: string;
  hasNonNavigableSwitcherItems: boolean;
  refreshSwitcherRegistry: () => Promise<void>;
  refreshingSwitcherRegistry: boolean;
  children: ReactNode;
}

export function Layout({
  view,
  setView,
  setHackTab,
  globalSearch,
  setGlobalSearch,
  switcherOpen,
  setSwitcherOpen,
  switcherRef,
  switcherMenuRef,
  onSwitcherMenuKeyDown,
  switcherGroups,
  navigateToSwitcherPage,
  profileInitial,
  accountId,
  switcherWarning,
  hasNonNavigableSwitcherItems,
  refreshSwitcherRegistry,
  refreshingSwitcherRegistry,
  children,
}: LayoutProps): JSX.Element {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <img src={adaptaLogo} alt="Adaptavist" className="brand-logo" />
        </div>
        <div className="top-search">
          <span className="search-icon" aria-hidden>🔍</span>
          <input
            type="search"
            placeholder="Search Completed Hacks and people..."
            aria-label="Search Completed Hacks and people"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setView('search'); }}
          />
        </div>
        <div className="top-actions">
          <div className="app-switcher" ref={switcherRef as React.RefObject<HTMLDivElement>}>
            <button
              type="button"
              className="switcher-trigger"
              aria-expanded={switcherOpen}
              aria-haspopup="menu"
              aria-controls="global-app-switcher-menu"
              onClick={() => setSwitcherOpen((open: boolean) => !open)}
              onKeyDown={(e) => {
                if (!switcherOpen && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
                  e.preventDefault();
                  setSwitcherOpen(true);
                }
              }}
            >
              <span className="switcher-trigger-icon" aria-hidden>🏠</span>
              <span className="switcher-trigger-label">HackDay Central</span>
              <span className="switcher-trigger-caret" aria-hidden>▾</span>
            </button>
            {switcherOpen ? (
              <>
                <button
                  type="button"
                  className="switcher-overlay"
                  aria-label="Close app switcher"
                  onClick={() => setSwitcherOpen(false)}
                />
                <div
                  id="global-app-switcher-menu"
                  className="switcher-menu"
                  role="menu"
                  aria-label="HackDay app switcher"
                  ref={switcherMenuRef as React.RefObject<HTMLDivElement>}
                  onKeyDown={onSwitcherMenuKeyDown}
                >
                  <section className="switcher-section" aria-label="Home">
                    <p className="switcher-section-title">Home</p>
                    <button type="button" data-switcher-option="true" className="switcher-row current" disabled>
                      <span className="switcher-row-main">
                        <span className="switcher-row-title">🏠 HackDay Central</span>
                        <span className="switcher-row-meta">Current page</span>
                      </span>
                      <span className="switcher-row-status">Home</span>
                    </button>
                  </section>
                  {switcherGroups.map((group) => (
                    <section key={group.title} className="switcher-section" aria-label={group.title}>
                      <p className="switcher-section-title">{group.title}</p>
                      {group.items.length === 0 ? (
                        <p className="switcher-empty">No events</p>
                      ) : (
                        group.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            data-switcher-option="true"
                            className="switcher-row"
                            disabled={!isNavigableRegistryItem(item)}
                            onClick={() => {
                              runSwitcherNavigation(item, (targetPageId) => {
                                void navigateToSwitcherPage(targetPageId);
                              });
                            }}
                          >
                            <span className="switcher-row-main">
                              <span className="switcher-row-title">{item.icon || '🚀'} {item.eventName}</span>
                              <span className="switcher-row-meta">{switcherRowMetaText(item)}</span>
                            </span>
                            <span className="switcher-row-status">{item.lifecycleStatus.replace('_', ' ')}</span>
                          </button>
                        ))
                      )}
                    </section>
                  ))}
                </div>
              </>
            ) : null}
          </div>
          <button type="button" className="icon-btn" aria-label="Notifications">⌁</button>
          <button type="button" className="icon-btn" aria-label="Messages">◻</button>
          <button type="button" className="profile-chip" title={accountId} onClick={() => setView('profile')} aria-label="Open profile">{profileInitial}</button>
        </div>
      </header>
      <div className="frame">
        <aside className="sidebar">
          <nav className="side-nav" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <React.Fragment key={item.id}>
                {item.groupLabel ? (
                  <p className="nav-group-label">{item.groupLabel}</p>
                ) : null}
                <button
                  type="button"
                  className={`side-link ${view === item.id ? 'side-link-active' : ''}`}
                  onClick={() => setView(item.id)}
                >
                  <span className="side-icon" aria-hidden>{item.icon}</span>
                  {item.label}
                </button>
              </React.Fragment>
            ))}
          </nav>
          <div className="sidebar-utility">
            <button
              type="button"
              className={`side-link ${view === 'profile' ? 'side-link-active' : ''}`}
              onClick={() => setView('profile')}
            >
              <span className="side-icon" aria-hidden>👤</span>
              Profile
            </button>
          </div>
        </aside>
        <main className="content">
          {switcherWarning ? <section className="message message-preview">{switcherWarning}</section> : null}
          {hasNonNavigableSwitcherItems ? (
            <section className="message message-preview">
              Some switcher entries are unavailable until their Confluence pages are provisioned.
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void refreshSwitcherRegistry()}
                  disabled={refreshingSwitcherRegistry}
                >
                  {refreshingSwitcherRegistry ? 'Refreshing registry…' : 'Refresh switcher registry'}
                </button>
              </div>
            </section>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
