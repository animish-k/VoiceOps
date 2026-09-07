import { TurnMetadata, TurnStatus, TurnTelemetryTimestamps } from '@voiceops/shared';

export interface TurnContextOptions {
  turnId: number;
  requestId?: string;
  userUtterance?: string;
}

export class TurnContext {
  public readonly turnId: number;
  public readonly requestId: string;
  public readonly abortController: AbortController;
  public status: TurnStatus = 'IDLE';
  public userUtterance?: string;
  public assistantSpokenText?: string;
  public readonly timestamps: TurnTelemetryTimestamps = {};
  public readonly createdAt: number;
  public isSuperseded: boolean = false;

  constructor(options: TurnContextOptions) {
    this.turnId = options.turnId;
    this.requestId = options.requestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${options.turnId}_${Date.now()}`);
    this.abortController = new AbortController();
    this.userUtterance = options.userUtterance;
    this.createdAt = Date.now();
    this.timestamps.utteranceStartedAt = this.createdAt;
  }

  public get signal(): AbortSignal {
    return this.abortController.signal;
  }

  public isAborted(): boolean {
    return this.abortController.signal.aborted || this.isSuperseded;
  }

  public abort(reason: string = 'Turn aborted'): void {
    if (!this.abortController.signal.aborted) {
      this.abortController.abort(reason);
    }
    this.status = 'INTERRUPTED';
    this.timestamps.interruptionDetectedAt = Date.now();
  }

  public setStatus(status: TurnStatus): void {
    this.status = status;
    if (status === 'EXECUTING_TOOL' && !this.timestamps.toolExecutionStartedAt) {
      this.timestamps.toolExecutionStartedAt = Date.now();
    } else if (status === 'SPEAKING' && !this.timestamps.toolExecutionEndedAt) {
      this.timestamps.toolExecutionEndedAt = Date.now();
    }
  }

  public toMetadata(): TurnMetadata {
    return {
      turnId: this.turnId,
      requestId: this.requestId,
      status: this.status,
      userUtterance: this.userUtterance,
      assistantSpokenText: this.assistantSpokenText,
      timestamps: { ...this.timestamps },
      isAborted: this.isAborted()
    };
  }
}
