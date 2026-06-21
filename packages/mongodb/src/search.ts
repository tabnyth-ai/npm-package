import type { Db } from "mongodb";
import type { SearchInput, SearchResult } from "tabnyth-studio/adapters";

import { describeCollection, listCollections } from "./introspection";
import { serializeValue } from "./mapDocuments";

const DEFAULT_SEARCH_LIMIT = 24;
const MAX_SEARCH_LIMIT = 50;
const DOCUMENT_SCAN_LIMIT = 200;

export async function searchMongo(db: Db, input: SearchInput): Promise<SearchResult[]> {
  const query = input.query.trim();

  if (query.length < 2) {
    return [];
  }

  const limit = Math.min(Math.max(input.limit ?? DEFAULT_SEARCH_LIMIT, 1), MAX_SEARCH_LIMIT);
  const lowered = query.toLowerCase();
  const results: SearchResult[] = [];
  const collections = await listCollections(db);

  for (const collection of collections) {
    if (results.length >= limit) {
      return results;
    }

    if (collection.name.toLowerCase().includes(lowered)) {
      results.push({
        kind: "table",
        title: `Table Name: ${collection.name}`,
        description: `Collection matched "${query}".`,
        containerName: collection.name
      });
    }
  }

  for (const collection of collections) {
    if (results.length >= limit) {
      return results;
    }

    try {
      const structure = await describeCollection(db, collection.name);

      for (const column of structure.columns) {
        if (results.length >= limit) {
          return results;
        }

        if (column.name.toLowerCase().includes(lowered)) {
          results.push({
            kind: "column",
            title: `Column/Row Name: ${column.name}`,
            description: `${collection.name}.${column.name} (${column.type})`,
            containerName: collection.name,
            columnName: column.name
          });
        }
      }
    } catch {
      // Keep searching other collections if one collection cannot be sampled.
    }
  }

  for (const collection of collections) {
    if (results.length >= limit) {
      return results;
    }

    const remaining = limit - results.length;
    const cellResults = await searchCollectionValues(db, collection.name, query, remaining);
    results.push(...cellResults);
  }

  return results;
}

async function searchCollectionValues(
  db: Db,
  collectionName: string,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  const lowered = query.toLowerCase();
  const documents = await db
    .collection<Record<string, unknown>>(collectionName)
    .find({})
    .limit(DOCUMENT_SCAN_LIMIT)
    .toArray();
  const results: SearchResult[] = [];

  for (const document of documents) {
    const serialized = serializeValue(document) as Record<string, unknown>;
    const matches = findValueMatches(serialized, lowered);

    for (const match of matches) {
      results.push({
        kind: "cell",
        title: `Cell Data: ${collectionName}.${match.path}`,
        description: `${readDocumentLabel(serialized)} contains "${preview(match.value)}".`,
        containerName: collectionName,
        columnName: match.path,
        value: match.value
      });

      if (results.length >= limit) {
        return results;
      }
    }
  }

  return results;
}

function findValueMatches(value: unknown, loweredQuery: string, path = ""): Array<{ path: string; value: unknown }> {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => findValueMatches(entry, loweredQuery, `${path}[${index}]`));
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
      findValueMatches(entry, loweredQuery, path ? `${path}.${key}` : key)
    );
  }

  const text = String(value);
  return text.toLowerCase().includes(loweredQuery) ? [{ path, value }] : [];
}

function readDocumentLabel(document: Record<string, unknown>): string {
  return "_id" in document ? `row _id=${preview(document._id)}` : "matching document";
}

function preview(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}
