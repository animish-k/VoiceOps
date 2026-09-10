# VoiceOps

> **Voice-Native Operations Analytics Dashboard & Copilot**

VoiceOps is a voice-native operations copilot for support and operations analysts to investigate transaction failures, operational incidents, and performance metrics through realtime conversational voice.

The core problem we address is not simply speech recognition. In real operational conversations, users interrupt, refine, and change requests while the system may still be processing the previous request.

VoiceOps therefore treats **interruption, recovery, and stale-result prevention as first-class system requirements**.

---

## 🎯 Target User

VoiceOps is designed for:

- Support engineers
- Operations analysts
- Payment operations teams
- Incident response teams
- Engineers investigating transaction failures

The goal is to let an operator investigate an incident naturally, as they would communicate with a teammate.

---

## 🚀 Problem

Operations teams often investigate transaction failures by manually navigating dashboards, applying filters, inspecting tables, and checking metrics.

During a live incident, this can slow down investigation and decision-making.

VoiceOps allows the analyst to perform these investigations conversationally.

For example:

> "Show me the failed transactions from Bangalore."

While the system is responding, the analyst can interrupt:

> "Wait — only transactions above ten thousand."

The previous turn becomes obsolete, the new turn becomes authoritative, and stale results from the previous request are prevented from overwriting the latest dashboard state or being spoken to the user.

---

# 🔥 Core Voice Problem

## Interruption + Recovery + Stale-Result Prevention

A naive voice assistant may stop speaking when a user interrupts but still allow the previous asynchronous operation to finish and update application state.

VoiceOps prevents this using a turn-fencing model.

Each user request receives:

- A monotonically increasing `turnId`
- A unique `requestId`
- An authoritative/superseded status

When a new request arrives:

1. The previous turn is interrupted/superseded.
2. The new turn becomes authoritative.
3. Cancellable work is cancelled where supported.
4. Asynchronous results retain their originating turn ID.
5. Results are checked against the authoritative turn before state mutation.
6. Only the latest authoritative turn can update the dashboard or produce the final spoken response.

**Cancellation is an optimization; turn fencing is the correctness mechanism.**

---

# ✨ Key Capabilities

### Voice-First Investigation

Users can query operational data naturally:

> "Show failed transactions from Bangalore."

> "Only transactions above ten thousand."

> "Show me the failures from Mumbai."

### Realtime Voice

VoiceOps uses LiveKit for realtime audio transport and conversational interaction.

### Rime TTS

Rime is the active text-to-speech provider used for spoken agent responses.

### Interruption Recovery

Users can interrupt an ongoing response and immediately provide a refined request.

### Stale-Result Prevention

Older asynchronous results cannot overwrite state belonging to a newer authoritative turn.

### Live Dashboard Synchronization

Authoritative agent results are published through the realtime data channel and reflected in the React dashboard.

---

# 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │        User         │
                    │      Microphone     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      LiveKit        │
                    │   Realtime WebRTC   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │        STT          │
                    │  Deepgram Nova-3    │
                    └──────────┬──────────┘
                               │
                               ▼
                 ┌────────────────────────────┐
                 │      VoiceOps Agent        │
                 │                            │
                 │  Agent Coordinator         │
                 │  Turn Manager              │
                 │  Tool Registry             │
                 │  State Fence               │
                 │  Response Generator        │
                 └────────────┬───────────────┘
                              │
                ┌─────────────┼──────────────┐
                │             │              │
                ▼             ▼              ▼
        Transaction       Metrics       Operations /
           Tools           Tools          Incidents
                │             │              │
                └─────────────┼──────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Authoritative State │
                   │     Turn Fence      │
                   └──────────┬──────────┘
                              │
                       LiveKit Data Channel
                              │
                              ▼
                   ┌─────────────────────┐
                   │ React Dashboard     │
                   │ Zustand State       │
                   │ Tables + Metrics    │
                   └─────────────────────┘

                              │
                              ▼
                   ┌─────────────────────┐
                   │       Rime TTS      │
                   │   Spoken Response   │
                   └─────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Lucide Icons
