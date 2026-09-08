import { TurnContext } from './TurnContext.js';
import { AgentEventLogger, defaultAgentEventLogger } from '../observability/EventLogger.js';

export class TurnManager {
  private currentTurnId: number = 0;
  private currentContext: TurnContext | null = null;
  private turns: Map<number, TurnContext> = new Map();
  private logger: AgentEventLogger;

  constructor(logger: AgentEventLogger = defaultAgentEventLogger) {
    this.logger = logger;
  }

  public startTurn(utterance?: string): TurnContext {
    const newTurnId = ++this.currentTurnId;
    const prevContext = this.currentContext;

    // Invalidate and supersede previous turn if active
    if (prevContext && prevContext.status !== 'COMPLETED' && prevContext.status !== 'INTERRUPTED') {
      prevContext.isSuperseded = true;
      prevContext.abort(`Superseded by turn ${newTurnId}`);

      this.logger.emit({
        type: 'turn_interrupted',
        turnId: prevContext.turnId,
        requestId: prevContext.requestId,
        timestamp: Date.now(),
        supersededByTurnId: newTurnId,
        reason: `New utterance received: "${utterance ?? ''}"`
      });
    }

    const context = new TurnContext({
      turnId: newTurnId,
      userUtterance: utterance
    });
    context.setStatus('LISTENING');

    this.currentContext = context;
    this.turns.set(newTurnId, context);

    this.logger.emit({
      type: 'turn_created',
      turnId: newTurnId,
      requestId: context.requestId,
      timestamp: Date.now(),
      userUtterance: utterance
    });

    return context;
  }

  public getCurrentTurnId(): number {
    return this.currentTurnId;
  }

  public getCurrentTurn(): TurnContext | null {
    return this.currentContext;
  }

  public getTurn(turnId: number): TurnContext | undefined {
    return this.turns.get(turnId);
  }

  public isAuthoritative(turn: TurnContext | number): boolean {
    const turnId = typeof turn === 'number' ? turn : turn.turnId;
    if (turnId !== this.currentTurnId) {
      return false;
    }

    if (typeof turn !== 'number' && (turn.isAborted() || turn.isSuperseded)) {
      return false;
    }

    return true;
  }

  public completeTurn(context: TurnContext): void {
    if (this.isAuthoritative(context)) {
      context.setStatus('COMPLETED');
    }
  }

  public reset(): void {
    if (this.currentContext && !this.currentContext.isAborted()) {
      this.currentContext.abort('TurnManager reset');
    }
    this.currentTurnId = 0;
    this.currentContext = null;
    this.turns.clear();
  }
}

export const defaultTurnManager = new TurnManager();
