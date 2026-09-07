# VoiceOps

> **Voice-Native Operations Analytics Dashboard & Copilot**
> Built for support and operations analysts to investigate transactions, incidents, and performance metrics in real time using conversational voice commands with instant interruption recovery.

---

## 🚀 Overview

VoiceOps enables operations and support engineers to monitor system health, dissect payment failure spikes, filter transaction volumes, and analyze incident root causes hands-free. 

### Key Capabilities
- **Voice-First Exploration**: Query high-cardinality transaction databases naturally (*"Show failed transactions from Bangalore above ₹10,000"*).
- **Hard Voice Problem Solved (Barge-in & Interruption)**: Cut off audio playback instantly when the operator interrupts, abort or fence in-flight backend tool operations, and guarantee that UI and conversational state never suffer from stale out-of-order writes.
- **Continuous Conversation**: Maintain continuous voice feedback and interim status updates while executing complex backend aggregations.

---

## 🛠️ Architecture & Technology Stack

```
[ Microphone ] ──> [ STT ] ──> [ LiveKit Realtime Agent ]
                                     │
                                     ├──> [ LLM (Gemini / Tool Calling) ]
                                     ├──> [ Operations Data Engine (SQLite / In-Memory) ]
                                     ├──> [ Turn & Fence State Manager ]
                                     └──> [ Rime TTS ] ──> [ Audio Sink / Dashboard ]
```

- **Frontend**: React 18 / Vite / TypeScript, Tailwind CSS, Lucide Icons, Recharts, `@livekit/components-react`.
- **Backend / Realtime Agent**: Node.js, TypeScript, LiveKit Agents SDK (`@livekit/agents` / LiveKit Server), Gemini API tool-calling.
- **Voice & Audio Pipeline**: LiveKit WebRTC Audio, Realtime STT, **Rime TTS** integration for voice synthesis.
- **Shared Contracts**: `@voiceops/shared` monorepo package with strict TypeScript schemas and event interfaces.
- **Testing & Quality**: Vitest, Playwright E2E, synthetic operations dataset generator.

---

## 📁 Repository Structure (Planned Monorepo)

```
VoiceOps/
├── packages/
│   ├── shared/         # Common TypeScript types, event schemas, API contracts
│   ├── agent/          # LiveKit Agent, LLM orchestration, Rime TTS, turn manager
│   ├── server/         # Express/Fastify API, synthetic database engine, token dispenser
│   └── web/            # React + Vite dashboard UI, charts, tables, voice controls
├── tests/
│   ├── interruption/   # Automated barge-in and turn fencing stress tests
│   └── e2e/            # Playwright end-to-end user journeys
├── data/
│   └── synthetic/      # Generated operations dataset (transactions, incidents)
├── docs/
│   └── architecture/   # Deep-dive architectural specs and sequence diagrams
├── README.md           # Project guide and quickstart
└── RIME_EVIDENCE.md    # Empirical benchmarks, latency measurements, and voice evidence
```

---

## 👥 Team Breakdown & Responsibilities

| Role | Engineer | Focus Areas |
|---|---|---|
| **Frontend Engineer** | Dev 1 | React operations dashboard, data tables, metric visualizers, voice visualizer & room connection UI. |
| **Voice / Realtime Engineer** | Dev 2 | LiveKit room orchestration, audio track routing, STT integration, **Rime TTS** pipeline, audio cutoff & barge-in. |
| **AI / Backend Engineer** | Dev 3 | LLM tool calling schema, query engine (SQLite/synthetic data), `turn_id` fencing, state synchronization. |
| **Evaluation / Integration Engineer** | Dev 4 | Interruption test suite, latency benchmarking, Playwright E2E, telemetry, `RIME_EVIDENCE.md`. |

---

## 🚦 Roadmap & Implementation Phases

1. **Phase 1: Workspace & Contracts Setup**: Monorepo scaffolding, `@voiceops/shared` schema definition, synthetic data generation.
2. **Phase 2: Core Subsystems**: Realtime agent skeleton, Rime TTS integration, operations dashboard UI, SQLite query tools.
3. **Phase 3: Turn Management & Interruption Fencing**: LiveKit audio cancellation on VAD, AbortController token wiring, state synchronization.
4. **Phase 4: Testing, Benchmark & Evidence Gathering**: Vitest unit tests, Playwright barge-in test, latency recording in `RIME_EVIDENCE.md`.
5. **Phase 5: Polish & Demo Delivery**: Visual cues, scenario scripts, final verification.

---

## 🔒 Security & Environment Configuration

Copy `.env.example` to `.env` in the root and relevant package directories:
- `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`
- `RIME_API_KEY`
- `GEMINI_API_KEY`
- `PORT` / `VITE_API_URL`

*Note: Real secrets must never be committed to git.*
