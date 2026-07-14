import { Hono } from "hono";

import { loadAdapter } from "../adapters/loadAdapter";
import type { DatabaseAdapter } from "../adapters/types";
import { detectAdapterName } from "../cli/detectAdapter";
import { createRoutes, type ApiConfig, type ApiRuntime } from "./createRoutes";
import { jsonError } from "./response";
import { serveStaticUi } from "./static";

export interface CreateServerOptions {
  adapter: DatabaseAdapter;
  config: ApiConfig;
  projectRoot?: string;
  staticDir?: string;
}

export function createServer(options: CreateServerOptions): Hono {
  const app = new Hono();
  const runtime: ApiRuntime = {
    adapter: options.adapter,
    config: options.config
  };

  app.onError((error, c) => jsonError(c, error));
  app.route(
    "/api",
    createRoutes({
      runtime,
      projectRoot: options.projectRoot,
      connectDatabase: async ({ databaseUrl, mode }) => {
        const adapterName = detectAdapterName(databaseUrl);
        const allowWrite = mode === undefined ? runtime.config.allowWrite : mode === "edit";
        const nextAdapter = await loadAdapter(adapterName, {
          connectionString: databaseUrl,
          allowWrite,
          defaultLimit: runtime.config.defaultLimit,
          maxLimit: runtime.config.maxLimit,
          timeoutMs: runtime.config.timeoutMs
        });

        await nextAdapter.connect();

        const previousAdapter = runtime.adapter;
        runtime.adapter = nextAdapter;
        runtime.config = {
          ...runtime.config,
          adapterName,
          allowWrite
        };

        await previousAdapter.disconnect().catch(() => undefined);
      }
    })
  );
  serveStaticUi(app, options.staticDir);

  return app;
}
