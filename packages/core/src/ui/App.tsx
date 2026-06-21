import { useEffect, useState } from "preact/hooks";
import { Lock, Unlock } from "lucide-preact";

import type { ContainerInfo, QueryResult, SearchResult } from "./api/types";
import { AppLayout, type StudioView } from "./components/AppLayout";
import { ErrorMessage } from "./components/ErrorMessage";
import { LoadingState } from "./components/LoadingState";
import { Sidebar } from "./components/Sidebar";
import { BrowsePanel } from "./features/browser/BrowsePanel";
import { LogsPanel } from "./features/logs/LogsPanel";
import { QueryPanel } from "./features/query/QueryPanel";
import { VisualizerPanel } from "./features/visualizer/VisualizerPanel";
import { useBrowse } from "./hooks/useBrowse";
import { useContainers } from "./hooks/useContainers";
import { useMeta } from "./hooks/useMeta";
import { useSearchResources } from "./hooks/useSearchResources";

export function App() {
  const metaState = useMeta();
  const containerState = useContainers();
  const [selected, setSelected] = useState<ContainerInfo | null>(null);
  const [activeView, setActiveView] = useState<StudioView>("query");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [searchValue, setSearchValue] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const browseState = useBrowse(selected, limit, page);
  const searchState = useSearchResources(searchValue);

  useEffect(() => {
    if (metaState.meta) {
      setLimit(metaState.meta.defaultLimit);
    }
  }, [metaState.meta?.defaultLimit]);

  useEffect(() => {
    setPage(1);
    setQueryResult(null);
  }, [selected?.name, limit]);

  useEffect(() => {
    if (!selected && containerState.containers.length > 0) {
      setSelected(containerState.containers[0]);
    }
  }, [containerState.containers, selected]);

  if (metaState.loading) {
    return <LoadingState label="Starting studio..." />;
  }

  if (!metaState.meta) {
    return <ErrorMessage message={metaState.error ?? "Unable to load studio metadata."} />;
  }

  const selectedTitle = selected?.displayName ?? selected?.name ?? "Select a table or collection";
  const adapterLabel = `${metaState.meta.adapter} ${metaState.meta.kind}`;
  const totalPages = Math.max(1, Math.ceil((browseState.result?.totalRows ?? browseState.result?.rowCount ?? 0) / limit));
  const activeTableResult = queryResult ?? browseState.result;
  const activeTableTitle = queryResult ? "Query result" : selectedTitle;
  const activeTableStatus = queryResult ? formatQueryResultStatus(queryResult) : undefined;

  function handleSearchResultSelect(result: SearchResult): void {
    const nextSelected = containerState.containers.find((container) => container.name === result.containerName);

    if (nextSelected) {
      handleSelectContainer(nextSelected);
      setActiveView("browser");
      setSearchValue("");
    }
  }

  function handleSelectContainer(container: ContainerInfo): void {
    setQueryResult(null);
    setSelected(container);
  }

  return (
    <AppLayout
      activeView={activeView}
      onViewChange={setActiveView}
      searchError={searchState.error}
      searchLoading={searchState.loading}
      searchResults={searchState.results}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      onSearchResultSelect={handleSearchResultSelect}
      sidebar={
        <Sidebar
          adapterLabel={adapterLabel}
          containers={containerState.containers}
          selectedName={selected?.name}
          loading={containerState.loading}
          onSelect={handleSelectContainer}
        />
      }
    >
      <div class="top-status">
        <span class={metaState.meta.allowWrite ? "mode-pill write" : "mode-pill"}>
          {metaState.meta.allowWrite ? <Unlock aria-hidden="true" size={15} /> : <Lock aria-hidden="true" size={15} />}
          {metaState.meta.allowWrite ? "Write mode enabled" : "Read-only mode"}
        </span>
        <span>Limit {limit}</span>
      </div>

      <ErrorMessage message={containerState.error} />

      {activeView === "query" ? (
        <div class="workspace-grid">
          <QueryPanel meta={metaState.meta} selected={selected} onRunResult={setQueryResult} />
          <BrowsePanel
            allowWrite={metaState.meta.allowWrite}
            container={selected}
            enableCellEditing={false}
            kind={metaState.meta.kind}
            title={activeTableTitle}
            result={activeTableResult}
            error={browseState.error}
            loading={queryResult ? false : browseState.loading}
            limit={limit}
            maxLimit={metaState.meta.maxLimit}
            page={page}
            showControls={!queryResult}
            status={activeTableStatus}
            totalPages={queryResult ? 1 : totalPages}
            onLimitChange={setLimit}
            onPageChange={setPage}
            onRefresh={() => void browseState.refresh()}
          />
        </div>
      ) : null}

      {activeView === "browser" ? (
        <div class="workspace-grid single-panel">
          <BrowsePanel
            allowWrite={metaState.meta.allowWrite}
            container={selected}
            enableCellEditing
            kind={metaState.meta.kind}
            title={selectedTitle}
            result={browseState.result}
            error={browseState.error}
            loading={browseState.loading}
            limit={limit}
            maxLimit={metaState.meta.maxLimit}
            page={page}
            totalPages={totalPages}
            onLimitChange={setLimit}
            onPageChange={setPage}
            onRefresh={() => void browseState.refresh()}
          />
        </div>
      ) : null}

      {activeView === "visualizer" ? (
        <div class="workspace-grid single-panel">
          <VisualizerPanel
            containers={containerState.containers}
            selectedName={selected?.name}
            onSelect={handleSelectContainer}
          />
        </div>
      ) : null}

      {activeView === "logs" ? (
        <div class="workspace-grid single-panel">
          <LogsPanel
            allowWrite={metaState.meta.allowWrite}
            adapterLabel={adapterLabel}
            containersCount={containerState.containers.length}
            lastBrowse={browseState.result}
            selectedTitle={selectedTitle}
            timeoutMs={metaState.meta.timeoutMs}
          />
        </div>
      ) : null}
    </AppLayout>
  );
}

function formatQueryResultStatus(result: QueryResult): string {
  const rowLabel = result.rowCount === 1 ? "row" : "rows";
  return `${result.rowCount} ${rowLabel} · ${result.durationMs} ms`;
}
