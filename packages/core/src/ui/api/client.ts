import type {
  BrowseInput,
  ConnectDatabaseInput,
  ConnectDatabaseResponse,
  ContainersResponse,
  InsertRowsInput,
  NythAiChatRequest,
  NythAiCreditsResponse,
  NythAiResultResponse,
  QueryInput,
  ResultResponse,
  SearchResponse,
  StructureResponse,
  StudioMeta,
  UpdateCellsInput
} from "./types";

export async function getMeta(): Promise<StudioMeta> {
  return request<StudioMeta>("/api/meta");
}

export async function getContainers(): Promise<ContainersResponse> {
  return request<ContainersResponse>("/api/containers");
}

export async function connectDatabase(input: ConnectDatabaseInput): Promise<ConnectDatabaseResponse> {
  return request<ConnectDatabaseResponse>("/api/connect", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function getContainerStructure(name: string): Promise<StructureResponse> {
  return request<StructureResponse>(`/api/containers/${encodeURIComponent(name)}/structure`);
}

export async function searchResources(query: string): Promise<SearchResponse> {
  return request<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}&limit=24`);
}

export async function browse(input: BrowseInput): Promise<ResultResponse> {
  return request<ResultResponse>("/api/browse", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function runQuery(input: QueryInput): Promise<ResultResponse> {
  return request<ResultResponse>("/api/query", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateCells(input: UpdateCellsInput): Promise<ResultResponse> {
  return request<ResultResponse>("/api/cells", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function insertRows(input: InsertRowsInput): Promise<ResultResponse> {
  return request<ResultResponse>("/api/rows", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function askNythAi(input: NythAiChatRequest): Promise<NythAiResultResponse> {
  return request<NythAiResultResponse>("/api/nyth-ai/chat", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

// Streaming variant: `onDelta` fires per raw text chunk as the model generates,
// and the promise resolves with the same payload askNythAi returns (from the
// stream's terminal `done` event).
export async function askNythAiStream(input: NythAiChatRequest, onDelta: (text: string) => void): Promise<NythAiResultResponse> {
  const response = await fetch("/api/nyth-ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...input, stream: true })
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok || !contentType.includes("text/event-stream") || !response.body) {
    const payload = await response.json().catch(() => null);
    throw new Error(readErrorMessage(payload));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: NythAiResultResponse | null = null;

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

      if (dataLines.length === 0) {
        continue;
      }

      const data = dataLines.join("\n");

      if (event === "delta") {
        const delta = safeParseJson<{ text?: string }>(data);

        if (delta?.text) {
          onDelta(delta.text);
        }
      } else if (event === "done") {
        result = safeParseJson<NythAiResultResponse>(data);
      } else if (event === "error") {
        throw new Error(safeParseJson<{ error?: string }>(data)?.error ?? "Nyth AI request failed.");
      }
    }
  }

  if (!result) {
    throw new Error("Nyth AI stream ended unexpectedly.");
  }

  return result;
}

function safeParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function getNythAiCredits(): Promise<NythAiCreditsResponse> {
  return request<NythAiCreditsResponse>("/api/nyth-ai/credits");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers
    }
  });

  const payload = (await response.json()) as T | { error?: string };

  if (!response.ok) {
    throw new Error(readErrorMessage(payload));
  }

  return payload as T;
}

function readErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return "Request failed.";
}
