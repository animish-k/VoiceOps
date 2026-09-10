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
      const parsed = JSON.parse(rawMessage);

      if (!parsed || !parsed.type) {
        console.warn(
          '[VoiceOps Channel] Malformed message received:',
          rawMessage
        );
        return false;
      }

      // Backend publishes authoritative dashboard updates as `state_commit`.
      // Convert them into the frontend's existing STATE_SNAPSHOT event.
      if (parsed.type === 'state_commit') {
        console.log('[VoiceOps Channel] Received state_commit:', {
          turnId: parsed.turnId,
          hasState: Boolean(parsed.state)
        });

        if (!parsed.state || typeof parsed.turnId !== 'number') {
          console.warn(
            '[VoiceOps Channel] Invalid state_commit:',
            parsed
          );
          return false;
        }

        return processIncomingEvent({
          type: 'STATE_SNAPSHOT',
          turnId: parsed.turnId,
          payload: parsed.state
        } as DataChannelEvent);
      }

      return processIncomingEvent(parsed as DataChannelEvent);
    } catch (err) {
      console.error(
        '[VoiceOps Channel] Failed to parse JSON message:',
        err,
        rawMessage
      );
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
