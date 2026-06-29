# Landing Is the Hard Part: Building a Solana Transaction Stack That Wins the Jito Auction

*How we built Slipstream — a smart transaction stack that lands Jito bundles under congestion by
handing the retry policy to an AI agent — and the silent failure that cost us hours along the way.*

> **Live console:** https://melodic-caramel-c6e7e5.netlify.app/?replay ·
> **Architecture doc:** [Notion](https://wise-sandal-b34.notion.site/Slipstream-Architecture-Document-a6e52d96a8d648a08ea2a1576a8f316f) ·
> **Source:** https://github.com/ChiamakaUI/slipstream ·
> Network: mainnet-beta · Agent: Claude Haiku 4.5

---

## Sending a transaction is easy. Landing one is a different job.

Every Solana tutorial ends at `sendTransaction`. Production ends nowhere near there.

On a contested public endpoint, the gap between *submitting* a transaction and *landing* it is
where all the real engineering lives: Did you target a leader that runs the Jito client? Was your
tip above the inclusion floor for that slot? Did your blockhash expire in the queue? Did the block
engine accept your bundle and then quietly never auction it? A single `confirmed: true / false`
boolean tells you none of this — and under load, the honest default state of a transaction is
**not landed yet, and you don't know why.**

Slipstream is built around that reality. It observes the network over Yellowstone gRPC, prices and
submits Jito bundles, tracks every transaction across all four commitment levels, and hands the one
decision that actually matters — *how to recover from a failure* — to an autonomous agent. The
orchestrator holds no retry policy of its own. Remove the agent and the recovery path ceases to
exist.

This article is the story of building it, organized around the lessons that were not in any doc.

---

## The architecture in one breath

The system is three planes around a single closed loop:

- **Observe.** A Yellowstone gRPC stream turns the raw cluster into three signals: *when* to send
  (the next Jito-connected leader window), *how hard the network is breathing* (congestion from
  slot-arrival jitter), and *what inclusion currently costs* (live Jito tip-floor percentiles).
- **Act.** A linear pipeline: build a versioned transaction (payload **and** the Jito tip in one
  transaction), push it through a rate-gated, region-pinned block engine, and establish landing
  truth on-chain.
- **Reason.** When something fails, a deterministic classifier labels *why*, and an AI agent decides
  *what to change*: refresh the blockhash, re-price the tip, wait N slots, or abort.

The split that defines the whole system is this: **the tip engine finds a sane price; the agent
decides how far above it to climb.** A formula can interpolate a tip percentile. It cannot reason
that *cheap bundles dropped before the auction mean the inclusion floor is high, so escalate
multiplicatively — because failed bundles cost nothing.* That judgment is the lever that actually
wins the auction, and it belongs to the agent.

And winning the auction is the point. There is a tempting shortcut here: broadcast the same signed
transaction over public RPC alongside the bundle, so *something* lands regardless of whether the
bundle wins. That is legitimate production practice — but it quietly dodges the exact question a
*smart transaction stack* exists to answer: **can you land the bundle itself, through the auction,
under congestion?** We chose to solve that, not route around it. Every landing below is a bundle
that won its auction.

---

## The bug that wasn't a bug

Here is the lesson that cost us the most and taught us the most.

We were submitting bundles on Jito's unauthenticated endpoint. They were being accepted —
`sendBundle` returned a valid `bundle_id` every time — and nothing landed. So we did the obvious
thing: we assumed the tip was too low and climbed a ladder. 150k lamports. 500k. 1M. 2.5M. Nothing.
A 2M-lamport bundle, watched on Jito's own `bundleResults` gRPC stream, never even returned
`stateAuctionBidRejected` — it was not *outbid* in the auction. **It never reached the auction.**

That detail broke the "tip too low" theory, so we stopped guessing and started ruling variables out
with evidence:

- **Not the tip.** The ladder to 2.5M landed nothing, and the bundle was never priced out — it was
  never ingested.
- **Not the region.** Re-running pinned to the lowest-latency endpoint (Amsterdam, 337 ms TLS RTT
  vs the anycast endpoint's 343 ms) changed nothing.
- **Not auth.** Bundles had landed fully unauthenticated before; an API key raises rate limits, it
  does not grant the ability to land.

The proof came from the chain itself. `getSignaturesForAddress` on the payer showed that **0 of 9
bundles** fired during that window ever executed on-chain — while **4 bundles had landed ~24 hours
earlier from the same wallet and the same code**, at 3.0–3.4M-lamport tips, including one finalized
**top-of-block** (`5bQBJ7oj…`, slot `426110964`, tx index 16). Same payer, same builder, ~24 hours
apart. The only thing that had changed was the IP's standing with the block engine. An explicit
`Rate limit exceeded: 1 per second for txn requests` confirmed it.

**Jito's unauthenticated rate limit is one request per second per IP, shared across every method —
and the penalty for exceeding it is silent.** Once your IP is penalized, `sendBundle` keeps handing
back valid bundle IDs while your bundles never enter the auction. We named it the *shadow-drop*, and
it is trivially misdiagnosed as "tip too low" because the symptom — nothing lands — is identical.

The fixes are architectural, not parametric, and they all ship in the stack:

1. **A global client-side token gate** (1 request / 1.5 s) in front of *every* block-engine call —
   leader lookups, tip-account fetches, sends, status polls — so a campaign can never out-run the
   limit and penalize its own IP.
2. **Rate-limit back-off** around each gRPC call, so a transient `Resource exhausted` is absorbed
   and retried instead of crashing a multi-bundle run mid-flight.
3. **On-chain landing detection as the source of truth** — covered next, because it's its own lesson.

---

## Stream for timing, chain for truth

The intuitive design is to confirm landing from the thing that submitted the bundle. Two of those
"authoritative" sources lied to us on mainnet.

The **block engine's own status lied.** `getInflightBundleStatuses` reported `Invalid` for the
entire life of a bundle that *finalized* on-chain. The `bundleResults` stream yielded no reasons at
all. On the unauthenticated endpoint, trusting the engine's verdict means reporting failures that
landed and landings that failed.

The **stream subscription lied too.** We built the Yellowstone `transactionStatus` subscription
first, expecting it to be the landing signal. It *missed 2 of 2 real landings* — because providers
emit that notification at most once, at `processed`, and drop it under load. A bundle finalizes
while the stream stays silent, and a silent stream is worse than no stream: it produces a false
`expired_blockhash`.

So we split responsibilities by what each source is actually good at. **Yellowstone gRPC drives
timing** — slot promotion, leader windows, congestion. **The chain confirms landing** — we poll
`getSignatureStatuses` for the specific signature from the moment of submission, recording the
wall-clock instant it first reaches each commitment level, and we never trust `sendBundle`'s
acceptance as evidence of anything. Stream for timing, chain for truth. It was the only combination
that didn't lie in testing.

One more load-bearing detail for anyone using Yellowstone from Node: **pin
`@triton-one/yellowstone-grpc@4.0.2`.** Versions 4.1.0+ switched the transport to a NAPI/Rust core,
and on Node 24 / arm64 that core's `subscribe()` hangs or throws `failed to open subscribe stream`
against an endpoint that `grpcurl` and raw `@grpc/grpc-js` stream from without complaint. v4.0.2 is
the last release on the pure `@grpc/grpc-js` transport. After pinning it, our probe streams ~160
slots in 12 seconds, green every run.

---

## Letting an AI own the one decision that matters

The bounty this was built for asks for an AI agent that owns *one real operational decision* — not
a chatbot bolted onto a happy path. We gave the agent the retry.

When an attempt fails, a **deterministic** classifier (no AI here — the agent reasons, it does not
guess the label) maps raw evidence onto a failure class: `expired_blockhash`, `fee_too_low`,
`compute_exceeded`, `bundle_failure`, `unknown`. The ordering is load-bearing — blockhash-expiry
strings are matched first, because Jito's send-path error for an expired blockhash isn't
`BlockhashNotFound` and would otherwise fall through to `bundle_failure`.

Then the agent gets the full picture: the failure class, the current slot, how many slots since the
blockhash was fetched, the last tip, the live tip-floor percentile ladder, the congestion estimate,
the budget ceiling, and the complete attempt history. It returns structured JSON — an action, the
changes (refresh blockhash? new tip? delay?), a confidence, and the alternatives it explicitly
rejected. The orchestrator clamps the proposed tip to a hard ceiling and applies the decision
verbatim.

What makes this more than a glorified `if`-statement is the *magnitude* judgment. Here is a real
recovery from one campaign (it's bundle `B2` in the live console's retry ladder):

```
attempt 1 — tip 0.0000 SOL (≈2,074 lamports)  → dropped (Invalid, before auction)
attempt 2 — tip 0.0003 SOL (≈250,000 lamports) → dropped (still under the floor)
attempt 3 — tip 0.0036 SOL (3,600,000 lamports) → FINALIZED
```

The agent did not crawl. It read "cheap bundles are being dropped before the auction, so the
inclusion floor is high, and failed attempts cost nothing," and it jumped multiplicatively to ~80%
of the budget ceiling to cross the floor in one move. That contextual, non-deterministic escalation
is the decision — and it is bounded by a hard tip ceiling and a max-attempt count, so it is autonomy
*with guardrails*. Delete the agent and there is no retry policy left; the orchestrator would simply
log the failure and stop.

---

## Three questions every Solana sender should be able to answer

Working on this forced precise answers to three questions that sound simple and aren't.

**What does the delta between `processed` and `confirmed` tell you about network health?**
`processed` means one validator executed your transaction in a block; `confirmed` means a
supermajority (>2/3 of stake) has voted on that block. The delta is a direct measure of how fast
stake-weighted consensus is forming — healthy is roughly 400–800 ms (votes landing within 1–2
slots); a *growing* delta means votes are competing for blockspace or the cluster is working through
forks. Honest caveat: we poll at 250 ms, so under calm conditions the delta collapses below the poll
interval (we measured ~0 ms) — the meaningful signal is a *growing* delta, not its absolute value.

**Why never fetch a blockhash at `finalized` for a time-sensitive transaction?**
A blockhash is valid for ~150 blocks (~60 s), counted from the slot it was produced — not from when
you fetched it. `finalized` lags the chain tip by ~32 slots (~13 s), so a finalized blockhash hands
you a transaction that has already burned >20% of its validity window before you've signed anything.
We fetch at `confirmed`: old enough that every fork knows it, fresh enough to keep nearly the whole
window. (Fetching at `processed` is the opposite failure — a minority-fork blockhash can be rolled
back into instant `BlockhashNotFound` rejections.)

**What happens to your bundle if the Jito leader skips their slot?**
It does not execute and does not carry over. The block engine won't re-target it to the next Jito
leader, and the next window can be many slots away. Worse, per Jito's docs, in uncle/skipped-slot
scenarios bundle transactions can be rebroadcast individually through the normal banking stage —
where bundle atomicity no longer applies. That's why we keep the tip transfer in the *same
transaction* as the payload: a partially-landed bundle can never pay a tip for work that didn't
execute.

---

## What the evidence shows

We don't ask you to trust the writeup — every figure is explorer-verifiable.

In the committed mainnet campaign, **8 of 8 bundles landed to `finalized`**, every one by winning
the Jito auction, at tips of **2.8M–3.9M lamports** (median 3.6M) — right at the empirically
observed inclusion floor of ~3.0M on a healthy IP. Two failures were *injected* deliberately: a
fault injector holds a fully-signed transaction until its blockhash genuinely expires on-chain, then
submits it anyway, so the failure, classification, and autonomous recovery are all real. Both
recovered. A representative landing: signature `3NDDQAtPkUnaQCj5…` at slot `428772323` — open it on
any explorer and check the producer against the leader we targeted at submit time.

The confirmed→finalized delta held around ~12 s (~32 slots), exactly as the finality math predicts.
The processed→confirmed delta is the one that needs honesty: under the calm conditions of the run it
read near-zero, which is a measurement-resolution story, not a consensus-speed claim — the lesson
being that you instrument for the *growing*-delta case and report the calm case truthfully rather
than dressing it up.

---

## What I'd build next

This is a prototype with production habits, not a production searcher. The honest next steps:

- **Staked / authenticated infrastructure.** Escalating to ~3.6M lamports is the right *response* to
  an unauthenticated connection's high inclusion floor, but the structural fix is a staked connection
  or an authenticated searcher relationship — that's how you lower the floor instead of paying it.
- **Sub-100 ms landing polls**, so the processed→confirmed delta sharpens from "directional" to
  "near-precise."
- **Multi-region failover** for the block engine and the gRPC feed.
- **Portfolio-level tip optimization** — pricing across a fleet of in-flight transactions rather
  than one at a time.

The habit that matters most is already here, and it's the whole thesis: **a submission is never
success until the chain says so.** Everything else — the tip engine, the agent, the lifecycle log —
exists to make that one principle operational.

---

*Built for the Superteam Nigeria Advanced Infrastructure Challenge. Code, live console, and the full
architecture document are linked at the top. Don't trust this article — check the chain.*
