import { ObjectId, type Db } from "mongodb";
import { describe, expect, it } from "vitest";

import { insertMongoRows } from "./insertRows";

describe("insertMongoRows", () => {
  it("inserts documents and returns inserted ids", async () => {
    const id = new ObjectId();
    const calls: Record<string, unknown> = {};
    const db = {
      collection(name: string) {
        calls.collection = name;
        return {
          async insertMany(documents: unknown[]) {
            calls.documents = documents;
            return { insertedIds: { 0: id } };
          }
        };
      }
    } as unknown as Db;

    const result = await insertMongoRows(db, {
      container: "users",
      rows: [{ name: "Ada" }]
    });

    expect(calls.collection).toBe("users");
    expect(calls.documents).toEqual([{ name: "Ada" }]);
    expect(result).toMatchObject({ rowCount: 1, rows: [{ _id: id.toHexString(), name: "Ada" }] });
  });

  it("normalizes valid _id strings", async () => {
    const id = new ObjectId();
    const calls: Record<string, unknown> = {};
    const db = {
      collection() {
        return {
          async insertMany(documents: unknown[]) {
            calls.documents = documents;
            return { insertedIds: { 0: id } };
          }
        };
      }
    } as unknown as Db;

    await insertMongoRows(db, {
      container: "users",
      rows: [{ _id: id.toHexString(), name: "Ada" }]
    });

    expect(calls.documents).toEqual([{ _id: id, name: "Ada" }]);
  });
});
