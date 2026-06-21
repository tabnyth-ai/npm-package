import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const CONFIG_FILE_NAME = "tabnyth.config.json";

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

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
