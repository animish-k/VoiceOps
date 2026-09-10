export type VoiceTransport = 'http' | 'websocket';
export type VoiceSessionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export interface RimeVoiceConfig {
  modelId: string;
  speaker: string;
  language: string;
  transport: VoiceTransport;
  audioFormat: 'pcm';
  sampleRate: number;
  segment: 'bySentence' | 'immediate' | 'never';
}

export interface VoiceOpsConfig {
  livekitUrl: string;
  livekitApiKey: string;
  livekitApiSecret: string;
  rimeApiKey: string;
  rime: RimeVoiceConfig;
}

const defaultRimeConfig: RimeVoiceConfig = {
  modelId: 'coda',
  speaker: 'celeste',
  language: 'en',
  transport: 'websocket',
  audioFormat: 'pcm',
  sampleRate: 24000,
  segment: 'bySentence'
};

function requiredEnv(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadVoiceOpsConfig(environment: NodeJS.ProcessEnv = process.env): VoiceOpsConfig {
  return {
    livekitUrl: requiredEnv(environment, 'LIVEKIT_URL'),
    livekitApiKey: requiredEnv(environment, 'LIVEKIT_API_KEY'),
    livekitApiSecret: requiredEnv(environment, 'LIVEKIT_API_SECRET'),
    rimeApiKey: requiredEnv(environment, 'RIME_API_KEY'),
    rime: {
      ...defaultRimeConfig,
      modelId: environment.RIME_MODEL_ID ?? defaultRimeConfig.modelId,
      speaker: environment.RIME_SPEAKER ?? defaultRimeConfig.speaker,
      language: environment.RIME_LANGUAGE ?? defaultRimeConfig.language,
      transport: environment.RIME_TRANSPORT === 'http' ? 'http' : defaultRimeConfig.transport,
      audioFormat: parseAudioFormat(environment.RIME_AUDIO_FORMAT),
      sampleRate: parseSampleRate(environment.RIME_SAMPLE_RATE),
      segment: environment.RIME_SEGMENT === 'immediate' || environment.RIME_SEGMENT === 'never'
        ? environment.RIME_SEGMENT
        : defaultRimeConfig.segment
    }
  };
}

function parseSampleRate(value: string | undefined): number {
  if (!value) {
    return defaultRimeConfig.sampleRate;
  }

  const sampleRate = Number(value);
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
    throw new Error('RIME_SAMPLE_RATE must be a positive integer');
  }
  return sampleRate;
}

function parseAudioFormat(value: string | undefined): 'pcm' {
  if (value && value !== 'pcm') {
    throw new Error('RIME_AUDIO_FORMAT must be pcm for the LiveKit Rime plugin');
  }
  return 'pcm';
}