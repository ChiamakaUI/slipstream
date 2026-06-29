# Slipstream

### Ride the leader. Land low-latency.

> **▶ Watch the 3-minute demo:** **https://youtu.be/CW6DEat56wk?si=T3rUGoJ7OrasYeId**
> **🖥 Live ops console:** https://melodic-caramel-c6e7e5.netlify.app/?replay · **📐 Architecture doc:** [Notion](https://wise-sandal-b34.notion.site/Slipstream-Architecture-Document-a6e52d96a8d648a08ea2a1576a8f316f) (also the console's *Architecture* tab)
> **Network:** mainnet-beta · **Agent:** Claude Haiku 4.5 · built for the **Superteam Nigeria Advanced Infrastructure Challenge**

---

Anyone can *send* a Solana transaction. **Landing** one — reliably, under congestion, on a public
endpoint — is a different problem entirely. Slipstream is a smart transaction stack built around
the exact part most stacks hard-code: **the retry**.

A dynamic **tip engine** prices a sane opening bid from live Jito tip-floor data. Then an
autonomous **Claude agent — not a formula —** decides how far above that bid to climb when a bundle
won't land. The orchestrator (`main.ts`) contains **no retry policy at all**; it executes whatever
the agent decides. The whole journey is tracked through every commitment stage
(submitted → processed → confirmed → finalized) over **Yellowstone gRPC**, and every failure is
classified deterministically before the agent ever sees it.

