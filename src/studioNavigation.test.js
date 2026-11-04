import { isStudioMatchLive, nextStudioKickoff, studioCountdown } from './studioNavigation';
const now = Date.parse('2026-11-04T18:14:00Z');
const fixture = status => ({ status, kickoff: '2026-11-04T17:45:00Z' });
test.each(['LIVE', 'IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'])('%s remains on the live match list', status => {
  expect(isStudioMatchLive(fixture(status), now)).toBe(true);
});
test.each(['FINISHED', 'AWARDED', 'TIMED', 'SCHEDULED', 'POSTPONED', 'CANCELLED', 'SUSPENDED'])('%s is excluded from the live match list', status => {
  expect(isStudioMatchLive(fixture(status), now)).toBe(false);
});
test('old unfinished snapshots and future fixtures cannot produce live indicators', () => {
  expect(isStudioMatchLive({ status: 'IN_PLAY', kickoff: '2026-11-01T18:00:00Z' }, now)).toBe(false);
  expect(isStudioMatchLive({ status: 'IN_PLAY', kickoff: '2026-11-05T18:00:00Z' }, now)).toBe(false);
});
test('countdown uses the next scheduled kickoff, excluding cancelled matches', () => {
  const next = { status: 'TIMED', kickoff: '2026-11-11T20:00:00Z' };
  expect(nextStudioKickoff([{ status: 'CANCELLED', kickoff: '2026-11-05T18:00:00Z' }, fixture('FINISHED'), next], now)).toEqual(next);
  expect(studioCountdown(next.kickoff, now)).toBe('7d 1h 46m 0s');
});
