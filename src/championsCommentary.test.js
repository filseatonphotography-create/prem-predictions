import { buildChampionsStudioCommentary, buildLiveStudioRevealLine } from './App';
const { footballFeed } = require('./studioCompetitions');
const raw = { id: 77, utcDate: '2026-11-04T17:45:00Z', status: 'IN_PLAY', minute: 29,
  homeTeam: { id: 1, name: 'RB Leipzig' }, awayTeam: { id: 2, name: 'Liverpool FC' },
  score: { fullTime: { home: 1, away: 1 } }, goals: [{ type: 'REGULAR', minute: 27, scorer: { name: 'Salah' }, team: { id: 2, name: 'Liverpool FC' }, score: { home: 1, away: 1 } }] };
const prohibited = /prediction|bingpot|correcto|resulto|coins|betting|on their slip|draw backers/i;
test('Champions goals use the same commentator as Premier League with scorer, match context and stable wording', () => {
  const entry = footballFeed(raw).find(entry => entry.updateKey === 'cl:77:goal:1-1');
  const result = buildChampionsStudioCommentary(entry);
  expect(result.lines[0]).toBe(buildLiveStudioRevealLine(entry.fixture, { homeGoals: 1, awayGoals: 1 }, entry.event, { footballOnly: true, events: entry.events, homeForm: [], awayForm: [] }));
  expect(result.lines.join(' ')).toContain('Salah'); expect(result.lines.join(' ')).toContain('Liverpool');
  expect(result.lines[0]).not.toBe('Salah · Liverpool FC');
  expect(buildChampionsStudioCommentary(entry)).toEqual(result);
  expect(result.lines.join(' ')).not.toMatch(prohibited);
});
test('every Champions phrase variant excludes prediction and betting references', () => {
  for (let id = 0; id < 100; id++) {
    for (const status of ['IN_PLAY', 'PAUSED', 'FINISHED']) {
      const match = { ...raw, id, status, bookings: [{ minute: 28, card: 'RED_CARD', team: raw.homeTeam, player: { name: 'Defender' } }] };
      const feed = footballFeed(match).map(buildChampionsStudioCommentary);
      expect(feed.flatMap(entry => entry.lines).join(' ')).not.toMatch(prohibited);
      expect(feed.find(entry => entry.event?.type === 'RED_CARD').lines.join(' ')).toContain('Defender');
    }
  }
});
test('unknown scorers are not invented and historical goals do not inherit the latest score', () => {
  const entry = footballFeed({ ...raw, score: { fullTime: { home: 4, away: 2 } }, goals: [{ minute: 27, team: raw.awayTeam }] }).find(entry => entry.event);
  const result = buildChampionsStudioCommentary(entry);
  expect(result.lines.join(' ')).not.toMatch(/Salah|4[–-]2/);
  expect(result.lines[0]).toContain('Liverpool');
});


test('shootout commentary credits the winner and missing final scores are not called draws', () => {
  const final = footballFeed({ ...raw, status: 'FINISHED', score: { fullTime: { home: 1, away: 1 }, penalties: { home: 3, away: 4 } } }).find(entry => entry.minute === 'FT');
  expect(buildChampionsStudioCommentary(final).lines[0]).toContain('Liverpool win the shootout');
  const unknown = footballFeed({ ...raw, status: 'FINISHED', score: {} }).find(entry => entry.minute === 'FT');
  expect(buildChampionsStudioCommentary(unknown).lines[0]).toContain('waiting for the confirmed final score');
});
