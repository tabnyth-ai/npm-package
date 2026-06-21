import type { Pool } from "pg";
import type { ColumnInfo, ContainerInfo, ContainerStructure, ForeignKeyInfo } from "tabnyth/adapters";

import { parseTableName } from "./names";

export async function listTables(pool: Pool): Promise<ContainerInfo[]> {
  const result = await pool.query<{
    table_schema: string;
    table_name: string;
  }>(
    `
      select table_schema, table_name
      from information_schema.tables
      where table_type = 'BASE TABLE'
        and table_schema not in ('pg_catalog', 'information_schema')
      order by table_schema, table_name
    `
  );

  return result.rows.map((row) => ({
    name: `${row.table_schema}.${row.table_name}`,
    schema: row.table_schema,
    displayName: `${row.table_schema}.${row.table_name}`,
    type: "table"
  }));
}

export async function describeTable(pool: Pool, name: string): Promise<ContainerStructure> {
  const { schema, table } = parseTableName(name);
  const [columns, primaryKeys, foreignKeys] = await Promise.all([
    listColumns(pool, schema, table),
    listPrimaryKeys(pool, schema, table),
    listForeignKeys(pool, schema, table)
  ]);

  return {
    name: `${schema}.${table}`,
    columns: columns.map((column) => {
      const foreignKey = foreignKeys.get(column.name);

      return foreignKey
        ? {
            ...column,
            primaryKey: primaryKeys.has(column.name),
            foreignKey
          }
        : {
            ...column,
            primaryKey: primaryKeys.has(column.name)
          };
    })
  };
}

async function listColumns(pool: Pool, schema: string, table: string): Promise<ColumnInfo[]> {
  const result = await pool.query<{
    column_name: string;
    data_type: string;
    is_nullable: string;
  }>(
    `
      select column_name, data_type, is_nullable
      from information_schema.columns
      where table_schema = $1
        and table_name = $2
      order by ordinal_position
    `,
    [schema, table]
  );

  return result.rows.map((row) => ({
    name: row.column_name,
    type: row.data_type,
    nullable: row.is_nullable === "YES"
  }));
}

async function listPrimaryKeys(pool: Pool, schema: string, table: string): Promise<Set<string>> {
  const result = await pool.query<{ column_name: string }>(
    `
      select kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      where tc.constraint_type = 'PRIMARY KEY'
        and tc.table_schema = $1
        and tc.table_name = $2
    `,
    [schema, table]
  );

  return new Set(result.rows.map((row) => row.column_name));
}

async function listForeignKeys(pool: Pool, schema: string, table: string): Promise<Map<string, ForeignKeyInfo>> {
  const result = await pool.query<{
    column_name: string;
    foreign_table_schema: string;
    foreign_table_name: string;
    foreign_column_name: string;
  }>(
    `
      select
        kcu.column_name,
        ccu.table_schema as foreign_table_schema,
        ccu.table_name as foreign_table_name,
        ccu.column_name as foreign_column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
       and tc.table_name = kcu.table_name
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name
       and ccu.constraint_schema = tc.constraint_schema
      where tc.constraint_type = 'FOREIGN KEY'
        and tc.table_schema = $1
        and tc.table_name = $2
      order by kcu.ordinal_position
    `,
    [schema, table]
  );

  return new Map(
    result.rows.map((row) => [
      row.column_name,
      {
        schema: row.foreign_table_schema,
        table: row.foreign_table_name,
        column: row.foreign_column_name
      }
    ])
  );
}
