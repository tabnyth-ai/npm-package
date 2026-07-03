import { describe, expect, it } from "vitest";

import { buildMongoFilter } from "./browse";

describe("buildMongoFilter", () => {
  it("returns an empty filter without filters", () => {
    expect(buildMongoFilter(undefined)).toEqual({});
    expect(buildMongoFilter([])).toEqual({});
  });

  it("maps a single comparison filter", () => {
    expect(buildMongoFilter([{ column: "sNo", operator: "gte", value: 5 }])).toEqual({
      sNo: { $gte: 5 }
    });
  });

  it("combines multiple filters with $and", () => {
    expect(
      buildMongoFilter([
        { column: "status", operator: "eq", value: "active" },
        { column: "age", operator: "lt", value: 30 }
      ])
    ).toEqual({
      $and: [{ status: { $eq: "active" } }, { age: { $lt: 30 } }]
    });
  });

  it("maps null checks", () => {
    expect(buildMongoFilter([{ column: "taskId", operator: "isNull" }])).toEqual({ taskId: null });
    expect(buildMongoFilter([{ column: "taskId", operator: "isNotNull" }])).toEqual({ taskId: { $ne: null } });
  });

  it("maps contains to an escaped case-insensitive regex", () => {
    expect(buildMongoFilter([{ column: "note", operator: "contains", value: "a.b" }])).toEqual({
      note: { $regex: "a\\.b", $options: "i" }
    });
  });
});
