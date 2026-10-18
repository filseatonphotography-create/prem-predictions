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
  const meta = { ...(previous.meta || {}) };
  let counter = Math.ceil(Math.max(Number.isSafeInteger(previous.counter) ? previous.counter : 0,
    ...Object.values(updates).filter(Number.isFinite), 0));
  const eligible = entry => entry.id !== "waiting" && entry.id !== "countdown";
  const historical = [];
  chronological(entries).reverse().filter(eligible).forEach(entry => {
    const key = identity(entry);
    const known = Number.isFinite(updates[key]);
    const recoveringPhase = entry.backfilled && (!meta[key] || meta[key].backfilled);
    // Repair legacy lineups once: their old bootstrap position used tomorrow's
    // kickoff instead of an announcement time. Other existing cards stay fixed.
    const repairingLineup = Boolean(entry.lineups && known && !meta[key]);
    if (recoveringPhase || repairingLineup) {
      delete updates[key];
      historical.push(entry);
      return;
    }
    if (!known) updates[key] = ++counter;
    if (!meta[key]) meta[key] = { backfilled: false };
  });
  historical.forEach(entry => {
    const key = identity(entry);
    if (meta[key]?.position != null) {
      updates[key] = meta[key].position;
      return;
    }
    // A reconstructed phase is history, not a freshly published update. Insert
    // it between existing cards without changing their relative arrival order.
    const known = chronological(entries.filter(candidate => Number.isFinite(updates[identity(candidate)])));
    const older = known.find(candidate => (candidate.momentMs || 0) <= (entry.momentMs || 0));
    const positions = [...new Set(Object.values(updates).filter(Number.isFinite))].sort((a, b) => a - b);
    const lower = older ? updates[identity(older)] : (positions[0] ?? 0) - 1;
    const upper = positions.find(position => position > lower) ?? lower + 2;
    updates[key] = (lower + upper) / 2;
    meta[key] = { backfilled: true, position: updates[key] };
  });
  return {
    entries: chronological(entries).sort((a, b) => (updates[identity(b)] || 0) - (updates[identity(a)] || 0)),
    state: { counter, updates, meta },
  };
}

function readOrder(key) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || "null");
    if (saved && Number.isSafeInteger(saved.counter) && saved.updates && typeof saved.updates === "object" && !Array.isArray(saved.updates)) {
      return { counter: saved.counter, updates: Object.fromEntries(Object.entries(saved.updates).filter(([, sequence]) => Number.isFinite(sequence))), meta: saved.meta || {} };
    }
  } catch { /* A missing or damaged cache starts a fresh timeline. */ }
  return {};
}

export default function useLiveStudioFeedOrder(entries, scope, enabled = true, legacyScope = scope) {
  // v2 starts clean instead of importing the retired event-time/arrival cache.
  const key = `live-studio-order:v2:${scope}`;
  const saved = useRef(null);
  const stored = readOrder(key);
  const previous = saved.current?.key === key ? saved.current.state
    : stored.updates ? stored : readOrder(`live-studio-order:v2:${legacyScope}`);
  const ordered = orderLiveStudioUpdates(entries, previous);
  useEffect(() => {
    if (!enabled) return;
    saved.current = { key, state: ordered.state };
    try { sessionStorage.setItem(key, JSON.stringify(ordered.state)); } catch {}
  }, [key, enabled, ordered.state]);
  return ordered.entries;
}
