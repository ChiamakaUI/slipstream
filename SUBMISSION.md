# Slipstream — Submission Map

This document maps every requirement of the **Advanced Infrastructure Challenge – Build a Smart
Transaction Stack** to exactly where it is satisfied in this repository, so the judging is fast and
nothing is missed. Deeper prose lives in [`README.md`](./README.md).

- **Live ops console:** https://melodic-caramel-c6e7e5.netlify.app/?replay (boots into replay of a real mainnet campaign; append `?live` to stream the control server)
- **Architecture Design Document:** https://wise-sandal-b34.notion.site/Slipstream-Architecture-Document-a6e52d96a8d648a08ea2a1576a8f316f (also the console's **Architecture** tab)
- **Article (Content deliverable):** [`docs/article.md`](./docs/article.md) — "Landing Is the Hard Part: Building a Solana Transaction Stack That Wins the Jito Auction"
- **Source:** this repo · **Network:** mainnet-beta · **Agent:** Claude Haiku 4.5

---

## Requirements

### 1 · Architecture Design Document
A public document covering architecture, data flow, infrastructure decisions, failure-handling
strategy, and AI-agent responsibilities, with diagrams.

→ **[Architecture Design Document on Notion](https://wise-sandal-b34.notion.site/Slipstream-Architecture-Document-a6e52d96a8d648a08ea2a1576a8f316f)**:
executive summary, two Mermaid diagrams (the three-plane data flow + the submission/recovery
sequence), component map, infrastructure-decision write-ups, the failure-classifier table, the
security model, and the agent's OWNS/NEVER responsibilities. Mirrored in the console's
**Architecture** tab (`dashboard/components/ArchitectureView.tsx`).

### 2 · The Transaction Stack
| Sub-requirement | Where |
|---|---|
| Monitor live slot + leader data via Yellowstone gRPC | `src/stream/geyser.ts` (slots-only stream, single-flight reconnect + backoff) |
| Detect correct leader window for submission | `src/jito/` `nextScheduledLeader` + `main.ts` leader-window targeting; **post-landing `getSlotLeaders` verification** (`main.ts` records `targetLeaderMatched` per attempt) — when a run captures it, the report prints a *Leader verification* line, and any landed slot is explorer-checkable against `targetLeaderIdentity` |
| Construct & submit Jito bundles | `src/jito/` (payload + tip in one tx) |
| Dynamic tips from real tip-account data (no hardcoding) | `src/tip/` — `clamp(ema50 × congestion, 1000, maxTip)` baseline; the agent owns escalation. Inputs logged per attempt |
| Lifecycle: Submitted → Processed → Confirmed → Finalized | `src/lifecycle/` + `pollLanding()` in `main.ts` |
| Timestamps, slot numbers, latency deltas | `dashboard/public/data/lifecycle.jsonl` (per-stage `observedAt`, `slot`, `deltaFromPrevMs`) |
| Classify failures (expired blockhash, low fee, compute, bundle failure) | `src/lifecycle/` deterministic classifier |
| Confirm landing without trusting `sendBundle` | on-chain `getSignatureStatuses` — see README *Operational lessons #3* for why the stream notification is insufficient on this provider |
| Automatic retries with blockhash refresh on expiry | agent decision → `main.ts` applies refresh + re-price + resubmit |

### 3 · Lifecycle Log (≥10 real submissions, ≥2 failures)
**Committed run: 8 logical transactions across 23 real bundle submissions, with 2 injected failures
— both autonomously recovered (8/8 landed to `finalized`).**

→ `dashboard/public/data/lifecycle.jsonl` — one entry per logical transaction, every attempt with signature,
blockhash fetch slot, tip basis, target leader, stage timestamps, and failure classification.
The campaign injects **real** faults (`src/fault/` holds a signed tx until its blockhash expires
on-chain), so the log carries genuine classified failures and their autonomous recoveries. Every
landed slot + signature is checkable on any explorer. Regenerate the human summary with
`npm run report` → `dashboard/public/data/report.md`.

### 4 · AI Agent — one real operational decision
→ **Autonomous Retry with Fault Injection** (+ failure reasoning + tip intelligence). `src/agent/`
receives classified failure context and returns a decision JSON (`action`, `changes`, `reasoning`,
`confidence`, rejected alternatives). The orchestrator (`main.ts`) holds **no retry policy** — it
applies whatever the agent decides. Every decision is in `dashboard/public/data/agent-decisions.jsonl` and the
dashboard **Decisions** tab. Not a sequential wrapper: the retry path does not exist outside the
agent's output.

### 5 · README Questions
→ [`README.md`](./README.md) → *The three required questions*: processed→confirmed as a
network-health signal (Q1), why never fetch a blockhash at `finalized` (Q2), and what happens when
a Jito leader skips its slot (Q3) — each backed by real logged observations.

### 6 · General
Open-source with setup instructions (README *Run it yourself*), working mainnet prototype, reconnection
handling (`src/stream/geyser.ts` single-flight exponential backoff), real Jito bundle construction,
dynamic tips, correct commitment levels, and a clean separation between the AI layer (`src/agent/`)
and the transaction layer (everything else — the agent never touches RPC or signing). Failure
handling is first-class; the happy path is not the point. **Engineering rigor:** offline unit tests
for the two decision modules (`test/unit.test.ts` — `npm test`, 13 deterministic cases) and **CI**
(`.github/workflows/ci.yml`: typecheck + tests on every push).

---

## Evaluation criteria → evidence
| Criterion | Evidence |
|---|---|
| **Does it work?** | `dashboard/public/data/report.md` (landing rate, explorer-verifiable signatures) + the live dashboard |
| **Depth of integration** | real Jito block-engine + Yellowstone gRPC, no hardcoded tips, correct commitment ladder, on-chain truth over a lying block-engine status (README *Operational lessons*) |
| **AI demonstration** | `dashboard/public/data/agent-decisions.jsonl` + Decisions tab — visible reasoning, confidence, rejected alternatives, real fault→recovery arcs |
| **Explanation** | Architecture tab + README depth + the operational lessons learned the hard way |

---

## How to verify (judges)
```bash
npm install
cp .env.example .env          # add your own RPC / gRPC / ANTHROPIC_API_KEY / keypair
npm run smoke                 # exercises all 3 integrations with ZERO SOL
npm run report                # reads the committed run in dashboard/public/data/ — zero setup
```
Open `dashboard/public/data/lifecycle.jsonl`, take any landed entry's `signature` + `slot`, and
confirm it on [solscan.io](https://solscan.io) — same wallet, same builder, real auction.

---

## Submission status
- [x] Live-agent campaign committed: **8 logical transactions / 23 real bundle submissions / 2
  injected faults, both autonomously recovered** — 8/8 landed to `finalized` (Haiku agent, no MOCK).
- [x] `npm run report` → `report.md` + README evidence blocks populated with real numbers and
  explorer links (regenerable from `dashboard/public/data/`).
- [x] Dashboard + architecture document deployed to public URLs (linked above), boots into replay.
- [x] `lifecycle.jsonl` + `agent-decisions.jsonl` committed in `dashboard/public/data/`.
- [x] Signatures spot-checkable on an explorer (see the README landed-bundles list).
