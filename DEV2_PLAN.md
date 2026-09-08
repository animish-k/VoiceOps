# VoiceOps Dev2 Plan and Progress

> Owner: Dev2, Voice / Realtime Engineer
> Branch: `feat/dev2-voice-realtime-rime`
> Last updated: 2026-09-08
> Status: Independent Dev2 work complete; cross-developer integration and live verification pending

This file is the handoff source of truth for Dev2 work. Update the checkboxes and notes as implementation progresses. Do not mark a live integration or performance result complete without actually testing it.

## Scope

Dev2 owns:

- LiveKit Agents integration
- LiveKit room and session lifecycle
- Browser microphone to LiveKit audio
- STT integration
- Rime TTS integration
- Realtime audio output
- Voice session lifecycle and connection states
- Barge-in and interruption handling at the audio layer
- TTS cancellation and stale speech protection
- Voice telemetry and latency instrumentation
- Realtime-specific frontend hooks and controls

Dev2 must not:

- Replace or redesign `TurnManager` or `StateCommitBoundary`
- Duplicate backend turn sequencing or stale-result fencing
- Modify unrelated dashboard components
- Expose API keys, access tokens, or LiveKit secrets
- Commit `.env` files or real credentials
- Claim measurements that have not been collected

## Current Repository State

- [x] Dedicated branch created: `feat/dev2-voice-realtime-rime`
- [x] Phase 1 shared contracts exist in `packages/shared`
- [x] Synthetic transaction and incident data exist
- [x] Existing dashboard and simulated `VoiceWidget` exist
- [x] `packages/agent` did not exist before Dev2 work; Dev2 foundation has now been added
- [x] No dedicated server/token package exists yet; this is an identified cross-developer dependency
- [x] Dev3's LLM/tool/turn entrypoint is not present in this branch; this is an identified cross-developer dependency
- [x] Existing `copilot_instructions.md` is untracked and intentionally untouched

## Shareable Dependency Matrix

Use this section when coordinating with teammates. Dev2 has completed the work that can be done without their code. The rows below are the remaining handoffs.

| Workstream | Current state | Dependency | Owner to complete dependency | Dev2 handoff action |
|---|---|---|---|---|
| Agent and turn integration | Blocked | Dev3's `voice.Agent`, LLM, tools, `TurnManager`, and authoritative response contract | Dev3 | Provide agent factory and final transcript/response handoff contract; Dev2 wires it into `startVoiceSession` and `VoiceOutputFence` |
| LiveKit token handoff | Blocked | Secure server endpoint issuing short-lived room token and public LiveKit URL | Dev3/server owner | Implement `/api/livekit/token`; Dev2 frontend already calls this endpoint |
| Agent runtime entrypoint | Blocked | Dev3 agent factory plus server startup ownership | Dev3, with Dev2 runtime integration | Give Dev2 the agent factory and startup command; Dev2 adds the LiveKit worker entrypoint |
| Dashboard authoritative updates | Blocked | Dev3 data-channel/state event publisher and turn IDs | Dev3 | Provide event schema usage and subscription path; Dev2 maps transcripts/status into the existing UI |
| Shared event logging | Blocked | EventLogger implementation and API | Dev4 or backend owner | Provide logger interface; Dev2 adapts session and TTS telemetry without logging secrets |
| Tool delay stress case | Blocked | Existing query/tool delay hook | Dev3 | Expose `VOICEOPS_TOOL_DELAY_MS` through the existing tool executor; Dev2 runs interruption proof |
| Browser transcript and turn display | Partially ready | Final transcript/data-channel events from the agent | Dev3 | Provide event payloads; Dev2 completes the VoiceWidget display wiring |
| Live acceptance test | Blocked | LiveKit/Rime credentials, token endpoint, agent pipeline, and test procedure | Dev2 runs; Dev3/server/Dev4 provide prerequisites | Run the exact two-turn scenario and record measured results |
| Evidence and benchmark update | Blocked | Real runs and latency measurements | Dev4 owns evidence; Dev2 supplies voice telemetry | Provide logs/measurements; Dev4 updates `RIME_EVIDENCE.md` |

### Messages to Teammates

**Dev3 / AI-Backend:** Dev2 needs the `voice.Agent` factory, the final-transcript entrypoint into the existing turn manager, the authoritative assistant-response event carrying `conversationId`, `turnId`, and `requestId`, and the existing tool-delay hook. Do not create a second turn manager in the agent package.

