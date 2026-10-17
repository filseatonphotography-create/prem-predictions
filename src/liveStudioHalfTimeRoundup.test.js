import { buildLiveStudioDeskEntries, mergeLiveStudioDeskHistory } from "./App";

const nowMs = Date.parse("2026-10-17T14:51:00Z");
const kickoff = "2026-10-17T14:00:00Z";
const match = (id, overrides = {}) => ({
  fixture: { id, homeTeam: `Home ${id}`, awayTeam: `Away ${id}`, kickoff },
  live: true, paused: true, finished: false, minute: 45,
  score: { homeGoals: 0, awayGoals: 0 }, lastNewsAt: nowMs - 1000,
  ...overrides,
});
const previousRows = [{ username: "Phil", position: 1, points: 20 }];
const currentRows = [{ username: "Phil", position: 1, points: 24 }];
const getTableRows = time => time < Date.parse(kickoff) ? previousRows : currentRows;

test("a confirmed half-time break gives all grounds' scores followed by the updated table", () => {
  const matches = [match(1, { score: { homeGoals: 2, awayGoals: 1 } }), match(2), match(3), match(4), match(5)];
  const [entry] = buildLiveStudioDeskEntries({ matches, nowMs, getTableRows });
  expect(entry.verdictLabel).toBe("Back in the studio");
  expect(entry.lines).toContain("Home 1 2–1 Away 1 (HT)");
  expect(entry.lines).toContain("Home 5 0–0 Away 5 (HT)");
  expect(entry.lines).toHaveLength(7); // Intro, all five scores, then the table introduction.
  expect(entry.lines.at(-1)).toMatch(/table|standings/);
  expect(entry.tableSnapshot).toEqual({ previousRows, currentRows });
  expect(entry.tableLabel).toBe("Mini-league at half time");
  expect(buildLiveStudioDeskEntries({ matches, nowMs, getTableRows })).toHaveLength(1);
});

test("includes other games still playing and excludes future, finished and unknown scores", () => {
  const matches = [match(1), match(2, { paused: false, minute: 43 }),
    match(3, { paused: false, live: false }), match(4, { paused: false, finished: true }),
    match(5, { score: { homeGoals: null, awayGoals: null } })];
  const [entry] = buildLiveStudioDeskEntries({ matches, nowMs, getTableRows });
  expect(entry.lines).toContain("Home 1 0–0 Away 1 (HT)");
  expect(entry.lines).toContain("Home 2 0–0 Away 2 (43')");
  expect(entry.lines.join(" ")).not.toMatch(/Home [345]|null/);
});

test("there is no half-time roundup before the provider confirms a pause", () => {
  const entries = buildLiveStudioDeskEntries({ matches: [match(1, { paused: false, minute: 45 })], nowMs, getTableRows });
  expect(entries.some(entry => entry.id.startsWith("studio:half-time:"))).toBe(false);
});

test("the scores and table stay together as a historical snapshot after play resumes", () => {
  const first = buildLiveStudioDeskEntries({ matches: [match(1)], nowMs, getTableRows });
  const history = mergeLiveStudioDeskHistory([], first);
  const later = buildLiveStudioDeskEntries({ matches: [match(1, { score: { homeGoals: 1, awayGoals: 0 } })], nowMs: nowMs + 60000, getTableRows });
  expect(mergeLiveStudioDeskHistory(history, later)).toEqual(first);
  expect(mergeLiveStudioDeskHistory(history, [])).toEqual(first);
});

test("staggered kick-offs get separate half-time checkpoints", () => {
  const matches = [match(1), match(2, { fixture: { id: 2, homeTeam: "Home 2", awayTeam: "Away 2", kickoff: "2026-10-17T14:15:00Z" } })];
  const entries = buildLiveStudioDeskEntries({ matches, nowMs, getTableRows });
  expect(new Set(entries.map(entry => entry.id)).size).toBe(2);
});

test("the studio never closes while a game is at 57 minutes", () => {
  const finished = match(1, { live: false, paused: false, finished: true });
  const live = match(2, { paused: false, minute: 57 });
  expect(buildLiveStudioDeskEntries({ matches: [finished, live], nowMs }).some(entry => entry.id === "studio:closing")).toBe(false);
  // A live fixture temporarily missing a score must also prevent a wrap-up.
  expect(buildLiveStudioDeskEntries({ matches: [finished], nowMs, hasUnfinishedFixtures: true })).toEqual([]);
});
