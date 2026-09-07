export interface LLMToolCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

export interface LLMResponse {
  text?: string;
  toolCalls?: LLMToolCall[];
  raw?: unknown;
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
}

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMProvider {
  readonly name: string;
  generate(
    messages: LLMMessage[],
    tools?: ToolDeclaration[],
    signal?: AbortSignal
  ): Promise<LLMResponse>;
}
