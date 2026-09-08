import { TurnManager } from './turn/TurnManager.js';
import { StateCommitBoundary, StateCommitResult } from './turn/StateCommitBoundary.js';
import { ResponseGenerator } from './turn/ResponseGenerator.js';
import { ToolRegistry } from './tools/ToolRegistry.js';
import { LLMProvider } from './llm/types.js';
import { MockLLMProvider } from './llm/MockLLMProvider.js';
import { AgentEventLogger } from './observability/EventLogger.js';
import { DashboardState } from '@voiceops/shared';
import { TurnContext } from './turn/TurnContext.js';

export interface AgentCoordinatorOptions {
  turnManager?: TurnManager;
  stateBoundary?: StateCommitBoundary;
  toolRegistry?: ToolRegistry;
  llmProvider?: LLMProvider;
  responseGenerator?: ResponseGenerator;
  logger?: AgentEventLogger;
}

export interface AgentTurnResult {
  turnId: number;
  requestId: string;
  isAuthoritative: boolean;
  committed: boolean;
  aborted: boolean;
  spokenText?: string;
  toolResult?: unknown;
  state?: DashboardState;
  discardReason?: string;
}

export class AgentCoordinator {
  public readonly turnManager: TurnManager;
  public readonly stateBoundary: StateCommitBoundary;
  public readonly toolRegistry: ToolRegistry;
  public readonly llmProvider: LLMProvider;
  public readonly responseGenerator: ResponseGenerator;
  public readonly logger: AgentEventLogger;

  constructor(options: AgentCoordinatorOptions = {}) {
    this.logger = options.logger || new AgentEventLogger();
    this.turnManager = options.turnManager || new TurnManager(this.logger);
    this.toolRegistry = options.toolRegistry || new ToolRegistry();
    this.stateBoundary = options.stateBoundary || new StateCommitBoundary(this.turnManager, undefined, this.logger);
    this.llmProvider = options.llmProvider || new MockLLMProvider();
    this.responseGenerator = options.responseGenerator || new ResponseGenerator(this.logger);
  }

  public async processUtterance(utterance: string): Promise<AgentTurnResult> {
    const context = this.turnManager.startTurn(utterance);
    const turnId = context.turnId;
    const requestId = context.requestId;

    try {
      context.setStatus('THINKING');

      const messages = [{ role: 'user' as const, content: utterance }];
      const tools = this.toolRegistry.getSchemas();

      // Check abort before calling LLM
      if (context.isAborted()) {
        return this.createAbortedResult(context);
      }

      const llmResponse = await this.llmProvider.generate(messages, tools, context.signal);

      if (context.isAborted()) {
        return this.createAbortedResult(context);
      }

      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        const toolCall = llmResponse.toolCalls[0];
        const toolStartTime = Date.now();

        context.setStatus('EXECUTING_TOOL');
        this.logger.emit({
          type: 'tool_started',
          turnId,
          requestId,
          timestamp: toolStartTime,
          toolName: toolCall.name,
          args: toolCall.args
        });

        let toolResult: unknown;
        try {
          toolResult = await this.toolRegistry.executeTool(
            toolCall.name,
            toolCall.args,
            context.signal
          );
        } catch (toolErr: unknown) {
          const isAbort = toolErr instanceof Error && (toolErr.name === 'AbortError' || context.isAborted());
          if (isAbort) {
            this.logger.emit({
              type: 'tool_aborted',
              turnId,
              requestId,
              timestamp: Date.now(),
              toolName: toolCall.name,
              reason: 'Tool execution aborted by superseded turn',
              durationMs: Date.now() - toolStartTime
            });
            return this.createAbortedResult(context);
          }
          throw toolErr;
        }

        const toolDurationMs = Date.now() - toolStartTime;
        this.logger.emit({
          type: 'tool_completed',
          turnId,
          requestId,
          timestamp: Date.now(),
          toolName: toolCall.name,
          durationMs: toolDurationMs
        });

        // STALE RESULT FENCING & STATE COMMIT BOUNDARY CHECK
        const commitResult: StateCommitResult = this.stateBoundary.commitToolResult(
          context,
          toolCall.name,
          toolResult
        );

        if (!commitResult.committed) {
          return {
            turnId,
            requestId,
            isAuthoritative: false,
            committed: false,
            aborted: context.isAborted(),
            discardReason: commitResult.discardReason
          };
        }

        // GENERATE RESPONSE ONLY FOR AUTHORITATIVE COMMITTED TURNS
        context.setStatus('SPEAKING');
        const spokenText = this.responseGenerator.generateResponse(
          context,
          toolCall.name,
          toolResult
        );

        this.turnManager.completeTurn(context);

        return {
          turnId,
          requestId,
          isAuthoritative: true,
          committed: true,
          aborted: false,
          spokenText,
          toolResult,
          state: commitResult.state
        };
      }

      // No tool calls - direct conversational reply
      const directText = llmResponse.text || '';
      context.assistantSpokenText = directText;
      this.turnManager.completeTurn(context);

      return {
        turnId,
        requestId,
        isAuthoritative: this.turnManager.isAuthoritative(context),
        committed: false,
        aborted: false,
        spokenText: directText
      };
    } catch (err: unknown) {
      if (context.isAborted()) {
        return this.createAbortedResult(context);
      }
      throw err;
    }
  }

  private createAbortedResult(context: TurnContext): AgentTurnResult {
    return {
      turnId: context.turnId,
      requestId: context.requestId,
      isAuthoritative: false,
      committed: false,
      aborted: true,
      discardReason: 'turn_aborted'
    };
  }

  public getDashboardState(): DashboardState {
    return this.stateBoundary.getDashboardState();
  }
}
