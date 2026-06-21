import type { Pool } from "pg";
import { describe, expect, it } from "vitest";

import { updateTableCells } from "./updateCells";

describe("updateTableCells", () => {
  it("updates cells by primary key and returns updated rows", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const pool = {
      async query(sql: string, params?: unknown[]) {
        calls.push({ sql, params });

        if (sql.includes("information_schema.columns")) {
          return { rows: [{ column_name: "id", data_type: "integer", is_nullable: "NO" }] };
        }

        if (sql.includes("information_schema.table_constraints")) {
          return { rows: [{ column_name: "id" }] };
        }

        return { rows: [{ id: 1, name: "Grace" }], fields: [{ name: "id" }, { name: "name" }] };
      }
    } as unknown as Pool;

    const result = await updateTableCells(pool, {
      container: "public.users",
      updates: [{ row: { id: 1 }, column: "name", value: "Grace" }]
    });

    const updateCall = calls.find((call) => call.sql.trim().startsWith("update"));
    expect(updateCall?.sql).toContain('update "public"."users" set "name" = $1 where "id" = $2 returning *');
    expect(updateCall?.params).toEqual(["Grace", 1]);
    expect(result).toMatchObject({ rowCount: 1, rows: [{ id: 1, name: "Grace" }] });
  });

  it("rejects tables without primary keys", async () => {
    const pool = {
      async query(sql: string) {
        if (sql.includes("information_schema.columns")) {
          return { rows: [{ column_name: "name", data_type: "text", is_nullable: "YES" }] };
        }

        return { rows: [] };
      }
    } as unknown as Pool;

    await expect(
      updateTableCells(pool, {
        container: "public.users",
        updates: [{ row: { name: "Ada" }, column: "name", value: "Grace" }]
      })
    ).rejects.toThrow(/primary key/i);
  });
});
