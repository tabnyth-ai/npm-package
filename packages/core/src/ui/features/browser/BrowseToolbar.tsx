import type { ComponentChildren } from "preact";
import { ChevronLeft, ChevronRight, Funnel, Maximize2, Minimize2, Plus, RefreshCw, Table2 } from "lucide-preact";

import { QuickLoader } from "../../components/QuickLoader";

interface BrowseToolbarProps {
  canInsert?: boolean;
  canSave?: boolean;
  editStatus?: ComponentChildren;
  expanded?: boolean;
  filterCount?: number;
  filtersOpen?: boolean;
  showControls?: boolean;
  title: string;
  limit: number;
  maxLimit: number;
  loading: boolean;
  page: number;
  pendingEditsCount?: number;
  pendingRowsCount?: number;
  saving?: boolean;
  totalPages: number;
  onDiscardEdits?(): void;
  onInsertRow?(): void;
  onLimitChange(limit: number): void;
  onPageChange(page: number): void;
  onRefresh(): void;
  onSaveRequest?(): void;
  onToggleExpanded?(): void;
  onToggleFilters?(): void;
}

const limitOptions = [25, 50, 100, 250, 500, 1000];

export function BrowseToolbar({
  canInsert = false,
  canSave = false,
  editStatus,
  expanded = false,
  filterCount = 0,
  filtersOpen = false,
  title,
  limit,
  maxLimit,
  loading,
  page,
  pendingEditsCount = 0,
  pendingRowsCount = 0,
  saving = false,
  showControls = true,
  totalPages,
  onDiscardEdits,
  onInsertRow,
  onLimitChange,
  onPageChange,
  onRefresh,
  onSaveRequest,
  onToggleExpanded,
  onToggleFilters
}: BrowseToolbarProps) {
  const options = limitOptions.filter((option) => option <= maxLimit);
  const hasEditActions = pendingEditsCount > 0 || pendingRowsCount > 0;
  const hasToolbarActions =
    canInsert || hasEditActions || showControls || Boolean(onToggleExpanded) || Boolean(onToggleFilters);

  return (
    <div class="panel-toolbar">
      <div class="panel-title">
        <Table2 aria-hidden="true" size={20} />
        <h2>{title}</h2>
        {editStatus ? <span class="edit-status">{editStatus}</span> : null}
      </div>
      {hasToolbarActions ? (
        <div class="toolbar-actions">
          {onToggleFilters ? (
            <button
              aria-expanded={filtersOpen}
              aria-label={filtersOpen ? "Hide filters" : "Show filters"}
              class={filterCount > 0 || filtersOpen ? "filter-toggle-button active" : "filter-toggle-button"}
              type="button"
              onClick={onToggleFilters}
            >
              <Funnel aria-hidden="true" size={14} />
              Filter
              {filterCount > 0 ? <span class="filter-count-badge">{filterCount}</span> : null}
            </button>
          ) : null}
          {canInsert ? (
            <button class="insert-row-button" type="button" onClick={onInsertRow} disabled={saving}>
              <Plus aria-hidden="true" size={14} />
              Insert row
            </button>
          ) : null}
          {hasEditActions ? (
            <>
              <span class="pending-edits-count">{formatPendingCount(pendingRowsCount, pendingEditsCount)}</span>
              <button class="secondary-button" type="button" onClick={onDiscardEdits} disabled={saving}>
                Discard edits
              </button>
              <button aria-label={saving ? "Saving edits" : "Save edits"} class="save-button" type="button" onClick={onSaveRequest} disabled={!canSave || saving}>
                {saving ? <QuickLoader className="button-loader" /> : formatSaveLabel(pendingRowsCount, pendingEditsCount)}
              </button>
            </>
          ) : null}
          {onToggleExpanded ? (
            <button
              aria-label={expanded ? "Show query editor" : "Expand result"}
              class="secondary-button result-expand-button"
              type="button"
              onClick={onToggleExpanded}
            >
              {expanded ? <Minimize2 aria-hidden="true" size={15} /> : <Maximize2 aria-hidden="true" size={15} />}
              {expanded ? "Show editor" : "Expand result"}
            </button>
          ) : null}
          {showControls ? (
            <>
              <div class="pagination-control" aria-label="Table pagination">
                <button
                  aria-label="Previous page"
                  class="icon-button bordered"
                  type="button"
                  disabled={loading || page <= 1}
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                >
                  <ChevronLeft aria-hidden="true" size={16} />
                </button>
                <span>{page} of {totalPages}</span>
                <button
                  aria-label="Next page"
                  class="icon-button bordered"
                  type="button"
                  disabled={loading || page >= totalPages}
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                >
                  <ChevronRight aria-hidden="true" size={16} />
                </button>
              </div>
              <label>
                Limit
                <select value={limit} onChange={(event) => onLimitChange(Number(event.currentTarget.value))}>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <button aria-label={loading ? "Refreshing table" : "Refresh table"} type="button" onClick={onRefresh} disabled={loading}>
                {loading ? (
                  <QuickLoader className="button-loader" />
                ) : (
                  <>
                    <RefreshCw aria-hidden="true" size={15} />
                    Refresh
                  </>
                )}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatPendingCount(rows: number, edits: number): string {
  const parts = [];

  if (rows > 0) {
    parts.push(`${rows} row${rows === 1 ? "" : "s"}`);
  }

  if (edits > 0) {
    parts.push(`${edits} edit${edits === 1 ? "" : "s"}`);
  }

  return parts.join(" + ");
}

function formatSaveLabel(rows: number, edits: number): string {
  if (rows > 0 && edits === 0) {
    return `Save ${rows} row${rows === 1 ? "" : "s"}`;
  }

  if (rows === 0) {
    return `Save ${edits} edit${edits === 1 ? "" : "s"}`;
  }

  return "Save changes";
}
