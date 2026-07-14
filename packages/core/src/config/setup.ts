import { stdin as defaultStdin, stdout as defaultStdout } from "node:process";
import readline from "node:readline";

import {
  ENV_FILE_NAME,
  TABNYTH_KEY_ENV_NAME,
  ensureTabnythEnvEntry,
  readTabnythKeyFromEnvFile,
  resolveProjectRoot,
  resolveEnvPath,
  writeTabnythKeyToEnvFile
} from "./configFile";

export const DEFAULT_LICENSE_DOCS_URL = "https://tabnyth.cloud/docs/generate-license-key";

export type SetupStatus = "configured" | "saved" | "created-empty" | "skipped";

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
  input?: NodeJS.ReadStream;
  output?: NodeJS.WriteStream;
  projectRoot?: string;
}

export async function setupTabnythConfig(options: SetupTabnythConfigOptions = {}): Promise<SetupResult> {
  const env = options.env ?? process.env;
  const projectRoot = options.projectRoot ?? resolveProjectRoot(env);
  const envPath = resolveEnvPath(projectRoot);
  const input = options.input ?? defaultStdin;
  const output = options.output ?? defaultStdout;
  const docsUrl = options.docsUrl ?? env.TABNYTH_LICENSE_DOCS_URL ?? DEFAULT_LICENSE_DOCS_URL;

  if (!options.forcePrompt && shouldSkipSetup(env)) {
    return toResult(envPath, "skipped");
  }

  const existingKey = (env[TABNYTH_KEY_ENV_NAME]?.trim() || (await readTabnythKeyFromEnvFile(projectRoot))).trim();

  if (existingKey) {
    output.write(`Tabnyth license is already configured via ${TABNYTH_KEY_ENV_NAME}.\n`);
    return toResult(envPath, "configured");
  }

  if (canPrompt(input, output)) {
    const pastedKey = (await promptForLicenseKey(input, output)).trim();

    if (pastedKey) {
      await writeTabnythKeyToEnvFile(projectRoot, pastedKey);
      output.write(`Added ${TABNYTH_KEY_ENV_NAME} to ${ENV_FILE_NAME}.\n`);
      return toResult(envPath, "saved");
    }
  }

  // No key pasted (or non-interactive shell): leave a placeholder and instructions.
  await ensureTabnythEnvEntry(projectRoot);
  output.write(`Added ${TABNYTH_KEY_ENV_NAME} to ${ENV_FILE_NAME}.\n`);
  output.write(`Paste your Tabnyth license key there, or generate one at ${docsUrl}.\n`);
  return toResult(envPath, "created-empty");
}

async function promptForLicenseKey(input: NodeJS.ReadStream, output: NodeJS.WriteStream): Promise<string> {
  const rl = readline.createInterface({ input, output });

  try {
    return await new Promise<string>((resolve) => {
      rl.question("Paste your Tabnyth license key here: ", (answer) => resolve(answer));
    });
  } finally {
    rl.close();
  }
}

function canPrompt(input: NodeJS.ReadStream, output: NodeJS.WriteStream): boolean {
  return Boolean(input.isTTY && output.isTTY);
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
