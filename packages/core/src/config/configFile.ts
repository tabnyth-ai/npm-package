import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const CONFIG_FILE_NAME = "tabnyth.config.json";
export const ENV_FILE_NAME = ".env";
export const TABNYTH_KEY_ENV_NAME = "TABNYTH_KEY";
export const TABNYTH_API_URL_ENV_NAME = "TABNYTH_API_URL";
export const TABNYTH_KEY_COMMENT =
  "# Paste your Tabnyth license key here or get it generated from https://tabnyth.cloud/docs/generate-license-key";

export interface TabnythConfig {
  licenseKey: string;
}

export function createDefaultConfig(): TabnythConfig {
  return {
    licenseKey: ""
  };
}

export function resolveProjectRoot(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): string {
  const initCwd = env.INIT_CWD?.trim();
  return initCwd ? initCwd : cwd;
}

export function resolveConfigPath(projectRoot = process.cwd()): string {
  return resolve(projectRoot, CONFIG_FILE_NAME);
}

export function resolveEnvPath(projectRoot = process.cwd()): string {
  return resolve(projectRoot, ENV_FILE_NAME);
}

export async function ensureTabnythEnvEntry(projectRoot = process.cwd()): Promise<string> {
  const envPath = resolveEnvPath(projectRoot);
  const raw = await readTextFileIfExists(envPath);

  if (hasTabnythEnvEntry(raw)) {
    return envPath;
  }

  await mkdir(dirname(envPath), { recursive: true });
  const prefix = raw && !raw.endsWith("\n") ? "\n" : "";
  const spacer = raw && raw.trim() ? "\n" : "";
  await appendFile(envPath, `${prefix}${spacer}${TABNYTH_KEY_COMMENT}\n${TABNYTH_KEY_ENV_NAME}=\n`, "utf8");
  return envPath;
}

export async function hasTabnythEnvEntryInFile(projectRoot = process.cwd()): Promise<boolean> {
  return hasTabnythEnvEntry(await readTextFileIfExists(resolveEnvPath(projectRoot)));
}

/**
 * Write a license key value into the project `.env`. Updates the existing
 * `TABNYTH_KEY=` line in place when present, otherwise appends a fresh entry.
 */
export async function writeTabnythKeyToEnvFile(projectRoot = process.cwd(), key: string): Promise<string> {
  const envPath = resolveEnvPath(projectRoot);
  const raw = await readTextFileIfExists(envPath);
  const value = normalizeLicenseKey(key);

  await mkdir(dirname(envPath), { recursive: true });

  if (hasTabnythEnvEntry(raw)) {
    const updated = raw.replace(
      new RegExp(`^(\\s*${TABNYTH_KEY_ENV_NAME}\\s*=).*$`, "m"),
      `$1${value}`
    );
    await writeFile(envPath, updated, "utf8");
    return envPath;
  }

  const prefix = raw && !raw.endsWith("\n") ? "\n" : "";
  const spacer = raw && raw.trim() ? "\n" : "";
  await appendFile(envPath, `${prefix}${spacer}${TABNYTH_KEY_COMMENT}\n${TABNYTH_KEY_ENV_NAME}=${value}\n`, "utf8");
  return envPath;
}

export async function readTabnythKeyFromEnvFile(projectRoot = process.cwd()): Promise<string> {
  const raw = await readTextFileIfExists(resolveEnvPath(projectRoot));
  return normalizeLicenseKey(readEnvValue(raw, TABNYTH_KEY_ENV_NAME));
}

export async function readTabnythLicenseKey(
  projectRoot = process.cwd(),
  env: NodeJS.ProcessEnv = process.env
): Promise<string> {
  const envValue = normalizeLicenseKey(env[TABNYTH_KEY_ENV_NAME]);

  if (envValue) {
    return envValue;
  }

  const fileValue = await readTabnythKeyFromEnvFile(projectRoot);

  if (fileValue) {
    return fileValue;
  }

  // Backward-compatible fallback for users who already have the old config.
  const legacyConfig = await readTabnythConfig(projectRoot);
  return normalizeLicenseKey(legacyConfig.licenseKey);
}

export async function readTabnythApiBaseUrl(
  projectRoot = process.cwd(),
  env: NodeJS.ProcessEnv = process.env
): Promise<string> {
  const envValue = normalizeLicenseKey(env[TABNYTH_API_URL_ENV_NAME]);

  if (envValue) {
    return envValue;
  }

  const raw = await readTextFileIfExists(resolveEnvPath(projectRoot));
  return normalizeLicenseKey(readEnvValue(raw, TABNYTH_API_URL_ENV_NAME));
}

export async function readTabnythConfig(projectRoot = process.cwd()): Promise<TabnythConfig> {
  const configPath = resolveConfigPath(projectRoot);

  try {
    const raw = await readFile(configPath, "utf8");
    return normalizeConfig(JSON.parse(raw) as unknown);
  } catch (error) {
    if (isMissingFileError(error)) {
      return createDefaultConfig();
    }

    if (error instanceof SyntaxError) {
      throw new Error(`${CONFIG_FILE_NAME} contains invalid JSON.`);
    }

    throw error;
  }
}

export async function writeTabnythConfig(projectRoot: string, config: TabnythConfig): Promise<string> {
  const configPath = resolveConfigPath(projectRoot);
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(normalizeConfig(config), null, 2)}\n`, "utf8");
  return configPath;
}

export function hasLicenseKey(config: TabnythConfig): boolean {
  return config.licenseKey.trim().length > 0;
}

export function normalizeLicenseKey(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeConfig(value: unknown): TabnythConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createDefaultConfig();
  }

  const config = value as Partial<TabnythConfig>;
  return {
    licenseKey: normalizeLicenseKey(config.licenseKey)
  };
}

async function readTextFileIfExists(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return "";
    }

    throw error;
  }
}

function hasTabnythEnvEntry(raw: string): boolean {
  return raw.split(/\r?\n/).some((line) => new RegExp(`^\\s*${TABNYTH_KEY_ENV_NAME}\\s*=`).test(line));
}

function readEnvValue(raw: string, name: string): string {
  const line = raw.split(/\r?\n/).find((entry) => new RegExp(`^\\s*${name}\\s*=`).test(entry));

  if (!line) {
    return "";
  }

  const [, value = ""] = line.split(/=(.*)/s);
  return unquoteEnvValue(value.trim().replace(/\s+#.*$/, ""));
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

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
