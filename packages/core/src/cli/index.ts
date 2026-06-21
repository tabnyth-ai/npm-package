#!/usr/bin/env node
import { fileURLToPath } from "node:url";

import { loadAdapter } from "../adapters/loadAdapter";
import { createServer } from "../server/createServer";
import { startServer } from "../server/startServer";
import { setupTabnythConfig } from "../config/setup";
import { detectAdapterName } from "./detectAdapter";
import { HelpRequested, parseCliOptions } from "./options";

async function main(): Promise<void> {
  if (isSetupCommand(process.argv[2])) {
    await setupTabnythConfig({
      forcePrompt: true,
      projectRoot: process.cwd()
    });
    return;
  }

  const options = parseCliOptions();
  const adapterName = detectAdapterName(options.databaseUrl, options.adapter);
  const adapter = await loadAdapter(adapterName, {
    connectionString: options.databaseUrl,
    allowWrite: options.allowWrite,
    defaultLimit: options.defaultLimit,
    maxLimit: options.maxLimit,
    timeoutMs: options.timeoutMs
  });

  await adapter.connect();

  const app = createServer({
    adapter,
    config: {
      adapterName,
      allowWrite: options.allowWrite,
      defaultLimit: options.defaultLimit,
      maxLimit: options.maxLimit,
      timeoutMs: options.timeoutMs
    },
    projectRoot: process.cwd(),
    staticDir: fileURLToPath(new URL("../ui", import.meta.url))
  });

  const server = await startServer(app, {
    host: options.host,
    port: options.port
  });

  console.log(`Tabnyth Studio is running at http://${options.host}:${options.port}`);
  console.log(`Adapter: ${adapterName}${options.allowWrite ? " (write mode enabled)" : " (read-only)"}`);

  const shutdown = async (): Promise<void> => {
    await server.close();
    await adapter.disconnect();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

function isSetupCommand(value: string | undefined): boolean {
  return value === "setup" || value === "config";
}

main().catch((error: unknown) => {
  if (error instanceof HelpRequested) {
    process.exit(0);
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
