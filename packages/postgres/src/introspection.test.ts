import type { Pool } from "pg";
import { describe, expect, it } from "vitest";

import { describeTable, listTables } from "./introspection";

describe("postgres introspection", () => {
  it("maps table rows", async () => {
    const pool = {
      async query() {
        return {
          rows: [
            { table_schema: "public", table_name: "users" },
            { table_schema: "billing", table_name: "invoices" }
          ]
        };
      }
    } as unknown as Pool;

    await expect(listTables(pool)).resolves.toEqual([
      { name: "public.users", schema: "public", displayName: "users", type: "table" },
      { name: "billing.invoices", schema: "billing", displayName: "billing.invoices", type: "table" }
    ]);
  });

  it("maps columns, primary keys, and foreign keys", async () => {
    const pool = {
      async query(sql: string) {
        if (sql.includes("information_schema.columns")) {
          return {
            rows: [
              { column_name: "id", data_type: "integer", is_nullable: "NO" },
              { column_name: "account_id", data_type: "integer", is_nullable: "YES" }
            ]
          };
        }

        if (sql.includes("FOREIGN KEY")) {
          return {
            rows: [
              {
                column_name: "account_id",
                foreign_table_schema: "public",
                foreign_table_name: "accounts",
                foreign_column_name: "id"
              }
            ]
          };
        }

        return { rows: [{ column_name: "id" }] };
      }
    } as unknown as Pool;

    await expect(describeTable(pool, "public.users")).resolves.toEqual({
      name: "public.users",
      columns: [
        { name: "id", type: "integer", nullable: false, primaryKey: true },
        {
          name: "account_id",
          type: "integer",
          nullable: true,
          primaryKey: false,
          foreignKey: { schema: "public", table: "accounts", column: "id" }
        }
      ]
    });
  });
});
