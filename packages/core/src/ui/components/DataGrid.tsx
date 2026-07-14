import { Fragment } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Asterisk, KeyRound } from "lucide-preact";

import type { ColumnInfo } from "../api/types";
import { JsonViewer } from "./JsonViewer";

export interface PendingCellEdit {
  id: string;
  column: string;
  displayValue: string;
  originalValue: unknown;
  rowIdentity: Record<string, unknown>;
  rowIndex: number;
  value: unknown;
}

export interface InsertDraftRow {
  values: Record<string, string>;
}

interface DataGridProps {
  columnMeta?: Map<string, ColumnInfo>;
  columns: string[];
  editable?: boolean;
  insertDraft?: InsertDraftRow | null;
  keyColumns?: string[];
  onEditCell?(rowIndex: number, column: string, value: string): void;
  onInsertDraftChange?(column: string, value: string): void;
  pendingEdits?: Map<string, PendingCellEdit>;
  rows: Record<string, unknown>[];
}

export function DataGrid({
  columnMeta = new Map(),
  columns,
  editable = false,
  insertDraft = null,
  keyColumns = [],
  onEditCell,
  onInsertDraftChange,
  pendingEdits = new Map(),
  rows
}: DataGridProps) {
  const visibleColumns = columns.length ? columns : collectColumns(rows);
  const [editing, setEditing] = useState<{ rowIndex: number; column: string; draft: string } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    setExpandedRows(new Set());
  }, [rows, columns]);

  if (rows.length === 0 && !insertDraft) {
    return <div class="empty-state">No rows returned.</div>;
  }

  if (visibleColumns.length === 0) {
    return <div class="empty-state">No columns found.</div>;
  }

  return (
    <div class="grid-scroll">
      <table class="data-grid">
        <thead>
          <tr>
            <th class="row-toggle-heading" aria-label="Expand row" />
            {visibleColumns.map((column) => {
              const meta = columnMeta.get(column);

              return (
                <th key={column} title={formatColumnTitle(column, meta)}>
                  <span class="column-label">
                    {meta?.primaryKey ? <KeyRound aria-hidden="true" class="column-key-icon" size={12} /> : null}
                    {!meta?.primaryKey && meta?.nullable === false ? (
                      <Asterisk aria-hidden="true" class="column-required-icon" size={12} />
                    ) : null}
                    <span>{column}</span>
                  </span>
                  {meta?.type ? <span class="column-type">{meta.type}</span> : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {insertDraft ? (
            <tr class="insert-draft-row">
              <td class="row-toggle-cell insert-row-marker">+</td>
              {visibleColumns.map((column) => (
                <td class="insert-draft-cell" key={column}>
                  <input
                    aria-label={`New ${column}`}
                    class="insert-row-input"
                    disabled={isGeneratedColumn(columnMeta.get(column))}
                    placeholder={formatInsertPlaceholder(columnMeta.get(column))}
                    spellcheck={false}
                    value={insertDraft.values[column] ?? ""}
                    onInput={(event) => onInsertDraftChange?.(column, event.currentTarget.value)}
                  />
                </td>
              ))}
            </tr>
          ) : null}
          {rows.map((row, rowIndex) => {
            const expanded = expandedRows.has(rowIndex);

            return (
              <Fragment key={rowIndex}>
                <tr class={expanded ? "data-row expanded" : "data-row"}>
                  <td class="row-toggle-cell">
                    <button
                      aria-expanded={expanded}
                      aria-label={expanded ? `Collapse row ${rowIndex + 1}` : `Expand row ${rowIndex + 1}`}
                      class="row-expand-toggle"
                      type="button"
                      onClick={() => toggleExpandedRow(setExpandedRows, rowIndex)}
                    >
                      {expanded ? "v" : ">"}
                    </button>
                  </td>
                  {visibleColumns.map((column) => renderCell({
                    column,
                    editable,
                    editing,
                    keyColumns,
                    onEditCell,
                    pendingEdits,
                    row,
                    rowIndex,
                    setEditing
                  }))}
                </tr>
                {expanded ? (
                  <tr class="expanded-row">
                    <td class="expanded-row-cell" colSpan={visibleColumns.length + 1}>
                      <div class="row-flex-boxes">
                        {visibleColumns.map((column) => {
                          const editId = createEditId(rowIndex, column);
                          const pending = pendingEdits.get(editId);
                          const value = pending ? pending.value : row[column];
                          const meta = columnMeta.get(column);

                          return (
                            <article class={pending ? "row-field-box dirty" : "row-field-box"} key={column}>
                              <header>
                                <span class="row-field-name">{column}</span>
                                {meta?.type ? <span class="row-field-type">{meta.type}</span> : null}
                              </header>
                              <div class="row-field-value" title={formatCellTitle(value)}>
                                <JsonViewer value={value} />
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface RenderCellInput {
  column: string;
  editable: boolean;
  editing: { rowIndex: number; column: string; draft: string } | null;
  keyColumns: string[];
  onEditCell?(rowIndex: number, column: string, value: string): void;
  pendingEdits: Map<string, PendingCellEdit>;
  row: Record<string, unknown>;
  rowIndex: number;
  setEditing(value: { rowIndex: number; column: string; draft: string } | null): void;
}

function renderCell({
  column,
  editable,
  editing,
  keyColumns,
  onEditCell,
  pendingEdits,
  row,
  rowIndex,
  setEditing
}: RenderCellInput) {
  const editId = createEditId(rowIndex, column);
  const pending = pendingEdits.get(editId);
  const value = pending ? pending.value : row[column];
  const isEditing = editing?.rowIndex === rowIndex && editing.column === column;
  const canEdit = editable && !keyColumns.includes(column) && rowHasKeys(row, keyColumns);

  return (
    <td
      class={pending ? "editable-cell dirty" : canEdit ? "editable-cell" : undefined}
      key={column}
      title={canEdit ? "Double-click to edit" : formatCellTitle(value)}
      onDblClick={() => {
        if (canEdit) {
          setEditing({ rowIndex, column, draft: formatEditableValue(value) });
        }
      }}
    >
      {isEditing ? (
        <input
          autoFocus
          class="cell-editor-input"
          value={editing.draft}
          onBlur={() => {
            onEditCell?.(rowIndex, column, editing.draft);
            setEditing(null);
          }}
          onInput={(event) => setEditing({ rowIndex, column, draft: event.currentTarget.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onEditCell?.(rowIndex, column, editing.draft);
              setEditing(null);
            }

            if (event.key === "Escape") {
              setEditing(null);
            }
          }}
        />
      ) : (
        <JsonViewer value={value} compact />
      )}
    </td>
  );
}

function toggleExpandedRow(setExpandedRows: (updater: (current: Set<number>) => Set<number>) => void, rowIndex: number): void {
  setExpandedRows((current) => {
    const next = new Set(current);

    if (next.has(rowIndex)) {
      next.delete(rowIndex);
      return next;
    }

    next.add(rowIndex);
    return next;
  });
}

function formatColumnTitle(column: string, meta: ColumnInfo | undefined): string {
  if (!meta) {
    return column;
  }

  const markers = [meta.primaryKey ? "primary key" : null, meta.nullable === false ? "required" : null].filter(Boolean);
  const suffix = [meta.type, ...markers].filter(Boolean).join(", ");

  return suffix ? `${column} (${suffix})` : column;
}

export function createEditId(rowIndex: number, column: string): string {
  return `${rowIndex}:${column}`;
}

function formatCellTitle(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatEditableValue(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function isGeneratedColumn(meta: ColumnInfo | undefined): boolean {
  return meta?.generated === true;
}

function formatInsertPlaceholder(meta: ColumnInfo | undefined): string {
  if (!meta) {
    return "";
  }

  if (meta.generated) {
    return "(auto-increment)";
  }

  if (meta.defaultValue) {
    return "(default value)";
  }

  if (meta.nullable) {
    return "NULL";
  }

  if (isTextColumn(meta.type)) {
    return "(empty string)";
  }

  return "";
}

function isTextColumn(type: string): boolean {
  return /char|text|string|uuid|email/i.test(type);
}

function rowHasKeys(row: Record<string, unknown>, keyColumns: string[]): boolean {
  return keyColumns.length > 0 && keyColumns.every((key) => row[key] !== null && row[key] !== undefined);
}

function collectColumns(rows: Record<string, unknown>[]): string[] {
  const columns = new Set<string>();

  for (const row of rows) {
    for (const column of Object.keys(row)) {
      columns.add(column);
    }
  }

  return [...columns];
}
