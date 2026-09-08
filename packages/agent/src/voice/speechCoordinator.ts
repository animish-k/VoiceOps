import * as rime from '@livekit/agents-plugin-rime';
import type { AudioFrame } from '@livekit/rtc-node';
import { InterruptionTelemetry, VoiceOutputFence, VoiceResponse } from './outputFence.js';

export interface SynthesizedAudioPacket {
  requestId: string;
  segmentId: string;
  frame: AudioFrame;
  deltaText?: string;
  final: boolean;
}

export type VoiceTelemetryEvent =
  | 'tts_started'
  | 'tts_first_audio'
  | 'tts_completed'
  | 'tts_cancelled'
  | 'interruption_detected'
  | 'audio_stop_requested'
  | 'audio_stopped'
  | 'stt_interim'
  | 'stt_final'
  | 'voice_session_state'
  | 'voice_session_error';

export interface VoiceTelemetrySink {
  emit: (event: VoiceTelemetryEvent, payload: Record<string, unknown>) => void;
}

export type AudioFrameHandler = (audio: SynthesizedAudioPacket) => Promise<void> | void;

export class RimeSpeechCoordinator {
  private activeStream?: ReturnType<rime.TTS['synthesize']>;

  constructor(
    private readonly tts: rime.TTS,
    private readonly fence: VoiceOutputFence,
    private readonly telemetry?: VoiceTelemetrySink
  ) {}

  async speak(response: VoiceResponse, onAudio: AudioFrameHandler): Promise<boolean> {
    const activeSpeech = this.fence.beginSpeech(response);
    if (!activeSpeech) {
      return false;
    }

    this.emit('tts_started', response);
    const stream = this.tts.synthesize(response.text, undefined, activeSpeech.signal);
    this.activeStream = stream;
    let emittedAudio = false;

    try {
      for await (const audio of stream) {
        if (!this.fence.canEmit(response)) {
          break;
        }
        await onAudio(audio);
        if (!emittedAudio) {
          emittedAudio = true;
          this.emit('tts_first_audio', response);
        }
      }

      if (activeSpeech.signal.aborted) {
        this.emit('tts_cancelled', response);
      } else {
        this.emit('tts_completed', response);
      }
    } catch (error) {
      if (!activeSpeech.signal.aborted) {
        throw error;
      }
      this.emit('tts_cancelled', response);
    } finally {
      stream.close();
      if (this.activeStream === stream) {
        this.activeStream = undefined;
      }
      this.fence.completeSpeech(response);
    }

    return emittedAudio;
  }

  interrupt(nextTurnId: number): InterruptionTelemetry | undefined {
    const telemetry = this.fence.interrupt(nextTurnId);
    if (!telemetry) {
      return undefined;
    }

    this.activeStream?.close();
    this.emit('interruption_detected', telemetry);
    this.emit('audio_stop_requested', telemetry);
    if (telemetry.audioStoppedAt !== undefined) {
      this.emit('audio_stopped', telemetry);
    }
    return telemetry;
  }

  private emit(event: VoiceTelemetryEvent, payload: object): void {
    this.telemetry?.emit(event, payload as Record<string, unknown>);
  }
}