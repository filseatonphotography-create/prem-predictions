import { readLiveStudioCache, writeLiveStudioCache } from './liveStudioStorage';
const pending = new Map();
const key = base => `champions-standings:v1:${base}`;
export function readChampionsStandings(base) {
  const saved = readLiveStudioCache(key(base));
  if (!saved || Date.now() - saved.receivedAt > 6 * 3600000 || !Array.isArray(saved.data?.standings) || saved.data?.competition?.code !== 'CL') return null;
  return saved.data;
}
export function fetchChampionsStandings(base) {
  if (!pending.has(base)) {
    const request = (async () => {
      const response = await fetch(`${base}/api/champions-league/standings`);
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.standings) || data.competition?.code !== 'CL') throw new Error('Champions League standings are temporarily unavailable.');
      writeLiveStudioCache(key(base), { data, receivedAt: Date.now() });
      return data;
    })().finally(() => pending.delete(base));
    pending.set(base, request);
  }
  return pending.get(base);
}
