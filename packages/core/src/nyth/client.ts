import { readTabnythConfig } from "../config/configFile";
import type { NythAiChatInput, NythAiChatResponse } from "./types";

const DEFAULT_API_BASE_URL = "http://localhost:8080";

export interface NythAiClientOptions {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  projectRoot?: string;
}

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  errorCode?: string;
  data?: T;
}

export async function askNythAi(input: NythAiChatInput, options: NythAiClientOptions = {}): Promise<NythAiChatResponse> {
  const licenseKey = await resolveLicenseKey(input.licenseKey, options.projectRoot);
  const fetcher = options.fetchImpl ?? fetch;
  const apiBaseUrl = normalizeBaseUrl(options.apiBaseUrl ?? process.env.TABNYTH_API_URL ?? DEFAULT_API_BASE_URL);

  const response = await fetcher(`${apiBaseUrl}/api/v1/nyth-ai/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(toBackendPayload(input, licenseKey))
  });

  const payload = (await response.json()) as ApiResponse<NythAiChatResponse>;

  if (!response.ok || !payload.data) {
    throw new Error(readApiError(payload, response.status));
  }

  return payload.data;
}

async function resolveLicenseKey(value: string | undefined, projectRoot: string | undefined): Promise<string> {
  const directValue = value?.trim();

  if (directValue) {
    return directValue;
  }

  const config = await readTabnythConfig(projectRoot);
  const configValue = config.licenseKey.trim();

  if (!configValue) {
    throw new Error("Tabnyth license key is missing. Run `tabnyth setup` or update tabnyth.config.json.");
  }

  return configValue;
}

function toBackendPayload(input: NythAiChatInput, licenseKey: string): Record<string, unknown> {
  return {
    licenseKey,
    prompt: input.prompt,
    ...(input.system ? { system: input.system } : {}),
    ...(input.model ? { model: input.model } : {}),
    ...(input.thinking === undefined ? {} : { thinking: input.thinking }),
    ...(input.effort ? { effort: input.effort } : {}),
    ...(input.temperature === undefined ? {} : { temperature: input.temperature }),
    ...(input.maxTokens === undefined ? {} : { maxTokens: input.maxTokens })
  };
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function readApiError(payload: ApiResponse<unknown>, status: number): string {
  if (payload.message) {
    return payload.message;
  }

  if (payload.errorCode) {
    return payload.errorCode;
  }

  return `Nyth AI request failed with status ${status}.`;
}
