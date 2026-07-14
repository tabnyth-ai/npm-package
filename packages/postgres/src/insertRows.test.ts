import type { Pool } from "pg";
import { describe, expect, it } from "vitest";

import { insertTableRows } from "./insertRows";

describe("insertTableRows", () => {
  it("inserts a row and returns inserted rows", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const pool = {
      async query(sql: string, params?: unknown[]) {
        calls.push({ sql, params });

        if (sql.includes("information_schema.columns")) {
          return {
            rows: [
              { column_name: "id", data_type: "integer", is_nullable: "NO", column_default: "nextval('users_id_seq'::regclass)", is_identity: "NO" },
              { column_name: "name", data_type: "text", is_nullable: "NO", column_default: null, is_identity: "NO" }
            ]
          };
        }

        if (sql.includes("information_schema.table_constraints")) {
          return { rows: [{ column_name: "id" }] };
        }

        return { rows: [{ id: 1, name: "Ada" }], fields: [{ name: "id" }, { name: "name" }] };
      }
    } as unknown as Pool;

    const result = await insertTableRows(pool, {
      container: "public.users",
      rows: [{ name: "Ada" }]
    });

    const insertCall = calls.find((call) => call.sql.trim().startsWith("insert"));
    expect(insertCall?.sql).toContain('insert into "public"."users" ("name") values ($1) returning *');
    expect(insertCall?.params).toEqual(["Ada"]);
    expect(result).toMatchObject({ rowCount: 1, rows: [{ id: 1, name: "Ada" }] });
  });

  it("uses default values when no fields are provided", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const pool = {
      async query(sql: string, params?: unknown[]) {
        calls.push({ sql, params });

        if (sql.includes("information_schema.columns")) {
          return { rows: [{ column_name: "id", data_type: "integer", is_nullable: "NO", column_default: "nextval('users_id_seq'::regclass)", is_identity: "NO" }] };
        }

        return { rows: [{ id: 1 }], fields: [{ name: "id" }] };
      }
    } as unknown as Pool;

    await insertTableRows(pool, {
      container: "public.users",
      rows: [{}]
    });

    const insertCall = calls.find((call) => call.sql.trim().startsWith("insert"));
    expect(insertCall?.sql).toContain('insert into "public"."users" default values returning *');
    expect(insertCall?.params).toBeUndefined();
  });
});
