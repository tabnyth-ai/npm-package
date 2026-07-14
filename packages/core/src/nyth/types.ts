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
  temperature?: number;
  maxTokens?: number;
  licenseKey?: string;
}

// Streaming callbacks for askNythAiStream: `onDelta` fires per text chunk as
// the model generates it; the returned promise resolves with the final
// NythAiChatResponse (from the stream's terminal `done` event).
export interface NythAiStreamHandlers {
  onDelta?(text: string): void;
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

export interface NythAiCreditBalanceResponse {
  creditBalance: number;
  licenseKey: {
    id: string;
    keyPreview: string;
    name: string;
    status: "ACTIVE" | "REVOKED";
    topicCredit?: number;
    revokedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
}
