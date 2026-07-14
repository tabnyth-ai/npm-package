import { ObjectId, type Db } from "mongodb";
import type { InsertRowsInput, QueryResult } from "tabnyth/adapters";

import { mapDocuments } from "./mapDocuments";

export async function insertMongoRows(db: Db, input: InsertRowsInput): Promise<QueryResult> {
  const startedAt = performance.now();
  const documents = input.rows.map(normalizeDocument);
  const result = await db.collection(input.container).insertMany(documents);
  const rows = documents.map((document, index) => ({
    ...document,
    _id: result.insertedIds[index] ?? document._id
  }));

  return mapDocuments(rows, startedAt);
}

function normalizeDocument(row: Record<string, unknown>): Record<string, unknown> {
  const document = { ...row };

  if (typeof document._id === "string" && ObjectId.isValid(document._id)) {
    document._id = new ObjectId(document._id);
  }

  return document;
}
