import type { ComponentChildren } from "preact";
import { ChevronLeft, ChevronRight, RefreshCw, Table2 } from "lucide-preact";

import { QuickLoader } from "../../components/QuickLoader";

interface BrowseToolbarProps {
  canSave?: boolean;
  editStatus?: ComponentChildren;
  showControls?: boolean;
  title: string;
  limit: number;
  maxLimit: number;
  loading: boolean;
  page: number;
  pendingEditsCount?: number;
  saving?: boolean;
  totalPages: number;
  onDiscardEdits?(): void;
  onLimitChange(limit: number): void;
  onPageChange(page: number): void;
  onRefresh(): void;
  onSaveRequest?(): void;
}

const limitOptions = [25, 50, 100, 250, 500, 1000];

export function BrowseToolbar({
  canSave = false,
  editStatus,
  title,
  limit,
  maxLimit,
  loading,
  page,
  pendingEditsCount = 0,
  saving = false,
  showControls = true,
  totalPages,
  onDiscardEdits,
  onLimitChange,
  onPageChange,
  onRefresh,
  onSaveRequest
}: BrowseToolbarProps) {
  const options = limitOptions.filter((option) => option <= maxLimit);
  const hasEditActions = pendingEditsCount > 0;
  const hasToolbarActions = hasEditActions || showControls;

  return (
    <div class="panel-toolbar">
      <div class="panel-title">
        <Table2 aria-hidden="true" size={20} />
        <h2>{title}</h2>
        {editStatus ? <span class="edit-status">{editStatus}</span> : null}
      </div>
      {hasToolbarActions ? (
        <div class="toolbar-actions">
          {hasEditActions ? (
            <>
              <span class="pending-edits-count">{pendingEditsCount} edits</span>
              <button class="secondary-button" type="button" onClick={onDiscardEdits} disabled={saving}>
                Discard
              </button>
              <button aria-label={saving ? "Saving edits" : "Save edits"} class="save-button" type="button" onClick={onSaveRequest} disabled={!canSave || saving}>
                {saving ? <QuickLoader className="button-loader" /> : "Save"}
              </button>
            </>
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
