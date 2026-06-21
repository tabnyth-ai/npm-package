import { ObjectId, type Db, type Document } from "mongodb";
import type { QueryResult, UpdateCellsInput } from "tabnyth/adapters";

import { mapDocuments } from "./mapDocuments";

export async function updateMongoCells(db: Db, input: UpdateCellsInput): Promise<QueryResult> {
  const startedAt = performance.now();
  const groups = groupUpdatesByDocument(input);
  const rows: Record<string, unknown>[] = [];

  for (const group of groups.values()) {
    if (group.valuesByColumn.has("_id")) {
      throw new Error("_id cannot be edited inline.");
    }

    const filter: Document = { _id: normalizeMongoId(group.row._id) };
    const set = Object.fromEntries(group.valuesByColumn);
    const result = await db.collection(input.container).updateOne(filter, { $set: set });

    rows.push({
      _id: group.row._id,
      acknowledged: result.acknowledged,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  }

  return mapDocuments(rows, startedAt);
}

interface MongoUpdateGroup {
  row: Record<string, unknown>;
  valuesByColumn: Map<string, unknown>;
}

function groupUpdatesByDocument(input: UpdateCellsInput): Map<string, MongoUpdateGroup> {
  const groups = new Map<string, MongoUpdateGroup>();

  for (const update of input.updates) {
    if (!("_id" in update.row) || update.row._id === null || update.row._id === undefined) {
      throw new Error("_id is missing from the edited document.");
    }

    const groupKey = String(update.row._id);
    const group = groups.get(groupKey) ?? {
      row: update.row,
      valuesByColumn: new Map<string, unknown>()
    };

    group.valuesByColumn.set(update.column, update.value);
    groups.set(groupKey, group);
  }

  return groups;
}

function normalizeMongoId(value: unknown): unknown {
  if (typeof value === "string" && ObjectId.isValid(value)) {
    return new ObjectId(value);
  }

  return value;
}
