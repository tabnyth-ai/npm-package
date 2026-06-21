import type { Pool } from "pg";
import type { QueryResult, UpdateCellsInput } from "tabnyth/adapters";

import { describeTable } from "./introspection";
import { mapRows } from "./mapRows";
import { parseTableName, quoteIdentifier, quoteTableName } from "./names";

export async function updateTableCells(pool: Pool, input: UpdateCellsInput): Promise<QueryResult> {
  const startedAt = performance.now();
  const parsed = parseTableName(input.container, input.schema);
  const structure = await describeTable(pool, input.container);
  const primaryKeys = structure.columns.filter((column) => column.primaryKey).map((column) => column.name);

  if (primaryKeys.length === 0) {
    throw new Error("This table has no primary key, so inline editing is disabled.");
  }

  const updatesByRow = groupUpdatesByRow(input, primaryKeys);
  const updatedRows: Record<string, unknown>[] = [];

  for (const group of updatesByRow.values()) {
    const changedColumns = [...new Set(group.updates.map((update) => update.column))];

    if (changedColumns.some((column) => primaryKeys.includes(column))) {
      throw new Error("Primary key columns cannot be edited inline.");
    }

    const values = changedColumns.map((column) => group.valuesByColumn.get(column));
    const whereValues = primaryKeys.map((key) => group.row[key]);
    const setSql = changedColumns.map((column, index) => `${quoteIdentifier(column)} = $${index + 1}`).join(", ");
    const whereSql = primaryKeys
      .map((column, index) => `${quoteIdentifier(column)} = $${changedColumns.length + index + 1}`)
      .join(" and ");

    const result = await pool.query<Record<string, unknown>>(
      `update ${quoteTableName(parsed.schema, parsed.table)} set ${setSql} where ${whereSql} returning *`,
      [...values, ...whereValues]
    );

    updatedRows.push(...result.rows);
  }

  return mapRows(updatedRows, startedAt);
}

interface UpdateGroup {
  row: Record<string, unknown>;
  updates: UpdateCellsInput["updates"];
  valuesByColumn: Map<string, unknown>;
}

function groupUpdatesByRow(input: UpdateCellsInput, primaryKeys: string[]): Map<string, UpdateGroup> {
  const groups = new Map<string, UpdateGroup>();

  for (const update of input.updates) {
    for (const key of primaryKeys) {
      if (!(key in update.row) || update.row[key] === null || update.row[key] === undefined) {
        throw new Error(`Primary key value "${key}" is missing from the edited row.`);
      }
    }

    const groupKey = primaryKeys.map((key) => String(update.row[key])).join("\u001f");
    const group = groups.get(groupKey) ?? {
      row: update.row,
      updates: [],
      valuesByColumn: new Map<string, unknown>()
    };

    group.updates.push(update);
    group.valuesByColumn.set(update.column, update.value);
    groups.set(groupKey, group);
  }

  return groups;
}
