import { inference } from '@livekit/agents';

export const voiceSttModel = 'deepgram/nova-3' as const;
export const voiceSttLanguage = 'en' as const;

export function createVoiceStt(): inference.STT<typeof voiceSttModel> {
  return new inference.STT({
    model: voiceSttModel,
    language: voiceSttLanguage,
    modelOptions: {
      interim_results: true,
      smart_format: true,
      numerals: true,
      keyterm: ['VoiceOps', 'LiveKit', 'Rime', 'Bangalore', 'Mumbai']
    },
    connOptions: {
    timeoutMs: 30000,
    maxRetry: 5,
    retryIntervalMs: 2000
  }
  });
}