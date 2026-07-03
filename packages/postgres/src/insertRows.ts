import type { Pool } from "pg";
import type { InsertRowsInput, QueryResult } from "tabnyth/adapters";

import { describeTable } from "./introspection";
import { mapRows } from "./mapRows";
import { parseTableName, quoteIdentifier, quoteTableName } from "./names";

export async function insertTableRows(pool: Pool, input: InsertRowsInput): Promise<QueryResult> {
  const startedAt = performance.now();
  const parsed = parseTableName(input.container, input.schema);
  const tableName = quoteTableName(parsed.schema, parsed.table);
  const structure = await describeTable(pool, input.container);
  const allowedColumns = new Set(structure.columns.map((column) => column.name));
  const insertedRows: Record<string, unknown>[] = [];

  for (const row of input.rows) {
    const values = Object.entries(row).filter(([, value]) => value !== undefined);

    for (const [column] of values) {
      if (!allowedColumns.has(column)) {
        throw new Error(`Column "${column}" does not exist on ${input.container}.`);
      }
    }

    if (values.length === 0) {
      const result = await pool.query<Record<string, unknown>>(`insert into ${tableName} default values returning *`);
      insertedRows.push(...result.rows);
      continue;
    }

    const columnSql = values.map(([column]) => quoteIdentifier(column)).join(", ");
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
    const result = await pool.query<Record<string, unknown>>(
      `insert into ${tableName} (${columnSql}) values (${placeholders}) returning *`,
      values.map(([, value]) => value)
    );

    insertedRows.push(...result.rows);
  }

  return mapRows(insertedRows, startedAt);
}
