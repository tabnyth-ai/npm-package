import { stdout as defaultStdout } from "node:process";

import {
  ENV_FILE_NAME,
  TABNYTH_KEY_ENV_NAME,
  ensureTabnythEnvEntry,
  hasTabnythEnvEntryInFile,
  readTabnythKeyFromEnvFile,
  resolveProjectRoot,
  resolveEnvPath
} from "./configFile";

export const DEFAULT_LICENSE_DOCS_URL = "https://tabnyth.cloud/docs/generate-license-key";

export type SetupStatus = "configured" | "existing" | "created-empty" | "skipped";

export interface SetupResult {
  envPath: string;
  /** @deprecated Use envPath. Kept for callers compiled against the old setup result. */
  configPath: string;
  status: SetupStatus;
}

export interface SetupTabnythConfigOptions {
  docsUrl?: string;
  env?: NodeJS.ProcessEnv;
  forcePrompt?: boolean;
  output?: NodeJS.WriteStream;
  projectRoot?: string;
}

export async function setupTabnythConfig(options: SetupTabnythConfigOptions = {}): Promise<SetupResult> {
  const env = options.env ?? process.env;
  const projectRoot = options.projectRoot ?? resolveProjectRoot(env);
  const envPath = resolveEnvPath(projectRoot);
  const output = options.output ?? defaultStdout;
  const docsUrl = options.docsUrl ?? env.TABNYTH_LICENSE_DOCS_URL ?? DEFAULT_LICENSE_DOCS_URL;

  if (!options.forcePrompt && shouldSkipSetup(env)) {
    return toResult(envPath, "skipped");
  }

  const alreadyHadEntry = await hasTabnythEnvEntryInFile(projectRoot);
  await ensureTabnythEnvEntry(projectRoot);

  const licenseKey = (env[TABNYTH_KEY_ENV_NAME]?.trim() || (await readTabnythKeyFromEnvFile(projectRoot))).trim();

  if (licenseKey) {
    output.write(`Tabnyth license is configured via ${TABNYTH_KEY_ENV_NAME}.\n`);
    return toResult(envPath, "configured");
  }

  if (alreadyHadEntry) {
    output.write(`${TABNYTH_KEY_ENV_NAME} is already present in ${ENV_FILE_NAME}. Paste your license key when you are ready.\n`);
    return toResult(envPath, "existing");
  }

  output.write(`Added ${TABNYTH_KEY_ENV_NAME} to ${ENV_FILE_NAME}.\n`);
  output.write(`Paste your Tabnyth license key there, or generate one at ${docsUrl}.\n`);
  return toResult(envPath, "created-empty");
}

function shouldSkipSetup(env: NodeJS.ProcessEnv): boolean {
  return env.TABNYTH_SKIP_SETUP === "1" || env.CI === "true" || env.CI === "1";
}

function toResult(envPath: string, status: SetupStatus): SetupResult {
  return {
    envPath,
    configPath: envPath,
    status
  };
}
