# VoiceOps Rime Voice & Interruption Evidence

> This document is maintained by the **Evaluation / Integration Engineer** to document benchmark results, voice latency, and interruption handling evidence using **Rime TTS** in VoiceOps.
>
> *Note: In accordance with project governance, no unverified benchmark numbers, fabricated model IDs, or synthetic audio measurements are recorded here prior to automated test execution.*

---

## 1. Hard Voice Problem

### Context & Definition
In high-velocity operations support workflows, analysts frequently issue rapid follow-up commands or corrective queries before an AI finishes speaking or while backend analytical tool calls are executing (e.g., changing filters mid-query: *"Show failed transactions from Bangalore... Wait, only Mumbai failures above ten thousand rupees"*).

### Core Challenges
1. **Audio Latency & Stale Audio Cutoff**: Promptly truncating in-flight Rime audio playback when an interruption (Voice Activity Detection / User Barge-in) is detected to avoid confusing the operator.
2. **Turn Invalidation & Authoritative State**: Invalidating obsolete turn IDs (`turn_id`) and canceling or fencing running asynchronous tool queries so that outdated tool results cannot commit state mutations or trigger stale speech.
3. **Conversational Coherence**: Guaranteeing that the next synthesized response acknowledges only the latest user intent while reflecting only the fragment of information the operator actually heard.

---

## 2. Acceptance Test

### Test Scenario: Rapid Interruption and Query Override
- **Initial State**: Analyst is viewing the default operations overview.
- **Action 1 (Turn 1)**: Analyst speaks: *"Show failed transactions from Bangalore."*
- **Trigger**: Backend begins executing `query_transactions(region="Bangalore", status="FAILED")`; Rime begins streaming introductory speech (*"Fetching failed transactions for Bangalore..."*).
- **Action 2 (Turn 2 - Interruption at T = 450ms)**: Analyst interrupts: *"Wait, only Mumbai failures above ten thousand rupees."*
- **Pass Criteria**:
  1. **Turn 1 Obsolete**: Turn 1 is invalidated and marked obsolete immediately upon barge-in detection.
  2. **Audio Cutoff**: Rime audio playback from Turn 1 stops promptly, recording timestamps (`interruption_detected_at`, `audio_stop_requested_at`, `audio_stopped_at`, `cutoff_latency_ms`).
  3. **Turn 2 Authoritative**: Turn 2 is initiated with an incremented `turn_id` and unique `request_id`.
  4. **Late Result Discarded**: Any late-arriving Turn 1 tool result is fenced and discarded without mutating state.
  5. **Clean Dashboard State**: Dashboard table renders strictly Mumbai failed transactions with amount $> ₹10,000$ (zero Bangalore records appear or flicker).
  6. **Turn 2 Spoken Response**: Final synthesized Rime audio speaks exclusively to Turn 2 results (*"Showing failed transactions for Mumbai above ₹10,000"*).

---

## 3. Test Procedure

### Automated Vitest / Headless LiveKit Simulation
1. Initialize mock LiveKit audio room with simulated analyst participant and VoiceOps agent.
2. Inject synthetic audio stream corresponding to Turn 1 utterance (*"Show failed transactions from Bangalore"*).
3. Assert agent state transitions: `IDLE` $\to$ `LISTENING` $\to$ `THINKING` $\to$ `EXECUTING_TOOL` $\to$ `SPEAKING`.
4. Inject interrupting audio packet at $T = +450\text{ ms}$ (*"Wait, only Mumbai failures above ten thousand rupees"*).
5. Monitor LiveKit track cancellation events and measure cutoff timestamp.
6. Verify tool execution cancellation token triggered and fence active.
7. Verify data channel state sync payload contains `turn_id: 2` with fence tag.

### End-to-End Playwright UI Verification
1. Launch Frontend (`packages/web`) and Backend Agent (`packages/agent`).
2. Run scripted audio injection test suite (`tests/e2e/interruption.spec.ts`).
3. Assert visual tables update strictly to Turn 2 parameters (Mumbai, FAILED, amount $> 10000$).
4. Capture client audio buffer metrics and timestamps.

---

## 4. Environment

- **LiveKit Server / Cloud**: Local / Cloud LiveKit Sandbox
- **Agent Runtime**: Node.js (v20+ LTS), TypeScript 5.x
- **Speech-to-Text (STT)**: LiveKit compatible real-time STT provider
- **Text-to-Speech (TTS)**: Rime API Integration (configured via `@voiceops/agent` TTS pipeline)
- **LLM Engine**: Tool-calling capable foundation model (e.g., Gemini 2.5 Flash / compatible)
- **Client OS / Browser**: Chrome / Chromium (Headless & Interactive)
- **Network Profile**: Simulated 50ms RTT / zero packet loss baseline

---

## 5. Measurements

*To be populated during Phase 3 & Phase 4 test runs based on instrumented timestamps.*

| Run # | Utterance Length (words) | Interruption Offset (ms) | Cutoff Latency (`cutoff_latency_ms`) | Tool Cancel Latency (ms) | Turn 2 Time-to-First-Audio (TTFA) (ms) | State Consistency (Pass/Fail) |
|---|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| TBD | TBD | TBD | TBD | TBD | TBD | TBD |

---

## 6. Results

*Empirical test results, log traces, and benchmark outputs will be appended here upon execution of automated test suites.*

- **Interruption Detection Success Rate**: `Pending test execution`
- **Fencing Integrity (Zero Stale State Overwrites)**: `Pending test execution`
- **Measured Interruption-to-Silence Cutoff Latency**: `Pending test execution`
- **End-to-End Latency Profile**: `Pending test execution`

---

## 7. Limitations

- **Browser Audio Context Latency**: Browser-level buffer draining can introduce variance depending on client OS sound drivers.
- **Non-Cancellable Sync Tools**: In-flight synchronous database operations cannot be aborted mid-instruction; handled via generation fencing (`current_turn_id === turn_id` check before state commit).
- **Synthetic Network Jitter**: High packet jitter may delay barge-in packet arrival at LiveKit server.

---

## 8. Reproducibility Commands

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Run unit and turn-fencing tests
pnpm test:unit

# 3. Run automated interruption simulation suite
pnpm test:interruption

# 4. Run full end-to-end integration suite with latency report generation
pnpm test:e2e:latency
```
