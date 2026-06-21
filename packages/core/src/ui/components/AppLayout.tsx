import type { ComponentChildren } from "preact";
import { MessageSquare, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, X } from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";

import type { SearchResult } from "../api/types";
import { NythAiDrawer } from "../features/nyth-ai/NythAiDrawer";
import { QuickLoader } from "./QuickLoader";

export type StudioView = "query" | "browser" | "visualizer" | "logs";

interface AppLayoutProps {
  activeView: StudioView;
  sidebar: ComponentChildren;
  children: ComponentChildren;
  searchError?: string | null;
  searchLoading?: boolean;
  searchResults?: SearchResult[];
  searchValue?: string;
  onInsertAiQuery?(query: string): void;
  onViewChange(view: StudioView): void;
  onSearchChange?(value: string): void;
  onSearchResultSelect?(result: SearchResult): void;
}

const tabs: Array<{ label: string; view: StudioView }> = [
  { label: "Query Editor", view: "query" },
  { label: "Data Browser", view: "browser" },
  { label: "Visualizer", view: "visualizer" },
  { label: "Logs", view: "logs" }
];

export function AppLayout({
  activeView,
  sidebar,
  children,
  searchError,
  searchLoading = false,
  searchResults = [],
  searchValue = "",
  onInsertAiQuery,
  onViewChange,
  onSearchChange,
  onSearchResultSelect
}: AppLayoutProps) {
  const [theme, setTheme] = useState<"dark" | "light">(readInitialTheme);
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const nextTheme = theme === "dark" ? "light" : "dark";
  const trimmedSearch = searchValue.trim();

  useEffect(() => {
    localStorage.setItem("tabnyth-theme", theme);
  }, [theme]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable === true;

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }

      if ((event.metaKey || event.ctrlKey) && key === "i" && !isTyping) {
        event.preventDefault();
        setAiOpen((open) => !open);
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setAiOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [searchOpen]);

  return (
    <div class={sidebarCollapsed ? "app-frame sidebar-collapsed" : "app-frame"} data-theme={theme}>
      <header class="top-nav">
        <div class="top-brand">
          <img alt="" aria-hidden="true" class="brand-mark" height="36" src="/assets/tabnyth-mark.png" width="36" />
          <strong>Tabnyth Studio</strong>
        </div>

        <nav class="top-tabs" aria-label="Studio sections">
          {tabs.map((tab) => (
            <button
              aria-current={activeView === tab.view ? "page" : undefined}
              class={activeView === tab.view ? "top-tab active" : "top-tab"}
              key={tab.view}
              type="button"
              onClick={() => onViewChange(tab.view)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div class="top-actions">
          <button class="global-search search-trigger" type="button" onClick={() => setSearchOpen(true)}>
            <Search aria-hidden="true" size={16} />
            <span class="search-trigger-label">Search resources...</span>
            <span class="shortcut-keys" aria-hidden="true">
              <kbd>Cmd</kbd>
              <kbd>K</kbd>
            </span>
          </button>
          <button class="ai-trigger" type="button" onClick={() => setAiOpen(true)}>
            <MessageSquare aria-hidden="true" size={16} />
            <span>Ask Nyth AI</span>
          </button>
          <button
            aria-label={`Switch to ${nextTheme} theme`}
            aria-pressed={theme === "light"}
            class="icon-button"
            type="button"
            onClick={() => setTheme(nextTheme)}
          >
            {theme === "dark" ? <Sun aria-hidden="true" size={21} /> : <Moon aria-hidden="true" size={21} />}
          </button>
        </div>
      </header>

      <div class="app-shell">
        <aside class={sidebarCollapsed ? "sidebar collapsed" : "sidebar"}>
          <button
            aria-label={sidebarCollapsed ? "Expand tables sidebar" : "Collapse tables sidebar"}
            class="icon-button bordered sidebar-collapse-button"
            type="button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            {sidebarCollapsed ? <PanelLeftOpen aria-hidden="true" size={18} /> : <PanelLeftClose aria-hidden="true" size={18} />}
          </button>
          <div aria-hidden={sidebarCollapsed ? "true" : "false"} class="sidebar-content">
            {sidebar}
          </div>
        </aside>
        <main class="main-panel">{children}</main>
      </div>

      {searchOpen ? (
        <div class="command-overlay" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) {
            setSearchOpen(false);
          }
        }}>
          <section aria-label="Search resources" aria-modal="true" class="command-dialog" role="dialog">
            <div class="command-search-row">
              <Search aria-hidden="true" size={22} />
              <input
                ref={searchInputRef}
                aria-label="Search resources"
                placeholder="Search tables, columns, and values..."
                type="search"
                value={searchValue}
                onInput={(event) => onSearchChange?.(event.currentTarget.value)}
              />
              <button aria-label="Close search" class="icon-button command-close" type="button" onClick={() => setSearchOpen(false)}>
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <div class="command-results">
              {trimmedSearch.length < 2 ? (
                <div class="command-empty">
                  <Search aria-hidden="true" size={24} />
                  <strong>Search your database resources</strong>
                  <span>Type at least 2 characters to find tables, columns, and matching values.</span>
                </div>
              ) : null}

              {trimmedSearch.length >= 2 && searchLoading ? <SearchShadowLoader /> : null}
              {trimmedSearch.length >= 2 && searchError ? <div class="search-state error">{searchError}</div> : null}
              {trimmedSearch.length >= 2 && !searchLoading && !searchError && searchResults.length === 0 ? (
                <div class="search-state">No matches found.</div>
              ) : null}
              {trimmedSearch.length >= 2 && !searchLoading && !searchError
                ? searchResults.map((result) => (
                    <button
                      class="search-result-card"
                      key={`${result.kind}:${result.containerName ?? ""}:${result.columnName ?? ""}:${result.title}`}
                      type="button"
                      onClick={() => {
                        onSearchResultSelect?.(result);
                        setSearchOpen(false);
                      }}
                    >
                      <span class="search-result-kind">{result.kind}</span>
                      <span class="search-result-title">{result.title}</span>
                      <small class="search-result-description">{result.description}</small>
                    </button>
                  ))
                : null}
            </div>
          </section>
        </div>
      ) : null}

      {aiOpen ? <NythAiDrawer onClose={() => setAiOpen(false)} onInsertQuery={onInsertAiQuery} /> : null}
    </div>
  );
}

function readInitialTheme(): "dark" | "light" {
  const stored = localStorage.getItem("tabnyth-theme");
  return stored === "light" ? "light" : "dark";
}

function SearchShadowLoader() {
  return (
    <div class="search-shadow-loader" aria-label="Searching database" role="status">
      <span class="inline-loader-label">
        <QuickLoader color="teal" />
        <span>Searching database</span>
      </span>
      {[0, 1, 2].map((item) => (
        <span class="search-shadow-card" key={item} aria-hidden="true">
          <span class="search-shadow-kicker" />
          <span class="search-shadow-title" />
          <span class="search-shadow-description" />
        </span>
      ))}
    </div>
  );
}
