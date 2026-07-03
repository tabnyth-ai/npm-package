import type { Db, Filter } from "mongodb";
import type { BrowseFilter, BrowseInput, QueryResult } from "tabnyth/adapters";

import { mapDocuments } from "./mapDocuments";

export async function browseCollection(db: Db, input: BrowseInput): Promise<QueryResult> {
  const startedAt = performance.now();
  const collection = db.collection<Record<string, unknown>>(input.container);
  const query = buildMongoFilter(input.filters);
  const [documents, totalRows] = await Promise.all([
    collection
      .find(query)
      .skip(input.offset ?? 0)
      .limit(input.limit ?? 100)
      .toArray(),
    collection.countDocuments(query)
  ]);
  const result = mapDocuments(documents, startedAt);

  return {
    ...result,
    totalRows
  };
}

const comparisonOperators: Partial<Record<BrowseFilter["operator"], string>> = {
  eq: "$eq",
  neq: "$ne",
  gt: "$gt",
  gte: "$gte",
  lt: "$lt",
  lte: "$lte"
};

export function buildMongoFilter(filters: BrowseFilter[] | undefined): Filter<Record<string, unknown>> {
  if (!filters || filters.length === 0) {
    return {};
  }

  const conditions = filters.map((filter): Record<string, unknown> => {
    if (filter.operator === "isNull") {
      // Matches both missing fields and explicit nulls.
      return { [filter.column]: null };
    }

    if (filter.operator === "isNotNull") {
      return { [filter.column]: { $ne: null } };
    }

    if (filter.operator === "contains") {
      return { [filter.column]: { $regex: escapeRegex(String(filter.value ?? "")), $options: "i" } };
    }

    const operator = comparisonOperators[filter.operator];

    if (!operator) {
      throw new Error(`Unsupported filter operator: ${filter.operator}`);
    }

    return { [filter.column]: { [operator]: filter.value } };
  });

  return conditions.length === 1 ? conditions[0] : { $and: conditions };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