**Server/token owner:** Dev2 needs `GET /api/livekit/token` returning `{ token, livekitUrl? }`. Keep LiveKit API credentials server-side. The browser already calls this endpoint and accepts `VITE_LIVEKIT_URL` as a public URL fallback.

**Dev4 / Evaluation:** Dev2 needs the shared `EventLogger` interface and the final interruption test runner. Dev2 can provide telemetry events and measured timestamps once live credentials and the agent pipeline are available.

## Verified Provider Decisions

These are the currently selected configuration defaults based on the current LiveKit documentation and installed package declarations. The live Rime path still needs credentials and a real acceptance test.

### Dependencies

- `@livekit/agents`: `1.8.0`
- `@livekit/agents-plugin-rime`: `1.8.0`
- `livekit-client`: `2.22.3`
- Node.js available locally: `v24.18.0`
- npm available locally: `11.16.0`

### STT

- Provider path: LiveKit Inference
- Model: `deepgram/nova-3`
- Language: `en-IN`
- Interim results: enabled
- Smart formatting: enabled
- Numerals: enabled
- Keyterms: `VoiceOps`, `LiveKit`, `Rime`, `Bangalore`, `Mumbai`

### Rime TTS

- Integration: `@livekit/agents-plugin-rime`
- Model ID: `coda`
- Speaker: `celeste`
- Language: `en`
- Transport: WebSocket
- Segmenting: `bySentence`
- Audio: PCM
- Sample rate: 16,000 Hz
- API key: server-side `RIME_API_KEY` only

Important implementation note: the installed Node Rime plugin exposes `samplingRate` and emits PCM for WebSocket mode. It does not expose an `audioFormat` option. The configuration rejects non-PCM values instead of sending unsupported fields to Rime.

## Completed Work

### Repository and dependency foundation

- [x] Created the dedicated Dev2 branch.
- [x] Added `packages/agent/package.json`.
- [x] Added `packages/agent/tsconfig.json`.
- [x] Installed and locked LiveKit Agents, Rime plugin, dotenv, and browser LiveKit dependencies.
- [x] Added `livekit-client` to `packages/web/package.json`.
- [x] Added placeholder-only Rime configuration to `.env.example`.

### Agent configuration and providers

- [x] Added `packages/agent/src/config.ts`.
- [x] Added required environment validation for LiveKit and Rime credentials.
- [x] Added configurable Rime model, speaker, language, transport, segment, and sample rate.
- [x] Added Rime provider factory in `packages/agent/src/providers/rime.ts`.
- [x] Added LiveKit Inference STT factory in `packages/agent/src/providers/stt.ts`.
- [x] Added exports from `packages/agent/src/index.ts`.

### Server-side session lifecycle

- [x] Added `packages/agent/src/realtime/session.ts`.
- [x] Uses the real `AgentSession.start({ agent, room })` API.
- [x] Calls `JobContext.connect()` after session startup.
- [x] Reports `connecting`, `connected`, `error`, and `disconnected` states.
- [x] Closes the session if startup fails.
- [x] Accepts the agent instance from the caller so Dev3's LLM/tools remain authoritative.

### Browser connection foundation

- [x] Added `packages/web/src/voice/liveKitVoiceSession.ts`.
- [x] Added `packages/web/src/voice/useLiveKitVoiceSession.ts`.
- [x] Accepts a server-issued token and LiveKit URL.
- [x] Connects a browser `Room` using the real `livekit-client` API.
- [x] Enables the browser microphone after connection.
- [x] Handles reconnect, reconnected, disconnected, and error states.
- [x] Does not handle or expose credentials.
- [x] React hook exposes connection state, errors, connect, disconnect, and cleanup.

### Deterministic validation

- [x] Added configuration tests in `packages/agent/src/config.test.ts`.
- [x] Tests missing credentials.
- [x] Tests invalid sample rates.
- [x] Tests rejection of unsupported MP3 configuration.
- [x] Agent build passes.
- [x] Agent tests pass: 7 tests passed.
- [x] Workspace typecheck passes after building shared declarations.
- [x] Web typecheck passes, including the browser LiveKit wrapper.
- [x] Added `VoiceOutputFence` for turn-aware speech admission and supersession.
- [x] Added deterministic tests for obsolete speech suppression and current-turn speech.
- [x] Added abort signaling and cutoff telemetry timing at the voice-output boundary.
- [x] Added `RimeSpeechCoordinator` around the real Rime `synthesize(..., abortSignal)` stream.
- [x] Closes the Rime stream when speech is superseded or cancelled.
- [x] Added an injectable voice telemetry sink for provider-boundary events.
- [x] Added LiveKit `AgentSession` telemetry wiring for STT, agent state, overlap, and errors.
- [x] Reduces provider errors to safe scalar metadata before telemetry emission.

