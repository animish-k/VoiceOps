import { ConnectionState, Room, RoomEvent } from 'livekit-client';

export type BrowserVoiceSessionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'reconnecting'
  | 'error';

export interface BrowserVoiceSessionCallbacks {
  onStateChange?: (state: BrowserVoiceSessionState) => void;
  onError?: (error: Error) => void;
}

export interface BrowserVoiceSessionOptions {
  livekitUrl: string;
  token: string;
}

export class LiveKitVoiceSession {
  private room?: Room;
  private state: BrowserVoiceSessionState = 'disconnected';

  constructor(private readonly callbacks: BrowserVoiceSessionCallbacks = {}) {}

  get currentState(): BrowserVoiceSessionState {
    return this.state;
  }

  async connect(options: BrowserVoiceSessionOptions): Promise<void> {
    if (this.room) {
      return;
    }

    this.transition('connecting');
    const room = new Room();
    this.room = room;
    this.registerRoomEvents(room);

    try {
      await room.connect(options.livekitUrl, options.token);
      this.transition('connected');
      await room.localParticipant.setMicrophoneEnabled(true);
      this.transition('listening');
    } catch (error) {
      await this.disconnect();
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.transition('error');
      this.callbacks.onError?.(normalizedError);
      throw normalizedError;
    }
  }

  async disconnect(): Promise<void> {
    const room = this.room;
    this.room = undefined;
    if (room) {
      await room.disconnect();
    }
    this.transition('disconnected');
  }

  private registerRoomEvents(room: Room): void {
    room.on(RoomEvent.Reconnecting, () => this.transition('reconnecting'));
    room.on(RoomEvent.Reconnected, () => this.transition('connected'));
    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      if (state === ConnectionState.Disconnected) {
        this.transition('disconnected');
      }
    });
    room.on(RoomEvent.Disconnected, () => {
      this.room = undefined;
      this.transition('disconnected');
    });
  }

  private transition(state: BrowserVoiceSessionState): void {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }
}