- Recharts
- LiveKit React components
- Zustand

## Realtime / Voice

- LiveKit Agents
- LiveKit WebRTC
- Deepgram Nova-3 STT through LiveKit inference
- Rime TTS

## Agent / Backend

- Node.js
- TypeScript
- LiveKit Agents SDK
- Gemini API / tool-calling architecture
- Synthetic operations data engine
- Turn management and state fencing
- AbortController-based cancellation where supported

## Shared Contracts

- `@voiceops/shared`
- TypeScript event and state contracts

## Testing

- Node.js native test runner
- TypeScript build/type checking
- Automated interruption tests
- Stale-result race tests
- Turn-sequencing tests
- State-fencing tests
- Stress tests
- Dashboard state tests
- Simulated end-to-end workflow tests

---

# 🎙️ Rime Configuration

Rime is the active speech provider in the submitted implementation.

| Configuration | Value |
|---|---|
| Provider | Rime |
| Model ID | `coda` |
| Speaker | `celeste` |
| Language | `en` |
| Audio format | PCM |
| Sample rate | 24000 Hz |
| Channels | Mono |
| Runtime synthesis | HTTP / non-WebSocket |
| WebSocket streaming | Disabled |
| Integration | `@livekit/agents-plugin-rime` |

Rime is integrated through the LiveKit Rime plugin. The submitted runtime uses non-WebSocket synthesis.

---

# 📁 Repository Structure

```text
VoiceOps/
│
├── packages/
│   ├── shared/
│   │   └── Common TypeScript contracts and event schemas
│   │
│   ├── agent/
│   │   ├── Agent coordinator
│   │   ├── Transaction query tools
│   │   ├── Synthetic data engine
│   │   ├── Turn manager
│   │   ├── State fencing
│   │   ├── LiveKit realtime worker
│   │   └── Rime TTS integration
│   │
│   └── web/
│       ├── React dashboard
│       ├── Transaction table
│       ├── Metrics
│       ├── Incident panel
│       ├── Voice controls
│       └── LiveKit voice session
│
├── tests/
│   ├── contracts/
│   ├── data/
│   ├── interruption/
│   ├── state/
│   └── e2e/
│
├── docs/
│
├── README.md
├── RIME_EVIDENCE.md
├── .env.example
└── package.json
```

---

# ⚙️ Setup

## Requirements

- Node.js
- npm
- A LiveKit project
- A Rime API key
- A Gemini API key if using the Gemini provider

## Install dependencies

From the project root:

```bash
npm install
```

## Environment configuration

Copy the example environment file.

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### macOS / Linux

```bash
cp .env.example .env
```

Configure:

```text
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

RIME_API_KEY=
GEMINI_API_KEY=

PORT=3001
```

For the frontend:

```text
VITE_API_URL=http://localhost:3001
```

**Never commit `.env` or real API keys.**

---

# ▶️ Running VoiceOps

From the project root:

### Start the frontend

```bash
npm run dev:web
```

### Start the realtime agent

```bash
npm run dev:agent
```

### Start the token/API server

```bash
npm run dev:server
```

The frontend connects to the realtime LiveKit session and receives authoritative dashboard state through the realtime data channel.

---

# 🧪 Testing

Build the complete project:

```bash
npm run build
```

Run the complete automated test suite:

```bash
npm test
```

Run interruption-specific tests:

```bash
npm run test:interruption
```

Run stress tests:

```bash
npm run test:stress
```

Run contract tests:

```bash
npm run test:contracts
```

Run end-to-end simulation tests:

```bash
npm run test:e2e
```

The test suite covers:

- Turn sequencing
- Interruption handling
- Stale asynchronous results
- State fencing
- Dashboard state updates
- Repeated interruption scenarios
- Cross-package contracts
- Deterministic transaction querying

---

# 🔄 Interruption and Recovery Flow

A typical interaction is:

