import type { Pool } from "pg";
import type { QueryInput, QueryResult } from "tabnyth/adapters";

import { mapRows } from "./mapRows";

export async function runSqlQuery(pool: Pool, input: QueryInput): Promise<QueryResult> {
  const sql = input.text ?? input.sql;

  if (!sql) {
    throw new Error("SQL query is required.");
  }

  const startedAt = performance.now();
  const result = await pool.query<Record<string, unknown>>(sql);

  return mapRows(result.rows ?? [], startedAt, result.fields);
}
