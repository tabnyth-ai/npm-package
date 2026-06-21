import { describe, expect, it } from "vitest";

import { clampLimit, readOffset } from "./limits";
import { assertMongoOperationAllowed } from "./mongoGuard";
import { assertSqlAllowed } from "./sqlGuard";

describe("limits", () => {
  it("clamps limits and normalizes offsets", () => {
    expect(clampLimit(5000, { defaultLimit: 100, maxLimit: 1000 })).toBe(1000);
    expect(clampLimit("25", { defaultLimit: 100, maxLimit: 1000 })).toBe(25);
    expect(clampLimit(-1, { defaultLimit: 100, maxLimit: 1000 })).toBe(100);
    expect(readOffset("20")).toBe(20);
    expect(readOffset(-5)).toBe(0);
  });
});

describe("assertSqlAllowed", () => {
  it("allows read-only SQL in read-only mode", () => {
    expect(() => assertSqlAllowed("select * from users", false)).not.toThrow();
    expect(() => assertSqlAllowed("with rows as (select 1) select * from rows", false)).not.toThrow();
  });

  it("blocks write SQL in read-only mode", () => {
    expect(() => assertSqlAllowed("update users set name = 'x'", false)).toThrow(/read-only/i);
    expect(() => assertSqlAllowed("select * from users; drop table users", false)).toThrow(/blocked/i);
  });

  it("allows writes when enabled", () => {
    expect(() => assertSqlAllowed("delete from users", true)).not.toThrow();
  });
});

describe("assertMongoOperationAllowed", () => {
  it("allows read operations", () => {
    expect(() => assertMongoOperationAllowed("find", false)).not.toThrow();
    expect(() => assertMongoOperationAllowed("aggregate", false)).not.toThrow();
  });

  it("blocks writes unless enabled", () => {
    expect(() => assertMongoOperationAllowed("insertOne", false)).toThrow(/allow-write/i);
    expect(() => assertMongoOperationAllowed("insertOne", true)).not.toThrow();
  });

  it("rejects unknown operations", () => {
    expect(() => assertMongoOperationAllowed("drop", true)).toThrow(/unsupported/i);
  });
});
