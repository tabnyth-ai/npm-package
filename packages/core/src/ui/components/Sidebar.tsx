import { Plus, Search, Table2 } from "lucide-preact";
import { useEffect, useMemo, useState } from "preact/hooks";

import type { ContainerInfo } from "../api/types";
import { QuickLoader } from "./QuickLoader";

interface SidebarProps {
  containers: ContainerInfo[];
  selectedName?: string;
  loading: boolean;
  adapterLabel: string;
  onSelect(container: ContainerInfo): void;
}

export function Sidebar({ containers, selectedName, loading, adapterLabel, onSelect }: SidebarProps) {
  const [filter, setFilter] = useState("");
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

      <button class="new-connection-button" type="button">
        <Plus aria-hidden="true" size={16} />
        <span>New Connection</span>
      </button>
    </div>
  );
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
