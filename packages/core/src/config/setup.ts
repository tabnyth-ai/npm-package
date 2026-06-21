import { spawn } from "node:child_process";
import { stdin as defaultStdin, stdout as defaultStdout } from "node:process";
import { createInterface } from "node:readline/promises";

import {
  CONFIG_FILE_NAME,
  hasLicenseKey,
  normalizeLicenseKey,
  readTabnythConfig,
  resolveConfigPath,
  resolveProjectRoot,
  writeTabnythConfig,
  type TabnythConfig
} from "./configFile";

export const DEFAULT_LICENSE_DOCS_URL = "https://tabnyth.com/docs/generate-license-key";

export type SetupStatus = "configured" | "existing" | "opened-docs" | "created-empty" | "skipped";

export interface SetupResult {
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
  openExternalUrl?(url: string): Promise<boolean>;
}

export async function setupTabnythConfig(options: SetupTabnythConfigOptions = {}): Promise<SetupResult> {
  const env = options.env ?? process.env;
  const projectRoot = options.projectRoot ?? resolveProjectRoot(env);
  const configPath = resolveConfigPath(projectRoot);
  const output = options.output ?? defaultStdout;
  const docsUrl = options.docsUrl ?? env.TABNYTH_LICENSE_DOCS_URL ?? DEFAULT_LICENSE_DOCS_URL;

  if (!options.forcePrompt && shouldSkipSetup(env)) {
    return { configPath, status: "skipped" };
  }

  const config = await readTabnythConfig(projectRoot);

  if (hasLicenseKey(config) && !options.forcePrompt) {
    output.write(`Tabnyth license is already configured in ${CONFIG_FILE_NAME}.\n`);
    return { configPath, status: "existing" };
  }

  if (!options.forcePrompt && !canPrompt(options.input ?? defaultStdin, output)) {
    await writeTabnythConfig(projectRoot, config);
    output.write(`Created ${CONFIG_FILE_NAME}. Add your licenseKey when you are ready.\n`);
    return { configPath, status: "created-empty" };
  }

  const licenseKey = await promptForLicenseKey(options.input ?? defaultStdin, output);

  if (licenseKey) {
    await writeTabnythConfig(projectRoot, { licenseKey });
    output.write(`Saved Tabnyth license in ${CONFIG_FILE_NAME}.\n`);
    return { configPath, status: "configured" };
  }

  await writeTabnythConfig(projectRoot, config);
  const opened = await (options.openExternalUrl ?? openExternalUrl)(docsUrl);
  output.write(`Open ${docsUrl} to generate a license key, then paste it into ${CONFIG_FILE_NAME}.\n`);

  if (!opened) {
    output.write("Your browser could not be opened automatically.\n");
  }

  return { configPath, status: "opened-docs" };
}

function shouldSkipSetup(env: NodeJS.ProcessEnv): boolean {
  return env.TABNYTH_SKIP_SETUP === "1" || env.CI === "true" || env.CI === "1";
}

function canPrompt(input: NodeJS.ReadStream, output: NodeJS.WriteStream): boolean {
  return Boolean(input.isTTY && output.isTTY);
}

async function promptForLicenseKey(input: NodeJS.ReadStream, output: NodeJS.WriteStream): Promise<string> {
  const rl = createInterface({ input, output });

  try {
    const answer = await rl.question(
      "Paste your Tabnyth license key, or press Enter to open /docs/generate-license-key: "
    );

    return normalizeLicenseKey(answer);
  } finally {
    rl.close();
  }
}

async function openExternalUrl(url: string): Promise<boolean> {
  const command = getOpenCommand(process.platform, url);

  if (!command) {
    return false;
  }

  try {
    const child = spawn(command.bin, command.args, {
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function getOpenCommand(platform: NodeJS.Platform, url: string): { bin: string; args: string[] } | null {
  if (platform === "darwin") {
    return { bin: "open", args: [url] };
  }

  if (platform === "win32") {
    return { bin: "cmd", args: ["/c", "start", "", url] };
  }

  return { bin: "xdg-open", args: [url] };
}
