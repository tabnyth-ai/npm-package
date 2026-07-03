export type AdapterKind = "sql" | "mongo";
export type AdapterName = "postgres" | "mongodb";

export interface CreateAdapterOptions {
  connectionString: string;
  allowWrite: boolean;
  defaultLimit: number;
  maxLimit: number;
  timeoutMs: number;
}

export interface ContainerInfo {
  name: string;
  type: "table" | "collection";
  schema?: string;
  displayName?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  defaultValue?: string | null;
  generated?: boolean;
  foreignKey?: ForeignKeyInfo;
}

export interface ForeignKeyInfo {
  schema?: string;
  table: string;
  column: string;
}

export interface ContainerStructure {
  name: string;
  columns: ColumnInfo[];
  sample?: Record<string, unknown>;
}

export type BrowseFilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "isNull"
  | "isNotNull";

export interface BrowseFilter {
  column: string;
  operator: BrowseFilterOperator;
  value?: unknown;
}

export interface BrowseInput {
  container: string;
  schema?: string;
  limit?: number;
  offset?: number;
  filters?: BrowseFilter[];
}

export interface QueryInput {
  text?: string;
  sql?: string;
  collection?: string;
  operation?: string;
  filter?: Record<string, unknown>;
  pipeline?: unknown[];
  document?: Record<string, unknown>;
  update?: Record<string, unknown>;
  limit?: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  totalRows?: number;
  durationMs: number;
}

export interface SearchInput {
  query: string;
  limit?: number;
}

export type SearchResultKind = "table" | "column" | "cell";

export interface SearchResult {
  kind: SearchResultKind;
  title: string;
  description: string;
  containerName?: string;
  columnName?: string;
  value?: unknown;
}

export interface CellUpdate {
  row: Record<string, unknown>;
  column: string;
  value: unknown;
}

export interface UpdateCellsInput {
  container: string;
  schema?: string;
  updates: CellUpdate[];
}

export interface InsertRowsInput {
  container: string;
  schema?: string;
  rows: Record<string, unknown>[];
}

export interface DatabaseAdapter {
  kind: AdapterKind;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listContainers(): Promise<ContainerInfo[]>;
  describeContainer(name: string): Promise<ContainerStructure>;
  browse(input: BrowseInput): Promise<QueryResult>;
  runQuery(input: QueryInput): Promise<QueryResult>;
  search(input: SearchInput): Promise<SearchResult[]>;
  insertRows(input: InsertRowsInput): Promise<QueryResult>;
  updateCells(input: UpdateCellsInput): Promise<QueryResult>;
}

export interface AdapterModule {
  createAdapter(options: CreateAdapterOptions): DatabaseAdapter | Promise<DatabaseAdapter>;
}
