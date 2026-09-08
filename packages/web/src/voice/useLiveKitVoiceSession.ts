import { useEffect, useRef, useState } from 'react';
import {
  BrowserVoiceSessionOptions,
  BrowserVoiceSessionState,
  LiveKitVoiceSession
} from './liveKitVoiceSession.js';

export interface UseLiveKitVoiceSessionResult {
  state: BrowserVoiceSessionState;
  error?: Error;
  connect: (options: BrowserVoiceSessionOptions) => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useLiveKitVoiceSession(): UseLiveKitVoiceSessionResult {
  const [state, setState] = useState<BrowserVoiceSessionState>('disconnected');
  const [error, setError] = useState<Error>();
  const sessionRef = useRef<LiveKitVoiceSession | null>(null);

  if (!sessionRef.current) {
    sessionRef.current = new LiveKitVoiceSession({
      onStateChange: setState,
      onError: setError
    });
  }

  const session = sessionRef.current;

  useEffect(() => {
    return () => {
      void session.disconnect();
    };
  }, [session]);

  const connect = async (options: BrowserVoiceSessionOptions): Promise<void> => {
    setError(undefined);
    await session.connect(options);
  };

  const disconnect = async (): Promise<void> => {
    await session.disconnect();
  };

  return { state, error, connect, disconnect };
}