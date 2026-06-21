import type {
  BrowseInput,
  ContainersResponse,
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
