import { useEffect, useMemo, useState } from "preact/hooks";

import { updateCells } from "../../api/client";
import type { ContainerInfo, QueryResult, StudioMeta } from "../../api/types";
import { ConfirmModal } from "../../components/ConfirmModal";
import { createEditId, DataGrid, type PendingCellEdit } from "../../components/DataGrid";
import { ErrorMessage } from "../../components/ErrorMessage";
import { LoadingState } from "../../components/LoadingState";
import { QuickLoader } from "../../components/QuickLoader";
import { useContainerStructure } from "../../hooks/useContainerStructure";
import { BrowseToolbar } from "./BrowseToolbar";

interface BrowsePanelProps {
  allowWrite: boolean;
  container: ContainerInfo | null;
  enableCellEditing?: boolean;
  kind: StudioMeta["kind"];
  title: string;
  result: QueryResult | null;
  error: string | null;
  loading: boolean;
  limit: number;
  maxLimit: number;
  page: number;
  showControls?: boolean;
  status?: string;
  totalPages: number;
  onLimitChange(limit: number): void;
  onPageChange(page: number): void;
  onRefresh(): void;
}

export function BrowsePanel(props: BrowsePanelProps) {
  const structureState = useContainerStructure(props.container);
  const [pendingEdits, setPendingEdits] = useState<Map<string, PendingCellEdit>>(new Map());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const keyColumns = useMemo(() => resolveKeyColumns(props.kind, structureState.structure, props.result), [
    props.kind,
    props.result,
    structureState.structure
  ]);
  const editStatus = buildEditStatus({
    allowWrite: props.allowWrite,
    enabled: props.enableCellEditing === true,
    keyColumns,
    loadingStructure: structureState.loading
  });
  const toolbarStatus =
    props.status ??
    (structureState.loading && props.enableCellEditing === true ? (
      <span class="inline-loader-label compact">
        <QuickLoader color="teal" />
        <span>Loading keys</span>
      </span>
    ) : (
      editStatus
    ));

  useEffect(() => {
    setPendingEdits(new Map());
    setConfirmOpen(false);
    setSaveError(null);
  }, [props.container?.name]);

  function handleCellEdit(rowIndex: number, column: string, displayValue: string): void {
    if (!props.result || keyColumns.length === 0) {
      return;
    }

    const row = props.result.rows[rowIndex];

    if (!row) {
      return;
    }

    const id = createEditId(rowIndex, column);
    const originalValue = row[column];
    const value = parseEditedValue(originalValue, displayValue);
    const rowIdentity = Object.fromEntries(keyColumns.map((key) => [key, row[key]]));

    setPendingEdits((current) => {
      const next = new Map(current);

      if (areEqualCellValues(originalValue, value)) {
        next.delete(id);
        return next;
      }

      next.set(id, {
        id,
        column,
        displayValue,
        originalValue,
        rowIdentity,
        rowIndex,
        value
      });

      return next;
    });
  }

  async function saveEdits(): Promise<void> {
    if (!props.container || pendingEdits.size === 0) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await updateCells({
        container: props.container.name,
        schema: props.container.schema,
        updates: [...pendingEdits.values()].map((edit) => ({
          row: edit.rowIdentity,
          column: edit.column,
          value: edit.value
        }))
      });
      setPendingEdits(new Map());
      setConfirmOpen(false);
      await props.onRefresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section class="content-panel browse-panel">
      <BrowseToolbar
        canSave={props.allowWrite && pendingEdits.size > 0}
        editStatus={toolbarStatus}
        title={props.title}
        limit={props.limit}
        maxLimit={props.maxLimit}
        loading={props.loading}
        pendingEditsCount={pendingEdits.size}
        page={props.page}
        saving={saving}
        showControls={props.showControls}
        totalPages={props.totalPages}
        onDiscardEdits={() => setPendingEdits(new Map())}
        onLimitChange={props.onLimitChange}
        onPageChange={props.onPageChange}
        onRefresh={props.onRefresh}
        onSaveRequest={() => setConfirmOpen(true)}
      />
      <ErrorMessage message={props.error} />
      <ErrorMessage message={structureState.error} />
      <ErrorMessage message={saveError} />
      {props.loading ? <LoadingState label="Loading rows..." /> : null}
      {!props.loading && props.result ? (
        <DataGrid
          columns={props.result.columns}
          editable={props.enableCellEditing === true && props.allowWrite && keyColumns.length > 0}
          keyColumns={keyColumns}
          pendingEdits={pendingEdits}
          rows={props.result.rows}
          onEditCell={handleCellEdit}
        />
      ) : null}
      {confirmOpen ? (
        <ConfirmModal
          title="Confirm cell updates"
          confirmLabel={
            saving ? (
              <>
                <QuickLoader className="button-loader" />
                <span class="sr-only">Saving updates</span>
              </>
            ) : (
              "Update values"
            )
          }
          disabled={saving}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void saveEdits()}
        >
          <p>
            You are about to update {pendingEdits.size} cell{pendingEdits.size === 1 ? "" : "s"} in {props.title}.
          </p>
          <p>This will write directly to your database and cannot be undone from Tabnyth Studio.</p>
          <div class="edit-preview-list">
            {[...pendingEdits.values()].slice(0, 8).map((edit) => (
              <div class="edit-preview-row" key={edit.id}>
                <strong>{edit.column}</strong>
                <span>{formatPreviewValue(edit.originalValue)}</span>
                <span>{formatPreviewValue(edit.value)}</span>
              </div>
            ))}
          </div>
        </ConfirmModal>
      ) : null}
    </section>
  );
}

function resolveKeyColumns(
  kind: StudioMeta["kind"],
  structure: ReturnType<typeof useContainerStructure>["structure"],
  result: QueryResult | null
): string[] {
  if (kind === "mongo") {
    return result?.columns.includes("_id") ? ["_id"] : [];
  }

  return structure?.columns.filter((column) => column.primaryKey).map((column) => column.name) ?? [];
}

function buildEditStatus(input: {
  allowWrite: boolean;
  enabled: boolean;
  keyColumns: string[];
  loadingStructure: boolean;
}): string | undefined {
  if (!input.enabled) {
    return undefined;
  }

  if (!input.allowWrite) {
    return "Start with --allow-write to edit cells";
  }

  if (input.loadingStructure) {
    return undefined;
  }

  if (input.keyColumns.length === 0) {
    return "No primary key found";
  }

  return "Double-click cells to edit";
}

function parseEditedValue(originalValue: unknown, displayValue: string): unknown {
  const trimmed = displayValue.trim();

  if (trimmed === "null") {
    return null;
  }

  if (typeof originalValue === "number") {
    const parsed = Number(displayValue);
    return Number.isFinite(parsed) ? parsed : displayValue;
  }

  if (typeof originalValue === "boolean") {
    if (trimmed === "true") {
      return true;
    }

    if (trimmed === "false") {
      return false;
    }

    return displayValue;
  }

  if (originalValue && typeof originalValue === "object") {
    try {
      return JSON.parse(displayValue);
    } catch {
      return displayValue;
    }
  }

  return displayValue;
}

function areEqualCellValues(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function formatPreviewValue(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}
