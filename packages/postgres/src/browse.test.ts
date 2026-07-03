import type { Pool } from "pg";
import { describe, expect, it } from "vitest";

import { browseTable, buildWhereClause } from "./browse";

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

  it("applies filters to both the rows query and the count query", async () => {
    const calls: unknown[][] = [];
    const pool = {
      async query(sql: string, params: unknown[]) {
        calls.push([sql, params]);
        return {
          rows: [{ id: 1, total: "1" }],
          fields: [{ name: "id" }]
        };
      }
    } as unknown as Pool;

    await browseTable(pool, {
      container: "public.users",
      limit: 10,
      offset: 0,
      filters: [{ column: "sNo", operator: "gte", value: 5 }]
    });

    expect(calls[0][0]).toContain('where "sNo" >= $1');
    expect(calls[0][0]).toContain("limit $2 offset $3");
    expect(calls[0][1]).toEqual([5, 10, 0]);
    expect(calls[1][0]).toContain('where "sNo" >= $1');
    expect(calls[1][1]).toEqual([5]);
  });
});

describe("buildWhereClause", () => {
  it("returns an empty clause without filters", () => {
    expect(buildWhereClause(undefined)).toEqual({ text: "", values: [] });
    expect(buildWhereClause([])).toEqual({ text: "", values: [] });
  });

  it("combines filters with and, quoting identifiers", () => {
    const clause = buildWhereClause([
      { column: 'weird"col', operator: "eq", value: "x" },
      { column: "age", operator: "lt", value: 30 }
    ]);

    expect(clause.text).toBe(' where "weird""col" = $1 and "age" < $2');
    expect(clause.values).toEqual(["x", 30]);
  });

  it("supports null checks without parameters", () => {
    const clause = buildWhereClause([
      { column: "taskId", operator: "isNull" },
      { column: "userId", operator: "isNotNull" }
    ]);

    expect(clause.text).toBe(' where "taskId" is null and "userId" is not null');
    expect(clause.values).toEqual([]);
  });

  it("escapes like wildcards for contains", () => {
    const clause = buildWhereClause([{ column: "note", operator: "contains", value: "50%_done" }]);

    expect(clause.text).toBe(' where "note"::text ilike $1');
    expect(clause.values).toEqual(["%50\\%\\_done%"]);
  });
});
