You are the Voice / Realtime Engineer on the VoiceOps hackathon project.

YOUR OWNERSHIP:

You own the realtime voice pipeline and Rime integration.

Primary ownership:

- LiveKit Agents integration
- LiveKit room/session connection
- browser microphone -> LiveKit audio
- STT integration
- Rime TTS integration
- realtime audio output
- voice session lifecycle
- interruption/barge-in handling at the audio layer
- voice telemetry/instrumentation

You may modify:

- packages/agent/src/realtime/**
- packages/agent/src/voice/**
- packages/agent/src/providers/**
- packages/agent/src/index.ts when required for realtime startup
- packages/web/src/voice/**
- frontend voice hooks/components when required to connect the real voice session
- package.json / package-lock.json for required LiveKit/Rime dependencies
- .env.example for placeholder environment variables
- docs related to realtime setup

You may READ:

- packages/agent/src/**
- packages/shared/src/**
- packages/web/src/**
- RIME_EVIDENCE.md

IMPORTANT:

Do NOT redesign the AI/backend turn-fencing architecture.

Do NOT replace TurnManager or StateCommitBoundary.

Do NOT remove existing stale-result protection.

Do NOT modify unrelated frontend/dashboard components.

Do NOT expose API keys.

Do NOT commit .env files.

==================================================
PROJECT
==================================================

VoiceOps is a voice-native operations analytics dashboard/copilot.

The target user is an operations/support analyst investigating transactions and incidents.

The primary voice workflow is:

User:
"Show failed transactions from Bangalore."

The system:
Microphone
→ LiveKit
→ STT
→ agent/LLM
→ query_transactions
→ authoritative dashboard state
→ Rime TTS
→ user

The defining hard voice problem is:

INTERRUPTION AND RECOVERY.

Example:

Turn 1:
"Show failed transactions from Bangalore."

While the agent is processing or speaking, the user interrupts:

Turn 2:
"Wait, only Mumbai failures above ten thousand rupees."

Expected behavior:

1. Turn 1 becomes obsolete.
2. Obsolete Rime audio stops as promptly as possible.
3. Turn 2 becomes authoritative.
4. Obsolete asynchronous work is cancelled where possible.
5. If old work cannot be cancelled, the existing backend turn fence prevents it from becoming authoritative.
6. No stale Turn 1 response should be spoken as the current response.
7. Turn 2 produces the final authoritative response.
8. Dashboard state eventually reflects Turn 2.

==================================================
IMPORTANT: VERIFY CURRENT APIS FIRST
==================================================

Before implementing anything:

Inspect the current official LiveKit Agents Node.js documentation and current Rime integration documentation.

Do NOT rely on old examples from memory.

The current official LiveKit documentation indicates:

- Node.js LiveKit Agents is supported.
- Rime is available through the official Rime LiveKit plugin.
- The current Rime Node.js plugin package is:
  @livekit/agents-plugin-rime
- Current Rime integration supports HTTP synthesis and WebSocket streaming.
- WebSocket mode is relevant for lower-latency streaming and word-level timestamps.
- Current Rime model IDs/voices must be verified from the live documentation/catalog before finalizing configuration.

Use the official documentation as the source of truth.

Do not invent APIs, class names, method names, event names or configuration fields.

If the installed LiveKit package version differs from the documentation examples, inspect the installed TypeScript types and adapt to the actual installed version.

==================================================
PHASE 1 — INSPECT EXISTING PROJECT
==================================================

Before coding:

1. Inspect packages/agent.
2. Inspect packages/shared.
3. Inspect packages/web.
4. Inspect existing TurnManager.
5. Inspect TurnContext.
6. Inspect StateCommitBoundary.
7. Inspect EventLogger.
8. Inspect existing dashboard voice interfaces.
9. Inspect package.json.
10. Inspect RIME_EVIDENCE.md.

Understand the existing interfaces before changing anything.

DO NOT duplicate turn-management logic.

The existing backend already owns authoritative turn state.

Your job is to connect the realtime voice layer to that architecture.

==================================================
PHASE 2 — INSTALL LIVEKIT DEPENDENCIES
==================================================

Install only the dependencies actually required for the current Node.js implementation.

At minimum determine the current versions required for:

- @livekit/agents
- @livekit/agents-plugin-rime
- livekit-client

Use the project's existing npm workspace setup.

Do not switch package managers.

Do not blindly copy package versions from old tutorials.

After installation:

npm install

Then verify:

npm run typecheck

and:

npm run build

Do not proceed with broken dependency resolution.

==================================================
PHASE 3 — ENVIRONMENT CONFIGURATION
==================================================

Determine the required environment variables from the current official LiveKit documentation.

The project must support environment configuration without exposing secrets.

Potential variables may include:

LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
RIME_API_KEY

Only add variables that are actually required by the chosen architecture.

IMPORTANT:

Do NOT put real credentials into:

- Git
- GitHub
- source code
- README
- screenshots
- RIME_EVIDENCE.md

Update:

.env.example

with placeholders only.

Example:

LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
RIME_API_KEY=

Do not invent credential formats.

==================================================
PHASE 4 — BASIC LIVEKIT CONNECTION
==================================================

Implement the basic realtime connection.

Goal:

Browser
→ microphone
→ LiveKit room
→ Voice Agent

The browser must be able to establish a voice session.

Implement clean abstractions such as:

VoiceSession
VoiceSessionState
VoiceConnectionState

Possible states:

disconnected
connecting
connected
listening
thinking
speaking
error

Use the actual LiveKit APIs rather than inventing a custom transport.

The frontend should be able to display:

Connected
Listening
Thinking
Speaking
Disconnected

==================================================
PHASE 5 — MICROPHONE INPUT
==================================================

Connect browser microphone input to LiveKit.

The user should be able to:

1. Open VoiceOps.
2. Click/start voice interaction.
3. Grant microphone permission.
4. Join/connect to the LiveKit session.
5. Speak naturally.
6. Have the agent receive the audio.

Handle:

- microphone permission denied
- connection failure
- reconnect
- disconnect
- cleanup

Do not create a fake microphone simulator for the actual live path.

A simulator can remain available for automated UI tests, but clearly label it as simulation.

==================================================
PHASE 6 — STT
==================================================

Integrate a LiveKit-compatible STT provider.

Before selecting one:

Check current official LiveKit Node.js plugin support.

Choose a provider that is:

- easy to configure
- stable
- appropriate for English
- capable of recognizing numbers and place names
- compatible with the chosen LiveKit AgentSession architecture

Keep STT behind a provider boundary where practical.

The voice pipeline should produce:

interim transcript
final transcript

The final user utterance must be forwarded into the existing agent/turn system.

==================================================
PHASE 7 — CONNECT TO EXISTING TURN MANAGER
==================================================

This is extremely important.

Do NOT create a second turn-management system.

When a final user utterance is accepted:

call/use the existing turn-management mechanism.

The flow should conceptually be:

final STT transcript
        ↓
create authoritative turn
        ↓
TurnContext
        ↓
existing LLM/tool pipeline

The realtime layer must propagate:

conversationId
turnId
requestId

where appropriate.

The existing backend owns:

- turn sequencing
- superseding
- stale-result fencing
- authoritative state commits

The realtime layer owns:

- detecting/handling voice interruption
- stopping obsolete audio
- coordinating the voice session

==================================================
PHASE 8 — RIME TTS
==================================================

Integrate Rime as the PRIMARY TTS provider.

Use the current official LiveKit Rime plugin.

Do NOT create a fallback TTS provider at this stage.

Rime must be the actual spoken output used by the application.

The implementation must document:

- Rime model ID
- Rime speaker/voice
- language
- endpoint
- audio format
- sample rate
- HTTP/WebSocket transport
- relevant latency options

IMPORTANT:

Verify the exact model and speaker against the current Rime/LiveKit documentation.

Do not assume that an old example is still valid.

For the initial implementation, prefer the current Rime WebSocket streaming capability if it integrates cleanly with the current LiveKit plugin.

The current official documentation indicates that WebSocket mode can provide streaming and word-level timestamps.

Use sentence-based or appropriate streaming segmentation according to the actual API and desired latency.

Keep spoken responses concise.

==================================================
PHASE 9 — RIME CONFIGURATION
==================================================

Choose one verified current Rime configuration for the hackathon.

Document it in a central configuration object/environment.

Example conceptual structure:

RIME_MODEL_ID
RIME_SPEAKER
RIME_LANGUAGE
RIME_AUDIO_FORMAT
RIME_SAMPLE_RATE
RIME_TRANSPORT

Do not hard-code secrets.

Do not hard-code an old model simply because it appears in an example.

At completion, report the exact configuration actually tested.

==================================================
PHASE 10 — HAPPY PATH
==================================================

Get this exact flow working before implementing complex interruption logic:

User:

"Show failed transactions from Bangalore."

Expected:

1. Microphone receives speech.
2. LiveKit transports audio.
3. STT produces transcript.
4. Agent accepts transcript.
5. Existing turn manager creates a turn.
6. LLM/tool layer calls query_transactions.
7. Dashboard state updates.
8. Response generator creates concise voice-ready response.
9. Rime synthesizes the response.
10. Rime audio streams back to the user.
11. User hears the response.

The assistant should say something similar to:

"I found the failed transactions from Bangalore."

Do not add unnecessary conversational filler.

==================================================
PHASE 11 — REAL INTERRUPTION / BARGE-IN
==================================================

Now implement the critical feature.

Scenario:

Turn 1:
"Show failed transactions from Bangalore."

Agent starts responding.

User interrupts:

"Wait, only Mumbai failures above ten thousand rupees."

Expected:

A. Detect interruption/barging-in.

B. Stop or cancel obsolete Rime speech generation/playback.

C. Record:

interruption_detected_at

D. Record:

audio_stop_requested_at

E. Record:

audio_stopped_at

F. Calculate:

cutoff_latency_ms

G. Notify/use the existing turn manager so Turn 1 becomes superseded.

H. Accept Turn 2 as the new authoritative turn.

I. Do NOT allow Turn 1 speech to continue as current speech.

J. Do NOT allow Turn 1 tool results to become authoritative.

K. Allow Turn 2 to execute.

L. Rime speaks the Turn 2 response.

==================================================
PHASE 12 — AUDIO CANCELLATION
==================================================

This is one of the most important engineering tasks.

Understand exactly how the current LiveKit AgentSession and TTS output cancellation works.

Do not simply hide the frontend voice widget.

The actual audio generation/output must stop or be cancelled.

When an interruption occurs:

1. Identify the active speech generation associated with the obsolete turn.
2. Abort/cancel its synthesis if the API supports an AbortSignal.
3. Stop obsolete audio playback/output.
4. Prevent queued obsolete speech segments from playing.
5. Record timestamps.
6. Continue with the new turn.

The current Rime Node.js TTS API exposes synthesis with an AbortSignal, so investigate using the actual API for cancellation where appropriate.

Do not invent a custom cancellation mechanism if LiveKit already provides one.

==================================================
PHASE 13 — STALE SPEECH PROTECTION
==================================================

The backend already protects state from stale results.

The voice layer must provide an equivalent guarantee for speech.

Every response that reaches the TTS layer should be associated with:

turnId
requestId

Before speech is emitted:

verify that the response still belongs to the authoritative turn.

Conceptually:

if response.turnId !== currentAuthoritativeTurnId:
    do not speak it

If an obsolete response has already started streaming:

stop/cancel it.

This is a voice-output fence.

==================================================
PHASE 14 — TOOL DELAY TEST
==================================================

Create a development-only configurable tool delay.

Example:

VOICEOPS_TOOL_DELAY_MS=5000

Do not permanently force a 5-second delay in production.

This delay exists specifically to demonstrate:

Turn 1
→ tool running
→ user interrupts
→ Turn 2
→ old Turn 1 completes later
→ stale result discarded

Coordinate with the existing backend test mechanism rather than duplicating the tool engine.

==================================================
PHASE 15 — OBSERVABILITY
==================================================

Integrate with the existing EventLogger.

Emit/record appropriate events such as:

voice_session_started
voice_session_connected
stt_interim
stt_final
interruption_detected
audio_stop_requested
audio_stopped
tts_started
tts_first_audio
tts_completed
tts_cancelled
voice_session_error

Where applicable include:

timestamp
conversationId
turnId
requestId

For TTS events include:

model
speaker
language
transport

Do NOT log:

RIME_API_KEY
LIVEKIT_API_SECRET
access tokens
private credentials

==================================================
PHASE 16 — LATENCY METRICS
==================================================

Instrument:

1. STT finalization latency

2. LLM/tool start timing

3. Rime TTFA

4. interruption detection time

5. audio stop request time

6. actual audio stop time

7. interruption cutoff latency

8. total response duration

Use monotonic/high-resolution timing where appropriate.

Do NOT publish numbers until they are actually measured.

Differentiate:

cold
warm

where practical.

Record enough information for Person 4 to use the measurements in RIME_EVIDENCE.md.

==================================================
PHASE 17 — RIME EVIDENCE
==================================================

Update RIME_EVIDENCE.md with the exact live integration configuration.

Include:

Provider:
Rime

Integration:
LiveKit Agents Rime plugin

Model:
<exact tested model>

Speaker:
<exact tested speaker>

Language:
<exact tested language>

Endpoint:
<actual endpoint/transport>

Audio format:
<actual>

Sample rate:
<actual>

Transport:
HTTP / WebSocket

Do not leave placeholders once the integration is verified.

Also include:

- installation package
- relevant configuration
- test command
- environment requirements
- limitations

Do not expose credentials.

==================================================
PHASE 18 — FRONTEND INTEGRATION
==================================================

Connect the existing Person 1 voice widget to the real voice session.

The frontend should display:

- connection state
- microphone state
- current transcript
- assistant transcript
- speaking state
- listening state
- interruption state
- current authoritative turn ID
- connection errors

Do not redesign the entire dashboard.

Use existing shared contracts.

The frontend should clearly distinguish:

LIVE VOICE

from:

SIMULATION / DEMO MODE

Do not make simulated voice appear to be real Rime output.

==================================================
PHASE 19 — FAILURE HANDLING
==================================================

Handle:

- LiveKit connection failure
- microphone permission failure
- STT failure
- LLM failure
- Rime failure
- interrupted TTS
- browser disconnect
- room disconnect
- malformed configuration

The application must fail visibly and recover where practical.

Do not silently switch to another TTS provider.

Rime is the primary provider for the judged path.

If a development fallback is absolutely necessary, clearly label it as a development fallback and never make it the default judged path.

==================================================
PHASE 20 — TESTING
==================================================

Add tests where appropriate.

At minimum verify:

A. Voice configuration loads.

B. LiveKit session can initialize with valid configuration.

C. Rime TTS initializes with the selected model/speaker.

D. Rime can synthesize a short test response.

E. TTS cancellation receives/propagates cancellation.

F. Obsolete response is not emitted to TTS.

G. Current response is emitted.

H. Interruption telemetry is generated.

I. No credentials appear in logs.

If live credentials are unavailable during automated CI, separate:

- deterministic unit tests
- live integration tests

Do NOT make fake live tests appear to be real provider tests.

==================================================
PHASE 21 — MANUAL ACCEPTANCE TEST
==================================================

Once the basic pipeline works, perform the real voice acceptance test.

Use:

Turn 1:
"Show failed transactions from Bangalore."

Wait until:

- tool is running and/or
- Rime starts speaking.

Interrupt with:

"Wait, only Mumbai failures above ten thousand rupees."

Verify:

1. Old Rime audio stops.
2. New transcript is captured.
3. New turn becomes authoritative.
4. New tool query uses Mumbai + FAILED + minimum 10000.
5. Old result does not overwrite the dashboard.
6. Old response does not become current speech.
7. New Rime response is heard.
8. Dashboard ends in the Turn 2 state.

Repeat the test several times.

Do not claim a success rate until actual repetitions have been performed.

==================================================
PHASE 22 — BUILD VERIFICATION
==================================================

Before finishing:

Run:

npm install

npm run typecheck

npm run build

Run the available test suite.

If the repository has:

npm run test:unit
npm run test:interruption
npm run test:stress
npm run test:contracts
npm run test:e2e

run the relevant tests.

Do not break existing tests.

==================================================
DEFINITION OF DONE
==================================================

Person 2's implementation is complete when:

1. Browser microphone connects to LiveKit.

2. Voice session is established.

3. STT receives user speech.

4. Final transcript reaches the existing agent/turn pipeline.

5. query_transactions can execute.

6. Dashboard receives authoritative state.

7. Rime is the actual primary TTS output.

8. Rime audio is streamed to the user.

9. Rime configuration is documented exactly.

10. User interruption can stop/cancel obsolete speech.

11. Existing turn fencing prevents stale backend results.

12. Voice telemetry records interruption and TTS timing.

13. Live acceptance test can reproduce the primary scenario.

14. Existing tests still pass.

15. Typecheck and build pass.

==================================================
IMPORTANT ARCHITECTURAL RULE
==================================================

DO NOT solve everything inside the realtime layer.

Responsibilities are:

VOICE / REALTIME:

- microphone
- LiveKit
- STT
- Rime
- audio playback
- interruption detection
- TTS cancellation
- voice telemetry

AI / BACKEND:

- LLM
- tool selection
- tool execution
- TurnManager
- StateCommitBoundary
- stale-result fencing
- authoritative application state

FRONTEND:

- dashboard
- visual state
- transcripts
- voice controls
- turn display

EVALUATION:

- automated tests
- stress tests
- evidence
- measurements
- reproducibility

Keep these boundaries intact.

==================================================
FINAL REPORT
==================================================

At the end, report:

1. Files changed.
2. Dependencies added.
3. LiveKit version actually installed.
4. Rime plugin version actually installed.
5. STT provider and version.
6. Exact Rime model.
7. Exact Rime speaker.
8. Language.
9. Audio format.
10. Sample rate.
11. HTTP/WebSocket transport.
12. Environment variables required.
13. Happy-path test result.
14. Interruption test result.
15. TTS cancellation behavior.
16. Latency measurements actually obtained.
17. Typecheck result.
18. Build result.
19. Tests passed/failed.
20. Known limitations.

Do not claim anything that was not actually tested.

Do not commit automatically.