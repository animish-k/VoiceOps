import { DashboardState } from '../state/dashboard.js';
import { TurnMetadata, TurnStatus } from '../state/turn.js';

export type DataChannelEvent =
  | {
      type: 'STATE_SNAPSHOT';
      payload: DashboardState;
      turnId: number;
    }
  | {
      type: 'STATE_PATCH';
      payload: Partial<DashboardState>;
      turnId: number;
    }
  | {
      type: 'TOOL_EXECUTION_START';
      toolName: string;
      args: Record<string, unknown>;
      turnId: number;
    }
  | {
      type: 'TOOL_EXECUTION_COMPLETE';
      toolName: string;
      durationMs: number;
      turnId: number;
    }
  | {
      type: 'TURN_STATUS_UPDATE';
      status: TurnStatus;
      metadata: TurnMetadata;
      turnId: number;
    }
  | {
      type: 'TURN_INTERRUPTED';
      supersededTurnId: number;
      newTurnId: number;
      reason: string;
    }
  | {
      type: 'TRANSCRIPT_DELTA';
      role: 'user' | 'assistant';
      text: string;
      isFinal: boolean;
      turnId: number;
    };
