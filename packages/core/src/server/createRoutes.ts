import { Hono, type Context } from "hono";

import type {
  BrowseFilter,
  BrowseFilterOperator,
  CellUpdate,
  DatabaseAdapter,
  InsertRowsInput,
  QueryInput
} from "../adapters/types";
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
  adapter?: DatabaseAdapter;
  config?: ApiConfig;
  runtime?: ApiRuntime;
  projectRoot?: string;
  connectDatabase?(input: ConnectDatabaseInput): Promise<void>;
}

export interface ApiRuntime {
  adapter: DatabaseAdapter;
  config: ApiConfig;
}

export interface ConnectDatabaseInput {
  databaseUrl: string;
  mode?: "view" | "edit";
}

export function createRoutes(context: ApiContext): Hono {
  const routes = new Hono();
  const runtime = context.runtime ?? createRuntimeFromContext(context);

  routes.get("/health", (c) => c.json({ ok: true }));

  routes.get("/meta", (c) => c.json(readMeta(runtime)));

  routes.get("/containers", async (c) => c.json({ containers: await runtime.adapter.listContainers() }));

  routes.get("/containers/:name/structure", async (c) => {
    const name = decodeURIComponent(c.req.param("name"));
    return c.json({ structure: await runtime.adapter.describeContainer(name) });
  });

  routes.get("/search", async (c) => {
    const query = c.req.query("q")?.trim() ?? "";
    const limit = clampSearchLimit(c.req.query("limit"));

    return c.json({ results: await runtime.adapter.search({ query, limit }) });
  });

  routes.post("/connect", async (c) => {
    if (!context.connectDatabase) {
      throw new ApiError(501, "Connecting from the UI is not available in this server.");
    }

    const body = await readJson<Record<string, unknown>>(c);

    await context.connectDatabase({
      databaseUrl: readRequiredString(body.databaseUrl, "databaseUrl").trim(),
      mode: readConnectionMode(body.mode)
    });

    return c.json({
      meta: readMeta(runtime),
      containers: await runtime.adapter.listContainers()
    });
  });

  routes.post("/browse", async (c) => {
    const body = await readJson<Record<string, unknown>>(c);
    const container = readRequiredString(body.container, "container");

    const result = await runtime.adapter.browse({
      container,
      schema: readOptionalString(body.schema),
      limit: clampLimit(body.limit, runtime.config),
      offset: readOffset(body.offset),
      filters: readBrowseFilters(body.filters)
    });

    return c.json({ result });
  });

  routes.post("/query", async (c) => {
    const body = await readJson<QueryInput>(c);
    const input = normalizeQueryInput(runtime.adapter.kind, body, runtime.config);
    const result = await runtime.adapter.runQuery(input);

    return c.json({ result });
  });

  routes.post("/cells", async (c) => {
    if (!runtime.config.allowWrite) {
      throw new ApiError(400, "Cell editing requires --allow-write.");
    }

    const body = await readJson<Record<string, unknown>>(c);
    const container = readRequiredString(body.container, "container");
    const updates = readCellUpdates(body.updates);

    const result = await runtime.adapter.updateCells({
      container,
      schema: readOptionalString(body.schema),
      updates
    });

    return c.json({ result });
  });

  routes.post("/rows", async (c) => {
    if (!runtime.config.allowWrite) {
      throw new ApiError(400, "Row inserts require --allow-write.");
    }

    const body = await readJson<Record<string, unknown>>(c);
    const input = readInsertRowsInput(body);
    const result = await runtime.adapter.insertRows(input);

    return c.json({ result });
  });

  routes.post("/nyth-ai/chat", async (c) => {
    const body = await readJson<Record<string, unknown>>(c);
    const input = normalizeNythAiInput(body);
    const result = await requestNythAi(
      {
        ...input,
        schema: await buildSchemaContext(runtime.adapter, runtime.config)
      },
      context.projectRoot
    );

    return c.json({ result });
  });

  routes.get("/nyth-ai/credits", async (c) => {
    const result = await requestNythAiCredits(context.projectRoot);

    return c.json({ result });
  });

  return routes;
}

function createRuntimeFromContext(context: ApiContext): ApiRuntime {
  if (!context.adapter || !context.config) {
    throw new Error("createRoutes requires either runtime or adapter/config.");
  }

  return {
    adapter: context.adapter,
    config: context.config
  };
}

function readMeta(runtime: ApiRuntime): StudioMetaResponse {
  return {
    adapter: runtime.config.adapterName,
    kind: runtime.adapter.kind,
    allowWrite: runtime.config.allowWrite,
    defaultLimit: runtime.config.defaultLimit,
    maxLimit: runtime.config.maxLimit,
    timeoutMs: runtime.config.timeoutMs
  };
}

interface StudioMetaResponse {
  adapter: string;
  kind: DatabaseAdapter["kind"];
  allowWrite: boolean;
  defaultLimit: number;
  maxLimit: number;
  timeoutMs: number;
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

function readConnectionMode(value: unknown): "view" | "edit" | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value === "view" || value === "edit") {
    return value;
  }

  throw new ApiError(400, "mode must be view or edit.");
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

const browseFilterOperators: ReadonlySet<BrowseFilterOperator> = new Set([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "isNull",
  "isNotNull"
]);
const maxBrowseFilters = 20;

function readBrowseFilters(value: unknown): BrowseFilter[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ApiError(400, "filters must be an array.");
  }

  if (value.length === 0) {
    return undefined;
  }

  if (value.length > maxBrowseFilters) {
    throw new ApiError(400, `At most ${maxBrowseFilters} filters are supported.`);
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new ApiError(400, "Each filter must be an object.");
    }

    const filter = entry as Record<string, unknown>;
    const column = readRequiredString(filter.column, "filter column");
    const operator = filter.operator;

    if (typeof operator !== "string" || !browseFilterOperators.has(operator as BrowseFilterOperator)) {
      throw new ApiError(400, `Unsupported filter operator: ${String(operator)}`);
    }

    if (operator === "isNull" || operator === "isNotNull") {
      return { column, operator };
    }

    if (filter.value === undefined) {
      throw new ApiError(400, `Filter on ${column} requires a value.`);
    }

    return { column, operator: operator as BrowseFilterOperator, value: filter.value };
  });
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

function readInsertRowsInput(body: Record<string, unknown>): InsertRowsInput {
  const container = readRequiredString(body.container, "container");
  const rows = readInsertRows(body.rows);

  return {
    container,
    schema: readOptionalString(body.schema),
    rows
  };
}

function readInsertRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError(400, "At least one row is required.");
  }

  return value.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new ApiError(400, "Each inserted row must be an object.");
    }

    return row as Record<string, unknown>;
  });
}

function assertAsBadRequest(fn: () => void): void {
  try {
    fn();
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : String(error));
  }
}
