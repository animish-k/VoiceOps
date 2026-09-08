import { AccessToken } from 'livekit-server-sdk';
import { VoiceOpsConfig } from '../config.js';

export interface CreateTokenOptions {
  apiKey: string;
  apiSecret: string;
  roomName: string;
  participantIdentity: string;
  participantName?: string;
  ttlSeconds?: number;
}

export async function createLiveKitToken(options: CreateTokenOptions): Promise<string> {
  if (!options.apiKey || !options.apiSecret) {
    throw new Error('LiveKit apiKey and apiSecret are required to issue access tokens');
  }

  const at = new AccessToken(options.apiKey, options.apiSecret, {
    identity: options.participantIdentity,
    name: options.participantName || options.participantIdentity,
    ttl: options.ttlSeconds ? `${options.ttlSeconds}s` : '10m'
  });

  at.addGrant({
    room: options.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  return await at.toJwt();
}

export async function issueBrowserVoiceToken(
  config: VoiceOpsConfig,
  roomName = 'voiceops-ops-room',
  identity = `analyst-${Math.random().toString(36).slice(2, 8)}`
): Promise<{ token: string; livekitUrl: string; room: string; identity: string }> {
  const token = await createLiveKitToken({
    apiKey: config.livekitApiKey,
    apiSecret: config.livekitApiSecret,
    roomName,
    participantIdentity: identity,
    participantName: 'Operations Analyst'
  });

  return {
    token,
    livekitUrl: config.livekitUrl,
    room: roomName,
    identity
  };
}

