import { LLMMessage, LLMProvider, LLMResponse, LLMToolCall, ToolDeclaration } from './types.js';

export interface GeminiProviderOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  systemInstruction?: string;
}

export class GeminiLLMProvider implements LLMProvider {
  public readonly name = 'gemini-llm-provider';
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private systemInstruction: string;

  constructor(options: GeminiProviderOptions = {}) {
    this.apiKey = options.apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY || '' : '');
    this.model = options.model || 'gemini-2.5-flash';
    this.baseUrl = options.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    this.systemInstruction = options.systemInstruction ||
      'You are VoiceOps AI, a real-time voice-first operations assistant for fintech support analysts. Interpret analyst commands and call query_transactions with precise filters.';
  }

  public async generate(
    messages: LLMMessage[],
    tools?: ToolDeclaration[],
    signal?: AbortSignal
  ): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set for GeminiLLMProvider.');
    }

    if (signal?.aborted) {
      throw new DOMException('Gemini request aborted', 'AbortError');
    }

    const contents = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const body: Record<string, unknown> = {
      contents,
      systemInstruction: {
        parts: [{ text: this.systemInstruction }]
      }
    };

    if (tools && tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: tools.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }))
        }
      ];
    }

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    const toolCalls: LLMToolCall[] = [];
    let text = '';

    for (const part of parts) {
      if (part.functionCall) {
        toolCalls.push({
          name: part.functionCall.name,
          args: (part.functionCall.args as Record<string, unknown>) || {}
        });
      }
      if (part.text) {
        text += part.text;
      }
    }

    return {
      text: text || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      raw: data
    };
  }
}
