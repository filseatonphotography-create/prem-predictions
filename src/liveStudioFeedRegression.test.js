import {
  buildFixtureSyncPayload, getLiveStudioEvents, buildLiveStudioEventLine,
  buildLiveStudioRevealLine, buildLiveStudioPhaseEvents, isLiveStudioFixtureInCoverageWindow,
  buildLiveStudioLineupsLine, getLiveStudioChangedTableSnapshot, buildLiveStudioFullTimeTableLine,
} from "./App";

const fixture = { id: 57, homeTeam: "Arsenal", awayTeam: "Chelsea", kickoff: "2026-10-17T14:00:00Z", gameweek: 8 };
const raw = {
  id: 57, homeTeam: { id: 1, name: "Arsenal", lineup: [{ name: "Home starter" }] },
  awayTeam: { id: 2, name: "Chelsea", lineup: [{ name: "Away starter" }] },
  utcDate: fixture.kickoff, status: "IN_PLAY", minute: 36,
  score: { fullTime: { home: 1, away: 0 }, halfTime: { home: 1, away: 0 } },
  goals: [{ type: "REGULAR", minute: 26, team: { id: 1, name: "Arsenal" }, scorer: { name: "Bukayo Saka" }, score: { home: 1, away: 0 } }],
  bookings: [{ minute: 30, card: "YELLOW", team: { name: "Chelsea" }, player: { name: "Booked player" } }],
  substitutions: [{ minute: 35, team: { name: "Arsenal" }, playerOut: { name: "Off player" }, playerIn: { name: "On player" } }],
};

test("browser sync carries goals, cards, substitutions and lineups into the same studio timeline", () => {
  const state = buildFixtureSyncPayload([raw], [fixture]).matchStateUpdates[57];
  const events = getLiveStudioEvents(state);
  expect(events.map(event => event.type)).toEqual(["SUBSTITUTION", "YELLOW_CARD", "GOAL"]);
  const sub = buildLiveStudioEventLine({ fixture, event: events[0], seed: "sub" });
  expect(sub).toContain("On player");
  expect(sub).toContain("Off player");
  expect(buildLiveStudioEventLine({ fixture, event: events[1], seed: "card" })).toContain("Booked player");
  const goal = buildLiveStudioRevealLine(fixture, { homeGoals: 1, awayGoals: 0 }, events[2]);
  expect(goal).toContain("Bukayo Saka");
  expect(goal).toContain("Arsenal");
  expect(goal).toContain("26'");
  expect(buildLiveStudioLineupsLine({ fixture, matchState: state })).toContain("Home starter");
  expect(buildLiveStudioLineupsLine({ fixture, matchState: state })).toContain("Away starter");
});

test("half-time cannot appear because elapsed time passed 45 or the half-time score was populated", () => {
  const state = buildFixtureSyncPayload([raw], [fixture]).matchStateUpdates[57];
  expect(buildLiveStudioPhaseEvents({ fixture, matchState: state, score: { homeGoals: 1, awayGoals: 0 }, events: getLiveStudioEvents(state) })).toEqual([]);
});

test("confirmed phase cards follow first-half and final added-time goals", () => {
  const events = [{ type: "GOAL", minute: 45, injuryTime: 8, homeGoals: 1, awayGoals: 0 }, { type: "GOAL", minute: 90, injuryTime: 9, homeGoals: 2, awayGoals: 0 }];
  const phases = buildLiveStudioPhaseEvents({ fixture, matchState: { status: "FINISHED", minute: 90, halfTimeHomeGoals: 1, halfTimeAwayGoals: 0 }, score: { homeGoals: 2, awayGoals: 0 }, events });
  expect(phases.find(event => event.statusLabel === "HT").sortMinute).toBeGreaterThan(45.08);
  expect(phases.find(event => event.statusLabel === "FT").sortMinute).toBeGreaterThan(90.09);
});

test("shows confirmed lineups before kickoff, but does not create coverage for an empty starting XI", () => {
  const state = buildFixtureSyncPayload([{ ...raw, status: "TIMED", score: {} }], [fixture]).matchStateUpdates[57];
  const now = Date.parse(fixture.kickoff) - 45 * 60000;
  expect(isLiveStudioFixtureInCoverageWindow(fixture, state, now)).toBe(true);
  expect(isLiveStudioFixtureInCoverageWindow(fixture, { status: "TIMED" }, now)).toBe(false);
});

test("unchanged positions suppress mid-match tables but always produce a full-time table and commentary", () => {
  const previousRows = [{ username: "Phil", position: 1, points: 20 }, { username: "Dave", position: 2, points: 18 }];
  const currentRows = previousRows.map(row => ({ ...row, points: row.points + 2 }));
  expect(getLiveStudioChangedTableSnapshot(previousRows, currentRows)).toBeNull();
  expect(getLiveStudioChangedTableSnapshot(previousRows, currentRows, { fullTime: true })).toEqual({ previousRows, currentRows });
  expect(buildLiveStudioFullTimeTableLine({ fixture, previousRows, currentRows, score: { homeGoals: 1, awayGoals: 0 }, seed: "final" })).toMatch(/table/);
});
