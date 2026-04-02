import React, { useRef, useState, type ReactNode, type Ref } from 'react';
import type { EventRegistryItem } from '../types';
import { isNavigableRegistryItem, runSwitcherNavigation, switcherRowMetaText } from '../appSwitcher';
import { OVERFLOW_NAV_ITEMS, PRIMARY_NAV_ITEMS, type View } from '../constants/nav';

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
  searchExampleQueries: string[];
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
  globalSearch,
  setGlobalSearch,
  searchExampleQueries,
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
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const overflowRef = useRef<HTMLDivElement | null>(null);
  const visibleSearchExamples = searchExampleQueries.filter(Boolean).slice(0, 3);
  const overflowIsActive = OVERFLOW_NAV_ITEMS.some((item) => item.id === view);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-main">
          <button type="button" className="brand-home" onClick={() => setView('dashboard')} aria-label="Go to Home">
            <span className="brand-mark" aria-hidden>H</span>
            <span className="brand-title">HackDay Central</span>
          </button>
          <div
            className="top-search"
            ref={searchRef}
            onBlur={(event) => {
              if (!searchRef.current?.contains(event.relatedTarget as Node | null)) {
                setSearchSuggestionsOpen(false);
              }
            }}
          >
            <span className="search-icon" aria-hidden>🔍</span>
            <input
              type="search"
              placeholder="Search hacks, people, and pains..."
              aria-label="Search hacks, people, and pains"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onFocus={() => {
                if (visibleSearchExamples.length > 0) {
                  setSearchSuggestionsOpen(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchSuggestionsOpen(false);
                  return;
                }
                if (e.key === 'Enter') {
                  setSearchSuggestionsOpen(false);
                  setView('search');
                }
              }}
            />
            {searchSuggestionsOpen && visibleSearchExamples.length > 0 ? (
              <div className="search-suggestions" role="listbox" aria-label="Example search queries">
                {visibleSearchExamples.map((query) => (
                  <button
                    key={query}
                    type="button"
                    className="search-suggestion"
                    onClick={() => {
                      setGlobalSearch(query);
                      setSearchSuggestionsOpen(false);
                      setView('search');
                    }}
                  >
                    Try: {query}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="top-actions">
            <button type="button" className="btn btn-primary top-primary-cta" onClick={() => setView('create_hackday')}>
              Create HackDay
            </button>
            <button
              type="button"
              className="icon-btn top-action-btn"
              aria-label="Notifications"
              onClick={() => setView('notifications')}
            >
              <span aria-hidden>🔔</span>
            </button>
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
                <span className="switcher-trigger-label">Events</span>
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
                          <span className="switcher-row-title">HackDay Central</span>
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
            <button
              type="button"
              className="profile-chip"
              title={accountId}
              onClick={() => setView('profile')}
              aria-label="Open profile"
            >
              {profileInitial}
            </button>
          </div>
        </div>
        <div className="tab-strip">
          <nav className="tab-nav" aria-label="Primary navigation">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tab-link ${view === item.id ? 'tab-link-active' : ''}`}
                onClick={() => {
                  setOverflowOpen(false);
                  setView(item.id);
                }}
              >
                {item.label}
              </button>
            ))}
            <div
              className="overflow-nav"
              ref={overflowRef}
              onBlur={(event) => {
                if (!overflowRef.current?.contains(event.relatedTarget as Node | null)) {
                  setOverflowOpen(false);
                }
              }}
            >
              <button
                type="button"
                className={`tab-link overflow-trigger ${overflowIsActive ? 'tab-link-active' : ''}`}
                aria-haspopup="menu"
                aria-expanded={overflowOpen}
                aria-controls="overflow-nav-menu"
                aria-label="More sections"
                onClick={() => setOverflowOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (!overflowOpen && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')) {
                    event.preventDefault();
                    setOverflowOpen(true);
                  }
                  if (event.key === 'Escape') {
                    setOverflowOpen(false);
                  }
                }}
              >
                ···
              </button>
              {overflowOpen ? (
                <div id="overflow-nav-menu" className="overflow-menu" role="menu" aria-label="More sections">
                  {OVERFLOW_NAV_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      className={`overflow-link ${view === item.id ? 'overflow-link-active' : ''}`}
                      onClick={() => {
                        setOverflowOpen(false);
                        setView(item.id);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>
        </div>
      </header>
      <div className="shell-body">
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
                  {refreshingSwitcherRegistry ? 'Refreshing switcher list…' : 'Refresh switcher list'}
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
