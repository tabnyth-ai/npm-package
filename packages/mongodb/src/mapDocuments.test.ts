import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import { mapDocuments } from "./mapDocuments";

describe("mapDocuments", () => {
  it("serializes ObjectId and Date values", () => {
    const id = new ObjectId();
    const result = mapDocuments([{ _id: id, createdAt: new Date("2026-01-01T00:00:00.000Z") }], performance.now());

    expect(result.columns).toEqual(["_id", "createdAt"]);
    expect(result.rows[0]).toEqual({
      _id: id.toHexString(),
      createdAt: "2026-01-01T00:00:00.000Z"
    });
  });
});
