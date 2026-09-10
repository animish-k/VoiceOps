import * as rime from '@livekit/agents-plugin-rime';
import { voice } from '@livekit/agents';
import { RimeVoiceConfig, VoiceOpsConfig } from '../config.js';
import { createVoiceStt } from './stt.js';

export function createRimeTts(config: VoiceOpsConfig): rime.TTS {
  const options: rime.TTSOptions = {
    modelId: config.rime.modelId,
    speaker: config.rime.speaker,
    apiKey: config.rimeApiKey,
    lang: config.rime.language,
    samplingRate: config.rime.sampleRate,
    useWebsocket: false,
    segment: config.rime.segment
  };

  return new rime.TTS(options);
}

export function createVoiceSession(config: VoiceOpsConfig): voice.AgentSession {
  return new voice.AgentSession({
    stt: createVoiceStt(),
    tts: createRimeTts(config)
  });
}

export function describeRimeConfig(config: RimeVoiceConfig): string {
  return `${config.modelId}/${config.speaker} ${config.language} ${config.transport}`;
}