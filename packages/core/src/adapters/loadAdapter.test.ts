import { describe, expect, it } from "vitest";

import { loadAdapter } from "./loadAdapter";

const options = {
  connectionString: "postgresql://localhost/app",
  allowWrite: false,
  defaultLimit: 100,
  maxLimit: 1000,
  timeoutMs: 10000
};

describe("loadAdapter", () => {
  it("creates adapters from adapter modules", async () => {
    const adapter = await loadAdapter("postgres", options, async () => ({
      createAdapter() {
        return {
          kind: "sql",
          async connect() {},
          async disconnect() {},
          async listContainers() {
            return [];
          },
          async describeContainer(name: string) {
            return { name, columns: [] };
          },
          async browse() {
            return { columns: [], rows: [], rowCount: 0, durationMs: 0 };
          },
          async runQuery() {
            return { columns: [], rows: [], rowCount: 0, durationMs: 0 };
          },
          async search() {
            return [];
          },
          async updateCells() {
            return { columns: [], rows: [], rowCount: 0, durationMs: 0 };
          }
        };
      }
    }));

    expect(adapter.kind).toBe("sql");
  });

  it("shows an install command when an adapter package is missing", async () => {
    const error = new Error("Cannot find package '@tabnyth-studio/mongodb'");
    Object.assign(error, { code: "ERR_MODULE_NOT_FOUND" });

    await expect(loadAdapter("mongodb", options, async () => Promise.reject(error))).rejects.toThrow(
      /npm i -D @tabnyth-studio\/mongodb/
    );
  });
});
