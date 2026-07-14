import { Plus, Search, Table2, X } from "lucide-preact";
import { createPortal } from "preact/compat";
import { useEffect, useMemo, useState } from "preact/hooks";

import { connectDatabase } from "../api/client";
import type { ConnectDatabaseResponse, ContainerInfo } from "../api/types";
import { QuickLoader } from "./QuickLoader";

interface SidebarProps {
  containers: ContainerInfo[];
  selectedName?: string;
  loading: boolean;
  adapterLabel: string;
  onConnected?(response: ConnectDatabaseResponse): Promise<void> | void;
  onSelect(container: ContainerInfo): void;
}

export function Sidebar({ containers, selectedName, loading, adapterLabel, onConnected, onSelect }: SidebarProps) {
  const [filter, setFilter] = useState("");
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState("all");
  const schemas = useMemo(() => {
    return Array.from(new Set(containers.map(resolveSchema).filter(Boolean) as string[])).sort((left, right) =>
      left.localeCompare(right)
    );
  }, [containers]);

  const visibleContainers = useMemo(() => {
    const query = filter.trim().toLowerCase();
    const schemaFiltered =
      selectedSchema === "all"
        ? containers
        : containers.filter((container) => resolveSchema(container) === selectedSchema);

    if (!query) {
      return schemaFiltered;
    }

    return schemaFiltered.filter((container) => {
      const label = container.displayName ?? container.name;
      return label.toLowerCase().includes(query);
    });
  }, [containers, filter, selectedSchema]);

  useEffect(() => {
    if (selectedSchema !== "all" && !schemas.includes(selectedSchema)) {
      setSelectedSchema("all");
    }
  }, [schemas, selectedSchema]);

  function handleSchemaChange(schema: string): void {
    setSelectedSchema(schema);

    const nextContainer =
      schema === "all" ? containers[0] : containers.find((container) => resolveSchema(container) === schema);

    if (nextContainer && nextContainer.name !== selectedName) {
      onSelect(nextContainer);
    }
  }

  return (
    <div class="sidebar-inner">
      <div class="connection-summary">
        <h2>{adapterLabel}</h2>
        <p>Containers: {containers.length}</p>
      </div>

      {schemas.length > 0 ? (
        <label class="schema-switcher">
          <span>Schema</span>
          <select
            aria-label="Switch schema"
            value={selectedSchema}
            onChange={(event) => handleSchemaChange(event.currentTarget.value)}
          >
            <option value="all">All schemas</option>
            {schemas.map((schema) => (
              <option key={schema} value={schema}>
                {schema}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label class="sidebar-search">
        <Search aria-hidden="true" size={15} />
        <input
          aria-label="Filter tables"
          placeholder="Filter tables..."
          type="search"
          value={filter}
          onInput={(event) => setFilter(event.currentTarget.value)}
        />
      </label>

      <div class="container-list">
        {loading ? <SidebarListLoading /> : null}
        {!loading && visibleContainers.length === 0 ? <p class="muted">No tables or collections found.</p> : null}
        {visibleContainers.map((container) => (
          <button
            class={container.name === selectedName ? "container-button active" : "container-button"}
            key={container.name}
            type="button"
            onClick={() => onSelect(container)}
          >
            <Table2 aria-hidden="true" size={16} />
            <span>{container.displayName ?? container.name}</span>
            <small>{container.type}</small>
          </button>
        ))}
      </div>

      <button class="new-connection-button" type="button" onClick={() => setConnectionModalOpen(true)}>
        <Plus aria-hidden="true" size={16} />
        <span>New Connection</span>
      </button>

      {connectionModalOpen
        ? // Portal out of .sidebar-content: its transform creates a containing
          // block that would trap and clip the fixed-position backdrop. The
          // .app-frame node keeps the theme variables and scoped styles.
          createPortal(
            <NewConnectionModal onClose={() => setConnectionModalOpen(false)} onConnected={onConnected} />,
            document.querySelector(".app-frame") ?? document.body
          )
        : null}
    </div>
  );
}

function NewConnectionModal({
  onClose,
  onConnected
}: {
  onClose(): void;
  onConnected?(response: ConnectDatabaseResponse): Promise<void> | void;
}) {
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  async function handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (connecting) {
      return;
    }

    const trimmed = databaseUrl.trim();

    if (!trimmed) {
      setError("DATABASE_URL is required.");
      return;
    }

    if (!isSupportedDatabaseUrl(trimmed)) {
      setError("Use a postgres://, postgresql://, mongodb://, or mongodb+srv:// URL.");
      return;
    }

    setError(null);
    setConnecting(true);

    try {
      const response = await connectDatabase({ databaseUrl: trimmed, mode });
      await onConnected?.(response);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div
      class="connection-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <section aria-label="New database connection" aria-modal="true" class="connection-modal" role="dialog">
        <header class="connection-modal-header">
          <div>
            <strong>New Connection</strong>
            <span>Connect this Studio session to another database</span>
          </div>
          <button aria-label="Close new connection" class="icon-button" type="button" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <form class="connection-form" onSubmit={(event) => void handleSubmit(event)}>
          <label class="connection-field">
            <span>DATABASE_URL</span>
            <input
              autoFocus
              placeholder="postgresql://user:pass@localhost:5432/app"
              spellcheck={false}
              type="text"
              value={databaseUrl}
              onInput={(event) => {
                setDatabaseUrl(event.currentTarget.value);
                setError(null);
              }}
            />
          </label>

          <div class="connection-mode" aria-label="Startup mode">
            <button
              aria-pressed={mode === "view"}
              class={mode === "view" ? "active" : undefined}
              disabled={connecting}
              type="button"
              onClick={() => setMode("view")}
            >
              View mode
            </button>
            <button
              aria-pressed={mode === "edit"}
              class={mode === "edit" ? "active" : undefined}
              disabled={connecting}
              type="button"
              onClick={() => setMode("edit")}
            >
              Edit mode
            </button>
          </div>

          {error ? <div class="connection-error">{error}</div> : null}

          <button aria-busy={connecting} class="deploy-connection-button" disabled={connecting} type="submit">
            {connecting ? "Connecting..." : "Deploy connection"}
          </button>
        </form>
      </section>
    </div>
  );
}

function isSupportedDatabaseUrl(value: string): boolean {
  return /^(postgres:\/\/|postgresql:\/\/|mongodb:\/\/|mongodb\+srv:\/\/)/i.test(value);
}

function SidebarListLoading() {
  return (
    <div class="sidebar-list-loading">
      <span class="inline-loader-label">
        <QuickLoader color="teal" />
        <span>Loading tables</span>
      </span>
      {[0, 1, 2, 3, 4].map((item) => (
        <span class="container-button skeleton-row" key={item} aria-hidden="true">
          <span class="skeleton-icon" />
          <span class="skeleton-line" />
          <span class="skeleton-chip" />
        </span>
      ))}
    </div>
  );
}

function resolveSchema(container: ContainerInfo): string | undefined {
  if (container.schema) {
    return container.schema;
  }

  if (!container.name.includes(".")) {
    return undefined;
  }

  return container.name.split(".")[0];
}
