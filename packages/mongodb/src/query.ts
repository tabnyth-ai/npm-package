import type { Db, Document } from "mongodb";
import type { QueryInput, QueryResult } from "tabnyth/adapters";

import { mapDocuments } from "./mapDocuments";

export async function runMongoQuery(db: Db, input: QueryInput): Promise<QueryResult> {
  const collectionName = readCollection(input);

  if (input.operation === "find") {
    return runFind(db, collectionName, input);
  }

  if (input.operation === "aggregate") {
    return runAggregate(db, collectionName, input);
  }

  if (input.operation === "insertOne") {
    return runInsertOne(db, collectionName, input);
  }

  if (input.operation === "updateOne") {
    return runUpdateOne(db, collectionName, input);
  }

  if (input.operation === "deleteOne") {
    return runDeleteOne(db, collectionName, input);
  }

  throw new Error(`Unsupported MongoDB operation: ${input.operation}`);
}

async function runFind(db: Db, collectionName: string, input: QueryInput): Promise<QueryResult> {
  const startedAt = performance.now();
  const documents = await db
    .collection<Record<string, unknown>>(collectionName)
    .find(input.filter ?? {})
    .limit(input.limit ?? 100)
    .toArray();

  return mapDocuments(documents, startedAt);
}

async function runAggregate(db: Db, collectionName: string, input: QueryInput): Promise<QueryResult> {
  const startedAt = performance.now();
  const pipeline = Array.isArray(input.pipeline) ? ([...input.pipeline] as Document[]) : [];

  if (!pipeline.some((stage) => isLimitStage(stage))) {
    pipeline.push({ $limit: input.limit ?? 100 });
  }

  const documents = await db.collection<Record<string, unknown>>(collectionName).aggregate(pipeline).toArray();
  return mapDocuments(documents, startedAt);
}

async function runInsertOne(db: Db, collectionName: string, input: QueryInput): Promise<QueryResult> {
  if (!input.document) {
    throw new Error("insertOne requires document.");
  }

  const startedAt = performance.now();
  const result = await db.collection(collectionName).insertOne(input.document);

  return mapDocuments([{ acknowledged: result.acknowledged, insertedId: result.insertedId }], startedAt);
}

async function runUpdateOne(db: Db, collectionName: string, input: QueryInput): Promise<QueryResult> {
  if (!input.update) {
    throw new Error("updateOne requires update.");
  }

  const startedAt = performance.now();
  const result = await db.collection(collectionName).updateOne(input.filter ?? {}, input.update);

  return mapDocuments(
    [
      {
        acknowledged: result.acknowledged,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedId: result.upsertedId
      }
    ],
    startedAt
  );
}

async function runDeleteOne(db: Db, collectionName: string, input: QueryInput): Promise<QueryResult> {
  const startedAt = performance.now();
  const result = await db.collection(collectionName).deleteOne(input.filter ?? {});

  return mapDocuments([{ acknowledged: result.acknowledged, deletedCount: result.deletedCount }], startedAt);
}

function readCollection(input: QueryInput): string {
  if (!input.collection) {
    throw new Error("MongoDB collection is required.");
  }

  return input.collection;
}

function isLimitStage(stage: unknown): boolean {
  return Boolean(stage && typeof stage === "object" && "$limit" in stage);
}
