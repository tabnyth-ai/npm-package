import { Pool } from "pg";

import type { CreateAdapterOptions } from "tabnyth-studio/adapters";

export function createPostgresPool(options: CreateAdapterOptions): Pool {
  return new Pool({
    connectionString: options.connectionString,
    statement_timeout: options.timeoutMs,
    query_timeout: options.timeoutMs
  });
}
