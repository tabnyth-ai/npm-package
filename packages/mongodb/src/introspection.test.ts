import type { Db } from "mongodb";
import { describe, expect, it } from "vitest";

import { describeCollection, listCollections } from "./introspection";

describe("mongodb introspection", () => {
  it("lists collections in name order", async () => {
    const db = {
      listCollections() {
        return {
          async toArray() {
            return [{ name: "users" }, { name: "accounts" }];
          }
        };
      }
    } as unknown as Db;

    await expect(listCollections(db)).resolves.toEqual([
      { name: "accounts", displayName: "accounts", type: "collection" },
      { name: "users", displayName: "users", type: "collection" }
    ]);
  });

  it("infers sample document structure", async () => {
    const db = {
      collection() {
        return {
          async findOne() {
            return { name: "Gaurav", active: true };
          }
        };
      }
    } as unknown as Db;

    await expect(describeCollection(db, "users")).resolves.toEqual({
      name: "users",
      columns: [
        { name: "name", type: "string" },
        { name: "active", type: "boolean" }
      ],
      sample: { name: "Gaurav", active: true }
    });
  });
});
