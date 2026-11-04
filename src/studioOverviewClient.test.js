import { fetchStudioOverview } from './studioOverviewClient';
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });
test('uses the same-site public football feed without waiting on Render', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ matches: [] }) }));
  await expect(fetchStudioOverview('https://backend.example', { preferSameOrigin: true })).resolves.toEqual({ matches: [] });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch.mock.calls[0][0]).toBe('/.netlify/functions/studio-overview');
});
test('a stalled request times out and can recover on a later attempt', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn(() => new Promise(() => {}));
  const result = fetchStudioOverview('', { preferSameOrigin: false, timeoutMs: 1000 });
  const rejected = expect(result).rejects.toThrow('taking longer');
  jest.advanceTimersByTime(1000); await rejected;
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ matches: [] }) });
  await expect(fetchStudioOverview('', { preferSameOrigin: false })).resolves.toEqual({ matches: [] });
});
test('falls back to the backend if the same-site endpoint is not deployed yet', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, json: async () => ({}) }).mockResolvedValueOnce({ ok: true, json: async () => ({ matches: [] }) });
  await fetchStudioOverview('https://backend.example', { preferSameOrigin: true });
  expect(global.fetch.mock.calls[1][0]).toBe('https://backend.example/api/live-studio/matches?competition=champions&summary=1');
});
test('leaving the page cancels the request without starting a fallback', async () => {
  global.fetch = jest.fn(() => new Promise(() => {})); const controller = new AbortController();
  const result = fetchStudioOverview('', { preferSameOrigin: true, signal: controller.signal });
  const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' }); controller.abort(); await rejected;
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
