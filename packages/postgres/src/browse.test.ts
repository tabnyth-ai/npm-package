import type { Pool } from "pg";
import { describe, expect, it } from "vitest";

import { browseTable } from "./browse";

describe("browseTable", () => {
  it("uses quoted table names and limit parameters", async () => {
    const calls: unknown[][] = [];
    const pool = {
      async query(sql: string, params: unknown[]) {
        calls.push([sql, params]);
        return {
          rows: [{ id: 1 }],
          fields: [{ name: "id" }]
        };
      }
    } as unknown as Pool;

    const result = await browseTable(pool, {
      container: 'app.users"',
      limit: 10,
      offset: 5
    });

    expect(calls[0][0]).toContain('"app"."users"""');
    expect(calls[0][1]).toEqual([10, 5]);
    expect(result).toMatchObject({ columns: ["id"], rows: [{ id: 1 }], rowCount: 1 });
  });
});
