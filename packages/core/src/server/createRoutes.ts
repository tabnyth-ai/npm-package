import { Hono, type Context } from "hono";

import type { CellUpdate, DatabaseAdapter, QueryInput } from "../adapters/types";
import { askNythAi, getNythAiCreditBalance } from "../nyth/client";
import type { NythAiChatInput, NythAiSchemaContext } from "../nyth/types";
import { clampLimit, readOffset, type PaginationLimits } from "../safety/limits";
import { assertMongoOperationAllowed } from "../safety/mongoGuard";
import { assertSqlAllowed } from "../safety/sqlGuard";
import { ApiError } from "./errors";

export interface ApiConfig extends PaginationLimits {
  adapterName: string;
  allowWrite: boolean;
  timeoutMs: number;
}

export interface ApiContext {
  adapter: DatabaseAdapter;
  config: ApiConfig;
  projectRoot?: string;
}

export function createRoutes({ adapter, config, projectRoot }: ApiContext): Hono {
  const routes = new Hono();

  routes.get("/health", (c) => c.json({ ok: true }));

  routes.get("/meta", (c) =>
    c.json({
      adapter: config.adapterName,
      kind: adapter.kind,
      allowWrite: config.allowWrite,
      defaultLimit: config.defaultLimit,
      maxLimit: config.maxLimit,
      timeoutMs: config.timeoutMs
    })
  );

  routes.get("/containers", async (c) => c.json({ containers: await adapter.listContainers() }));

  routes.get("/containers/:name/structure", async (c) => {
    const name = decodeURIComponent(c.req.param("name"));
    return c.json({ structure: await adapter.describeContainer(name) });
  });

  routes.get("/search", async (c) => {
    const query = c.req.query("q")?.trim() ?? "";
    const limit = clampSearchLimit(c.req.query("limit"));

    return c.json({ results: await adapter.search({ query, limit }) });
  });

  routes.post("/browse", async (c) => {
    const body = await readJson<Record<string, unknown>>(c);
    const container = readRequiredString(body.container, "container");

    const result = await adapter.browse({
      container,
      schema: readOptionalString(body.schema),
      limit: clampLimit(body.limit, config),
      offset: readOffset(body.offset)
    });

    return c.json({ result });
  });

  routes.post("/query", async (c) => {
    const body = await readJson<QueryInput>(c);
    const input = normalizeQueryInput(adapter.kind, body, config);
    const result = await adapter.runQuery(input);

    return c.json({ result });
  });

  routes.post("/cells", async (c) => {
    if (!config.allowWrite) {
      throw new ApiError(400, "Cell editing requires --allow-write.");
    }

    const body = await readJson<Record<string, unknown>>(c);
    const container = readRequiredString(body.container, "container");
    const updates = readCellUpdates(body.updates);

    const result = await adapter.updateCells({
      container,
      schema: readOptionalString(body.schema),
      updates
    });

    return c.json({ result });
  });

  routes.post("/nyth-ai/chat", async (c) => {
    const body = await readJson<Record<string, unknown>>(c);
    const input = normalizeNythAiInput(body);
    const result = await requestNythAi(
      {
        ...input,
        schema: await buildSchemaContext(adapter, config)
      },
      projectRoot
    );

    return c.json({ result });
  });

  routes.get("/nyth-ai/credits", async (c) => {
    const result = await requestNythAiCredits(projectRoot);

    return c.json({ result });
  });

  return routes;
}

async function requestNythAi(input: NythAiChatInput, projectRoot: string | undefined) {
  try {
    return await askNythAi(input, { projectRoot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nyth AI request failed.";
    throw new ApiError(readNythAiErrorStatus(message), message);
  }
}

async function requestNythAiCredits(projectRoot: string | undefined) {
  try {
    return await getNythAiCreditBalance({ projectRoot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nyth AI credit balance failed.";
    throw new ApiError(readNythAiErrorStatus(message), message);
  }
}

async function readJson<T>(c: Context): Promise<T> {
  try {
    return (await c.req.json()) as T;
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
}

function normalizeQueryInput(kind: DatabaseAdapter["kind"], body: QueryInput, config: ApiConfig): QueryInput {
  if (kind === "sql") {
    const text = (body.text ?? body.sql ?? "").trim();
    assertAsBadRequest(() => assertSqlAllowed(text, config.allowWrite));
    return {
      ...body,
      text,
      limit: clampLimit(body.limit, config)
    };
  }

  assertAsBadRequest(() => assertMongoOperationAllowed(body.operation, config.allowWrite));

  return {
    ...body,
    limit: clampLimit(body.limit, config)
  };
}

function readRequiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, `${label} is required.`);
  }

  return value;
}

function normalizeNythAiInput(body: Record<string, unknown>) {
  return {
    prompt: readRequiredString(body.prompt, "prompt"),
    system: readOptionalString(body.system),
    model: readOptionalString(body.model),
    thinking: readOptionalBoolean(body.thinking),
    effort: readOptionalEffort(body.effort),
    temperature: readOptionalNumber(body.temperature, "temperature"),
    maxTokens: readOptionalNumber(body.maxTokens, "maxTokens")
  };
}

async function buildSchemaContext(adapter: DatabaseAdapter, config: ApiConfig): Promise<NythAiSchemaContext> {
  const containers = await adapter.listContainers();
  const structures = await describeContainers(adapter, containers.map((container) => container.name));

  return {
    adapterKind: adapter.kind,
    adapterName: config.adapterName,
    containers: containers.map((container) => {
      const structure = structures.get(container.name);

      return {
        name: container.name,
        type: container.type,
        schema: container.schema,
        displayName: container.displayName,
        columns: structure?.columns ?? []
      };
    })
  };
}

async function describeContainers(adapter: DatabaseAdapter, names: string[]): Promise<Map<string, Awaited<ReturnType<DatabaseAdapter["describeContainer"]>>>> {
  const structures = new Map<string, Awaited<ReturnType<DatabaseAdapter["describeContainer"]>>>();
  let nextIndex = 0;
  const workerCount = Math.min(6, names.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < names.length) {
        const index = nextIndex;
        nextIndex += 1;

        const name = names[index];
        structures.set(name, await adapter.describeContainer(name));
      }
    })
  );

  return structures;
}

function readNythAiErrorStatus(message: string): number {
  if (/missing/i.test(message)) {
    return 400;
  }

  if (/invalid|inactive/i.test(message)) {
    return 401;
  }

  if (/credit|payment|required/i.test(message)) {
    return 402;
  }

  return 502;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function readOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readOptionalEffort(value: unknown): "low" | "medium" | "high" | undefined {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return undefined;
}

function readOptionalNumber(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new ApiError(400, `${label} must be a number.`);
  }

  return parsed;
}

function clampSearchLimit(value: unknown): number {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : 24;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 24;
  }

  return Math.min(Math.floor(parsed), 50);
}

function readCellUpdates(value: unknown): CellUpdate[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError(400, "At least one cell update is required.");
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new ApiError(400, "Each cell update must be an object.");
    }

    const update = entry as Record<string, unknown>;
    const column = readRequiredString(update.column, "column");

    if (!update.row || typeof update.row !== "object" || Array.isArray(update.row)) {
      throw new ApiError(400, "Each cell update requires a row identity.");
    }

    return {
      row: update.row as Record<string, unknown>,
      column,
      value: update.value
    };
  });
}

function assertAsBadRequest(fn: () => void): void {
  try {
    fn();
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : String(error));
  }
}
