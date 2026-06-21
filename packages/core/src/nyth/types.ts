export type NythAiEffort = "low" | "medium" | "high";

export interface NythAiSchemaColumn {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  foreignKey?: {
    schema?: string;
    table: string;
    column: string;
  };
}

export interface NythAiSchemaContainer {
  name: string;
  type: "table" | "collection";
  schema?: string;
  displayName?: string;
  columns: NythAiSchemaColumn[];
}

export interface NythAiSchemaContext {
  adapterKind: "sql" | "mongo";
  adapterName: string;
  containers: NythAiSchemaContainer[];
}

export interface NythAiChatInput {
  prompt: string;
  schema?: NythAiSchemaContext;
  system?: string;
  model?: string;
  thinking?: boolean;
  effort?: NythAiEffort;
  temperature?: number;
  maxTokens?: number;
  licenseKey?: string;
}

export interface NythAiChatResponse {
  text: string;
  isQuery: boolean;
  query: string | null;
  reasoning: string | null;
  model: string;
  agent?: number | string;
  finishReason: string | null;
  usage?: unknown;
}
