# Campaign Report

- Network: **mainnet-beta**
- Logical transactions: **12**
- Landed (confirmed or finalized): **12/12 (100%)**
- Outcomes: `finalized` ×12
- Fault injections: **3**, autonomously recovered: **3**
- Agent decisions: **30** (retry ×30, abort ×0), mean confidence **0.76**
- Failure classes seen: `bundle_failure` ×22, `expired_blockhash` ×7

## Q1 evidence — processed→confirmed deltas

Across **12** landed bundles we measured processed→confirmed of **0 ms–1 ms** (median **0 ms**), consistent with low-congestion conditions where stake-weighted votes land within 1–2 slots.

## Landed bundles (explorer-verifiable)

| outcome | slot | tip (lamports) | proc→conf | conf→final | attempts | leader | signature |
|---|---|---|---|---|---|---|---|
| finalized | 429626720 | 3,200,000 | 1 ms | 12333 ms | 3 | ↪ other | [`4iPV6qA5UM1KES2P…`](https://solscan.io/tx/4iPV6qA5UM1KES2PeqBLPmzmqGALk7gJGEwXgDDDQ9A5oh3pwmxsYHizBwWf97hxUqVQ2az8BRMZjdXq6VPcHf8m) |
| finalized | 429627051 | 3,200,000 | 0 ms | 12540 ms | 2 | ↪ other | [`zaMKaNhcTfTG39XD…`](https://solscan.io/tx/zaMKaNhcTfTG39XDrv1jvx6aaGg24914f7nnUzarxsC23tqUg9nQdj9jpRs1DDJvK3e9ZjzwkAyUUo9K3T9G9ZA) |
| finalized | 429627562 | 3,200,000 | 0 ms | 11703 ms | 3 | ↪ other | [`4vSFm4fmLcEiVVBa…`](https://solscan.io/tx/4vSFm4fmLcEiVVBar2mWmeyFSTjFjKuEhHfYfAhwSsHbuEeWuwf2548YxSdwfLSLAraYzRKyEnVXoX4YQhG3yoHu) |
| finalized | 429628144 | 3,200,000 | 1 ms | 12154 ms | 3 | ✅ match | [`4qtPXw3CigWczQNu…`](https://solscan.io/tx/4qtPXw3CigWczQNuPAahaLizEoxKEQ3qg11NTU1YtaAmG4sQasRMbmjn8myubuE6KhV7yhKPSW5ZYoWyAWFnkJCb) |
| finalized | 429629591 | 3,500,000 | 1 ms | 12418 ms | 4 | ↪ other | [`2dCb4Ku8G6Bqicq3…`](https://solscan.io/tx/2dCb4Ku8G6Bqicq3ZxpuvLG8oCiZvtEz9uEYNsxTGz9P7miNYotHb4ca9s2iQe5qw9pNSQnuiwnUYeobZhYQvFTF) |
| finalized | 429630188 | 3,200,000 | 0 ms | 12236 ms | 3 | ✅ match | [`3MDqAZs6nK2vUcQL…`](https://solscan.io/tx/3MDqAZs6nK2vUcQLN64ri1osFSGekdD2xCEdjJzFK78ieCJa3BkZu7M54BNgkxFtunG5CeTFGMKi1gAorapPtSmQ) |
| finalized | 429631631 | 3,600,000 | 0 ms | 12513 ms | 6 | ✅ match | [`yjHfLZmYXSGeaEkm…`](https://solscan.io/tx/yjHfLZmYXSGeaEkmX5t65D4aHfgGkacTMwo5xps31BXvcDB6QDSvadnMBY1Eob3wHH3uGVcVyNLikAUTtwn1uZg) |
| finalized | 429631971 | 3,200,000 | 0 ms | 12056 ms | 2 | ↪ other | [`igtwo5pMSeyxZoEc…`](https://solscan.io/tx/igtwo5pMSeyxZoEcZa6tHPh58mdYbWzVLBaUkDLMF8mFS7pQ7hC1o42UUycrictLc4jsot3LhGtZoeSmzzyU6Wb) |
| finalized | 429634904 | 3,200,000 | 0 ms | 12374 ms | 3 | ↪ other | [`53aRKfq66z8rGwFA…`](https://solscan.io/tx/53aRKfq66z8rGwFAggakAWFEBM164w7UcmtB5qyL9pY6AHVf1Fn2bhH9evqB52YEdZpdAB6nEkyLzCYyGfZk82AJ) |
| finalized | 429635502 | 3,600,000 | 0 ms | 12342 ms | 3 | ↪ other | [`4HjqmJ96vqjUNQmZ…`](https://solscan.io/tx/4HjqmJ96vqjUNQmZQmNQ145KF3vcv5tgWTLMsenimp4kJMyYMzcMEf2Ksy4qfC8eKWMEKxa8ricUuY48dU2iwRQD) |
| finalized | 429636622 | 3,600,000 | 0 ms | 12324 ms | 5 | ↪ other | [`2yGs25BSGA4NUu98…`](https://solscan.io/tx/2yGs25BSGA4NUu98AiRCDcMRy4rmbXJwttyGMzHKQqyn8JbnJfjUZfQAG4V5bvWwUq6AVKay8yheKmiPRscaFzFy) |
| finalized | 429637519 | 3,200,000 | 1 ms | 11974 ms | 4 | ↪ other | [`4a6aVGMdwG9PKh9G…`](https://solscan.io/tx/4a6aVGMdwG9PKh9GV1NB7x1vPYcpAGfk3oidLo3fUBvNykNDbLMKxEBX4fV4LbyzkvQ6JGD4QPwjJRvuqY9EVdzc) |

Landed-tip range: **3,200,000–3,600,000 lamports** (median 3,200,000).

**Leader verification:** **3/12** landed bundles were produced by the exact Jito leader whose window we targeted (`getSlotLeaders` on the landed slot vs. the leader captured at submit). The leader column above is explorer-checkable — open the slot and compare its producer to `targetLeaderIdentity` in `logs/lifecycle.jsonl`.

## Fault injection → autonomous recovery

**Entry `43d67b91`** → outcome `finalized` after 3 attempt(s):
- attempt 1: `expired_blockhash` — tx error: {"sendError":"Error: jito-ts error: SearcherClientError: Invalid argument provided: bundle contains an expired blockhash"}
- attempt 2: `bundle_failure` — block engine reported Invalid — bundle dropped before/at auction (blockhash also expired by detection time)
  - agent → **retry** (refresh=true, tip→1112, delay=0) conf 0.95
    > The failure class is "expired_blockhash" — the blockhash became invalid during or before submission. Root cause: slotsSinceBlockhashFetch is 157 slots, which exceeds the ~150-slot validity window. This is not a tip or auction problem; it is a blockhash staleness problem. Evidence
  - agent → **retry** (refresh=true, tip→3200000, delay=0) conf 0.72
    >  FAILURE DIAGNOSIS: Attempt 1 failed with expired_blockhash (blockhash was stale at submission time). Attempt 2 resubmitted with the SAME blockhash, which was also expired by attempt 2 — and additionally the bundle dropped before/at auction with tip of 1112 lamports. The blockhas

**Entry `f4078477`** → outcome `finalized` after 3 attempt(s):
- attempt 1: `expired_blockhash` — tx error: {"sendError":"Error: jito-ts error: SearcherClientError: Invalid argument provided: bundle contains an expired blockhash"}
- attempt 2: `bundle_failure` — block engine reported Invalid — bundle dropped before/at auction (blockhash also expired by detection time)
  - agent → **retry** (refresh=true, tip→283000, delay=2) conf 0.95
    >  The failure is clearly due to blockhash expiration, not tip insufficiency. The evidence: 1. **Failure Root Cause**: slotsSinceBlockhashFetch = 156 slots, which exceeds the ~150-slot validity window. The error message explicitly states "expired blockhash" — this is deterministic 
  - agent → **retry** (refresh=true, tip→3200000, delay=0) conf 0.85
    >  ## Chain of Reasoning ### What Failed Attempt 2: bundle marked Invalid and dropped before/at auction. The blockhash had also expired by detection time (slotsSinceBlockhashFetch = 226, well over the 150-slot validity window). Attempt 1 failed due to expired blockhash directly. ##

**Entry `d40ebecf`** → outcome `finalized` after 5 attempt(s):
- attempt 1: `expired_blockhash` — tx error: {"sendError":"Error: jito-ts error: SearcherClientError: Invalid argument provided: bundle contains an expired blockhash"}
- attempt 2: `bundle_failure` — block engine reported Invalid — bundle dropped before/at auction (blockhash also expired by detection time)
- attempt 3: `bundle_failure` — block engine reported Invalid — bundle dropped before/at auction (blockhash also expired by detection time)
- attempt 4: `bundle_failure` — block engine reported Invalid — bundle dropped before/at auction (blockhash also expired by detection time)
  - agent → **retry** (refresh=true, tip→1000, delay=0) conf 0.95
    >  FAILURE ANALYSIS: The bundle failed with "expired_blockhash" — not a tip/auction issue. The slotsSinceBlockhashFetch is 157, which exceeds the ~150-slot validity window. The blockhash is stale and MUST be refreshed before resubmission, or any retry is guaranteed to fail identica
  - agent → **retry** (refresh=true, tip→300000, delay=0) conf 0.7
    >  Chain of reasoning: 1. **What failed:**    - Attempt 2 failed with "bundle_failure" — block engine reported Invalid, bundle dropped before/at auction.    - Attempt 1 failed with "expired_blockhash" — blockhash was stale on first try.    - Both attempts used the minimum tip of 10
  - agent → **retry** (refresh=true, tip→1500000, delay=0) conf 0.65
    >  **Failure Analysis:** Attempt 3 failed with bundle_failure (dropped before/at auction) and the blockhash is now expired. slotsSinceBlockhashFetch = 237, which FAR exceeds the 150-slot validity window. The blockhash expiration is causally linked to this failure. **Attempt History
  - agent → **retry** (refresh=true, tip→3600000, delay=2) conf 0.72
    >  FAILURE ANALYSIS: - Attempt 4 failed with bundle_failure (Invalid, dropped before/at auction) AND the blockhash had expired by detection time. - This is a double problem: the old blockhash (226 slots stale) guaranteed failure, AND the tip was insufficient to land even if the blo

## Representative agent decision (verbatim)
```json
{
  "id": "2a90bdc8-4d24-4e4f-8d6f-243582fabdf7",
  "at": 1782720304563,
  "trigger": {
    "entryId": "eb57f67c-3887-4a67-a1d1-c056f6df6f80",
    "attempt": 1,
    "failureClass": "bundle_failure",
    "failureDetail": "block engine reported Invalid — bundle dropped before/at auction (blockhash also expired by detection time)",
    "networkContext": {
      "currentSlot": 429626397,
      "recentTipPercentiles": {
        "p25": 1000,
        "p50": 1024,
        "p75": 3469,
        "p95": 44708,
        "p99": 2620000
      },
      "slotsSinceBlockhashFetch": 234,
      "attemptsSoFar": 1
    }
  },
  "reasoning": "\nFAILURE ANALYSIS:\n- failureClass: bundle_failure (Invalid — dropped before/at auction)\n- The bundle never reached the auction layer; it was rejected by the block engine\n- Critically: the blockhash ALSO expired by detection time (slotsSinceBlockhashFetch = 234, well beyond the ~150 slot validity window)\n\nROOT CAUSE DETERMINATION:\nThe failure has TWO structural problems:\n1. Blockhash expiration: 234 slots >> 150 slot validity. This alone guarantees rejection. Any resubmission with the same blockhash will fail identically.\n2. Tip adequacy: The last tip was only 35,766 lamports—roughly 1.4% of p99 (2.62M). However, we cannot assess tip as the primary failure cause here because the blockhash was already expired, so the bundle was rejected before tip evaluation could meaningfully occur.\n\nRESUBMISSION STRATEGY:\nSince blockhash expiration is the immediate structural blocker, refreshBlockhash MUST be true. This is non-negotiable.\n\nOn tip: The 35,766 lamport attempt was far below p99. However, I must not assume that simply tipping higher without a fresh blockhash will land—the blockhash failure masks the real inclusion floor. Once we refresh the blockhash, we enter a cleaner state to evaluate tip adequacy.\n\nFor the NEW tip: \n- p99 is 2.62M, but we're on an unauthenticated connection, so the real floor is likely 3–6× p99 or higher\n- We're still on attempt 1 of 6, with maxTipLamports = 4M available\n- Given the low congestionFactor (0.8) and the fact that a blockhash refresh is our primary fix, I'll adopt a moderately aggressive escalation: jump to ~2M lamports (roughly 0.8× p99 as a baseline for an unauthenticated connection, accounting for typical deprioritization). This is not the maximum, preserving flexibility for further escalation if needed.\n- Rationale: Small bumps (35k → 50k) after a blockhash refresh and against p99 of 2.62M would waste attempts. A meaningful jump to 2M addresses the deprioritization headwind on public connections without burning our budget.\n\nALTERNATIVES REJECTED:\n1. \"Abort\": premature—we have only attempted once, the failure is structurally explainable (expired blockhash), we have 5 attempts remaining, and tip was never adequately tested. Abort only after we've tried high tips with a valid blockhash.\n2. \"Retry with same blockhash, higher tip\": logically redundant—the bundle will fail again due to blockhash expiration regardless of tip. Wasting an attempt.\n3. \"Refresh blockhash but keep tip at 35k\": blockhash refresh is good, but the old tip was vastly below the real inclusion floor for public connections. Pairing a fresh blockhash with inadequate tip means we fail for a different reason and learn nothing. Better to escalate tip aggressively now.\n4. \"Retry immediately (delaySlots=0)\": we have a valid reason to wait (blockhash refresh is I/O-dependent and deserves a slot to settle). Minimal cost vs clarity, so delaySlots=1 is prudent.\n\nCONFIDENCE:\n0.72 — refreshing the blockhash removes the guaranteed failure mode, and jumping tip to 2M is empirically sound for unauthenticated public connections. However, if the real inclusion floor is above 2M (or if there are other network issues), we may still fail, hence not higher confidence. But this decision maximally addresses the evidence.\n",
  "decision": {
    "action": "retry",
    "changes": {
      "refreshBlockhash": true,
      "newTipLamports": 2000000,
      "delaySlots": 1,
      "otherAdjustments": "Refresh blockhash to eliminate the expired-blockhash failure mode. After refresh, the attempt will enter a clean state to test tip adequacy on an unauthenticated connection. Escalate tip aggressively (2M ≈ 0.76× p99) because small bumps are empirically wasted against the real inclusion floor for deprioritized connections; a meaningful jump targets the true floor in fewer attempts."
    },
    "confidence": 0.72,
    "rejectedAlternatives": [
      "Abort: premature—only 1 attempt made, failure is structurally explainable by blockhash expiration (not tip alone), and 5 attempts remain. Abort only after trying adequate tip with valid blockhash.",
      "Retry with same blockhash: guaranteed to fail again due to 234 slots > 150 slot validity window. Blockhash refresh is mandatory, not optional.",
      "Retry with fresh blockhash but keep tip at 35k: the old tip was vastly below p99 and the real floor for public connections (which is 3–6× p99). Pairing a fresh blockhash with inadequate tip wastes an attempt; escalate tip aggressively now.",
      "Retry immediately (delaySlots=0): blockhash refresh is I/O-bound; waiting 1 slot is prudent and costs nothing vs ensuring the new blockhash is settled."
    ]
  },
  "model": "claude-haiku-4-5-20251001"
}
```
