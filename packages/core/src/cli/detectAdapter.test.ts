import { describe, expect, it } from "vitest";

import { detectAdapterName } from "./detectAdapter";
import { HelpRequested, parseCliOptions } from "./options";

describe("detectAdapterName", () => {
  it("detects postgres URLs", () => {
    expect(detectAdapterName("postgresql://user:pass@localhost:5432/app")).toBe("postgres");
    expect(detectAdapterName("postgres://user:pass@localhost:5432/app")).toBe("postgres");
  });

  it("detects mongodb URLs", () => {
    expect(detectAdapterName("mongodb://localhost:27017/app")).toBe("mongodb");
    expect(detectAdapterName("mongodb+srv://example.com/app")).toBe("mongodb");
  });

  it("uses an explicit adapter override", () => {
    expect(detectAdapterName("mongodb://localhost:27017/app", "pg")).toBe("postgres");
  });
});

describe("parseCliOptions", () => {
  it("reads url and numeric defaults", () => {
    const options = parseCliOptions(["node", "tabnyth", "--url", "mongodb://localhost:27017/app"], {});

    expect(options.databaseUrl).toBe("mongodb://localhost:27017/app");
    expect(options.host).toBe("127.0.0.1");
    expect(options.port).toBe(5555);
    expect(options.defaultLimit).toBe(100);
    expect(options.maxLimit).toBe(1000);
    expect(options.allowWrite).toBe(false);
  });

  it("reads database URL from env", () => {
    const options = parseCliOptions(["node", "tabnyth", "--env", "MONGO_URL"], {
      MONGO_URL: "mongodb://localhost:27017/app"
    });

    expect(options.databaseUrl).toBe("mongodb://localhost:27017/app");
    expect(options.envName).toBe("MONGO_URL");
  });

  it("clamps default limit to max limit", () => {
    const options = parseCliOptions(
      ["node", "tabnyth", "--url", "mongodb://localhost:27017/app", "--limit", "500", "--max-limit", "100"],
      {}
    );

    expect(options.defaultLimit).toBe(100);
  });

  it("stops parsing after help is requested", () => {
    expect(() => parseCliOptions(["node", "tabnyth", "--help"], {})).toThrow(HelpRequested);
  });
});