> ### The bug that wasn't a bug
> On Jito's unauthenticated endpoint, exceeding **one request per second per IP** doesn't throw an
> error — it **shadow-drops your bundles**. `sendBundle` keeps returning valid bundle IDs while
> *nothing lands*. We chased "tip too low" for hours, climbing a tip ladder to 2.5M lamports that
> landed nothing — until the chain itself proved us wrong. The fix is architectural, and it ships
> in the stack. → [Operational lessons](#operational-lessons-learned-the-hard-way)

**Don't trust this README — check the chain.** Every landed slot and signature below is
explorer-verifiable, including one finalized **top-of-block** (`5bQBJ7oj…`, slot `426110964`,
tx index 16). Slot numbers in the lifecycle log are real.

---

## See it live (60-second tour)

1. **Open the [live console](https://melodic-caramel-c6e7e5.netlify.app/?replay).** It boots into **replay**
   of a recorded mainnet campaign — no setup, no spend. Watch a bundle move through the
   **Execution Pipeline** and the **Landing Probability** read its odds in real time.
   (Append `?live` instead to stream a running campaign from the control server.)
2. **Click bundle `B2`** in *Live Orchestrations* to open its **Retry Ladder**. This is the whole
   thesis in one panel: tip `0.0000` → **dropped**, `0.0003` → **dropped**, `0.0036` →
   **CONFIRMED**. The agent escalated the tip until it crossed the inclusion floor.
3. **Read the *Decisions* tab.** Every retry carries the agent's full reasoning, its confidence,
   and the alternatives it rejected — structured JSON, not a black box.
4. **Open the *Architecture* tab** for the full design document: data-flow diagram, component map,
   infrastructure decisions, and the agent's OWNS / NEVER responsibilities.

---

## Quick start

```bash
npm install
cp .env.example .env        # fill in the values below
npm run smoke               # verify all 3 integrations with ZERO SOL
npm run dev -- --bundles 2 --inject-faults 0    # dress rehearsal
npm run run:campaign        # 12 bundles, 2 fault injections
npm run report              # turn logs/ into report.md (numbers + explorer links)
```

`npm run report` reads `lifecycle.jsonl` + `agent-decisions.jsonl` and writes `report.md` —
landing rate, measured processed→confirmed deltas, explorer-verifiable signatures, and the
fault→recovery narrative. It reads `logs/` after you run a campaign, and **falls back to the
committed judged run in `dashboard/public/data/` automatically** — so a fresh clone can run
`npm run report` with zero setup. It **refuses to certify a run that used the MOCK agent**, so
every figure it emits comes from a real, live-agent campaign.

`.env`:

| var | what |
|---|---|
| `GRPC_ENDPOINT` / `GRPC_X_TOKEN` | Yellowstone gRPC (PublicNode personal token works; a dedicated provider is better) |
| `RPC_URL` | standard JSON-RPC endpoint — a dedicated provider (Helius/QuickNode/Solinfra) is strongly preferred over the public `api.mainnet-beta` endpoint, which is rate-limited and lags |
| `ANTHROPIC_API_KEY` | powers the retry agent (`AGENT_MODEL`, default claude-haiku-4-5) |
| `KEYPAIR_PATH` | payer keypair JSON (fund with ≥0.01 SOL) |
| `BLOCK_ENGINE_URL` / `BLOCK_ENGINE_HTTP` | Jito block engine — **pin one region** (default `amsterdam.mainnet.block-engine.jito.wtf`), not the global anycast endpoint (see Operational lessons) |
| `JITO_AUTH_KEY` _(optional)_ | x-jito-auth API key for higher rate limits; unset = unauthenticated default sends, which Jito supports |
| `JITO_AUTH_KEYPAIR_PATH` _(optional)_ | searcher keypair for gRPC challenge-response auth; unset = default sends |

---

## How it works

The data flows in one direction; each module owns exactly one job.

```
src/
  stream/     Yellowstone gRPC slot streaming (slots-only), reconnect & backpressure
  tip/        dynamic tip engine: clamp(ema50 × congestion, 1000, maxTipLamports)
  jito/       bundle construction, leader-window targeting, submission, status
  lifecycle/  commitment-stage tracker + deterministic failure classifier
  agent/      Claude retry agent: failure context in, decision JSON out
  fault/      fault injector (holds a signed tx until its blockhash expires on-chain)
  log/        lifecycle.jsonl + agent-decisions.jsonl writers
  main.ts     campaign orchestrator — contains NO retry policy; the agent owns it
```

The split that defines the system: **the engine finds a sane price; the agent decides how far above
it to climb.** A formula can interpolate a tip percentile. It cannot reason that *cheap bundles
dropped before the auction mean the inclusion floor is high, so escalate multiplicatively because
failed bundles cost nothing.* That judgment is the agent's, and it is the lever that actually wins
the auction on a public endpoint.

---

## The three required questions

### Q1 — What does the delta between `processed_at` and `confirmed_at` tell you about network health?

`processed` means one validator executed the transaction in a block; `confirmed` means a
supermajority (>2/3 of stake) has voted on that block. The delta is therefore a direct
measurement of **how fast stake-weighted consensus is forming**:

- **Healthy:** votes land within 1–2 slots, so the delta sits around **400–800 ms**.
- **Degraded:** a growing delta means vote transactions are competing for blockspace
  (congestion), the cluster is processing forks, or the block's slot is at risk of being
  skipped — the block exists but the network is slow to commit to it.

<!-- AUTO:q1-deltas -->
Across **8** landed bundles in the latest campaign we measured processed→confirmed of **0 ms–1 ms** (median **0 ms**), consistent with low-congestion conditions — stake-weighted votes landing within 1–2 slots. Per-bundle deltas are in `logs/lifecycle.jsonl`.
<!-- /AUTO:q1-deltas -->

We timestamp each stage by polling `getSignatureStatuses` from submission (every
`POLL_INTERVAL_MS`, default **250 ms**) and recording the wall-clock moment the signature first
reaches each commitment. Two honest caveats follow from how that's measured: the delta is
**quantized to the poll interval** and includes RPC propagation lag, so read it as a directional
health signal — a **lower-bound proxy**, not an absolute consensus-latency readout. A large or
*growing* processed→confirmed delta is the meaningful signal; a near-zero delta usually means the
chain promoted both stages between two polls, not that consensus was instant. (The Yellowstone
stream drives slot/leader/congestion timing — it does not timestamp the per-signature stages; see
Operational lessons for why landing truth is read from the chain, not the stream.)

### Q2 — Why never fetch a blockhash at `finalized` commitment for a time-sensitive transaction?

A blockhash is valid for **150 blocks (~60 s)**, counted from the slot where it was produced —
not from when you fetched it. `finalized` lags the tip by **~32 slots (~13 s)**, so a
finalized blockhash hands you a transaction that has already burned **>20% of its validity
window before you've signed anything**. Under time pressure (leader-window targeting, retries,
auction queues) that lost window is the difference between landing and `expired_blockhash`.

We fetch at `confirmed`: old enough that every fork and every simulator knows it, fresh enough
to keep nearly the whole window. (Fetching at `processed` is the opposite failure: a blockhash
from a minority fork can be rolled back, producing instant `BlockhashNotFound` rejections.)

This is not theoretical for us — our failure evidence collector records
`slotsSinceBlockhashFetch` at detection time, and the agent's decision JSON reasons about the
150-slot window explicitly when it chooses whether a resubmission needs a refresh.

### Q3 — What happens to your bundle if the Jito leader skips their slot?

The bundle **does not execute and does not carry over**. Bundles only execute inside
Jito-Solana leaders' blocks via the block-engine auction; if the targeted leader skips their
slot, the auction result for that slot dies with it. Three consequences we engineered around:

1. **No automatic re-targeting** — the block engine does not queue your bundle for the next
   Jito leader. You must resubmit, and the next Jito leader window may be many slots away
   (we observed gaps of 0–60+ slots via `getNextScheduledLeader`).
2. **Atomicity can leak.** Per Jito's own docs, in uncle/skipped-slot scenarios bundle
   transactions can be **rebroadcast individually**, hitting the normal banking stage where
   bundle atomicity and revert protection do not apply. Our bundles keep the tip transfer in
   the *same transaction* as the payload, so a partially-landed bundle can never pay a tip
   for work that didn't execute.
3. **Status fades to `Invalid`.** The skipped bundle drops out of the engine's 5-minute
   lookback, indistinguishable from never-ingested — so our classifier treats block-engine
   status as primary evidence and on-chain absence as confirmation, then hands the agent the
   leader-schedule context to decide between immediate resubmission and waiting for the next
   window.

<!-- AUTO:q3-skip -->
Observed in the latest campaign: entry `0a6207fe` hit `bundle_failure` (block-engine `Invalid` + on-chain absence) and recovered to `finalized` after 2 attempt(s) — the classifier treated block-engine status as primary evidence and handed the agent the leader-schedule context to drive the next attempt.
<!-- /AUTO:q3-skip -->

---

## Failure handling (not happy-path)

Failures are first-class. A deterministic classifier maps raw evidence (stream tx errors,
block-engine inflight status, `isBlockhashValid` at detection) onto failure classes
(`expired_blockhash`, `fee_too_low`, `compute_exceeded`, `bundle_failure`, `unknown`), and the
**agent** — not the orchestrator — decides what changes: refresh blockhash, re-price the tip
(it sees live percentiles), delay N slots, or abort. Every decision is logged with reasoning,
confidence, and rejected alternatives in `logs/agent-decisions.jsonl`.

The campaign also **injects real faults**: the injector holds a fully-signed transaction until
its blockhash genuinely expires on-chain (polling `isBlockhashValid`), then submits it anyway.
The failure, detection, classification, and recovery that follow are all real — nothing is
mocked for the demo.

---

## Operational lessons (learned the hard way)

The most valuable thing we learned: **Jito's unauthenticated rate limit is one request per
second per IP, shared across every method — and the penalty for exceeding it is _silent_.**
Once an IP is penalized, `sendBundle` keeps returning a valid bundle_id, but the bundle never
enters the auction and never lands. This is a *shadow-drop*, and it is easy to misdiagnose as
"tip too low."

We chased exactly that wrong diagnosis, then ruled it out with evidence rather than guesses:

- **Tip is not the variable.** A clean tip ladder climbing 150k → 2.5M lamports landed nothing.
  A 2M-lamport bundle, watched on Jito's gRPC `bundleResults` stream, never returned
  `stateAuctionBidRejected` — it was not priced out of the auction, it never reached it.
  (For reference, on a healthy IP our inclusion floor was ~3.0M lamports — see below.)
- **Region is not the variable.** Re-running the ladder pinned to the lowest-latency regional
  endpoint (Amsterdam, 337 ms TLS RTT vs the global anycast endpoint's 343 ms) changed nothing.
- **Auth is not the variable.** Bundles had landed fully unauthenticated; an API key raises
  rate limits, it does not grant the ability to land.

The proof came from the chain itself. `getSignaturesForAddress` on the payer showed that **0 of
9 bundles** fired during the penalized window ever executed on-chain — while **4 bundles had
landed ~24 h earlier from the same wallet and the same code**, at 3.0–3.4M-lamport tips,
including one finalized **top-of-block** (`5bQBJ7oj…`, slot 426110964, tx index 16). Same payer,
same builder, ~24 h apart: the only thing that changed was the IP's standing with the block
engine. An explicit `Rate limit exceeded: 1 per second for txn requests` confirmed the cause.

The fixes are architectural, not parametric, and all three ship in the stack:

1. **A global client-side token gate** (1 request / 1.5 s, the first call charged) in front of
   *every* block-engine call — leader lookups, tip-account fetches, sends, status polls — so a
   campaign can never out-run the limit and penalize its own IP.
2. **Rate-limit back-off** around each gRPC call: a transient `Resource exhausted` is absorbed
   with growing back-off and retried, instead of crashing a 12-bundle run mid-flight.
3. **Chain-based landing detection is the source of truth.** On the unauthenticated endpoint the
   block-engine's own status lies — `getInflightBundleStatuses` reported `Invalid` for the
   entire life of a bundle that finalized on-chain, and the `bundleResults` stream yields no
   reasons at all. So landing is confirmed on-chain: we poll `getSignatureStatuses` from submit
   until the signature reaches each commitment level, never by trusting `sendBundle`'s acceptance.

   > **On "confirm landing using stream subscriptions, RPC polling insufficient":** we built the
   > Yellowstone `transactionStatus` subscription first — and it *missed 2 of 2 real landings*,
   > because providers (SolInfra confirmed) emit that notification at most once, at `processed`,
   > and drop it under load, so a bundle finalizes while the stream stays silent. A stream you
   > can't trust to fire is worse than no stream: it reports false `expired_blockhash`. We keep
   > Yellowstone gRPC as the **stream subscription that drives lifecycle timing** (slot promotion,
   > leader windows, congestion) and confirm the *specific* signature's landing on-chain, polling
   > tightly (sub-second) so the processed→confirmed delta (Q1) survives. **Stream for timing,
   > chain for truth** — the only combination that didn't lie in testing.

4. **The Yellowstone client version is load-bearing — pin `@triton-one/yellowstone-grpc@4.0.2`.**
   On Node 24.15 / darwin-arm64 the v5 client's `subscribe()` either hangs indefinitely or throws
   `failed to open subscribe stream` against an endpoint that `grpcurl` and raw `@grpc/grpc-js`
   stream from without complaint — so it's the client, not the server. The cause: v4.1.0+ switched
   the transport to a NAPI/Rust core, and that core is what wedges. v4.0.2 is the last release on
   the pure `@grpc/grpc-js` transport. The downgrade also changes the API surface: there is no
   `client.connect()` (grpc-js connects lazily), and channel options use grpc-js names
   (`grpc.keepalive_time_ms`, `grpc.max_receive_message_length`, …) rather than the NAPI option
   names. After pinning v4.0.2 the probe streams ~160 slots in 12 s, green every run.

<!-- AUTO:landing-summary -->
**Latest campaign:** landed **8/8 (100%)** with the live `claude-haiku-4-5-20251001` agent. Example explorer-verifiable landings: [`3NDDQAtPkUnaQCj5…`](https://solscan.io/tx/3NDDQAtPkUnaQCj5jkpZocRajihBFZY5kQQ1VcwkMS352EgvEwqiSGgqawCiF93dE4KWL9fHawXF3KW3woaDDP6F), [`32LoW93VuqcaTV9r…`](https://solscan.io/tx/32LoW93VuqcaTV9r53JgAvUeYCk8qdrzsjpFMMKfQQTEPehBCnFYStk1V225EEBfSaSCuBurds8wvu8UH3wcJJVu), [`4PG8B6ATWZs8WjWm…`](https://solscan.io/tx/4PG8B6ATWZs8WjWmAZXwyeTEMVsTYNCo9XsDRUhGkyNkmqYxfRBa8mahxxnj6jQH9bGRWTsNCXyucxv4n464wCBq).
<!-- /AUTO:landing-summary -->

---

## Verifying the lifecycle log

`logs/lifecycle.jsonl` — one JSON entry per logical transaction: every attempt with its
signature, blockhash fetch slot, tip basis (formula inputs included), target leader slot,
stage timestamps, failure classification, and the IDs of the agent decisions that drove each
retry. Landed entries' slots and signatures can be checked on any explorer.

**Leader targeting is verifiable, not just claimed.** After a bundle lands the stack calls
`getSlotLeaders` on the landed slot and compares the actual block producer to the
`targetLeaderIdentity` captured at submit time (`landedSlotLeader` / `targetLeaderMatched`
on each attempt). When a run records that comparison, `npm run report` prints a **Leader
verification** line counting how many landed bundles hit the exact targeted Jito leader's slot.
Either way you can confirm it independently: open the slot on any explorer and check its producer
against `targetLeaderIdentity` in the log.

<!-- AUTO:explorer-links -->
Example landed signatures from the latest campaign — check the slot + signature on any explorer:
- slot 428772323 — [`3NDDQAtPkUnaQCj5…`](https://solscan.io/tx/3NDDQAtPkUnaQCj5jkpZocRajihBFZY5kQQ1VcwkMS352EgvEwqiSGgqawCiF93dE4KWL9fHawXF3KW3woaDDP6F)
- slot 428772942 — [`32LoW93VuqcaTV9r…`](https://solscan.io/tx/32LoW93VuqcaTV9r53JgAvUeYCk8qdrzsjpFMMKfQQTEPehBCnFYStk1V225EEBfSaSCuBurds8wvu8UH3wcJJVu)
- slot 428773465 — [`4PG8B6ATWZs8WjWm…`](https://solscan.io/tx/4PG8B6ATWZs8WjWmAZXwyeTEMVsTYNCo9XsDRUhGkyNkmqYxfRBa8mahxxnj6jQH9bGRWTsNCXyucxv4n464wCBq)
<!-- /AUTO:explorer-links -->

---

<sub>Submission map for fast judging: [`SUBMISSION.md`](./SUBMISSION.md) — every challenge
requirement mapped to exactly where it's satisfied.</sub>
