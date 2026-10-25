import { buildLiveStudioDeskEntries, mergeLiveStudioDeskHistory } from "./App";
const { getMatchEventMomentMs } = require("./liveMatchEvents");

const kickoff = "2026-10-19T19:00:00Z";
const fixture = { id: 560606, homeTeam: "Tottenham Hotspur FC", awayTeam: "Coventry City FC", kickoff };
const halfTimeAt = "2026-10-19T19:50:26.660Z";
const secondHalfAt = "2026-10-19T20:05:29.562Z";
const goals = [
  { type: "GOAL", minute: 14, homeGoals: 1, awayGoals: 0 },
  { type: "GOAL", minute: 49, homeGoals: 2, awayGoals: 0 },
  { type: "GOAL", minute: 58, homeGoals: 2, awayGoals: 1 },
  { type: "GOAL", minute: 90, injuryTime: 5, homeGoals: 3, awayGoals: 1 },
];
const match = (finished = false) => ({
  fixture, live: !finished, paused: false, finished, minute: finished ? null : 88,
  score: finished ? { homeGoals: 3, awayGoals: 1 } : { homeGoals: 2, awayGoals: 1 },
  events: finished ? goals : goals.slice(0, 3),
  matchState: { status: finished ? "FINISHED" : "IN_PLAY", halfTimeAt, secondHalfAt,
    halfTimeHomeGoals: 1, halfTimeAwayGoals: 0, finishedAt: "2026-10-19T21:00:00Z" },
  picks: [{ username: "Alice", prediction: { homeGoals: 1, awayGoals: 0 } }],
});
const scoreAt = (game, moment) => (game.events || []).filter(event => getMatchEventMomentMs(game.fixture, event, game.matchState) <= moment)
  .reduce((_score, event) => ({ homeGoals: event.homeGoals, awayGoals: event.awayGoals }), { homeGoals: 0, awayGoals: 0 });
const options = (game = match()) => ({ matches: [game], nowMs: Date.parse("2026-10-19T20:48:29.562Z"),
  getScoreAtMoment: (_fixture, moment) => scoreAt(game, moment),
  getTableRows: moment => [{ username: "Alice", position: 1, points: moment < Date.parse(kickoff) ? 0 : 7 }],
});

test("opening Spurs–Coventry at 88 minutes recovers earlier studio visits and the recorded half-time card", () => {
  const entries = buildLiveStudioDeskEntries(options());
  const checkpoints = entries.filter(entry => entry.id.startsWith("studio:checkpoint:"));
  expect(checkpoints.map(entry => entry.id.split(":").at(-1))).toEqual(["15", "20", "60", "75", "85"]);
  const half = entries.find(entry => entry.id.startsWith("studio:half-time:"));
  expect(half.lines).toContain("Tottenham Hotspur 1–0 Coventry City (HT)");
  expect(half.tableSnapshot).toBeDefined();
  expect(half.momentMs).toBe(Date.parse(halfTimeAt));
  expect(half.backfilled).toBe(true);
  const first = checkpoints.find(entry => entry.minute === "15'");
  expect(first.roundupMatches[0].score).toEqual({ homeGoals: 1, awayGoals: 0 });
  expect(first.lines.join(" ")).not.toContain("2–1");
  expect(first.playerRoundup.join(" ")).toContain("Alice");
  expect(checkpoints.find(entry => entry.minute === "60'").roundupMatches[0].score).toEqual({ homeGoals: 2, awayGoals: 1 });
  expect(entries.some(entry => entry.id === "studio:closing")).toBe(false);
});

test("joining after full-time recovers the break without putting the final score in earlier snapshots", () => {
  const entries = buildLiveStudioDeskEntries({ ...options(match(true)), nowMs: Date.parse("2026-10-19T21:02:00Z") });
  expect(entries.find(entry => entry.id === "studio:closing").roundupMatches[0].score).toEqual({ homeGoals: 3, awayGoals: 1 });
  const earlier = entries.filter(entry => entry.id !== "studio:closing");
  expect(earlier.length).toBeGreaterThan(0);
  expect(earlier.every(entry => entry.roundupMatches[0].score.homeGoals < 3)).toBe(true);
  const history = mergeLiveStudioDeskHistory([], entries);
  expect(mergeLiveStudioDeskHistory(history, entries)).toEqual(history);
});

test("an incomplete goal timeline recovers confirmed half-time but invents no earlier score snapshots", () => {
  const game = { ...match(), events: [] };
  const entries = buildLiveStudioDeskEntries(options(game));
  expect(entries.filter(entry => entry.backfilled && entry.id.startsWith("studio:checkpoint:"))).toEqual([]);
  expect(entries.find(entry => entry.id.startsWith("studio:half-time:")).roundupMatches[0].score).toEqual({ homeGoals: 1, awayGoals: 0 });
});

test("does not recover future visits or assume half-time from the wall clock alone", () => {
  const game = { ...match(), minute: 16, score: { homeGoals: 1, awayGoals: 0 }, events: goals.slice(0, 1), matchState: { status: "IN_PLAY" } };
  const entries = buildLiveStudioDeskEntries({ ...options(game), nowMs: Date.parse("2026-10-19T19:16:00Z") });
  expect(entries).toHaveLength(1);
  expect(entries[0].minute).toBe("15'");
  expect(entries[0].backfilled).toBeUndefined();
});

test("refresh cannot recover an early half-time card while another ground is still in its first half", () => {
  const game = match();
  // No usable score timeline: this ground would otherwise disappear from the
  // historical snapshots and allow the first game's break to be published.
  const other = { ...game, fixture: { ...fixture, id: 2 }, minute: 45,
    score: null, events: [], matchState: { status: "IN_PLAY", minute: 45 } };
  const entries = buildLiveStudioDeskEntries({ ...options(game), matches: [game, other] });
  expect(entries.some(entry => entry.id.startsWith("studio:half-time:"))).toBe(false);
});

test("recovered half-time waits for the last confirmed whistle and includes all four grounds", () => {
  const games = [1, 2, 3, 4].map(id => ({ ...match(), fixture: { ...fixture, id },
    matchState: { ...match().matchState, halfTimeAt: `2026-10-19T19:${49 + id}:00Z` } }));
  const entries = buildLiveStudioDeskEntries({ ...options(), matches: games,
    getScoreAtMoment: (fixture, moment) => scoreAt(games.find(game => game.fixture.id === fixture.id), moment) });
  const halves = entries.filter(entry => entry.id.startsWith("studio:half-time:"));
  expect(halves).toHaveLength(1);
  expect(halves[0].momentMs).toBe(Date.parse("2026-10-19T19:53:00Z"));
  expect(halves[0].roundupMatches).toHaveLength(4);
  expect(halves[0].roundupMatches.every(game => game.scoreLabel === "HT")).toBe(true);
});
