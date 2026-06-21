import { Binary, Decimal128, ObjectId } from "mongodb";
import type { QueryResult } from "tabnyth-studio/adapters";

export function mapDocuments(documents: Record<string, unknown>[], startedAt: number): QueryResult {
  const rows = documents.map((document) => serializeValue(document) as Record<string, unknown>);

  return {
    columns: collectColumns(rows),
    rows,
    rowCount: rows.length,
    durationMs: Math.round(performance.now() - startedAt)
  };
}

export function serializeValue(value: unknown): unknown {
  if (value instanceof ObjectId) {
    return value.toHexString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Decimal128) {
    return value.toString();
  }

  if (value instanceof Binary) {
    return value.toString("base64");
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializeValue(entry)]));
  }

  return value;
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
