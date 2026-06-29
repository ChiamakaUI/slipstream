"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DashboardStore, type DashState } from "./store";
import { loadReplayEvents, playReplay, type PlayerHandle } from "./replay";

/** Base URL of the live control server (SSE + control endpoints). */
export const LIVE_BASE = process.env.NEXT_PUBLIC_LIVE_URL ?? "http://localhost:8088";
const LIVE_URL = LIVE_BASE + "/events";

/**
 * Connects the store to data:
 *   - default: replay the committed logs immediately — a judge lands on a populated
 *     dashboard with no idle flash and no dependency on a running live server.
 *   - ?live   : connect to the live SSE server; if it doesn't open in ~2.6s, fall back to replay.
 *   - ?replay : replay only (same as default; kept for explicit links).
 */
export function useDashboard(): DashState {
  const storeRef = useRef<DashboardStore>();
  if (!storeRef.current) storeRef.current = new DashboardStore();
  const store = storeRef.current;
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forceLive = params.has("live");
    let player: PlayerHandle | null = null;
    let es: EventSource | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const startReplay = async () => {
      if (cancelled) return;
      store.reset();
      store.setMode("replay");
      const evs = await loadReplayEvents();
      if (cancelled) return;
      if (!evs.length) {
        store.setMode("idle");
        return;
      }
      player = playReplay(evs, (e) => store.applyEvent(e), { loop: true });
    };

    if (!forceLive) {
      startReplay();
    } else {
      store.setMode("connecting");
      try {
        es = new EventSource(LIVE_URL);
        let connected = false;
        fallbackTimer = setTimeout(() => {
          if (!connected) {
            es?.close();
            es = null;
            startReplay();
          }
        }, 2600);
        es.onopen = () => {
          connected = true;
          if (fallbackTimer) clearTimeout(fallbackTimer);
          store.setMode("live");
        };
        es.onmessage = (m) => {
          try {
            store.applyEvent(JSON.parse(m.data));
          } catch {
            /* ignore malformed frame */
          }
        };
        es.onerror = () => {
          if (!connected) {
            if (fallbackTimer) clearTimeout(fallbackTimer);
            es?.close();
            es = null;
            startReplay();
          }
        };
      } catch {
        startReplay();
      }
    }

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (es) es.close();
      if (player) player.stop();
    };
  }, [store]);

  return store.getState();
}

/** Ticking clock for relative-time labels (1 Hz). */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
