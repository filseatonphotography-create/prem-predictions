import {
  buildLiveStudioFullTimePointsLines, buildLiveStudioEntryLines,
  buildLiveStudioFinalRoundup, buildLiveStudioFullTimeTableLine,
  getSavedLiveStudioFullTimeFixtures,
} from "./App";

const score = { homeGoals: 2, awayGoals: 1 };
const pick = (username, homeGoals, awayGoals, boost = {}) => ({ username, prediction: { homeGoals, awayGoals, ...boost } });

test("full-time celebrates every Bingpot and names everyone who earned points with boosts", () => {
  const picks = [pick("Phil", 2, 1), pick("Double", 2, 1, { isDouble: true }), pick("Triple", 2, 1, { isTriple: true }),
    pick("Dave", 3, 2), pick("Sam", 3, 1), pick("Zero", 0, 1), pick("Empty", "", ""), { username: "Missing" }];
  const lines = buildLiveStudioFullTimePointsLines({ picks, score, seed: "fulham-final" });
  expect(lines).toHaveLength(5);
  expect(lines.find(line => line.includes("Phil"))).toMatch(/Bingpot.*7|7.*Bingpot/);
  expect(lines.find(line => line.includes("Double"))).toContain("14 prediction points with the double");
  expect(lines.find(line => line.includes("Triple"))).toContain("21 prediction points with the triple");
  expect(lines.find(line => line.includes("Dave"))).toContain("4 prediction points");
  expect(lines.find(line => line.includes("Sam"))).toContain("2 prediction points");
  expect(lines.join(" ")).not.toMatch(/Zero|Empty|Missing|2-1/);
  const card = buildLiveStudioEntryLines({ statusLabel: "FT", revealLine: "The whistle goes.", pointsLines: lines,
    betLine: "Coins settled.", tableImpactLine: "Here's the table." });
  expect(card).toEqual(["The whistle goes.", ...lines, "Coins settled."]);
});

test("there is no prediction points commentary when nobody earns points", () => {
  expect(buildLiveStudioFullTimePointsLines({ picks: [pick("Phil", 0, 1), pick("Dave", 1, 1)], score, seed: "zero" })).toEqual([]);
  expect(buildLiveStudioFullTimePointsLines({ picks: [], score })).toEqual([]);
});

test("a goalless draw still earns a Bingpot for a valid exact prediction", () => {
  expect(buildLiveStudioFullTimePointsLines({ picks: [pick("Phil", 0, 0)], score: { homeGoals: 0, awayGoals: 0 }, seed: "draw" })[0]).toMatch(/Bingpot/);
});

test("the final table compares kick-off standings with full-time, including concurrent games", () => {
  const fixture = { id: 57, kickoff: "2026-10-17T14:00:00Z" };
  const kickoff = Date.parse(fixture.kickoff);
  const start = [{ username: "Dave", position: 1, points: 12 }, { username: "Phil", position: 2, points: 10 }];
  const midgame = [{ username: "Phil", position: 1, points: 17 }, { username: "Dave", position: 2, points: 12 }];
  const final = [{ username: "Phil", position: 1, points: 21 }, { username: "Dave", position: 2, points: 14 }];
  const fullTimeMs = kickoff + 110 * 60000;
  const getTableRows = jest.fn(moment => moment < kickoff ? start : moment < fullTimeMs ? midgame : final);
  const roundup = buildLiveStudioFinalRoundup({
    matches: [{ fixture, score, finished: true, lastNewsAt: fullTimeMs }], nowMs: fullTimeMs, getTableRows,
  });
  const snapshot = roundup.tableSnapshot;
  expect(snapshot).toEqual({ previousRows: start, currentRows: final });
  expect(getTableRows).toHaveBeenNthCalledWith(1, kickoff - 1);
  expect(getTableRows).toHaveBeenNthCalledWith(2, fullTimeMs, { scoresByFixtureId: { [fixture.id]: score } });
  const line = buildLiveStudioFullTimeTableLine({ ...snapshot, fixture, score, seed: "start-to-finish" });
  expect(line).toContain("Phil");
  expect(line).toContain("up");
  expect(line).toContain("since kick-off");
  expect(line).not.toMatch(/unchanged|No change|holds/);
});

test("previously read full-time cards can be enriched without reviving another league's history", () => {
  sessionStorage.clear(); localStorage.clear();
  sessionStorage.setItem("live-studio-commentary:v1:league-1", JSON.stringify([
    { id: "57:full-time", fixtureId: 57, fullTime: true }, { id: "studio:roundup:1", fixtureId: 999 },
  ]));
  expect([...getSavedLiveStudioFullTimeFixtures("league-1")]).toEqual(["57"]);
  expect([...getSavedLiveStudioFullTimeFixtures("league-2")]).toEqual([]);
  sessionStorage.clear(); localStorage.clear();
});
