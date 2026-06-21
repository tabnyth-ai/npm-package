import { serve } from "@hono/node-server";
import type { Hono } from "hono";

export interface StartServerOptions {
  host: string;
  port: number;
}

export interface RunningServer {
  close(): Promise<void>;
}

export function startServer(app: Hono, options: StartServerOptions): Promise<RunningServer> {
  return new Promise((resolve, reject) => {
    const server = serve(
      {
        fetch: app.fetch,
        hostname: options.host,
        port: options.port
      },
      () => {
        resolve({
          close: () =>
            new Promise<void>((closeResolve, closeReject) => {
              server.close((error) => {
                if (error) {
                  closeReject(error);
                  return;
                }

                closeResolve();
              });
            })
        });
      }
    );

    server.once("error", reject);
  });
}
