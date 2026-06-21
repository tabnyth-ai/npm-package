import type { FieldDef } from "pg";
import type { QueryResult } from "tabnyth-studio/adapters";

export function mapRows(
  rows: Record<string, unknown>[],
  startedAt: number,
  fields?: FieldDef[]
): QueryResult {
  const columns = fields?.length ? fields.map((field) => field.name) : collectColumns(rows);

  return {
    columns,
    rows,
    rowCount: rows.length,
    durationMs: Math.round(performance.now() - startedAt)
  };
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
