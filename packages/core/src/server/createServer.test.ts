import { describe, expect, it } from "vitest";

import type { DatabaseAdapter } from "../adapters/types";
import { createServer } from "./createServer";

describe("createServer", () => {
  it("serves metadata and adapter-backed routes", async () => {
    const app = createServer({
      adapter: createFakeAdapter(),
      config: {
        adapterName: "postgres",
        allowWrite: false,
        defaultLimit: 100,
        maxLimit: 1000,
        timeoutMs: 10000
      }
    });

    const meta = await app.request("/api/meta");
    expect(await meta.json()).toMatchObject({ adapter: "postgres", kind: "sql", allowWrite: false });

    const containers = await app.request("/api/containers");
    expect(await containers.json()).toEqual({
      containers: [{ name: "public.users", type: "table", schema: "public" }]
    });

    const browse = await app.request("/api/browse", {
      method: "POST",
      body: JSON.stringify({ container: "public.users", limit: 5000 })
    });

    expect(await browse.json()).toMatchObject({
      result: {
        columns: ["id"],
        rows: [{ id: 1 }],
        rowCount: 1
      }
    });
  });

  it("blocks write SQL before the adapter receives it", async () => {
    const app = createServer({
      adapter: createFakeAdapter(),
      config: {
        adapterName: "postgres",
        allowWrite: false,
        defaultLimit: 100,
        maxLimit: 1000,
        timeoutMs: 10000
      }
    });

    const response = await app.request("/api/query", {
      method: "POST",
      body: JSON.stringify({ text: "delete from users" })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringMatching(/read-only/i) });
  });

  it("blocks cell updates when write mode is disabled", async () => {
    const app = createServer({
      adapter: createFakeAdapter(),
      config: {
        adapterName: "postgres",
        allowWrite: false,
        defaultLimit: 100,
        maxLimit: 1000,
        timeoutMs: 10000
      }
    });

    const response = await app.request("/api/cells", {
      method: "POST",
      body: JSON.stringify({
        container: "public.users",
        updates: [{ row: { id: 1 }, column: "name", value: "Ada" }]
      })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringMatching(/allow-write/i) });
  });

  it("passes cell updates to the adapter in write mode", async () => {
    const app = createServer({
      adapter: createFakeAdapter(),
      config: {
        adapterName: "postgres",
        allowWrite: true,
        defaultLimit: 100,
        maxLimit: 1000,
        timeoutMs: 10000
      }
    });

    const response = await app.request("/api/cells", {
      method: "POST",
      body: JSON.stringify({
        container: "public.users",
        updates: [{ row: { id: 1 }, column: "name", value: "Ada" }]
      })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ result: { rowCount: 1 } });
  });
});

function createFakeAdapter(): DatabaseAdapter {
  return {
    kind: "sql",
    async connect() {},
    async disconnect() {},
    async listContainers() {
      return [{ name: "public.users", type: "table", schema: "public" }];
    },
    async describeContainer(name) {
      return { name, columns: [{ name: "id", type: "integer" }] };
    },
    async browse() {
      return { columns: ["id"], rows: [{ id: 1 }], rowCount: 1, durationMs: 1 };
    },
    async runQuery() {
      return { columns: ["id"], rows: [{ id: 1 }], rowCount: 1, durationMs: 1 };
    },
    async search() {
      return [{ kind: "table", title: "Table Name: public.users", description: "Matched table.", containerName: "public.users" }];
    },
    async updateCells() {
      return { columns: ["id"], rows: [{ id: 1 }], rowCount: 1, durationMs: 1 };
    }
  };
}
