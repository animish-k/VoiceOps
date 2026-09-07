import { QueryTransactionsParams } from '@voiceops/shared';
import {
  executeQueryTransactions,
  QUERY_TRANSACTIONS_SCHEMA,
  QueryTransactionsResult
} from './queryTransactions.js';
import { SyntheticDataEngine, defaultSyntheticEngine } from '../data/SyntheticDataEngine.js';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private dataEngine: SyntheticDataEngine;

  constructor(dataEngine: SyntheticDataEngine = defaultSyntheticEngine) {
    this.dataEngine = dataEngine;
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    this.registerTool({
      name: QUERY_TRANSACTIONS_SCHEMA.name,
      description: QUERY_TRANSACTIONS_SCHEMA.description,
      parameters: QUERY_TRANSACTIONS_SCHEMA.parameters,
      execute: async (args: Record<string, unknown>, signal?: AbortSignal) => {
        const params = args as QueryTransactionsParams;
        return executeQueryTransactions(params, this.dataEngine, signal);
      }
    });
  }

  public registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  public getSchemas(): Array<{ name: string; description: string; parameters: Record<string, unknown> }> {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  }

  public async executeTool(
    name: string,
    args: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" is not registered in ToolRegistry.`);
    }

    if (signal?.aborted) {
      throw new DOMException(`Tool execution of "${name}" aborted before execution`, 'AbortError');
    }

    return tool.execute(args, signal);
  }

  public getDataEngine(): SyntheticDataEngine {
    return this.dataEngine;
  }
}

export const defaultToolRegistry = new ToolRegistry();
