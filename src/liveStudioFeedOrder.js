// A feed is a timeline of football events, not a ranking of React updates.
// Prediction data, wording and restored history may arrive in any order.
export function orderLiveStudioUpdates(entries = []) {
  return { entries: [...entries].sort((a, b) =>
    (b.momentMs || 0) - (a.momentMs || 0)
    || Number(Boolean(b.id?.startsWith("studio:"))) - Number(Boolean(a.id?.startsWith("studio:")))
    || (b.sortMinute ?? -1) - (a.sortMinute ?? -1)
    || String(a.orderKey || a.id).localeCompare(String(b.orderKey || b.id))) };
}

export default function useLiveStudioFeedOrder(entries) {
  // Deliberately ignore the old session sequence: it promoted old results when
  // points/league data loaded and kept that incorrect order across reloads.
  return orderLiveStudioUpdates(entries).entries;
}
