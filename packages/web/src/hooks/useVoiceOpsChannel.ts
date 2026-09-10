import { useCallback } from 'react';
import { DataChannelEvent } from '@voiceops/shared';
import { useDashboardStore } from '../state/useDashboardStore.js';

/**
 * Interface for LiveKit DataChannel integration.
 * Person 2 can connect this hook directly to the LiveKit Room's DataReceived event:
 *
 * ```ts
 * const { processIncomingMessage } = useVoiceOpsChannel();
 * room.on(RoomEvent.DataReceived, (payload) => {
 *   const message = new TextDecoder().decode(payload);
 *   processIncomingMessage(message);
 * });
 * ```
 */
export function useVoiceOpsChannel() {
  const handleDataChannelEvent = useDashboardStore(s => s.handleDataChannelEvent);
  const lastUpdatedTurnId = useDashboardStore(s => s.lastUpdatedTurnId);
  const assistantStatus = useDashboardStore(s => s.assistantStatus);

  const processIncomingEvent = useCallback(
    (event: DataChannelEvent): boolean => {
      try {
        return handleDataChannelEvent(event);
      } catch (err) {
        console.error('[VoiceOps Channel] Error processing event:', err, event);
        return false;
      }
    },
    [handleDataChannelEvent]
  );

  const processIncomingMessage = useCallback(
    (rawMessage: string): boolean => {
      try {
        const parsed = JSON.parse(rawMessage) as DataChannelEvent;
        if (!parsed || !parsed.type) {
          console.warn('[VoiceOps Channel] Malformed message received:', rawMessage);
          return false;
        }
        return processIncomingEvent(parsed);
      } catch (err) {
        console.error('[VoiceOps Channel] Failed to parse JSON message:', err, rawMessage);
        return false;
      }
    },
    [processIncomingEvent]
  );

  return {
    processIncomingEvent,
    processIncomingMessage,
    currentAuthoritativeTurnId: lastUpdatedTurnId,
    assistantStatus
  };
}
