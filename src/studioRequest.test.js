import { studioRequest } from './studioRequest';
const original = global.fetch;
afterEach(() => { global.fetch = original; jest.useRealTimers(); });
test('a stalled response body has the same deadline as the request', async () => {
  jest.useFakeTimers(); global.fetch = jest.fn(async () => ({ ok: true, json: () => new Promise(() => {}) }));
  const pending = studioRequest('/prefs', { method: 'POST', timeoutMs: 100 });
  const assertion = expect(pending).rejects.toMatchObject({ unconfirmed: true, message: expect.stringContaining('not confirmed') });
  jest.advanceTimersByTime(100); await assertion;
});
test('expired authentication preserves the HTTP status for logout', async () => {
  global.fetch = jest.fn(async () => ({ ok: false, status: 401, json: async () => ({ error: 'Expired session' }) }));
  await expect(studioRequest('/prefs')).rejects.toMatchObject({ status: 401, message: 'Expired session' });
});
test('cancelling a request stops waiting even if the transport ignores cancellation', async () => {
  global.fetch = jest.fn(() => new Promise(() => {})); const controller = new AbortController();
  const pending = studioRequest('/prefs', { signal: controller.signal });
  const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' }); controller.abort(); await assertion;
});