### Voice output fencing

- [x] Added `packages/agent/src/voice/outputFence.ts`.
- [x] Accepts authoritative turn IDs from the existing backend boundary.
- [x] Aborts active speech when a newer turn supersedes it.
- [x] Rejects obsolete responses before they reach the TTS provider.
- [x] Prevents the authoritative turn ID from moving backwards.
- [x] Connect the fence to the Rime synthesis stream.
- [x] Coordinator closes the active Rime stream on interruption.
- [ ] Connect the coordinator's emitted frames to the final LiveKit playback/AgentSession path.
	- Dependency: Dev3 agent/session output path; owner: Dev2 after Dev3 provides the final agent integration point.
- [ ] Connect the telemetry sink to the shared `EventLogger`.
	- Dependency: EventLogger implementation/API; owner: Dev4 or backend owner provides it, then Dev2 adapts the sink.

## Remaining Work Plan

### 1. Integrate with Dev3's agent and turn pipeline

Status: BLOCKED ON DEV3 INTERFACE

- [ ] Identify the actual Dev3 agent entrypoint and `voice.Agent` construction.
	- Dependency: Dev3 agent factory; owner: Dev3.
- [ ] Pass the existing LLM/tool implementation into `startVoiceSession`.
	- Dependency: Dev3 agent factory; owner: Dev3 provides it, Dev2 performs the adapter wiring.
- [ ] Forward `conversationId`, `turnId`, and `requestId` without creating a second turn manager.
	- Dependency: Dev3 response/event contract; owner: Dev3 defines the payload, Dev2 forwards it.
- [ ] Subscribe to final and interim transcript events using the actual LiveKit events/API.
	- Dependency: Agent session is started by the real runtime; owner: Dev2 after Dev3 runtime handoff.
- [ ] Forward final transcripts into the existing authoritative turn mechanism.
	- Dependency: Dev3 turn-manager entrypoint; owner: Dev3 exposes it, Dev2 calls it.
- [ ] Forward authoritative assistant response text to the Rime speech path.
	- Dependency: Dev3 authoritative response event; owner: Dev3 emits it, Dev2 sends it through the output fence/coordinator.
- [ ] Confirm late tool results remain protected by the existing backend fence.
	- Dependency: Dev3 tool delay and stale-result test path; owner: Dev3 confirms backend behavior, Dev2 confirms no stale speech.

Integration rule: Dev2 supplies the voice transport and lifecycle. Dev3 remains the owner of LLM, tools, turn sequencing, state commits, and stale-result fencing.

### 2. Add the real agent runtime entrypoint

Status: BLOCKED ON DEV3 AGENT FACTORY

- [ ] Add the production/dev LiveKit agent entrypoint once Dev3's agent factory exists.
	- Dependency: Dev3's `voice.Agent` factory and server startup ownership; owner: Dev3 provides the factory, Dev2 adds the entrypoint.
- [ ] Load environment configuration server-side.
	- Dependency: Agent runtime entrypoint; owner: Dev2.
- [ ] Start the LiveKit worker using the installed Node.js Agents API.
	- Dependency: Dev3 agent factory; owner: Dev2.
- [ ] Call `startVoiceSession` with the real agent.
	- Dependency: Dev3 agent factory; owner: Dev2.
- [ ] Add clean shutdown and room disconnect behavior.
	- Dependency: LiveKit worker entrypoint; owner: Dev2.
- [ ] Add a documented command for local agent startup.
	- Dependency: Final package/startup command; owner: Dev2, documented after runtime exists.

Do not create a fake LLM or fake tool pipeline in the Dev2 package just to make the entrypoint appear complete.

### 3. Add a secure token handoff

Status: BLOCKED ON SERVER/TOKEN OWNER

- [ ] Confirm which package owns the token endpoint.
	- Dependency: Server package ownership; owner: Dev3/server owner.
- [ ] Generate short-lived LiveKit room tokens server-side.
	- Dependency: LiveKit server SDK and credentials; owner: Dev3/server owner.
