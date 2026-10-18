import { useEffect, useRef } from "react";

function chronological(entries) {
  return [...entries].sort((a, b) =>
    (b.momentMs || 0) - (a.momentMs || 0)
    || Number(Boolean(a.id?.startsWith("studio:"))) - Number(Boolean(b.id?.startsWith("studio:")))
    || (b.sortMinute ?? -1) - (a.sortMinute ?? -1)
    || String(a.orderKey || a.id).localeCompare(String(b.orderKey || b.id)));
}

function identity(entry) {
  // A scorer or corrected minute can enrich a provisional goal without making
  // it a new post. Its existing update key identifies the same score change.
  if (entry.id === "studio:closing" && entry.roundupMatches?.length) {
    return `studio:closing:${entry.roundupMatches.map(match => String(match.fixture.id)).sort().join(":")}`;
  }
  return String(entry.arrivalKey || entry.updateKey || entry.id);
}

export function orderLiveStudioUpdates(entries = [], previous = {}) {
  const updates = { ...(previous.updates || {}) };
  let counter = Math.max(Number.isSafeInteger(previous.counter) ? previous.counter : 0,
    ...Object.values(updates).filter(Number.isSafeInteger), 0);
  const eligible = entry => entry.id !== "waiting" && entry.id !== "countdown";
  // Seed an existing feed once. Thereafter only genuinely unseen posts receive
  // a new sequence. Text, points, lineups and event-time corrections cannot move it.
  chronological(entries).reverse().filter(eligible).forEach(entry => {
    const key = identity(entry);
    if (!Number.isSafeInteger(updates[key])) updates[key] = ++counter;
  });
  return {
    entries: chronological(entries).sort((a, b) => (updates[identity(b)] || 0) - (updates[identity(a)] || 0)),
    state: { counter, updates },
  };
}

function readOrder(key) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || "null");
    if (saved && Number.isSafeInteger(saved.counter) && saved.updates && typeof saved.updates === "object" && !Array.isArray(saved.updates)) {
      return { counter: saved.counter, updates: Object.fromEntries(Object.entries(saved.updates).filter(([, sequence]) => Number.isSafeInteger(sequence) && sequence > 0)) };
    }
  } catch { /* A missing or damaged cache starts a fresh timeline. */ }
  return {};
}

export default function useLiveStudioFeedOrder(entries, scope, enabled = true) {
  // v2 starts clean instead of importing the retired event-time/arrival cache.
  const key = `live-studio-order:v2:${scope}`;
  const saved = useRef(null);
  const previous = saved.current?.key === key ? saved.current.state : readOrder(key);
  const ordered = orderLiveStudioUpdates(entries, previous);
  useEffect(() => {
    if (!enabled) return;
    saved.current = { key, state: ordered.state };
    try { sessionStorage.setItem(key, JSON.stringify(ordered.state)); } catch {}
  }, [key, enabled, ordered.state]);
  return ordered.entries;
}
