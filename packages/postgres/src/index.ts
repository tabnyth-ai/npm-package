import type { Pool } from "pg";
import type {
  BrowseInput,
  CreateAdapterOptions,
  DatabaseAdapter,
  QueryInput,
  SearchInput,
  UpdateCellsInput
} from "tabnyth-studio/adapters";

import { browseTable } from "./browse";
import { createPostgresPool } from "./client";
import { describeTable, listTables } from "./introspection";
import { runSqlQuery } from "./query";
import { searchPostgres } from "./search";
import { updateTableCells } from "./updateCells";

export function createAdapter(options: CreateAdapterOptions): DatabaseAdapter {
  return new PostgresAdapter(createPostgresPool(options));
}

class PostgresAdapter implements DatabaseAdapter {
  readonly kind = "sql" as const;

  constructor(private readonly pool: Pool) {}

  async connect(): Promise<void> {
    const client = await this.pool.connect();
    client.release();
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  listContainers() {
    return listTables(this.pool);
  }

  describeContainer(name: string) {
    return describeTable(this.pool, name);
  }

  browse(input: BrowseInput) {
    return browseTable(this.pool, input);
  }

  runQuery(input: QueryInput) {
    return runSqlQuery(this.pool, input);
  }

  search(input: SearchInput) {
    return searchPostgres(this.pool, input);
  }

  updateCells(input: UpdateCellsInput) {
    return updateTableCells(this.pool, input);
  }
}
