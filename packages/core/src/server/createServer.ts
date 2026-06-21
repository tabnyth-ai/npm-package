import { Hono } from "hono";

import type { DatabaseAdapter } from "../adapters/types";
import { createRoutes, type ApiConfig } from "./createRoutes";
import { jsonError } from "./response";
import { serveStaticUi } from "./static";

export interface CreateServerOptions {
  adapter: DatabaseAdapter;
  config: ApiConfig;
  staticDir?: string;
}

export function createServer(options: CreateServerOptions): Hono {
  const app = new Hono();

  app.onError((error, c) => jsonError(c, error));
  app.route("/api", createRoutes(options));
  serveStaticUi(app, options.staticDir);

  return app;
}
