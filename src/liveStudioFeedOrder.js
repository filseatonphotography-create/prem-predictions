import { useEffect, useState } from "react";

function contentFingerprint(entry) {
  const text = JSON.stringify([entry.title, entry.lines, entry.lineups, entry.tableSnapshot]);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return `${text.length}:${hash >>> 0}`;
}

function entryKey(entry) {
  return entry.orderKey || entry.updateKey || entry.id;
}

export function orderLiveStudioUpdates(entries = [], previous = { counter: 0, updates: {} }) {
  const updates = previous.updates || {};
  const changed = entries.filter(entry => updates[entryKey(entry)]?.fingerprint !== contentFingerprint(entry))
    .sort((a, b) => (a.momentMs || 0) - (b.momentMs || 0)
      || Number(Boolean(a.id?.startsWith("studio:"))) - Number(Boolean(b.id?.startsWith("studio:")))
      || (a.sortMinute || 0) - (b.sortMinute || 0));
  let state = previous;
  if (changed.length) {
    state = { counter: previous.counter || 0, updates: { ...updates } };
    changed.forEach(entry => {
      state.counter += 1;
      state.updates[entryKey(entry)] = { sequence: state.counter, fingerprint: contentFingerprint(entry) };
    });
  }
  return { state, entries: [...entries].sort((a, b) =>
    (state.updates[entryKey(b)]?.sequence || 0) - (state.updates[entryKey(a)]?.sequence || 0)) };
}

function readOrder(key) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || "null");
    if (saved && Number.isFinite(saved.counter) && saved.updates && typeof saved.updates === "object") return saved;
  } catch {}
  return { counter: 0, updates: {} };
}

export default function useLiveStudioFeedOrder(entries, scope, enabled) {
  const key = `live-studio-order:v1:${scope}`;
  const [saved, setSaved] = useState(() => ({ key, state: readOrder(key) }));
  const previous = saved.key === key ? saved.state : readOrder(key);
  const ordered = orderLiveStudioUpdates(entries, previous);
  useEffect(() => {
    if (!enabled || (saved.key === key && ordered.state === saved.state)) return;
    setSaved({ key, state: ordered.state });
    try { sessionStorage.setItem(key, JSON.stringify(ordered.state)); } catch {}
  }, [enabled, key, ordered.state, saved]);
  return ordered.entries;
}
