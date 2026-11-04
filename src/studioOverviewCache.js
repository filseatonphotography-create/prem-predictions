// Fast score/status reads must not wait for line-ups or individual match requests.
function createStudioOverviewCache({ fetchMatches, now = Date.now, ttl = 30000, maxStale = 120000 }) {
  let snapshot = null, pending = null;
  function refresh() {
    if (!pending) {
      pending = Promise.resolve().then(fetchMatches).then(matches => {
        if (!Array.isArray(matches)) throw new Error('Invalid competition overview');
        snapshot = { matches, updatedAt: now() };
        return snapshot;
      }).finally(() => { pending = null; });
    }
    return pending;
  }
  return {
    async get() {
      if (snapshot && now() - snapshot.updatedAt < ttl) return Object.assign({}, snapshot, { stale: false });
      if (snapshot && now() - snapshot.updatedAt < maxStale) {
        refresh().catch(() => {});
        return Object.assign({}, snapshot, { stale: true });
      }
      return Object.assign({}, await refresh(), { stale: false });
    },
  };
}
module.exports = { createStudioOverviewCache };
