import { stdin as defaultInput, stdout as defaultOutput } from "node:process";
import readline from "node:readline";

export type StartupMode = "view" | "edit";

interface ModeChoice {
  value: StartupMode;
  label: string;
  description: string;
}

interface KeypressKey {
  ctrl?: boolean;
  name?: string;
}

type KeypressListener = (chunk: string, key: KeypressKey) => void;

export interface PromptInput extends NodeJS.ReadStream {
  isRaw: boolean;
  setRawMode: (mode: boolean) => this;
}

export interface PromptOutput extends NodeJS.WriteStream {
  isTTY: boolean;
}

export interface ResolveStartupModeOptions {
  input?: PromptInput;
  mode?: StartupMode;
  output?: PromptOutput;
  prompt: boolean;
}

export interface StartupSummary {
  databaseUrl: string;
  licenseKey?: string;
  mode: StartupMode;
  output?: { write(chunk: string): unknown };
}

const ANSI_RESET = "\x1B[0m";
const ANSI_GREEN = "\x1B[32m";
const ANSI_YELLOW = "\x1B[33m";

function paint(code: string, text: string): string {
  return process.env.NO_COLOR ? text : `${code}${text}${ANSI_RESET}`;
}

const green = (text: string): string => paint(ANSI_GREEN, text);
const yellow = (text: string): string => paint(ANSI_YELLOW, text);

const modeChoices: ModeChoice[] = [
  {
    value: "view",
    label: "View mode only",
    description: "this will allow you to see data in your database"
  },
  {
    value: "edit",
    label: "Edit mode",
    description: "this will allow you to make edits"
  }
];

export async function resolveStartupMode({
  input = defaultInput,
  mode,
  output = defaultOutput,
  prompt
}: ResolveStartupModeOptions): Promise<StartupMode> {
  if (mode) {
    return mode;
  }

  if (!prompt || !isInteractive(input, output)) {
    return "view";
  }

  return promptForStartupMode(input, output);
}

export function writeStartupSummary({ databaseUrl, licenseKey, mode, output = defaultOutput }: StartupSummary): void {
  output.write(`Mode: ${formatStartupMode(mode)}\n`);
  output.write(`Database URL being used: ${formatDatabaseUrl(databaseUrl)}\n`);

  if (licenseKey?.trim()) {
    output.write(`${green(`Using license key: ${maskLicenseKey(licenseKey)}`)}\n`);
    return;
  }

  output.write(`${yellow("To access full potential of Tabnyth, enter your license key.")}\n`);
}

export function formatStartupMode(mode: StartupMode): string {
  return mode === "edit" ? "Edit mode" : "View mode only";
}

export function formatDatabaseUrl(value: string): string {
  try {
    const url = new URL(value);

    if (url.password) {
      url.password = "***";
    }

    return url.toString();
  } catch {
    return value;
  }
}

export function maskLicenseKey(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length <= 8) {
    return "***";
  }

  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

async function promptForStartupMode(input: PromptInput, output: PromptOutput): Promise<StartupMode> {
  readline.emitKeypressEvents(input);

  const wasRaw = input.isRaw === true;
  let selectedIndex = 0;
  let rendered = false;

  input.setRawMode?.(true);
  input.resume();
  output.write("\x1B[?25l");

  return await new Promise<StartupMode>((resolve, reject) => {
    const render = (): void => {
      if (rendered) {
        output.write(`\x1B[${modeChoices.length + 2}A\x1B[0J`);
      }

      output.write("Select Tabnyth startup mode:\n");

      for (const [index, choice] of modeChoices.entries()) {
        const isSelected = index === selectedIndex;
        const marker = isSelected ? ">" : " ";
        const line = `${marker} ${choice.label} - ${choice.description}`;
        output.write(`${isSelected ? green(line) : line}\n`);
      }

      output.write("Use arrow keys, then press Enter.\n");
      rendered = true;
    };

    const cleanup = (): void => {
      input.off("keypress", onKeypress);
      input.setRawMode?.(wasRaw);
      output.write("\x1B[?25h");
    };

    const onKeypress: KeypressListener = (_chunk, key) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        output.write("\n");
        reject(new Error("Startup cancelled."));
        return;
      }

      if (key.name === "up" || key.name === "left") {
        selectedIndex = selectedIndex === 0 ? modeChoices.length - 1 : selectedIndex - 1;
        render();
        return;
      }

      if (key.name === "down" || key.name === "right") {
        selectedIndex = (selectedIndex + 1) % modeChoices.length;
        render();
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        const selected = modeChoices[selectedIndex]?.value ?? "view";
        cleanup();
        output.write("\n");
        resolve(selected);
      }
    };

    input.on("keypress", onKeypress);
    render();
  });
}

function isInteractive(input: PromptInput, output: PromptOutput): boolean {
  return Boolean(input.isTTY && output.isTTY && typeof input.setRawMode === "function");
}
