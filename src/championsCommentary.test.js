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
  expect(buildChampionsStudioCommentary(final).title).toContain('Penalties: 3–4.');
  expect(buildChampionsStudioCommentary(final).lines.join(' ')).not.toMatch(/3[–-]4/);
  const unknown = footballFeed({ ...raw, status: 'FINISHED', score: {} }).find(entry => entry.minute === 'FT');
  expect(buildChampionsStudioCommentary(unknown).lines[0]).toContain('waiting for the confirmed final score');
});

test.each([['GOAL', '⚽'], ['YELLOW_CARD', '🟨'], ['RED_CARD', '🟥'], ['SUBSTITUTION', '🔁'], ['PENALTY_MISSED', '🥅'], ['GOAL_DISALLOWED', '❌']])('Champions %s updates use the Premier League icon', (type, icon) => {
  const entry = footballFeed(raw).find(entry => entry.event);
  expect(buildChampionsStudioCommentary({ ...entry, event: { ...entry.event, type } }).icon).toBe(icon);
});
test('goal scores belong in the shared event heading and are not repeated in the commentary body', () => {
  const entry = footballFeed(raw).find(entry => entry.event);
  const result = buildChampionsStudioCommentary(entry);
  expect(result.title).toContain('Goal for LIV!'); expect(result.title).toContain('1-1');
  expect(result.lines.join(' ')).not.toMatch(/1[–-]1/);
});
test('Sporting–United counts Bruno’s penalty once and credits the ruled-out own goal to United', () => {
  const sporting = { id: 498, name: 'Sporting Clube de Portugal' };
  const united = { id: 66, name: 'Manchester United FC' };
  const penalty = { type: 'PENALTY', minute: 48, team: united, scorer: { name: 'Bruno Fernandes' }, score: { home: 1, away: 1 } };
  const second = { ...penalty, type: 'REGULAR', minute: 50, score: { home: 1, away: 2 } };
  const ownGoal = { type: 'GOAL', goalType: 'OWN_GOAL', minute: 82, team: sporting, scorerName: 'Kaique', homeGoals: 2, awayGoals: 3 };
  const feed = footballFeed({ ...raw, id: 575411, status: 'FINISHED', minute: 90, homeTeam: sporting, awayTeam: united,
    score: { fullTime: { home: 2, away: 2 } }, goals: [penalty, second],
    recordedState: { matchEvents: [
      { type: 'GOAL', goalType: 'PENALTY', team: united, scorerName: 'Bruno Fernandes', minute: null, scored: true },
      ownGoal,
      { ...ownGoal, type: 'GOAL_DISALLOWED', minute: 86, scoreCorrection: true, synthetic: true,
        source: 'observed-score-correction', previousHomeGoals: 2, previousAwayGoals: 3, awayGoals: 2 },
    ] },
  }).map(buildChampionsStudioCommentary);
  const bruno = feed.filter(entry => entry.event?.scorerName === 'Bruno Fernandes');
  expect(bruno.map(entry => entry.event.minute)).toEqual([48, 50]);
  expect(bruno[0].lines.join(' ')).not.toMatch(/hat-trick/i);
  expect(bruno[1].lines.join(' ')).toContain('On for a hat-trick');
  expect(bruno[1].lines.join(' ')).not.toContain("That's the hat-trick");
  const scored = feed.find(entry => entry.event?.minute === 82);
  expect(scored.title).toContain('Goal for MUN!');
  expect(scored.lines[0]).toMatch(/own goal from Kaique.*Manchester United/i);
  const ruledOut = feed.find(entry => entry.event?.type === 'GOAL_DISALLOWED');
  expect(ruledOut.title).toContain('Goal ruled out for MUN');
  expect(ruledOut.lines[0]).toMatch(/own goal by Kaique.*Manchester United/i);
  expect(feed.find(entry => entry.minute === 'FT').title).toContain('2-2');
});
test('half-time and second-half headings retain the half-time score after later goals', () => {
  const feed = footballFeed({ ...raw, status: 'FINISHED', minute: 90, score: { halfTime: { home: 0, away: 0 }, fullTime: { home: 4, away: 2 } } }).map(buildChampionsStudioCommentary);
  const half = feed.find(entry => entry.minute === 'HT'), restart = feed.find(entry => entry.minute === '2H'), final = feed.find(entry => entry.minute === 'FT');
  for (const entry of [half, restart]) { expect(entry.title).toContain('0-0'); expect(entry.title).not.toContain('4-2'); expect(entry.lines.join(' ')).not.toMatch(/0[–-]0|4[–-]2/); }
  expect(half.icon).toBe('🕛'); expect(restart.icon).toBe('▶');
  expect(final.title).toContain('4-2'); expect(final.icon).toBe('🏁');
  expect(final.lines.join(' ')).not.toMatch(/4[–-]2/);
});
