import { ENV_FILE_NAME, TABNYTH_KEY_ENV_NAME, readTabnythLicenseKey } from "../config/configFile";
import type { NythAiChatInput, NythAiChatResponse, NythAiCreditBalanceResponse } from "./types";

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

export async function getNythAiCreditBalance(options: NythAiClientOptions = {}): Promise<NythAiCreditBalanceResponse> {
  const licenseKey = await resolveLicenseKey(undefined, options.projectRoot);
  const fetcher = options.fetchImpl ?? fetch;
  const apiBaseUrl = normalizeBaseUrl(options.apiBaseUrl ?? process.env.TABNYTH_API_URL ?? DEFAULT_API_BASE_URL);

  const response = await fetcher(`${apiBaseUrl}/api/v1/nyth-ai/credits`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ licenseKey })
  });

  const payload = (await response.json()) as ApiResponse<NythAiCreditBalanceResponse>;

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

  const configValue = await readTabnythLicenseKey(projectRoot);

  if (!configValue) {
    throw new Error(
      `Tabnyth license key is missing. Run \`tabnyth setup\`, then paste your key into ${TABNYTH_KEY_ENV_NAME} in ${ENV_FILE_NAME}.`
    );
  }

  return configValue;
}

function toBackendPayload(input: NythAiChatInput, licenseKey: string): Record<string, unknown> {
  return {
    licenseKey,
    prompt: input.prompt,
    ...(input.schema ? { schema: input.schema } : {}),
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
