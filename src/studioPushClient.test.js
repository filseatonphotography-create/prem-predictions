import { enableStudioPush } from './studioPushClient';
const originalFetch = global.fetch;
const originalNotification = Object.getOwnPropertyDescriptor(window, 'Notification');
const originalPush = Object.getOwnPropertyDescriptor(window, 'PushManager');
const originalWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
afterEach(() => {
  global.fetch = originalFetch;
  for (const [object, key, original] of [[window, 'Notification', originalNotification], [window, 'PushManager', originalPush], [navigator, 'serviceWorker', originalWorker]]) {
    if (original) Object.defineProperty(object, key, original); else delete object[key];
  }
});
test('an existing browser subscription is reused without requesting another VAPID key or permission', async () => {
  const subscription = { endpoint: 'https://push.example/subscription' };
  const registration = { pushManager: { getSubscription: jest.fn(async () => subscription), subscribe: jest.fn() } };
  const requestPermission = jest.fn();
  Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'granted', requestPermission } });
  Object.defineProperty(window, 'PushManager', { configurable: true, value: function PushManager() {} });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: jest.fn(async () => registration) } });
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({}) }));
  await expect(enableStudioPush({ base: '', token: 'test', prefs: {}, fixturePrefs: {} })).resolves.toBe(true);
  expect(requestPermission).not.toHaveBeenCalled(); expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch.mock.calls[0][0]).toBe('/api/push/subscribe');
  expect(JSON.parse(global.fetch.mock.calls[0][1].body).subscription).toEqual(subscription);
});
