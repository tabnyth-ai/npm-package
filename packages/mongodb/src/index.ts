import type { Db, MongoClient } from "mongodb";
import type {
  BrowseInput,
  CreateAdapterOptions,
  DatabaseAdapter,
  QueryInput,
  SearchInput,
  UpdateCellsInput
} from "tabnyth/adapters";

import { browseCollection } from "./browse";
import { createMongoConnection } from "./client";
import { describeCollection, listCollections } from "./introspection";
import { runMongoQuery } from "./query";
import { searchMongo } from "./search";
import { updateMongoCells } from "./updateCells";

export function createAdapter(options: CreateAdapterOptions): DatabaseAdapter {
  const connection = createMongoConnection(options);
  return new MongoDbAdapter(connection.client, connection.db);
}

class MongoDbAdapter implements DatabaseAdapter {
  readonly kind = "mongo" as const;

  constructor(
    private readonly client: MongoClient,
    private readonly db: Db
  ) {}

  async connect(): Promise<void> {
    await this.client.connect();
    await this.db.command({ ping: 1 });
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  listContainers() {
    return listCollections(this.db);
  }

  describeContainer(name: string) {
    return describeCollection(this.db, name);
  }

  browse(input: BrowseInput) {
    return browseCollection(this.db, input);
  }

  runQuery(input: QueryInput) {
    return runMongoQuery(this.db, input);
  }

  search(input: SearchInput) {
    return searchMongo(this.db, input);
  }

  updateCells(input: UpdateCellsInput) {
    return updateMongoCells(this.db, input);
  }
}
