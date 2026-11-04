const { createStudioOverviewCache } = require('./studioOverviewCache');

test('score reads share one fast provider request and do not require match details', async () => {
  let complete;
  const fetchMatches = jest.fn(() => new Promise(resolve => { complete = resolve; }));
  const cache = createStudioOverviewCache({ fetchMatches, now: () => 1000 });
  const first = cache.get(), second = cache.get();
  await Promise.resolve(); expect(fetchMatches).toHaveBeenCalledTimes(1);
  complete([{ id: 1, status: 'IN_PLAY' }]);
  expect(await first).toEqual(await second);
  expect((await cache.get()).matches[0].status).toBe('IN_PLAY');
  expect(fetchMatches).toHaveBeenCalledTimes(1);
});

test('a recent score snapshot returns while revalidation is still waiting, and errors do not erase it', async () => {
  let now = 0, complete;
  const fetchMatches = jest.fn().mockResolvedValueOnce([{ id: 1, status: 'IN_PLAY' }]).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; })).mockRejectedValue(new Error('provider down'));
  const cache = createStudioOverviewCache({ fetchMatches, now: () => now });
  await cache.get(); now = 31000;
  expect(await cache.get()).toMatchObject({ stale: true, matches: [{ status: 'IN_PLAY' }] });
  complete([{ id: 1, status: 'FINISHED' }]); for (let i = 0; i < 10; i++) await Promise.resolve();
  expect(await cache.get()).toMatchObject({ stale: false, matches: [{ status: 'FINISHED' }] });
  now = 62000;
  expect(await cache.get()).toMatchObject({ stale: true });
  for (let i = 0; i < 10; i++) await Promise.resolve();
  now = 200000;
  await expect(cache.get()).rejects.toThrow('provider down');
});

test('recipient lookup reads subscriptions once, and accepts a poll snapshot with no further disk reads', () => {
  const fs = require('fs'), vm = require('vm');
  const source = fs.readFileSync('server.js', 'utf8');
  const records = { user: { subscription: {}, notifPrefs: { liveUpdates: true } }, muted: { subscription: {}, studioPrefs: { 1: { enabled: false } } } };
  const loadJson = jest.fn(() => records);
  const context = { loadJson, PUSH_SUBSCRIPTIONS_FILE: 'unused', hasDeviceSubscription: () => true, isPushTypeEnabled: (_kind, prefs) => prefs?.liveUpdates !== false };
  const start = source.indexOf('function getLiveStudioNotificationUserIds('), end = source.indexOf('\nfunction hasFixtureNotificationEnabled(', start);
  vm.runInNewContext(`${source.slice(start, end)}; this.get = getLiveStudioNotificationUserIds;`, context);
  expect(context.get('1')).toEqual(['user']); expect(loadJson).toHaveBeenCalledTimes(1);
  expect(context.get('1', records)).toEqual(['user']); expect(loadJson).toHaveBeenCalledTimes(1);
});
