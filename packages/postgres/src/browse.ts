import type { Pool } from "pg";
import type { BrowseFilter, BrowseInput, QueryResult } from "tabnyth/adapters";

import { mapRows } from "./mapRows";
import { parseTableName, quoteIdentifier, quoteTableName } from "./names";

interface WhereClause {
  text: string;
  values: unknown[];
}

export async function browseTable(pool: Pool, input: BrowseInput): Promise<QueryResult> {
  const parsed = parseTableName(input.container, input.schema);
  const tableName = quoteTableName(parsed.schema, parsed.table);
  const where = buildWhereClause(input.filters);
  const startedAt = performance.now();
  const [result, countResult] = await Promise.all([
    pool.query<Record<string, unknown>>(
      `select * from ${tableName}${where.text} limit $${where.values.length + 1} offset $${where.values.length + 2}`,
      [...where.values, input.limit ?? 100, input.offset ?? 0]
    ),
    pool.query<{ total: string }>(`select count(*) as total from ${tableName}${where.text}`, where.values)
  ]);
  const mapped = mapRows(result.rows, startedAt, result.fields);

  return {
    ...mapped,
    totalRows: Number(countResult.rows[0]?.total ?? mapped.rowCount)
  };
}

const comparisonOperators: Partial<Record<BrowseFilter["operator"], string>> = {
  eq: "=",
  neq: "<>",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<="
};

export function buildWhereClause(filters: BrowseFilter[] | undefined): WhereClause {
  if (!filters || filters.length === 0) {
    return { text: "", values: [] };
  }

  const conditions: string[] = [];
  const values: unknown[] = [];

  for (const filter of filters) {
    const column = quoteIdentifier(filter.column);

    if (filter.operator === "isNull") {
      conditions.push(`${column} is null`);
      continue;
    }

    if (filter.operator === "isNotNull") {
      conditions.push(`${column} is not null`);
      continue;
    }

    if (filter.operator === "contains") {
      values.push(`%${escapeLikePattern(String(filter.value ?? ""))}%`);
      conditions.push(`${column}::text ilike $${values.length}`);
      continue;
    }

    const operator = comparisonOperators[filter.operator];

    if (!operator) {
      throw new Error(`Unsupported filter operator: ${filter.operator}`);
    }

    values.push(filter.value);
    conditions.push(`${column} ${operator} $${values.length}`);
  }

  return {
    text: ` where ${conditions.join(" and ")}`,
    values
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/([\\%_])/g, "\\$1");
}