```text
User:
"Show failed transactions from Bangalore."

        │
        ▼

Turn 1 becomes authoritative

        │
        ▼

Agent executes query / generates response

        │
        │ USER INTERRUPTS
        ▼

"Wait — only transactions above ₹10,000."

        │
        ▼

Turn 1 becomes superseded

        │
        ▼

Turn 2 becomes authoritative

        │
        ▼

Latest query executes

        │
        ▼

Turn 2 updates dashboard + Rime response

        │
        ▼

Any late Turn 1 result is fenced
and cannot overwrite Turn 2
```

This is the primary hard voice behavior demonstrated by the project.

---

# 🛡️ Failure Behavior

If a user interrupts an active request:

- Obsolete speech is interrupted.
- The previous turn is superseded.
- The new request receives a newer turn ID.
- Cancellable operations are cancelled where supported.
- Late results from previous turns are checked against the authoritative-turn fence.
- Only the latest authoritative state can update the dashboard.
- Only the latest authoritative response is allowed through the spoken response path.

If a realtime connection fails, the voice session reports the connection failure and the frontend can transition out of the active listening state.

---

# 📊 Evaluation

VoiceOps includes automated evaluation of the core correctness properties.

### Turn Sequencing

Verifies that newer requests receive newer authoritative turn IDs.

### Interruption Handling

Verifies that a new request supersedes the active request.

### Stale-Result Race

Simulates an older request completing after a newer request and verifies that the old result cannot mutate authoritative state.

### State Fencing

Verifies that dashboard state is only updated by authoritative turns.

### Stress Testing

Runs repeated interruption scenarios to exercise turn sequencing and stale-result protection.

### Realtime Voice Validation

The realtime pipeline was manually validated with:

- LiveKit microphone connection
- Browser microphone input
- Live STT transcription
- User-turn completion
- Agent processing
- Authoritative state publication
- Dashboard state synchronization
- Rime TTS response generation

Detailed evidence is provided in:

```text
RIME_EVIDENCE.md
```

---

# 📈 Example Interaction

### Initial request

> "Show me the failed transactions from Bangalore."

The dashboard displays the matching transactions and metrics.

### User interruption

> "Wait — only transactions above ten thousand."

The previous response is interrupted and the newer request becomes authoritative.

The dashboard then reflects the refined request.

If the original query completes later, its stale result cannot overwrite the newer dashboard state.

---

# ⚠️ Known Limitations

- The operations dataset is synthetic and deterministic; it does not connect to a production payment database.
- The current system is a hackathon prototype rather than a production incident-management platform.
- Voice quality and transcription depend on external realtime, STT, and TTS services and network conditions.
- Rime is used through non-WebSocket synthesis in the submitted implementation.
- Dedicated numerical measurements for WebRTC audio cutoff latency, STT finalization latency, LLM TTFT, and Rime TTFA were not instrumented with a synchronized measurement harness.
- Production deployment would require additional authentication, authorization, audit logging, persistent storage, observability, and enterprise data integrations.

---

# 🔐 Security & Configuration

Secrets are supplied through environment variables and are intentionally excluded from source control.

The repository includes:

```text
.env.example
```

with placeholders only.

The actual:

```text
.env
```

file must never be committed or included in a submission package.

---

# 👥 Team Responsibilities

| Role | Focus |
|---|---|
| Frontend Engineer | React operations dashboard, tables, metrics, visualizations, voice UI |
| Voice / Realtime Engineer | LiveKit realtime pipeline, STT, Rime TTS, audio and interruption handling |
| AI / Backend Engineer | Agent orchestration, tool calling, synthetic data engine, turn fencing |
| Evaluation / Integration Engineer | Interruption tests, stress testing, evaluation, integration and evidence |

---

# 🏁 Project Goal

VoiceOps is designed to make operational investigation as natural as talking to a teammate.

The project does not treat voice as a button placed on top of a dashboard.

Instead, **voice, interruption, recovery, and stale-result prevention are part of the core workflow.**

> **Let an operations analyst investigate an incident naturally, quickly, and safely through voice.**