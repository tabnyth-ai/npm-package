import type { Pool } from "pg";
import type { ColumnInfo, ContainerInfo, SearchInput, SearchResult } from "tabnyth-studio/adapters";

import { describeTable, listTables } from "./introspection";
import { parseTableName, quoteIdentifier, quoteTableName } from "./names";

const DEFAULT_SEARCH_LIMIT = 24;
const MAX_SEARCH_LIMIT = 50;

export async function searchPostgres(pool: Pool, input: SearchInput): Promise<SearchResult[]> {
  const query = input.query.trim();

  if (query.length < 2) {
    return [];
  }

  const limit = Math.min(Math.max(input.limit ?? DEFAULT_SEARCH_LIMIT, 1), MAX_SEARCH_LIMIT);
  const lowered = query.toLowerCase();
  const results: SearchResult[] = [];
  const tables = await listTables(pool);

  for (const table of tables) {
    if (results.length >= limit) {
      return results;
    }

    const label = table.displayName ?? table.name;

    if (label.toLowerCase().includes(lowered)) {
      results.push({
        kind: "table",
        title: `Table Name: ${label}`,
        description: `Table matched "${query}".`,
        containerName: table.name
      });
    }
  }

  const structures = [];

  for (const table of tables) {
    if (results.length >= limit) {
      return results;
    }

    try {
      const structure = await describeTable(pool, table.name);
      structures.push({ table, columns: structure.columns });

      for (const column of structure.columns) {
        if (results.length >= limit) {
          return results;
        }

        if (column.name.toLowerCase().includes(lowered)) {
          results.push({
            kind: "column",
            title: `Column/Row Name: ${column.name}`,
            description: `${table.displayName ?? table.name}.${column.name} (${column.type})`,
            containerName: table.name,
            columnName: column.name
          });
        }
      }
    } catch {
      // Keep search useful even when one table has permissions or unusual column types.
    }
  }

  for (const structure of structures) {
    if (results.length >= limit) {
      return results;
    }

    const remaining = limit - results.length;
    const cellResults = await searchTableCells(pool, structure.table, structure.columns, query, remaining);
    results.push(...cellResults);
  }

  return results;
}

async function searchTableCells(
  pool: Pool,
  table: ContainerInfo,
  columns: ColumnInfo[],
  query: string,
  limit: number
): Promise<SearchResult[]> {
  const searchableColumns = columns.filter((column) => isSearchableColumnType(column.type)).slice(0, 60);

  if (searchableColumns.length === 0) {
    return [];
  }

  const parsed = parseTableName(table.name, table.schema);
  const tableName = quoteTableName(parsed.schema, parsed.table);
  const values = searchableColumns
    .map((column) => `(${quoteIdentifier(column.name)}::text, ${sqlString(column.name)})`)
    .join(", ");

  try {
    const result = await pool.query<{
      column_name: string;
      cell_value: string;
      row_data: Record<string, unknown>;
    }>(
      `
        select matched.column_name, matched.cell_value, row_to_json(source) as row_data
        from ${tableName} source
        cross join lateral (values ${values}) as matched(cell_value, column_name)
        where matched.cell_value is not null
          and matched.cell_value ilike $1
        limit $2
      `,
      [`%${query}%`, limit]
    );

    return result.rows.map((row) => ({
      kind: "cell" as const,
      title: `Cell Data: ${table.displayName ?? table.name}.${row.column_name}`,
      description: `${readRowLabel(row.row_data)} contains "${preview(row.cell_value)}".`,
      containerName: table.name,
      columnName: row.column_name,
      value: row.cell_value
    }));
  } catch {
    return [];
  }
}

function isSearchableColumnType(type: string): boolean {
  const normalized = type.toLowerCase();

  return !["bytea", "tsvector"].includes(normalized);
}

function readRowLabel(row: Record<string, unknown>): string {
  if ("id" in row) {
    return `row id=${preview(row.id)}`;
  }

  const [key, value] = Object.entries(row)[0] ?? ["row", ""];
  return `${key}=${preview(value)}`;
}

function preview(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