- [ ] Keep `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` server-side.
	- Dependency: Server environment configuration; owner: Dev3/server owner.
- [ ] Add the browser token fetch contract.
	- Dependency: Endpoint response shape; owner: Dev3/server owner supplies `{ token, livekitUrl? }`, Dev2 frontend call is already implemented.
- [ ] Handle token fetch failure visibly in the frontend.
	- Dependency: Endpoint availability; owner: Dev2 implementation is complete for HTTP/configuration failures, live verification awaits endpoint.
- [ ] Document required room name/identity behavior.
	- Dependency: Token endpoint contract; owner: Dev3/server owner.

The browser must never receive `LIVEKIT_API_SECRET`, `RIME_API_KEY`, or any other private credential.

### 4. Replace simulated voice controls with the live path

Status: PARTIALLY COMPLETE; TOKEN AND AGENT HANDOFF PENDING

- [x] Add a Dev2-owned voice hook around `LiveKitVoiceSession`.
- [x] Update `VoiceWidget` only as needed to connect the real session.
- [x] Clearly label `LIVE VOICE` versus `SIMULATION / DEMO MODE`.
- [x] Display connection state and visible token/configuration failures.
- [x] Add the browser token request contract at `/api/livekit/token`.
- [x] Disable simulation scenario triggers outside demo mode.
- [ ] Display microphone state and permission failures.
	- Dependency: LiveKit token endpoint and browser permission testing; owner: Dev2 after endpoint is available.
- [ ] Display interim user transcript.
	- Dependency: LiveKit data/transcript event delivery from agent; owner: Dev3 supplies event contract, Dev2 renders it.
- [ ] Display final user transcript.
	- Dependency: Dev3 final transcript event delivery; owner: Dev3 supplies event contract, Dev2 renders it.
- [ ] Display assistant transcript/spoken text.
	- Dependency: Dev3 authoritative assistant response event; owner: Dev3 supplies event contract, Dev2 renders it.
- [ ] Display listening, thinking, speaking, and interruption states.
	- Dependency: Agent state/data-channel events; owner: Dev3 publishes authoritative state, Dev2 maps it.
- [ ] Display current authoritative turn ID.
	- Dependency: Dev3 turn event payload; owner: Dev3 supplies turn ID, Dev2 renders it.
- [ ] Display connection and provider errors.
	- Dependency: Live endpoint/provider runtime; owner: Dev2 UI is ready, live verification awaits endpoint/credentials.
- [ ] Keep the existing dashboard layout and unrelated components unchanged.
	- Dependency: None; owner: Dev2 review item before merge.

### 5. Implement interruption and barge-in recovery

Status: PARTIALLY COMPLETE; LIVE SESSION WIRING PENDING

- [ ] Confirm LiveKit AgentSession interruption settings for the installed version.
	- Dependency: Real AgentSession runtime and Dev3 agent configuration; owner: Dev2 after runtime handoff.
- [ ] Enable the appropriate interruption mode and minimum speech thresholds.
	- Dependency: Dev3 agent/session startup path; owner: Dev2 chooses and configures it.
- [ ] Detect user barge-in while Rime is speaking.
	- Dependency: LiveKit AgentSession active speech and VAD/STT events; owner: Dev2.
- [ ] Record `interruption_detected_at`.
	- Dependency: Live interruption event; owner: Dev2.
- [ ] Record `audio_stop_requested_at`.
	- Dependency: Live interruption event; owner: Dev2.
- [ ] Call the supported LiveKit speech interruption API.
	- Dependency: Live AgentSession handle; owner: Dev2.
- [ ] Propagate `AbortSignal` to direct Rime synthesis where that path is used.
	- Dependency: Authoritative response reaches `RimeSpeechCoordinator`; owner: Dev2 has provider support implemented, final wiring depends on Dev3 response event.
- [ ] Prevent queued obsolete speech segments from playing.
	- Dependency: Live AgentSession output path; owner: Dev2.
- [ ] Record `audio_stopped_at`.
	- Dependency: Actual playback stop callback/observable; owner: Dev2.
- [ ] Calculate `cutoff_latency_ms` using monotonic/high-resolution timing.
	- Dependency: Actual stop timestamp; owner: Dev2.
- [ ] Notify the existing turn manager that the old turn is superseded.
	- Dependency: Dev3 turn-manager supersession API; owner: Dev3 exposes it, Dev2 calls it.
