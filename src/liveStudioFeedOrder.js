import { useLayoutEffect, useRef } from "react";
import { readLiveStudioCache, writeLiveStudioCache } from "./liveStudioStorage";

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

export function orderLiveStudioUpdates(entries = [], previous = {}, { historicalIds = [] } = {}) {
  const updates = { ...(previous.updates || {}) };
  const meta = { ...(previous.meta || {}) };
  let counter = Math.ceil(Math.max(Number.isSafeInteger(previous.counter) ? previous.counter : 0,
    ...Object.values(updates).filter(Number.isFinite), 0));
  const eligible = entry => entry.id !== "waiting" && entry.id !== "countdown";
  const historical = [];
  const kickoffs = [];
  chronological(entries).reverse().filter(eligible).forEach(entry => {
    const key = identity(entry);
    const known = Number.isFinite(updates[key]);
    const kickoff = entry.kickoff || entry.updateKey?.includes(":kick-off:") || /:KICK_OFF:/i.test(entry.id || "");
    // A late-loaded or corrected kick-off belongs at the match start, even if
    // an older ledger mistakenly gave it a fresh arrival above subsequent play.
    if (kickoff && Number.isFinite(entry.momentMs) && meta[key]?.kickoffMoment !== entry.momentMs) {
      delete updates[key];
      kickoffs.push(entry);
      return;
    }
    const recoveringPhase = (entry.backfilled || historicalIds.includes(entry.id)) && (!meta[key] || meta[key].backfilled);
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
  kickoffs.forEach(entry => {
    const key = identity(entry);
    const newer = entries.filter(candidate => candidate.momentMs > entry.momentMs && Number.isFinite(updates[identity(candidate)]));
    if (newer.length) {
      const upper = Math.min(...newer.map(candidate => updates[identity(candidate)]));
      const olderPositions = Object.values(updates).filter(position => Number.isFinite(position) && position < upper);
      const lower = olderPositions.length ? Math.max(...olderPositions) : upper - 2;
      updates[key] = (lower + upper) / 2;
    } else updates[key] = ++counter;
    meta[key] = { backfilled: true, position: updates[key], kickoffMoment: entry.momentMs };
  });
  return {
    entries: chronological(entries).sort((a, b) => (updates[identity(b)] || 0) - (updates[identity(a)] || 0)),
    state: { counter, updates, meta },
  };
}

function readOrder(key) {
  try {
    const saved = readLiveStudioCache(key);
    if (saved && Number.isSafeInteger(saved.counter) && saved.updates && typeof saved.updates === "object" && !Array.isArray(saved.updates)) {
      return { counter: saved.counter, updates: Object.fromEntries(Object.entries(saved.updates).filter(([, sequence]) => Number.isFinite(sequence))), meta: saved.meta || {} };
    }
  } catch { /* A missing or damaged cache starts a fresh timeline. */ }
  return {};
}

export default function useLiveStudioFeedOrder(entries, scope, enabled = true, legacyScope = scope, ready = true, historicalIds = []) {
  // Repair the old partial-load ledger once, after the server snapshot arrives.
  const key = `live-studio-order:v3:${scope}`;
  const saved = useRef(null);
  const stored = readOrder(key);
  const previous = saved.current?.key === key ? saved.current.state
    : stored;
  const ordered = orderLiveStudioUpdates(entries, previous, { historicalIds });
  useLayoutEffect(() => {
    if (!enabled || !ready) return;
    saved.current = { key, state: ordered.state };
    writeLiveStudioCache(key, ordered.state);
  }, [key, enabled, ready, ordered.state]);
  return ordered.entries;
}
