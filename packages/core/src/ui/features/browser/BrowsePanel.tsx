import { useEffect, useMemo, useState } from "preact/hooks";

import { insertRows, updateCells } from "../../api/client";
import type { BrowseFilter, ColumnInfo, ContainerInfo, QueryResult, StudioMeta } from "../../api/types";
import { ConfirmModal } from "../../components/ConfirmModal";
import { createEditId, DataGrid, type InsertDraftRow, type PendingCellEdit } from "../../components/DataGrid";
import { ErrorMessage } from "../../components/ErrorMessage";
import { QuickLoader } from "../../components/QuickLoader";
import { TableShadowLoader } from "../../components/TableShadowLoader";
import { useContainerStructure } from "../../hooks/useContainerStructure";
import { BrowseToolbar } from "./BrowseToolbar";
import { FilterBar } from "./FilterBar";

interface BrowsePanelProps {
  allowWrite: boolean;
  container: ContainerInfo | null;
  enableCellEditing?: boolean;
  expanded?: boolean;
  filters?: BrowseFilter[];
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
  onFiltersChange?(filters: BrowseFilter[]): void;
  onLimitChange(limit: number): void;
  onPageChange(page: number): void;
  onRefresh(): void;
  onToggleExpanded?(): void;
}

export function BrowsePanel(props: BrowsePanelProps) {
  const structureState = useContainerStructure(props.container);
  const [pendingEdits, setPendingEdits] = useState<Map<string, PendingCellEdit>>(new Map());
  const [insertDraft, setInsertDraft] = useState<InsertDraftRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filters = props.filters ?? [];
  const canFilter = props.onFiltersChange !== undefined && props.showControls !== false && props.container !== null;
  const filterColumns = useMemo(() => {
    const structureColumns = structureState.structure?.columns.map((column) => column.name) ?? [];
    return structureColumns.length > 0 ? structureColumns : props.result?.columns ?? [];
  }, [structureState.structure, props.result]);
  const keyColumns = useMemo(() => resolveKeyColumns(props.kind, structureState.structure, props.result), [
    props.kind,
    props.result,
    structureState.structure
  ]);
  const columnMeta = useMemo(
    () => new Map(structureState.structure?.columns.map((column) => [column.name, column]) ?? []),
    [structureState.structure]
  );
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
    setInsertDraft(null);
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

  function handleInsertRow(): void {
    setInsertDraft((current) => current ?? { values: {} });
    setConfirmOpen(false);
    setSaveError(null);
  }

  function handleInsertDraftChange(column: string, value: string): void {
    setInsertDraft((current) => {
      const next = current ?? { values: {} };

      return {
        values: {
          ...next.values,
          [column]: value
        }
      };
    });
  }

  function discardChanges(): void {
    setPendingEdits(new Map());
    setInsertDraft(null);
    setConfirmOpen(false);
    setSaveError(null);
  }

  async function saveChanges(): Promise<void> {
    if (!props.container || (pendingEdits.size === 0 && !insertDraft)) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      if (insertDraft) {
        await insertRows({
          container: props.container.name,
          schema: props.container.schema,
          rows: [buildInsertRow(insertDraft, props.result?.columns ?? [], columnMeta)]
        });
      }

      if (pendingEdits.size > 0) {
        await updateCells({
          container: props.container.name,
          schema: props.container.schema,
          updates: [...pendingEdits.values()].map((edit) => ({
            row: edit.rowIdentity,
            column: edit.column,
            value: edit.value
          }))
        });
      }

      setPendingEdits(new Map());
      setInsertDraft(null);
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
        canInsert={props.enableCellEditing === true && props.allowWrite && !props.loading}
        canSave={props.allowWrite && (pendingEdits.size > 0 || insertDraft !== null)}
        editStatus={toolbarStatus}
        expanded={props.expanded}
        title={props.title}
        limit={props.limit}
        maxLimit={props.maxLimit}
        loading={props.loading}
        pendingEditsCount={pendingEdits.size}
        pendingRowsCount={insertDraft ? 1 : 0}
        page={props.page}
        saving={saving}
        showControls={props.showControls}
        totalPages={props.totalPages}
        filterCount={filters.length}
        filtersOpen={filtersOpen}
        onDiscardEdits={discardChanges}
        onInsertRow={handleInsertRow}
        onLimitChange={props.onLimitChange}
        onPageChange={props.onPageChange}
        onRefresh={props.onRefresh}
        onSaveRequest={() => setConfirmOpen(true)}
        onToggleExpanded={props.onToggleExpanded}
        onToggleFilters={canFilter ? () => setFiltersOpen((open) => !open) : undefined}
      />
      {canFilter && filtersOpen ? (
        <FilterBar
          key={props.container?.name}
          columns={filterColumns}
          columnMeta={columnMeta}
          filters={filters}
          onApply={(next) => props.onFiltersChange?.(next)}
        />
      ) : null}
      <ErrorMessage message={props.error} />
      <ErrorMessage message={structureState.error} />
      <ErrorMessage message={saveError} />
      {props.loading ? (
        <TableShadowLoader columns={props.result?.columns.length ?? (filterColumns.length || 6)} />
      ) : null}
      {!props.loading && props.result ? (
        <DataGrid
          columnMeta={columnMeta}
          columns={props.result.columns}
          editable={props.enableCellEditing === true && props.allowWrite && keyColumns.length > 0}
          insertDraft={insertDraft}
          keyColumns={keyColumns}
          onInsertDraftChange={handleInsertDraftChange}
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
          onConfirm={() => void saveChanges()}
        >
          <p>{buildConfirmMessage(insertDraft ? 1 : 0, pendingEdits.size, props.title)}</p>
          <p>This will write directly to your database and cannot be undone from Tabnyth Studio.</p>
          {insertDraft ? <InsertPreview row={buildInsertRow(insertDraft, props.result?.columns ?? [], columnMeta)} /> : null}
          {pendingEdits.size > 0 ? (
            <div class="edit-preview-list">
              {[...pendingEdits.values()].slice(0, 8).map((edit) => (
                <div class="edit-preview-row" key={edit.id}>
                  <strong>{edit.column}</strong>
                  <span>{formatPreviewValue(edit.originalValue)}</span>
                  <span>{formatPreviewValue(edit.value)}</span>
                </div>
              ))}
            </div>
          ) : null}
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

function buildInsertRow(
  draft: InsertDraftRow,
  columns: string[],
  columnMeta: Map<string, ColumnInfo>
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const column of columns) {
    const meta = columnMeta.get(column);

    if (meta?.generated) {
      continue;
    }

    if (Object.hasOwn(draft.values, column)) {
      row[column] = parseInsertedValue(meta, draft.values[column] ?? "");
      continue;
    }

    if (meta?.defaultValue || meta?.nullable) {
      continue;
    }

    if (meta && isTextColumn(meta.type)) {
      row[column] = "";
    }
  }

  return row;
}

function parseInsertedValue(meta: ColumnInfo | undefined, displayValue: string): unknown {
  const trimmed = displayValue.trim();

  if (trimmed === "null") {
    return null;
  }

  if (!meta) {
    return parseJsonLikeValue(displayValue);
  }

  if (isNumberColumn(meta.type)) {
    const parsed = Number(displayValue);
    return Number.isFinite(parsed) ? parsed : displayValue;
  }

  if (isBooleanColumn(meta.type)) {
    if (trimmed === "true") {
      return true;
    }

    if (trimmed === "false") {
      return false;
    }
  }

  if (isJsonColumn(meta.type)) {
    return parseJsonLikeValue(displayValue);
  }

  return displayValue;
}

function parseJsonLikeValue(displayValue: string): unknown {
  const trimmed = displayValue.trim();

  if (!trimmed) {
    return displayValue;
  }

  try {
    return JSON.parse(displayValue);
  } catch {
    return displayValue;
  }
}

function isTextColumn(type: string): boolean {
  return /char|text|string|uuid|email/i.test(type);
}

function isNumberColumn(type: string): boolean {
  return /int|numeric|decimal|double|real|float|serial|number/i.test(type);
}

function isBooleanColumn(type: string): boolean {
  return /bool/i.test(type);
}

function isJsonColumn(type: string): boolean {
  return /json|object|array/i.test(type);
}

function buildConfirmMessage(rowCount: number, editCount: number, title: string): string {
  const parts = [];

  if (rowCount > 0) {
    parts.push(`insert ${rowCount} row${rowCount === 1 ? "" : "s"}`);
  }

  if (editCount > 0) {
    parts.push(`update ${editCount} cell${editCount === 1 ? "" : "s"}`);
  }

  return `You are about to ${parts.join(" and ")} in ${title}.`;
}

function InsertPreview({ row }: { row: Record<string, unknown> }) {
  const entries = Object.entries(row);

  return (
    <div class="edit-preview-list">
      {entries.length === 0 ? (
        <div class="edit-preview-row">
          <strong>default values</strong>
          <span>Database defaults</span>
          <span>will be used</span>
        </div>
      ) : (
        entries.slice(0, 8).map(([column, value]) => (
          <div class="edit-preview-row" key={column}>
            <strong>{column}</strong>
            <span>new row</span>
            <span>{formatPreviewValue(value)}</span>
          </div>
        ))
      )}
    </div>
  );
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
