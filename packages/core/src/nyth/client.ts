import { ENV_FILE_NAME, TABNYTH_KEY_ENV_NAME, readTabnythApiBaseUrl, readTabnythLicenseKey } from "../config/configFile";
import type { NythAiChatInput, NythAiChatResponse, NythAiCreditBalanceResponse, NythAiStreamHandlers } from "./types";

// Fallback used only when neither an explicit option nor TABNYTH_API_URL (env
// or .env) provides a value. Lets the published package reach prod out of the box.
const DEFAULT_API_BASE_URL = "https://prod-api.tabnyth.cloud";

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
  const apiBaseUrl = await resolveApiBaseUrl(options);

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

// Streaming twin of askNythAi. The backend responds with SSE; `onDelta` fires
// for each text chunk and the promise resolves with the final response (same
// shape askNythAi returns). Falls back to throwing the API error message when
// the request is rejected before the stream starts (bad key, no credit, ...).
export async function askNythAiStream(
  input: NythAiChatInput,
  handlers: NythAiStreamHandlers = {},
  options: NythAiClientOptions = {}
): Promise<NythAiChatResponse> {
  const licenseKey = await resolveLicenseKey(input.licenseKey, options.projectRoot);
  const fetcher = options.fetchImpl ?? fetch;
  const apiBaseUrl = await resolveApiBaseUrl(options);

  const response = await fetcher(`${apiBaseUrl}/api/v1/nyth-ai/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ ...toBackendPayload(input, licenseKey), stream: true })
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok || !contentType.includes("text/event-stream")) {
    const payload = (await response.json().catch(() => ({}))) as ApiResponse<unknown>;
    throw new Error(readApiError(payload, response.status));
  }

  if (!response.body) {
    throw new Error("Nyth AI stream returned no body.");
  }

  let result: NythAiChatResponse | null = null;

  for await (const event of readSseEvents(response.body)) {
    if (event.event === "delta") {
      const delta = safeParse<{ text?: string }>(event.data);

      if (delta?.text) {
        handlers.onDelta?.(delta.text);
      }
    } else if (event.event === "done") {
      result = safeParse<NythAiChatResponse>(event.data);
    } else if (event.event === "error") {
      throw new Error(safeParse<{ error?: string }>(event.data)?.error ?? "Nyth AI stream failed.");
    }
  }

  if (!result) {
    throw new Error("Nyth AI stream ended unexpectedly.");
  }

  return result;
}

export async function getNythAiCreditBalance(options: NythAiClientOptions = {}): Promise<NythAiCreditBalanceResponse> {
  const licenseKey = await resolveLicenseKey(undefined, options.projectRoot);
  const fetcher = options.fetchImpl ?? fetch;
  const apiBaseUrl = await resolveApiBaseUrl(options);

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
    ...(input.temperature === undefined ? {} : { temperature: input.temperature }),
    ...(input.maxTokens === undefined ? {} : { maxTokens: input.maxTokens })
  };
}

async function resolveApiBaseUrl(options: NythAiClientOptions): Promise<string> {
  if (options.apiBaseUrl) {
    return normalizeBaseUrl(options.apiBaseUrl);
  }

  const fromEnv = await readTabnythApiBaseUrl(options.projectRoot);
  return normalizeBaseUrl(fromEnv || DEFAULT_API_BASE_URL);
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

// Minimal SSE parser over a fetch body: yields {event, data} per message.
async function* readSseEvents(body: NonNullable<Response["body"]>): AsyncGenerator<{ event: string; data: string }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");

    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");

      let event = "message";
      const dataLines: string[] = [];

      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("event:")) {
          event = line.slice("event:".length).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice("data:".length).replace(/^ /, ""));
        }
      }

      if (dataLines.length > 0) {
        yield { event, data: dataLines.join("\n") };
      }
    }
  }
}

function safeParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
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
