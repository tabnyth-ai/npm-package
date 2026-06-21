import { Db, MongoClient } from "mongodb";

import type { CreateAdapterOptions } from "tabnyth/adapters";

export interface MongoConnection {
  client: MongoClient;
  db: Db;
}

export function createMongoConnection(options: CreateAdapterOptions): MongoConnection {
  const databaseName = readDatabaseName(options.connectionString);
  const client = new MongoClient(options.connectionString, {
    serverSelectionTimeoutMS: Math.min(options.timeoutMs, 10000)
  });

  return {
    client,
    db: client.db(databaseName)
  };
}

function readDatabaseName(connectionString: string): string {
  const parsed = new URL(connectionString);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));

  if (!databaseName) {
    throw new Error("MongoDB URL must include a database name.");
  }

  return databaseName;
}
