import type { Pool } from "pg";
import type { BrowseInput, QueryResult } from "tabnyth-studio/adapters";

import { mapRows } from "./mapRows";
import { parseTableName, quoteTableName } from "./names";

export async function browseTable(pool: Pool, input: BrowseInput): Promise<QueryResult> {
  const parsed = parseTableName(input.container, input.schema);
  const tableName = quoteTableName(parsed.schema, parsed.table);
  const startedAt = performance.now();
  const [result, countResult] = await Promise.all([
    pool.query<Record<string, unknown>>(
    `select * from ${tableName} limit $1 offset $2`,
    [input.limit ?? 100, input.offset ?? 0]
    ),
    pool.query<{ total: string }>(`select count(*) as total from ${tableName}`)
  ]);
  const mapped = mapRows(result.rows, startedAt, result.fields);

  return {
    ...mapped,
    totalRows: Number(countResult.rows[0]?.total ?? mapped.rowCount)
  };
}