- [ ] Ensure obsolete assistant text is not emitted as current speech.
	- Dependency: Dev3 authoritative response IDs; owner: Dev2 output fence is implemented, final event wiring pending.
- [ ] Ensure late old tool results cannot commit authoritative dashboard state.
	- Dependency: Dev3 existing backend fence; owner: Dev3 verifies state fence, Dev2 verifies no stale speech.
- [ ] Ensure Turn 2 continues listening and speaking normally.
	- Dependency: Complete Dev3 turn pipeline and live credentials; owner: Dev2 runs the integration test.

The voice fence must complement the backend fence. It must not replace it.

### 6. Add voice telemetry

Status: PARTIALLY COMPLETE; SHARED LOGGER AND LIVE IDS PENDING

Integrate with the existing `EventLogger` once its actual location/API is available.

Required events where applicable:

- [x] `stt_interim` and `stt_final` adapter events.
- [x] `interruption_detected`, `audio_stop_requested`, and `audio_stopped` provider-boundary events.
- [x] `tts_started`, `tts_first_audio`, `tts_completed`, and `tts_cancelled` coordinator events.
- [x] `voice_session_error` and agent-state adapter events.
- [ ] `voice_session_started` and `voice_session_connected` emitted by the final runtime entrypoint.
	- Dependency: Dev3 agent factory and LiveKit worker startup; owner: Dev2.
- [ ] Forward all adapter events to the shared `EventLogger`.
	- Dependency: EventLogger implementation/API; owner: Dev4 or backend owner.

Include timestamps and IDs where available:

- [ ] `conversationId`, `turnId`, and `requestId`.
	- Dependency: Dev3 authoritative event contract; owner: Dev3 supplies IDs, Dev2 forwards them.
- [x] Rime model, speaker, language, and transport are available from the Dev2 configuration.
- [ ] Attach the configuration and IDs to live logger events.
	- Dependency: Shared EventLogger and Dev3 IDs; owners: Dev4/backend owner and Dev3.

Never log credentials, access tokens, or secrets.

### 7. Add configurable tool delay support

Status: BLOCKED ON TOOL OWNER

- [ ] Reuse the existing backend tool-delay mechanism if one exists.
	- Dependency: Dev3 query/tool implementation; owner: Dev3.
- [ ] Otherwise agree with Dev3 on the smallest shared configuration hook.
	- Dependency: Dev3 tool executor design; owner: Dev3.
- [ ] Support development-only `VOICEOPS_TOOL_DELAY_MS`.
	- Dependency: Dev3 exposes delay in tool executor; owner: Dev3 implements, Dev2 consumes for acceptance test.
- [ ] Demonstrate Turn 1 still completing in the background after interruption.
	- Dependency: Tool delay plus live agent pipeline; owner: Dev2 and Dev3 jointly test.
- [ ] Verify Turn 1 cannot overwrite Turn 2 state or speech.
	- Dependency: Dev3 state fence and response IDs; owners: Dev3 state, Dev2 speech.
- [ ] Ensure production default is no artificial delay.
	- Dependency: Tool configuration; owner: Dev3.

Do not duplicate the query engine or tool executor in the realtime package.

### 8. Add deterministic interruption tests

Status: PARTIALLY COMPLETE; LIVE MOCKS AND LOGGER CONTRACT PENDING

- [x] Test valid voice configuration loads.
- [x] Test Rime configuration validation and selected defaults.
- [x] Test obsolete response suppression before TTS.
- [x] Test current response emission.
- [ ] Test LiveKit session construction with valid configuration.
	- Dependency: Dev3 agent factory/real session constructor; owner: Dev2 after handoff.
- [ ] Test Rime TTS construction with selected model/speaker.
	- Dependency: Provider mock or live-safe constructor fixture; owner: Dev2.
- [ ] Test direct Rime synthesis cancellation with an `AbortSignal` where applicable.
	- Dependency: Rime stream mock or live credential fixture; owner: Dev2.
- [ ] Test interruption telemetry.
	- Dependency: Shared EventLogger contract and mocked AgentSession event source; owners: Dev2 plus Dev4/backend owner.
- [ ] Test credential redaction in telemetry/logging.
	- Dependency: Shared EventLogger contract; owner: Dev4/backend owner supplies logger, Dev2 writes test.
