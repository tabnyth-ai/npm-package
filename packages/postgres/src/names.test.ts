import { describe, expect, it } from "vitest";

import { parseTableName, quoteIdentifier, quoteTableName } from "./names";

describe("postgres names", () => {
  it("parses schema-qualified names", () => {
    expect(parseTableName("app.users")).toEqual({ schema: "app", table: "users" });
    expect(parseTableName("users")).toEqual({ schema: "public", table: "users" });
  });

  it("quotes identifiers safely", () => {
    expect(quoteIdentifier('weird"name')).toBe('"weird""name"');
    expect(quoteTableName("app", "users")).toBe('"app"."users"');
  });
});
