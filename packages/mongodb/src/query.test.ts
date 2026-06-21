import type { Db } from "mongodb";
import { describe, expect, it } from "vitest";

import { runMongoQuery } from "./query";

describe("runMongoQuery", () => {
  it("runs find queries with a limit", async () => {
    const calls: Record<string, unknown> = {};
    const db = {
      collection(name: string) {
        calls.collection = name;
        return {
          find(filter: Record<string, unknown>) {
            calls.filter = filter;
            return {
              limit(limit: number) {
                calls.limit = limit;
                return {
                  async toArray() {
                    return [{ name: "Ada" }];
                  }
                };
              }
            };
          }
        };
      }
    } as unknown as Db;

    const result = await runMongoQuery(db, {
      collection: "users",
      operation: "find",
      filter: { role: "admin" },
      limit: 10
    });

    expect(calls).toMatchObject({ collection: "users", filter: { role: "admin" }, limit: 10 });
    expect(result).toMatchObject({ columns: ["name"], rows: [{ name: "Ada" }], rowCount: 1 });
  });

  it("appends a limit to aggregate pipelines", async () => {
    const calls: Record<string, unknown> = {};
    const db = {
      collection() {
        return {
          aggregate(pipeline: unknown[]) {
            calls.pipeline = pipeline;
            return {
              async toArray() {
                return [{ count: 1 }];
              }
            };
          }
        };
      }
    } as unknown as Db;

    await runMongoQuery(db, {
      collection: "users",
      operation: "aggregate",
      pipeline: [{ $match: { active: true } }],
      limit: 5
    });

    expect(calls.pipeline).toEqual([{ $match: { active: true } }, { $limit: 5 }]);
  });
});
