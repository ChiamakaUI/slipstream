#!/usr/bin/env bash
set -euo pipefail

# Slipstream — one-command canonical judged run.
#
# Prerequisites in .env (gitignored):
#   RPC_URL              dedicated JSON-RPC (Helius/QuickNode/SolInfra)
#   GRPC_ENDPOINT (+GRPC_X_TOKEN)   live Yellowstone gRPC feed
#   ANTHROPIC_API_KEY    funded Anthropic credits (the agent fires on failures)
#   KEYPAIR_PATH         payer funded ~0.06 SOL (>= ~12 landed bundles @ ~3M tip)
#
# Produces a single canonical run, syncs it to the dashboard, and regenerates the
# README evidence + report.md. Then commit/push (redeploys Netlify) and propagate the
# same signatures into the Notion doc (see scratchpad/NOTION_EDITS_STAGED.md).

echo "==> 1/5  Preflight integrations (ZERO SOL)"
npm run smoke

echo "==> 2/5  Clearing previous logs (append-mode files)"
rm -f logs/lifecycle.jsonl logs/agent-decisions.jsonl logs/events.jsonl

echo "==> 3/5  Canonical campaign — 12 bundles, 2 injected faults, live agent"
npm run run:campaign

echo "==> 4/5  Sync logs to dashboard + regenerate report/README evidence"
npm run dashboard:data
npm run report

echo "==> 5/5  Done."
echo "Next:"
echo "  - git add -A && git commit && git push   (redeploys the live console)"
echo "  - propagate the new signatures into the Notion doc (scratchpad/NOTION_EDITS_STAGED.md)"
echo "  - spot-check 2-3 signatures on solscan"
