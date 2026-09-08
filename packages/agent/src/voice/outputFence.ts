export interface VoiceResponse {
  turnId: number;
  requestId: string;
  text: string;
}

export interface InterruptionTelemetry {
  interruptionDetectedAt: number;
  audioStopRequestedAt: number;
  audioStoppedAt?: number;
  cutoffLatencyMs?: number;
}

export interface ActiveSpeech {
  response: VoiceResponse;
  signal: AbortSignal;
}

export class VoiceOutputFence {
  private authoritativeTurnId = 0;
  private activeSpeech?: {
    response: VoiceResponse;
    controller: AbortController;
  };

  get currentTurnId(): number {
    return this.authoritativeTurnId;
  }

  setAuthoritativeTurn(turnId: number): void {
    if (turnId < this.authoritativeTurnId) {
      return;
    }

    this.authoritativeTurnId = turnId;
  }

  beginSpeech(response: VoiceResponse): ActiveSpeech | undefined {
    if (!this.isCurrent(response)) {
      return undefined;
    }

    this.activeSpeech?.controller.abort('superseded');
    const controller = new AbortController();
    this.activeSpeech = { response, controller };
    return { response, signal: controller.signal };
  }

  canEmit(response: VoiceResponse): boolean {
    return this.isCurrent(response) && !this.activeSpeech?.controller.signal.aborted;
  }

  interrupt(nextTurnId: number): InterruptionTelemetry | undefined {
    const interruptionDetectedAt = performance.now();
    if (nextTurnId <= this.authoritativeTurnId) {
      return undefined;
    }

    this.authoritativeTurnId = nextTurnId;
    const audioStopRequestedAt = performance.now();
    const activeSpeech = this.activeSpeech;
    if (!activeSpeech) {
      return {
        interruptionDetectedAt,
        audioStopRequestedAt
      };
    }

    activeSpeech.controller.abort('interrupted');
    const audioStoppedAt = performance.now();
    this.activeSpeech = undefined;
    return {
      interruptionDetectedAt,
      audioStopRequestedAt,
      audioStoppedAt,
      cutoffLatencyMs: audioStoppedAt - interruptionDetectedAt
    };
  }

  completeSpeech(response: VoiceResponse): void {
    if (this.activeSpeech?.response.requestId === response.requestId) {
      this.activeSpeech = undefined;
    }
  }

  private isCurrent(response: VoiceResponse): boolean {
    return response.turnId === this.authoritativeTurnId;
  }
}