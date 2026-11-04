const originalFetch = global.fetch, originalToken = process.env.FOOTBALL_DATA_TOKEN;
afterEach(() => { global.fetch = originalFetch; if (originalToken === undefined) delete process.env.FOOTBALL_DATA_TOKEN; else process.env.FOOTBALL_DATA_TOKEN = originalToken; });
test('the same-site feed supplies upcoming lineups, announcement timing and Champions League form without Render', async () => {
  jest.resetModules(); process.env.FOOTBALL_DATA_TOKEN = 'test-only';
  const lineup = Array.from({ length: 11 }, (_, id) => ({ id, name: `Player ${id}` }));
  const upcoming = { id: 77, utcDate: new Date(Date.now() + 10 * 60000).toISOString(), status: 'TIMED', homeTeam: { id: 1, name: 'Home', lineup }, awayTeam: { id: 2, name: 'Away', lineup }, score: {} };
  const prior = { ...upcoming, id: 66, utcDate: new Date(Date.now() - 7 * 86400000).toISOString(), status: 'FINISHED', score: { fullTime: { home: 2, away: 0 } } };
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ matches: [prior, upcoming] }) }));
  const { handler } = require('../netlify/functions/studio-overview');
  const response = await handler(), data = JSON.parse(response.body);
  expect(response.statusCode).toBe(200);
  expect(data.nextFixture).toMatchObject({ id: 'cl:77', kickoff: upcoming.utcDate });
  expect(data.matches[0].lineupsAvailable).toBe(true);
  expect(data.matches[0].lineups.home.lineup).toHaveLength(11);
  expect(data.matches[0].lineupsAnnouncedAt).toBeTruthy();
  expect(data.matches[0].form.home[0].outcome).toBe('W');
  expect(global.fetch.mock.calls[0][0]).toContain('/competitions/CL/matches');
  await handler(); expect(global.fetch).toHaveBeenCalledTimes(1);
});
test('missing provider configuration returns a retriable response without leaking credentials', async () => {
  jest.resetModules(); delete process.env.FOOTBALL_DATA_TOKEN;
  const { handler } = require('../netlify/functions/studio-overview');
  const response = await handler(); expect(response.statusCode).toBe(503);
  expect(JSON.parse(response.body)).toEqual({ error: 'Fixture updates are temporarily unavailable.' });
});
