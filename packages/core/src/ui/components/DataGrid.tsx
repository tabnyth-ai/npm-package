import { useState } from "preact/hooks";

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

interface DataGridProps {
  columns: string[];
  editable?: boolean;
  keyColumns?: string[];
  onEditCell?(rowIndex: number, column: string, value: string): void;
  pendingEdits?: Map<string, PendingCellEdit>;
  rows: Record<string, unknown>[];
}

export function DataGrid({
  columns,
  editable = false,
  keyColumns = [],
  onEditCell,
  pendingEdits = new Map(),
  rows
}: DataGridProps) {
  const visibleColumns = columns.length ? columns : collectColumns(rows);
  const [editing, setEditing] = useState<{ rowIndex: number; column: string; draft: string } | null>(null);

  if (rows.length === 0) {
    return <div class="empty-state">No rows returned.</div>;
  }

  return (
    <div class="grid-scroll">
      <table class="data-grid">
        <thead>
          <tr>
            {visibleColumns.map((column) => (
              <th key={column} title={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {visibleColumns.map((column) => {
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
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
