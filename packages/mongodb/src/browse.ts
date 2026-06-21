import type { Db } from "mongodb";
import type { BrowseInput, QueryResult } from "tabnyth-studio/adapters";

import { mapDocuments } from "./mapDocuments";

export async function browseCollection(db: Db, input: BrowseInput): Promise<QueryResult> {
  const startedAt = performance.now();
  const collection = db.collection<Record<string, unknown>>(input.container);
  const [documents, totalRows] = await Promise.all([
    collection
      .find({})
      .skip(input.offset ?? 0)
      .limit(input.limit ?? 100)
      .toArray(),
    collection.countDocuments({})
  ]);
  const result = mapDocuments(documents, startedAt);

  return {
    ...result,
    totalRows
  };
}
