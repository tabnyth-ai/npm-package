import JSON5 from "json5";

import type { ContainerInfo, QueryInput, StudioMeta } from "../../api/types";

export function parseQuery(
  kind: StudioMeta["kind"],
  query: string,
  selected: ContainerInfo | null,
  defaultLimit: number
): QueryInput | Error {
  if (kind === "sql") {
    return { text: query };
  }

  try {
    return normalizeMongoQuery(JSON5.parse(query), selected, defaultLimit);
  } catch (error) {
    return new Error(
      error instanceof Error
        ? error.message
        : "MongoDB query must be valid JSON or Compass-style JavaScript object syntax."
    );
  }
}

export function createDefaultQuery(kind: StudioMeta["kind"], selected: ContainerInfo | null, limit: number): string {
  if (kind === "sql") {
    const tableName = selected ? quoteSqlTableName(selected.name) : "public.table_name";
    return `SELECT * FROM ${tableName} LIMIT ${limit};`;
  }

  return JSON.stringify(
    {
      collection: selected?.name ?? "collection_name",
      operation: "find",
      filter: {},
      limit
    },
    null,
    2
  );
}

function normalizeMongoQuery(parsed: unknown, selected: ContainerInfo | null, defaultLimit: number): QueryInput {
  if (Array.isArray(parsed)) {
    return {
      collection: readSelectedCollection(selected),
      operation: "aggregate",
      pipeline: parsed,
      limit: defaultLimit
    };
  }

  if (!isRecord(parsed)) {
    throw new Error("MongoDB query must be an object or an aggregation pipeline array.");
  }

  if (isQueryInputShape(parsed)) {
    const input = parsed as QueryInput;
    const hasPipeline = Array.isArray(input.pipeline);

    return {
      ...input,
      collection: typeof input.collection === "string" ? input.collection : selected?.name,
      operation: typeof input.operation === "string" ? input.operation : hasPipeline ? "aggregate" : "find"
    };
  }

  return {
    collection: readSelectedCollection(selected),
    operation: "find",
    filter: parsed,
    limit: defaultLimit
  };
}

function isQueryInputShape(value: Record<string, unknown>): boolean {
  return ["collection", "operation", "filter", "pipeline", "document", "update", "limit"].some((key) => key in value);
}

function readSelectedCollection(selected: ContainerInfo | null): string {
  if (!selected?.name) {
    throw new Error("Select a MongoDB collection before running this query.");
  }

  return selected.name;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function quoteSqlTableName(name: string): string {
  return name
    .split(".")
    .map((part) => `"${part.replace(/"/g, '""')}"`)
    .join(".");
}
