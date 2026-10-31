import { buildLiveStudioDeskEntries, buildLiveStudioFinalRoundup, buildLiveStudioEntryLines, mergeLiveStudioDeskHistory } from "./App";

const kickoff = Date.parse("2026-10-17T14:00:00Z");
const nowMs = kickoff + 120 * 60000;
const match = (id, home, away, homeGoals, awayGoals, kickoffMs = kickoff) => ({
  fixture: { id, homeTeam: home, awayTeam: away, kickoff: new Date(kickoffMs).toISOString() },
  score: { homeGoals, awayGoals }, finished: true, live: false, picks: [], events: [], lastNewsAt: nowMs,
});

const matches = [match(1, "Arsenal", "Chelsea", 2, 1), match(2, "Liverpool", "Brentford", 0, 0)];
const start = [{ username: "Dave", position: 1, points: 12 }, { username: "Phil", position: 2, points: 10 }];
const final = [{ username: "Phil", position: 1, points: 21 }, { username: "Dave", position: 2, points: 14 }];

test("one final studio post lists every result and carries the only end-of-session table", () => {
  const getTableRows = jest.fn(moment => moment < kickoff ? start : final);
  const entries = buildLiveStudioDeskEntries({ matches, nowMs, getTableRows });
  expect(entries).toHaveLength(1);
  expect(entries[0].verdictLabel).toBe("Back in the studio");
  expect(entries[0].lines).toContain("Arsenal 2–1 Chelsea (FT)");
  expect(entries[0].lines).toContain("Liverpool 0–0 Brentford (FT)");
  expect(entries[0].tableSnapshot).toEqual({ previousRows: start, currentRows: final });
  expect(getTableRows).toHaveBeenNthCalledWith(1, kickoff - 1);
  expect(getTableRows).toHaveBeenNthCalledWith(2, nowMs, { scoresByFixtureId: { 1: matches[0].score, 2: matches[1].score } });
  const individual = buildLiveStudioEntryLines({ statusLabel: "FT", revealLine: "Full time!", pointsLines: ["Bingpot for Phil! 7 points."], betLine: "Coins won.", tableImpactLine: "Old table commentary" });
  expect(individual).toEqual(["Full time!", "Bingpot for Phil! 7 points.", "Coins won."]);
});

test("a partial founder-only refresh cannot replace the complete saved full-time table", () => {
  const rows = Array.from({ length: 10 }, (_, index) => ({ username: `Member${index}`, position: index + 1, points: 100 - index }));
  const [complete] = buildLiveStudioDeskEntries({ matches, nowMs, getTableRows: () => rows });
  complete.badgeAwards = [{ username: "Member9", badgeId: "sniper" }];
  const [partial] = buildLiveStudioDeskEntries({ matches, nowMs, getTableRows: () => rows.slice(0, 7).map(row => ({ ...row, points: 0 })) });
  const [restored] = mergeLiveStudioDeskHistory([complete], [partial]);
  expect(restored.tableSnapshot).toEqual(complete.tableSnapshot);
  expect(restored.badgeAwards).toEqual(complete.badgeAwards);
  const [refreshed] = buildLiveStudioDeskEntries({ matches, nowMs, getTableRows: () => rows.map(row => ({ ...row, points: row.points + 1 })) });
  expect(mergeLiveStudioDeskHistory([restored], [refreshed])[0].tableSnapshot.currentRows[0].points).toBe(101);
});

test("the final roundup includes earlier completed games even when their live coverage expired", () => {
  const earlier = match(3, "Fulham", "Everton", 1, 1, kickoff - 150 * 60000);
  const getTableRows = jest.fn(() => final);
  const [entry] = buildLiveStudioDeskEntries({ matches, completedMatches: [earlier, ...matches], nowMs, getTableRows });
  expect(entry.lines.filter(line => /\(FT\)/.test(line))).toHaveLength(3);
  expect(entry.lines).toContain("Fulham 1–1 Everton (FT)");
  expect(getTableRows.mock.calls[0][0]).toBe(kickoff - 150 * 60000 - 1);
  expect(buildLiveStudioDeskEntries({ matches: [], completedMatches: [earlier], nowMs, getTableRows })).toHaveLength(1);
});

test("never creates a final roundup during live play or while a started fixture is temporarily missing", () => {
  const live = { ...matches[0], finished: false, live: true, minute: 57 };
  expect(buildLiveStudioFinalRoundup({ matches: [live, matches[1]], nowMs })).toBeNull();
  expect(buildLiveStudioDeskEntries({ matches: [live, matches[1]], nowMs }).some(entry => entry.id === "studio:closing")).toBe(false);
  expect(buildLiveStudioDeskEntries({ matches: [], completedMatches: matches, hasUnfinishedFixtures: true, nowMs })).toEqual([]);
});

test("old saved full-time cards lose their standings while keeping their points commentary", () => {
  const old = { id: "1:full-time", fixtureId: 1, fullTime: true, momentMs: nowMs,
    lines: ["Full time!", "Bingpot for Phil! 7 points.", "Here's how the table changed."],
    tableSnapshot: { previousRows: start, currentRows: final }, tableLabel: "Mini-league at full time" };
  const [card] = mergeLiveStudioDeskHistory([old], []);
  expect(card.lines).toEqual(["Full time!", "Bingpot for Phil! 7 points."]);
  expect(card.tableSnapshot).toBeUndefined();
  expect(card.tableLabel).toBeUndefined();
});


test("confirmed results publish immediately while the next game has lineups or kicks off shortly", () => {
  const upcoming = { fixture: { id: 9, homeTeam: "Forest", awayTeam: "Arsenal", kickoff: new Date(nowMs + 15 * 60000).toISOString() }, finished: false, live: false, score: null };
  const entries = buildLiveStudioDeskEntries({ matches: [...matches, upcoming], completedMatches: matches, nowMs, nextKickoffMs: nowMs + 15 * 60000 });
  expect(entries).toHaveLength(1);
  expect(entries[0].minute).toBe("FT");
  expect(entries[0].roundupMatches.map(match => match.fixture.id)).toEqual([1, 2]);
  expect(entries[0].roundupMatches.every(match => match.scoreLabel === "FT")).toBe(true);
});
