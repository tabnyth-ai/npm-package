export type NythAiEffort = "low" | "medium" | "high";

export interface NythAiChatInput {
  prompt: string;
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
  reasoning: string | null;
  model: string;
  agent?: number | string;
  finishReason: string | null;
  usage?: unknown;
}