- [ ] Test browser session connection state transitions with mocked LiveKit room.
	- Dependency: Mocking strategy for `livekit-client`; owner: Dev2.
- [ ] Test microphone permission failure handling.
	- Dependency: Browser test harness and mocked permission rejection; owner: Dev2.
- [ ] Keep live credential tests separate from deterministic CI tests.
	- Dependency: Live credential environment; owner: Dev2/Dev4.

### 9. Run the manual acceptance test

Status: BLOCKED ON LIVE PREREQUISITES

Dependencies: Dev3 agent/turn pipeline, server token endpoint, valid LiveKit and Rime credentials, and Dev4 test/evidence procedure. Owners: Dev3 for agent/turn pipeline, server owner for token endpoint, Dev2 for execution, Dev4 for evidence capture.

Scenario:

1. Say: `Show failed transactions from Bangalore.`
2. Wait until the tool is running or Rime starts speaking.
3. Interrupt with: `Wait, only Mumbai failures above ten thousand rupees.`

Verify:

- [ ] Old Rime audio stops.
- [ ] New transcript is captured.
- [ ] Turn 2 becomes authoritative.
- [ ] Turn 2 query contains Mumbai, FAILED, and minimum 10000.
- [ ] Old tool result does not overwrite the dashboard.
- [ ] Old response does not remain current speech.
- [ ] New Rime response is heard.
- [ ] Dashboard ends in Turn 2 state.
- [ ] Repeat the scenario several times.
- [ ] Record actual repetition count and outcomes.

Do not claim a success rate until the repetitions are actually run.

### 10. Update documentation and evidence

Status: PARTIALLY COMPLETE; LIVE RESULTS PENDING

- [x] `.env.example` contains placeholder-only Rime settings.
- [ ] Update README setup instructions for the actual shipped package layout.
	- Dependency: Final Dev3 agent/server package paths and startup command; owner: Dev3 supplies final paths, Dev2 updates voice sections.
- [x] Document the selected provider configuration in Dev2 plan and environment example.
- [ ] Document the live agent startup command.
	- Dependency: Dev3 agent factory and worker entrypoint; owner: Dev2 after runtime integration.
- [ ] Document browser token requirements.
	- Dependency: Server token endpoint contract; owner: server/token owner.
- [x] Document current failure behavior and known unverified live limitations in `DEV2_PLAN.md`.
- [ ] Update `RIME_EVIDENCE.md` with measured results only.
	- Dependency: Live Rime/LiveKit runs; owner: Dev4 updates evidence, Dev2 supplies measurements.
- [ ] Replace TBD values only after running the acceptance test.
- [ ] Record cold and warm measurements separately where practical.
- [ ] Document that cached, simulated, and live measurements are different.
- [ ] Include reproducible commands and fixtures.
	- Dependency: Final test runner and live acceptance harness; owner: Dev4, with Dev2 voice fixtures.

### 11. Final branch verification and handoff

Status: PARTIALLY COMPLETE; FINAL INTEGRATION VERIFICATION PENDING

- [ ] Run `npm.cmd install`.
	- Dependency: None; owner: Dev2 reruns after final dependency changes.
- [ ] Run `npm.cmd run typecheck`.
	- Dependency: Shared package must build first under current npm workspace setup; owner: Dev2.
- [ ] Run `npm.cmd run build`.
	- Dependency: Final agent/server packages; owner: Dev2.
- [ ] Run `npm.cmd run test`.
	- Dependency: Final workspace test scripts; owner: Dev2.
- [ ] Run focused interruption tests.
	- Dependency: Dev3 pipeline and token endpoint for integration tests; owner: Dev2/Dev4.
- [ ] Run available E2E tests.
	- Dependency: Browser token endpoint, agent runtime, and test harness; owners: Dev3/server owner/Dev4.
- [ ] Review `git diff` for Dev2 scope only.
	- Dependency: Final branch state; owner: Dev2.
- [ ] Confirm no credentials or `.env` files are tracked.
	- Dependency: Final branch state; owner: Dev2.
- [ ] Confirm no unrelated dashboard/backend redesign was introduced.
	- Dependency: Final branch state; owner: Dev2 and reviewer.
- [ ] Commit Dev2 changes on `feat/dev2-voice-realtime-rime`.
	- Dependency: Team approval and final validation; owner: Dev2.
- [ ] Report the commit and merge notes to the team.
	- Dependency: Commit exists; owner: Dev2.

