import { buildFixtureSyncPayload, getLiveStudioClockMinute, buildLiveStudioDeskEntries } from "./App";
const { mergeRecordedMatchState } = require("./liveMatchEvents");

const fixture = { id: 560606, homeTeam: "Tottenham Hotspur FC", awayTeam: "Coventry City FC", kickoff: "2026-10-19T19:00:00Z" };
const raw = {
  id: fixture.id, utcDate: fixture.kickoff, homeTeam: { name: fixture.homeTeam }, awayTeam: { name: fixture.awayTeam },
  status: "IN_PLAY", minute: null, lastUpdated: "2026-10-19T19:15:00Z", score: { fullTime: { home: 1, away: 0 } },
};

test.each([undefined, null, ""])("a provider minute of %s clears an older minute instead of freezing the studio clock", minute => {
  const previous = { status: "IN_PLAY", minute: 0, lastUpdated: "2026-10-19T19:00:00Z" };
  const incoming = buildFixtureSyncPayload([{ ...raw, minute }], [fixture]).matchStateUpdates[fixture.id];
  expect(incoming.minute).toBeNull();
  const merged = mergeRecordedMatchState(incoming, previous);
  const nowMs = Date.parse("2026-10-19T19:15:00Z");
  const currentMinute = getLiveStudioClockMinute(fixture, merged, nowMs);
  expect(currentMinute).toBe(15);
  expect(buildLiveStudioDeskEntries({ nowMs, matches: [{ fixture, matchState: merged, score: { homeGoals: 1, awayGoals: 0 }, minute: currentMinute, live: true }] })[0].title).toBe("Around the grounds");
});

test("a missing second-half minute uses the recorded restart, never a retained half-time 45", () => {
  const previous = { status: "PAUSED", minute: 45, lastUpdated: "2026-10-19T19:50:00Z", halfTimeAt: "2026-10-19T19:50:26.660Z", secondHalfAt: "2026-10-19T20:05:29.562Z" };
  const nowMs = Date.parse("2026-10-19T20:20:29.562Z");
  const incoming = buildFixtureSyncPayload([{ ...raw, lastUpdated: new Date(nowMs).toISOString() }], [fixture]).matchStateUpdates[fixture.id];
  const merged = mergeRecordedMatchState(incoming, previous);
  expect(merged.minute).toBeNull();
  expect(getLiveStudioClockMinute(fixture, merged, nowMs)).toBe(60);
});
