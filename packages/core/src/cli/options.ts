import cac from "cac";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { AdapterName } from "../adapters/types";
import type { StartupMode } from "./startup";

export interface CliOptions {
  databaseUrl: string;
  envName: string;
  envFile?: string;
  mode?: StartupMode;
  promptForMode: boolean;
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
  envFile?: string;
  mode?: string;
  adapter?: AdapterName;
  host?: string;
  port?: number | string;
  limit?: number | string;
  maxLimit?: number | string;
  timeoutMs?: number | string;
  allowWrite?: boolean;
  help?: boolean;
}

export function parseCliOptions(argv = process.argv, env = process.env, cwd = process.cwd()): CliOptions {
  const cli = cac("tabnyth");

  cli
    .usage("[env-file] [env-name] [options]")
    .option("--url <url>", "Database URL")
    .option("--env <name>", "Environment variable name", { default: "DATABASE_URL" })
    .option("--env-file <path>", "Load the database URL from an env file")
    .option("--mode <mode>", "Startup mode: view or edit")
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
  const positional = parsed.args.map(String);

  if (raw.help) {
    throw new HelpRequested();
  }

  const envFile = raw.envFile ?? positional[0];
  const envName = raw.env ?? positional[1] ?? "DATABASE_URL";
  const fileEnv = envFile ? readEnvFile(envFile, cwd) : {};
  applyEnvFileValues(env, fileEnv);
  const databaseUrl = raw.url ?? env[envName];

  if (!databaseUrl) {
    throw new Error(formatMissingDatabaseUrlMessage(envName, envFile));
  }

  const mode = readStartupMode(raw.mode) ?? (raw.allowWrite === true ? "edit" : undefined);
  const maxLimit = readNumber(raw.maxLimit, 1000, "max-limit", 1);
  const defaultLimit = Math.min(readNumber(raw.limit, 100, "limit", 1), maxLimit);

  return {
    databaseUrl,
    envName,
    envFile,
    mode,
    promptForMode: mode === undefined,
    adapter: raw.adapter,
    host: raw.host ?? "127.0.0.1",
    port: readNumber(raw.port, 5555, "port", 1),
    defaultLimit,
    maxLimit,
    timeoutMs: readNumber(raw.timeoutMs, 10000, "timeout-ms", 1),
    allowWrite: mode === "edit"
  };
}

function readNumber(value: number | string | undefined, fallback: number, label: string, min: number): number {
  const numberValue = value === undefined ? fallback : Number(value);

  if (!Number.isFinite(numberValue) || numberValue < min) {
    throw new Error(`Invalid --${label} value.`);
  }

  return Math.floor(numberValue);
}

function readStartupMode(value: string | undefined): StartupMode | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.toLowerCase();

  if (normalized === "view" || normalized === "read" || normalized === "readonly" || normalized === "read-only") {
    return "view";
  }

  if (normalized === "edit" || normalized === "write") {
    return "edit";
  }

  throw new Error("Invalid --mode value. Use view or edit.");
}

function readEnvFile(path: string, cwd: string): Record<string, string> {
  let raw: string;

  try {
    raw = readFileSync(resolve(cwd, path), "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new Error(`Env file not found: ${path}`);
    }

    throw error;
  }

  return parseEnvFile(raw);
}

function parseEnvFile(raw: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);

    if (!match) {
      continue;
    }

    const [, key, value = ""] = match;
    values[key] = unquoteEnvValue(value.trim().replace(/\s+#.*$/, ""));
  }

  return values;
}

function applyEnvFileValues(env: NodeJS.ProcessEnv, values: Record<string, string>): void {
  for (const [key, value] of Object.entries(values)) {
    env[key] ??= value;
  }
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function formatMissingDatabaseUrlMessage(envName: string, envFile?: string): string {
  const envFileHint = envFile ? ` or add ${envName} to ${envFile}` : "";
  return `Database URL not provided. Pass --url, set ${envName}${envFileHint}.`;
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
