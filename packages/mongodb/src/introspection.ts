import type { Db } from "mongodb";
import type { ColumnInfo, ContainerInfo, ContainerStructure } from "tabnyth-studio/adapters";

import { serializeValue } from "./mapDocuments";

export async function listCollections(db: Db): Promise<ContainerInfo[]> {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();

  return collections
    .map((collection) => ({
      name: collection.name,
      displayName: collection.name,
      type: "collection" as const
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function describeCollection(db: Db, name: string): Promise<ContainerStructure> {
  const sample = await db.collection(name).findOne();
  const serialized = sample ? (serializeValue(sample) as Record<string, unknown>) : undefined;

  return {
    name,
    columns: serialized ? inferColumns(serialized) : [],
    sample: serialized
  };
}

function inferColumns(document: Record<string, unknown>): ColumnInfo[] {
  return Object.entries(document).map(([name, value]) => ({
    name,
    type: inferType(value)
  }));
}

function inferType(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}
