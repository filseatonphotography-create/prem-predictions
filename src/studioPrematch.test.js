const { hasStudioLineups, getStudioLineupTime, buildStudioPrematchCards } = require('./studioPrematch');
const kickoff = '2026-11-05T20:00:00Z', announcedAt = '2026-11-05T18:45:00Z';
const fixture = { id: 'cl:1', competition: 'champions', homeTeam: 'Home', awayTeam: 'Away', kickoff };
const lineup = Array.from({ length: 11 }, (_, id) => ({ id, name: `Player ${id}` }));
const state = { status: 'TIMED', lineups: { home: { lineup }, away: { lineup } }, lineupsAnnouncedAt: announcedAt };
const cards = time => buildStudioPrematchCards({ fixture, state, announcedAt, now: Date.parse(`2026-11-05T${time}Z`), form: { home: [], away: [] } });
test('requires complete confirmed lineups', () => {
  expect(hasStudioLineups(state)).toBe(true);
  expect(hasStudioLineups({ lineups: { home: { lineup: lineup.slice(0, 10) }, away: { lineup } } })).toBe(false);
});
test('publishes form 30 minutes after the lineup and buildup 15 minutes before kickoff', () => {
  expect(cards('19:14:59')).toEqual([]);
  expect(cards('19:15:00')).toEqual([expect.objectContaining({ formCard: true, momentMs: Date.parse('2026-11-05T19:15:00Z') })]);
  expect(cards('19:44:59')).toHaveLength(1);
  expect(cards('19:45:00')).toHaveLength(2);
  expect(cards('19:45:00')[1]).toMatchObject({ title: 'The countdown is on', momentMs: Date.parse('2026-11-05T19:45:00Z') });
  expect(JSON.stringify(cards('19:50:00'))).not.toMatch(/prediction|coins/i);
});
test('saved announcement times do not restart on a late join or reload', () => {
  expect(getStudioLineupTime(fixture, {}, announcedAt, Date.parse('2026-11-05T19:30:00Z'))).toBe(new Date(announcedAt).toISOString());
  const newer = { lineupsAnnouncedAt: '2026-11-05T19:20:00Z' };
  expect(getStudioLineupTime(fixture, newer, announcedAt, Date.parse('2026-11-05T19:30:00Z'))).toBe(new Date(announcedAt).toISOString());
  expect(cards('19:50:00').map(card => card.id)).toEqual(cards('19:50:01').map(card => card.id));
});
test('pre-match cards remain historical after kickoff and never precede confirmed lineups', () => {
  expect(cards('20:00:00').every(card => card.momentMs < Date.parse(kickoff))).toBe(true);
  expect(buildStudioPrematchCards({ fixture, state: { status: 'TIMED' }, announcedAt, now: Date.parse('2026-11-05T19:50:00Z') })).toEqual([]);
});
test('uses the same schedule for Premier League games', () => {
  expect(buildStudioPrematchCards({ fixture: { ...fixture, id: 1, competition: undefined }, state, announcedAt, now: Date.parse('2026-11-05T19:50:00Z') })).toHaveLength(2);
});
