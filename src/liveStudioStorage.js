// Keep the published timeline across reloads and recreated browser tabs. Read
// the old session cache as a fallback so upgrading does not discard its order.
export function readLiveStudioCache(key, fallback = null) {
  for (const name of ["localStorage", "sessionStorage"]) {
    try {
      const value = window[name].getItem(key);
      if (value != null) return JSON.parse(value);
    } catch { /* Try the other store when storage is unavailable or damaged. */ }
  }
  return fallback;
}

export function writeLiveStudioCache(key, value) {
  const serialized = JSON.stringify(value);
  for (const name of ["localStorage", "sessionStorage"]) {
    try { window[name].setItem(key, serialized); } catch {
      // A stale durable copy must not override a newer session fallback.
      try { window[name].removeItem(key); } catch {}
    }
  }
}
