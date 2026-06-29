import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyFailure } from "../src/lifecycle/classifier.js";
import { TipEngine, type TipFloorSnapshot } from "../src/tip/engine.js";
import { config } from "../src/config.js";

/**
 * Offline, deterministic unit tests for the two pure decision modules — the failure
 * classifier and the dynamic tip engine. No network, no SOL, no live infra: they run
 * the same way in CI as on a laptop. (Live mainnet behaviour is exercised separately by
 * `npm run smoke` / `npm run run:campaign`.)
 */

// ---- Failure classifier ----------------------------------------------------

test("classifier: Jito send-path expired blockhash wins over a concurrent Invalid status", () => {
  // The Jito error string isn't `BlockhashNotFound`; the classifier must match it FIRST,
  // before the block-engine `Invalid` verdict, or an expiry is mislabelled bundle_failure.
  const { cls } = classifyFailure({
    txErr: "SearcherClientError: bundle contains an expired blockhash",
    inflightStatus: "Invalid",
  });
  assert.equal(cls, "expired_blockhash");
});

test("classifier: BlockhashNotFound → expired_blockhash", () => {
  assert.equal(classifyFailure({ txErr: { err: "BlockhashNotFound" } }).cls, "expired_blockhash");
});

test("classifier: compute budget exceeded → compute_exceeded", () => {
  assert.equal(classifyFailure({ txErr: "ComputationalBudgetExceeded" }).cls, "compute_exceeded");
});

test("classifier: insufficient fee → fee_too_low", () => {
  assert.equal(classifyFailure({ txErr: "InsufficientFundsForFee" }).cls, "fee_too_low");
});

test("classifier: block-engine Invalid/Failed → bundle_failure", () => {
  assert.equal(classifyFailure({ inflightStatus: "Invalid" }).cls, "bundle_failure");
  assert.equal(classifyFailure({ inflightStatus: "Failed" }).cls, "bundle_failure");
});

test("classifier: timeout with an expired blockhash → expired_blockhash", () => {
  assert.equal(classifyFailure({ timedOut: true, blockhashStillValid: false }).cls, "expired_blockhash");
});

test("classifier: bundle pending past timeout (valid blockhash) → fee_too_low", () => {
  assert.equal(classifyFailure({ timedOut: true, inflightStatus: "Pending" }).cls, "fee_too_low");
});

test("classifier: unmapped tx error → bundle_failure", () => {
  assert.equal(classifyFailure({ txErr: "some unrecognised runtime error" }).cls, "bundle_failure");
});

test("classifier: no decisive evidence → unknown", () => {
  assert.equal(classifyFailure({}).cls, "unknown");
});

// ---- Tip engine ------------------------------------------------------------

function snap(ema50: number): TipFloorSnapshot {
  return { time: "t", p25: 1, p50: 1, p75: 1, p95: 1, p99: 1, ema50, fetchedAt: Date.now() };
}

test("tip engine: congestion factor defaults to 1 with too few samples", () => {
  assert.equal(new TipEngine().congestionFactor(), 1);
});

test("tip engine: congestion factor clamps to the [0.8, 2.5] band", () => {
  const fast = new TipEngine();
  let t = 1_000;
  for (let i = 0; i < 12; i++) { t += 100; fast.observeSlot(t); } // 100ms intervals → 0.25 → clamps up to 0.8
  assert.equal(fast.congestionFactor(), 0.8);

  const slow = new TipEngine();
  t = 1_000;
  for (let i = 0; i < 12; i++) { t += 2_000; slow.observeSlot(t); } // 2000ms intervals → 5 → clamps down to 2.5
  assert.equal(slow.congestionFactor(), 2.5);
});

test("tip engine: decide() clamps the priced tip into [jitoMin, maxTip]", async () => {
  const e = new TipEngine();

  // Inject a snapshot directly so decide() never touches the network.
  (e as unknown as { snapshot: TipFloorSnapshot }).snapshot = snap(999_999_999);
  assert.equal((await e.decide("TipAcct")).lamports, config.maxTipLamports);

  (e as unknown as { snapshot: TipFloorSnapshot }).snapshot = snap(1);
  assert.equal((await e.decide("TipAcct")).lamports, config.jitoMinTipLamports);
});

test("tip engine: decide() exposes the full percentile basis it priced from", async () => {
  const e = new TipEngine();
  (e as unknown as { snapshot: TipFloorSnapshot }).snapshot = snap(2_000_000);
  const d = await e.decide("TipAcct");
  assert.equal(d.tipAccount, "TipAcct");
  assert.ok(d.basis.formula.includes("clamp"));
  assert.equal(typeof d.basis.congestionFactor, "number");
});