## Acceptance Criteria

Dev2 is complete when all of the following are true:

- [ ] Browser microphone connects to LiveKit using a server-issued token.
	- Dependency/owner: server token endpoint by Dev3/server owner; Dev2 verifies browser connection.
- [ ] Voice session reaches the agent runtime.
	- Dependency/owner: Dev3 `voice.Agent` factory and runtime entrypoint; Dev2 wires and verifies.
- [ ] STT emits interim and final transcripts.
	- Dependency/owner: Live agent runtime and token path; Dev2 implementation, Dev3 integration prerequisite.
- [ ] Final transcript reaches the existing turn pipeline.
	- Dependency/owner: Dev3 turn-manager API; Dev3 exposes, Dev2 forwards.
- [ ] Existing query tools can execute through Dev3's path.
	- Dependency/owner: Dev3 LLM/tool pipeline; Dev3 owns implementation, Dev2 verifies voice path.
- [ ] Dashboard receives authoritative state through existing fencing.
	- Dependency/owner: Dev3 data-channel/state publisher; Dev3 owns state, Dev2 verifies display.
- [x] Rime is configured as the primary spoken-output provider.
- [ ] Rime audio reaches the user over the shipped path.
	- Dependency/owner: Live AgentSession output plus credentials; Dev2 wires, Dev3/server owner supplies runtime.
- [x] Exact selected Rime model, speaker, language, format, sample rate, and transport are documented.
- [ ] User interruption stops obsolete speech promptly.
	- Dependency/owner: Live AgentSession and real speech path; Dev2 implements/verifies after Dev3 runtime exists.
- [x] Rime synthesis cancellation path is implemented with `AbortSignal` and stream closure.
- [ ] Rime playback cancellation is tested on the shipped LiveKit path.
	- Dependency/owner: Live AgentSession output and credentials; Dev2/Dev4 test.
- [x] Obsolete responses are blocked by the voice output fence before TTS.
- [ ] Existing backend fencing prevents stale state commits.
	- Dependency/owner: Dev3 `TurnManager`/`StateCommitBoundary`; Dev3 verifies.
- [ ] Voice telemetry records interruption and TTS timing in the shared logger.
	- Dependency/owner: EventLogger API by Dev4/backend owner; Dev2 supplies adapter/events.
- [ ] Manual acceptance scenario is reproducible.
	- Dependency/owner: Dev3 pipeline, server token endpoint, credentials; Dev2 runs, Dev4 records evidence.
- [x] Current Dev2 code typechecks, builds, and focused tests pass.
- [ ] Full final-branch validation passes after cross-developer merge.
	- Dependency/owner: All merged packages; Dev2 runs final verification.
- [x] Known current limitations are documented honestly.

## Current Validation Record

Last verified on 2026-09-08:

- `npm.cmd install`: passed; npm reported 2 audit findings and pending install-script approvals.
- `npm.cmd --workspace=@voiceops/agent run build`: passed.
- `npm.cmd --workspace=@voiceops/agent run test`: passed, 7 tests.
- `npm.cmd --workspace=@voiceops/shared run build`: passed.
- `npm.cmd --workspace=@voiceops/web run typecheck`: passed after shared declarations were built.
- `npm.cmd --workspace=@voiceops/web run typecheck`: passed.
- `npm.cmd --workspace=@voiceops/web run build`: passed; production assets generated.
- `npm.cmd run typecheck`: passed after shared declarations were built.
- Live Rime synthesis: not yet run; no credentials available in this workspace.
- LiveKit room connection: not yet run; no token/server path available in this workspace.
- Manual interruption acceptance test: not yet run.
- Measured latency: none recorded yet.

## Handoff Notes

The next person should begin with the blocked integration points, not rewrite the foundation:

1. Dev3 provides the `voice.Agent` factory, turn-manager handoff, response IDs, and tool-delay hook.
2. The server/token owner provides `GET /api/livekit/token` with `{ token, livekitUrl? }`.
3. Dev2 wires the runtime entrypoint, authoritative transcripts/responses, and LiveKit output path.
4. Dev4 or the backend owner provides the shared `EventLogger` API.
5. Dev2 and Dev4 run the interruption acceptance test and record real measurements.

Do not mark the project as Rime-verified until a real Rime request has succeeded with the exact configuration above. Do not mark interruption recovery complete until the user-visible audio cutoff and stale-result behavior have both been observed and recorded.
