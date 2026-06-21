import cac from "cac";

import type { AdapterName } from "../adapters/types";

export interface CliOptions {
  databaseUrl: string;
  envName: string;
  adapter?: AdapterName;
  host: string;
  port: number;
  defaultLimit: number;
  maxLimit: number;
  timeoutMs: number;
  allowWrite: boolean;
}

export class HelpRequested extends Error {
  constructor() {
    super("Help requested.");
  }
}

interface RawCliOptions {
  url?: string;
  env?: string;
  adapter?: AdapterName;
  host?: string;
  port?: number | string;
  limit?: number | string;
  maxLimit?: number | string;
  timeoutMs?: number | string;
  allowWrite?: boolean;
  help?: boolean;
}

export function parseCliOptions(argv = process.argv, env = process.env): CliOptions {
  const cli = cac("tabnyth");

  cli
    .option("--url <url>", "Database URL")
    .option("--env <name>", "Environment variable name", { default: "DATABASE_URL" })
    .option("--adapter <name>", "Adapter override: postgres or mongodb")
    .option("--host <host>", "Host to bind", { default: "127.0.0.1" })
    .option("--port <port>", "Port to listen on", { default: 5555 })
    .option("--limit <number>", "Default row/document limit", { default: 100 })
    .option("--max-limit <number>", "Maximum row/document limit", { default: 1000 })
    .option("--timeout-ms <number>", "Query timeout in milliseconds", { default: 10000 })
    .option("--allow-write", "Allow write and destructive queries");

  cli.help();

  const parsed = cli.parse(argv, { run: false });
  const raw = parsed.options as RawCliOptions;

  if (raw.help) {
    throw new HelpRequested();
  }

  const envName = raw.env ?? "DATABASE_URL";
  const databaseUrl = raw.url ?? env[envName];

  if (!databaseUrl) {
    throw new Error(`Database URL not provided. Pass --url or set ${envName}.`);
  }

  const maxLimit = readNumber(raw.maxLimit, 1000, "max-limit", 1);
  const defaultLimit = Math.min(readNumber(raw.limit, 100, "limit", 1), maxLimit);

  return {
    databaseUrl,
    envName,
    adapter: raw.adapter,
    host: raw.host ?? "127.0.0.1",
    port: readNumber(raw.port, 5555, "port", 1),
    defaultLimit,
    maxLimit,
    timeoutMs: readNumber(raw.timeoutMs, 10000, "timeout-ms", 1),
    allowWrite: raw.allowWrite === true
  };
}

function readNumber(value: number | string | undefined, fallback: number, label: string, min: number): number {
  const numberValue = value === undefined ? fallback : Number(value);

  if (!Number.isFinite(numberValue) || numberValue < min) {
    throw new Error(`Invalid --${label} value.`);
  }

  return Math.floor(numberValue);
}
