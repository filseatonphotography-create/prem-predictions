const { hasStudioLineups, getStudioLineupTime, buildStudioPrematchCards, buildStudioFormNote, buildStudioBuildupPreview } = require('./studioPrematch');
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

test('varies the single opening line between fixtures and keeps it stable across refreshes', () => {
  const now = Date.parse('2026-11-05T19:30:00Z');
  const openings = Array.from({ length: 12 }, (_, id) => buildStudioPrematchCards({
    fixture: { ...fixture, id: `cl:${id}` }, state, now, announcedAt,
  })[0].lines);
  expect(openings.every(lines => lines.length === 1 && lines[0].includes('Champions League'))).toBe(true);
  expect(new Set(openings.flat()).size).toBeGreaterThan(2);
  expect(cards('19:30:00')[0].lines).toEqual(cards('19:30:01')[0].lines);
});

test('form commentary recognises winning and losing runs and stops at unknown results', () => {
  const form = outcomes => outcomes.map(outcome => ({ outcome }));
  const wins = buildStudioFormNote(fixture, { home: form(['D']), away: form(['W', 'W', 'L']) }, ['United', 'Liverpool']);
  expect(wins).toContain('Liverpool');
  expect(wins).toMatch(/3 wins in a row|2 straight wins|2 consecutive wins/);
  const losses = buildStudioFormNote(fixture, { home: form(['L', 'L', 'L']), away: form(['W', 'W']) }, ['United', 'Liverpool']);
  expect(losses).toMatch(/United.*3 straight defeats|3 defeats in a row for United/);
  expect(buildStudioFormNote(fixture, { home: form(['W', '?', 'W']), away: [] })).toBe('Home won last time out and will want to build on that result.');
  expect(buildStudioFormNote(fixture, { home: form(['?', 'W']), away: [] })).toBe('');
});

test('the countdown contrasts the model favourite with an unbeaten opponent', () => {
  const preview = buildStudioBuildupPreview(fixture, {
    probabilities: { home: 19.5, draw: 22, away: 58.5 },
    form: { home: ['W', 'D', 'W', 'L'].map(outcome => ({ outcome })) },
  });
  expect(preview).toEqual([
    'The pre-match model makes Away favourites with a 59% chance of winning.',
    'Can Home, unbeaten in their last 3 matches, put that forecast under pressure?',
  ]);
});

test('the countdown describes close games and draw-leaning games without naming a favourite', () => {
  const preview = probabilities => buildStudioBuildupPreview(fixture, { probabilities });
  expect(preview({ home: 36, draw: 32, away: 32 })[0]).toMatch(/almost nothing between/);
  expect(preview({ home: 35, draw: 39, away: 26 })[0]).toMatch(/draw.*most likely result \(39%\)/);
});

test('the countdown wording varies across fixtures and stays stable when the clock advances', () => {
  const previews = Array.from({ length: 12 }, (_, id) => buildStudioBuildupPreview({ ...fixture, id: `cl:${id}` })[0]);
  expect(new Set(previews).size).toBeGreaterThan(2);
  expect(cards('19:45:00')[1].lines).toEqual(cards('19:50:00')[1].lines);
});
