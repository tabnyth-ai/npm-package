import { ObjectId, type Db } from "mongodb";
import { describe, expect, it } from "vitest";

import { updateMongoCells } from "./updateCells";

describe("updateMongoCells", () => {
  it("updates documents by _id", async () => {
    const id = new ObjectId();
    const calls: Record<string, unknown> = {};
    const db = {
      collection(name: string) {
        calls.collection = name;
        return {
          async updateOne(filter: unknown, update: unknown) {
            calls.filter = filter;
            calls.update = update;
            return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
          }
        };
      }
    } as unknown as Db;

    const result = await updateMongoCells(db, {
      container: "users",
      updates: [{ row: { _id: id.toHexString() }, column: "name", value: "Grace" }]
    });

    expect(calls.collection).toBe("users");
    expect(calls.filter).toEqual({ _id: id });
    expect(calls.update).toEqual({ $set: { name: "Grace" } });
    expect(result).toMatchObject({ rowCount: 1, rows: [{ acknowledged: true, matchedCount: 1, modifiedCount: 1 }] });
  });

  it("rejects _id edits", async () => {
    const db = {} as Db;

    await expect(
      updateMongoCells(db, {
        container: "users",
        updates: [{ row: { _id: "abc" }, column: "_id", value: "def" }]
      })
    ).rejects.toThrow(/_id/i);
  });
});
