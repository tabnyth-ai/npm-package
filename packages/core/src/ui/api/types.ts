import type {
  BrowseInput,
  CellUpdate,
  ContainerInfo,
  ContainerStructure,
  QueryInput,
  QueryResult,
  SearchResult,
  UpdateCellsInput
} from "../../adapters/types";

export interface StudioMeta {
  adapter: string;
  kind: "sql" | "mongo";
  allowWrite: boolean;
  defaultLimit: number;
  maxLimit: number;
  timeoutMs: number;
}

export interface ContainersResponse {
  containers: ContainerInfo[];
}

export interface ResultResponse {
  result: QueryResult;
}

export interface StructureResponse {
  structure: ContainerStructure;
}

export interface SearchResponse {
  results: SearchResult[];
}

export type {
  BrowseInput,
  CellUpdate,
  ContainerInfo,
  ContainerStructure,
  QueryInput,
  QueryResult,
  SearchResult,
  UpdateCellsInput
};
