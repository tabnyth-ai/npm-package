import type { Pool } from "pg";
import { describe, expect, it } from "vitest";

import { runSqlQuery } from "./query";

describe("runSqlQuery", () => {
  it("normalizes pg query results", async () => {
    const pool = {
      async query(sql: string) {
        expect(sql).toBe("select 1 as id");
        return {
          rows: [{ id: 1 }],
          fields: [{ name: "id" }]
        };
      }
    } as unknown as Pool;

    await expect(runSqlQuery(pool, { text: "select 1 as id" })).resolves.toMatchObject({
      columns: ["id"],
      rows: [{ id: 1 }],
      rowCount: 1
    });
  });
});
