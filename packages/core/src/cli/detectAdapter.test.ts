import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
    expect(options.promptForMode).toBe(true);
  });

  it("reads database URL from env", () => {
    const options = parseCliOptions(["node", "tabnyth", "--env", "MONGO_URL"], {
      MONGO_URL: "mongodb://localhost:27017/app"
    });

    expect(options.databaseUrl).toBe("mongodb://localhost:27017/app");
    expect(options.envName).toBe("MONGO_URL");
  });

  it("reads database URL from a positional env file and env name", async () => {
    const root = await makeProjectRoot();
    await writeFile(join(root, ".env.dev"), "DATABASE_URL=postgresql://user:pass@localhost:5432/app\n", "utf8");

    const options = parseCliOptions(["node", "tabnyth", ".env.dev", "DATABASE_URL"], {}, root);

    expect(options.databaseUrl).toBe("postgresql://user:pass@localhost:5432/app");
    expect(options.envFile).toBe(".env.dev");
    expect(options.envName).toBe("DATABASE_URL");
  });

  it("reads database URL from --env-file", async () => {
    const root = await makeProjectRoot();
    const env: NodeJS.ProcessEnv = {};
    await writeFile(join(root, ".env.dev"), "MONGO_URL='mongodb://localhost:27017/app'\nTABNYTH_KEY=tnk_test\n", "utf8");

    const options = parseCliOptions(["node", "tabnyth", "--env-file", ".env.dev", "--env", "MONGO_URL"], env, root);

    expect(options.databaseUrl).toBe("mongodb://localhost:27017/app");
    expect(env.TABNYTH_KEY).toBe("tnk_test");
  });

  it("reads an explicit edit mode", () => {
    const options = parseCliOptions(["node", "tabnyth", "--url", "mongodb://localhost:27017/app", "--mode", "edit"], {});

    expect(options.mode).toBe("edit");
    expect(options.allowWrite).toBe(true);
    expect(options.promptForMode).toBe(false);
  });

  it("keeps --allow-write as an edit mode shortcut", () => {
    const options = parseCliOptions(["node", "tabnyth", "--url", "mongodb://localhost:27017/app", "--allow-write"], {});

    expect(options.mode).toBe("edit");
    expect(options.allowWrite).toBe(true);
    expect(options.promptForMode).toBe(false);
  });

  it("rejects invalid startup modes", () => {
    expect(() => parseCliOptions(["node", "tabnyth", "--url", "mongodb://localhost:27017/app", "--mode", "admin"], {})).toThrow(
      "Invalid --mode value. Use view or edit."
    );
  });

  it("includes the env file in the missing database URL message", async () => {
    const root = await makeProjectRoot();
    await writeFile(join(root, ".env.dev"), "OTHER_URL=mongodb://localhost:27017/app\n", "utf8");

    expect(() => parseCliOptions(["node", "tabnyth", ".env.dev", "DATABASE_URL"], {}, root)).toThrow(
      "Database URL not provided. Pass --url, set DATABASE_URL or add DATABASE_URL to .env.dev."
    );
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

async function makeProjectRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "tabnyth-cli-"));
}
