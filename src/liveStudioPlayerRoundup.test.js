import { act, renderHook } from "@testing-library/react";
import { useLiveStudioCommentaryHistory, buildLiveStudioPlayerRoundup, getLiveStudioPlayerUpdates, buildLiveStudioDeskEntries, mergeLiveStudioDeskHistory } from "./App";

const kickoff = "2026-10-17T14:00:00Z";
const nowMs = Date.parse(kickoff) + 25 * 60000;
const pick = (username, homeGoals, awayGoals, boost = {}) => ({ username, userId: username.toLowerCase(), prediction: { homeGoals, awayGoals, ...boost } });
const match = (id, overrides = {}) => ({
  fixture: { id, homeTeam: "Arsenal", awayTeam: "Chelsea", kickoff },
  live: true, paused: false, finished: false, minute: 25, lastNewsAt: nowMs - 4 * 60000,
  score: { homeGoals: 2, awayGoals: 1 },
  picks: [pick("Phil", 2, 1, { isDouble: true }), pick("Dave", 3, 2), pick("Emma", 0, 1)],
  ...overrides,
});

test("every player gets their projected total, including boosts, Bingpots and zero points", () => {
  const matches = [match(1), match(2, { picks: [pick("Phil", 2, 1, { isTriple: true }), pick("Dave", 3, 1), pick("Emma", 1, 0)] })];
  const lines = buildLiveStudioPlayerRoundup({ matches });
  expect(lines).toHaveLength(3);
  expect(lines.find(line => line.includes("Phil"))).toMatch(/35 prediction points/);
  expect(lines[0]).toMatch(/2 Bingpots in play/);
  expect(lines[0]).toMatch(/double and triple boosts included/);
  expect(lines.find(line => line.includes("Dave"))).toMatch(/6 prediction points/);
  expect(lines.find(line => line.includes("Emma"))).toMatch(/4 prediction points/);
  const zero = buildLiveStudioPlayerRoundup({ matches: [match(1)] }).find(line => line.includes("Emma"));
  expect(zero).toMatch(/0 prediction points/);
});

test.each(["15-minute", "20-minute", "60-minute", "75-minute", "late", "half-time", "final"])("the %s studio visit includes the prediction desk", phase => {
  const game = match(1, phase === "late" ? { minute: 85, lastNewsAt: nowMs - 5 * 60000 } : phase.endsWith("-minute") ? { minute: Number(phase.split("-")[0]) } : phase === "half-time" ? { paused: true } : phase === "quiet" ? { minute: 40 } : phase === "final" ? { finished: true, live: false } : {});
  const [entry] = buildLiveStudioDeskEntries({ matches: phase === "quiet" ? [game, match(2, { minute: 40 })] : [game], nowMs });
  expect(entry.verdictLabel).toBe("Back in the studio");
  expect(entry.playerRoundup).toHaveLength(3);
  for (const name of ["Phil", "Dave", "Emma"]) expect(entry.playerRoundup.find(line => line.includes(name))).toMatch(/prediction points/);
  if (phase === "final") {
    expect(entry.playerRoundup.join(" ")).not.toMatch(/in line|on for|as things stand|in play/);
    expect(entry.playerRoundup[0]).toMatch(/Bingpot banked/);
  }
});

test("late predictions enrich the original snapshot without changing scores, timestamp or order", () => {
  const [original] = buildLiveStudioDeskEntries({ matches: [match(1, { picks: [] })], nowMs });
  const [later] = buildLiveStudioDeskEntries({ matches: [match(1, { minute: 29, score: { homeGoals: 2, awayGoals: 2 } })], nowMs: nowMs + 240000 });
  const [saved] = mergeLiveStudioDeskHistory([original], [later]);
  expect(saved.momentMs).toBe(original.momentMs);
  expect(saved.lines).toEqual(original.lines);
  // Phil's original 2-1 double is still worth 14 in this historical snapshot.
  expect(saved.playerRoundup[0]).toMatch(/Phil.*14 prediction points/);
  expect(saved.playerRoundup).toHaveLength(3);
  expect(mergeLiveStudioDeskHistory([saved], [original])[0].playerRoundup).toEqual(saved.playerRoundup);
  const [partial] = buildLiveStudioDeskEntries({ matches: [match(1, { picks: [pick("Dave", 3, 2)] })], nowMs });
  expect(mergeLiveStudioDeskHistory([saved], [partial])[0].playerRoundup).toEqual(saved.playerRoundup);
});

test("missing predictions and invalid scores cannot create fictional Bingpots", () => {
  expect(buildLiveStudioPlayerRoundup({ matches: [match(1, { picks: [{ username: "Missing" }, pick("Empty", "", "")] })] })).toEqual([]);
  expect(buildLiveStudioPlayerRoundup({ matches: [match(1, { score: { homeGoals: null, awayGoals: null } })] })).toEqual([]);
});

test("the final player rundown survives a partial refresh and later score corrections", () => {
  const [full] = buildLiveStudioDeskEntries({ matches: [match(1, { finished: true, live: false })], nowMs });
  const [partial] = buildLiveStudioDeskEntries({ matches: [match(1, { finished: true, live: false, picks: [pick("Dave", 3, 2)] })], nowMs });
  const [refreshed] = mergeLiveStudioDeskHistory([full], [partial]);
  expect(refreshed.playerRoundup).toHaveLength(3);
  expect(refreshed.lines.join(" ")).toMatch(/Best return.*Phil.*14 prediction points/);
  expect(refreshed.playerRoundup.find(line => line.includes("Phil"))).toContain("14 prediction points");
  const [corrected] = buildLiveStudioDeskEntries({ matches: [match(1, { finished: true, live: false, score: { homeGoals: 0, awayGoals: 1 }, picks: [pick("Dave", 3, 2)] })], nowMs });
  const [updated] = mergeLiveStudioDeskHistory([refreshed], [corrected]);
  expect(updated.playerRoundup.find(line => line.includes("Emma"))).toContain("7 prediction points");
  expect(updated.playerRoundup.find(line => line.includes("Phil"))).toContain("0 prediction points");
});

test("legacy and loaded account IDs for the same player do not create duplicates", () => {
  const [full] = buildLiveStudioDeskEntries({ matches: [match(1)], nowMs });
  const [loaded] = buildLiveStudioDeskEntries({ matches: [match(1, { picks: [{ ...pick("Phil", 2, 1, { isDouble: true }), userId: "loaded-id" }] })], nowMs });
  const [merged] = mergeLiveStudioDeskHistory([full], [loaded]);
  expect(merged.playerRoundup).toHaveLength(3);
  expect(merged.playerRoundup.filter(line => line.includes("Phil"))).toHaveLength(1);
});

test("the saved full rundown survives loading, a partial final response and a second page reload", () => {
  sessionStorage.clear(); localStorage.clear();
  const full = buildLiveStudioDeskEntries({ matches: [match(1, { finished: true, live: false })], nowMs });
  const partial = buildLiveStudioDeskEntries({ matches: [match(1, { finished: true, live: false, picks: [pick("Dave", 3, 2)] })], nowMs });
  sessionStorage.setItem("live-studio-commentary:v1:refresh-final", JSON.stringify(full));
  const { result, rerender, unmount } = renderHook(({ feed }) => useLiveStudioCommentaryHistory(feed, "refresh-final"), { initialProps: { feed: [{ id: "waiting" }] } });
  expect(result.current.find(entry => entry.id === "studio:closing").playerRoundup).toHaveLength(3);
  act(() => rerender({ feed: partial }));
  expect(result.current.find(entry => entry.id === "studio:closing").playerRoundup).toHaveLength(3);
  unmount();
  const restored = renderHook(() => useLiveStudioCommentaryHistory(partial, "refresh-final"));
  expect(restored.result.current.find(entry => entry.id === "studio:closing").playerRoundup).toHaveLength(3);
  restored.unmount(); sessionStorage.clear(); localStorage.clear();
});


test("saved player summaries use current account IDs for profile avatars, retaining every player's points", () => {
  const [entry] = buildLiveStudioDeskEntries({ matches: [match(1)], nowMs });
  const users = [{ username: "Phil", userId: "phil-account" }, { username: "Dave", userId: "dave-account" }, { username: "Emma", userId: "emma-account" }];
  const updates = getLiveStudioPlayerUpdates(entry, users);
  expect(updates).toHaveLength(3);
  expect(updates.find(row => row.username === "Phil")).toEqual(expect.objectContaining({ userId: "phil-account", line: expect.stringContaining("14 prediction points") }));
  expect(updates.find(row => row.username === "Emma").line).toContain("0 prediction points");
  expect(updates.every(row => !row.line.includes("At the prediction desk:"))).toBe(true);
  const legacy = { playerRoundup: ["At the prediction desk: Phil has 14 prediction points coming from these games if the scores stay put."] };
  expect(getLiveStudioPlayerUpdates(legacy, users)).toEqual([{ userId: "phil-account", username: "Phil", line: "Phil has 14 prediction points coming from these games if the scores stay put." }]);
});

test("studio visits mention each live bet's selection and stake, including players without a prediction", () => {
  const games = [match(1, { picks: [
    { ...pick("Phil", 2, 1), bet: { side: "H", stake: 4 } },
    { username: "Dave", userId: "dave", bet: { side: "D", stake: 1 } },
    pick("Emma", 0, 1),
  ] })];
  const [entry] = buildLiveStudioDeskEntries({ matches: games, nowMs });
  const phil = entry.playerRoundup.find(line => line.includes("Phil"));
  const dave = entry.playerRoundup.find(line => line.includes("Dave"));
  expect(phil).toContain("4 coins backing Arsenal to win");
  expect(phil).toMatch(/going their way|winning bet|Looking good/);
  expect(dave).toContain("1 coin backing a draw");
  expect(dave).toMatch(/at risk|rescue|cost them/);
  expect(dave).not.toContain("prediction points");
  expect(entry.playerRoundup.find(line => line.includes("Emma"))).not.toContain("coins");
  expect(entry.playerRoundup.join(" ")).not.toMatch(/balance|coins table|coin standings/i);
});

test("late bets enrich the original roundup without changing its score snapshot or publication time", () => {
  const [original] = buildLiveStudioDeskEntries({ matches: [match(1)], nowMs });
  const [withBets] = buildLiveStudioDeskEntries({ matches: [match(1, { minute: 29, score: { homeGoals: 0, awayGoals: 1 }, picks: [
    { username: "Phil", userId: "phil", bet: { side: "H", stake: 4 } },
    { username: "Dave", userId: "dave", bet: { side: "D", stake: 2 } },
  ] })], nowMs: nowMs + 240000 });
  const [enriched] = mergeLiveStudioDeskHistory([original], [withBets]);
  expect(enriched.momentMs).toBe(original.momentMs);
  expect(enriched.playerRoundup.find(line => line.includes("Phil"))).toContain("14 prediction points");
  expect(enriched.playerRoundup.find(line => line.includes("Phil"))).toContain("4 coins backing Arsenal to win");
  expect(enriched.playerRoundup.find(line => line.includes("Phil"))).toMatch(/going their way|winning bet|Looking good/);
  const [thin] = buildLiveStudioDeskEntries({ matches: [match(1)], nowMs });
  expect(mergeLiveStudioDeskHistory([enriched], [thin])[0].playerRoundup).toEqual(enriched.playerRoundup);
});

test("finished bets and invalid selections are not presented as bets still in play", () => {
  const picks = [{ ...pick("Phil", 2, 1), bet: { side: "H", stake: 4 } },
    { username: "Invalid", userId: "invalid", bet: { side: "unknown", stake: 10 } }];
  const finished = buildLiveStudioPlayerRoundup({ matches: [match(1, { picks })], finished: true });
  expect(finished.join(" ")).not.toContain("coins backing");
  expect(finished).toHaveLength(1);
  const active = buildLiveStudioPlayerRoundup({ matches: [match(1, { picks })] });
  expect(active).toHaveLength(1);
});


test.each([15, 20, 45, 60, 75, 85])("the %s-minute visit includes live bets without a balance or coins ranking", minute => {
  const [entry] = buildLiveStudioDeskEntries({ matches: [match(1, { minute, paused: minute === 45, picks: [
    { ...pick("Phil", 2, 1), bet: { side: "H", stake: 4 } },
  ] }), match(2, { minute, paused: minute === 45, fixture: { ...match(2).fixture, homeTeam: "Liverpool", awayTeam: "Everton" }, picks: [
    { ...pick("Phil", 2, 1), bet: { side: "A", stake: 2 } },
  ] })], nowMs });
  expect(entry.playerRoundup).toHaveLength(1);
  expect(entry.playerRoundup[0]).toContain("4 coins backing Arsenal to win");
  expect(entry.playerRoundup[0]).toContain("2 coins backing Everton to win");
  expect(entry.playerRoundup[0]).not.toMatch(/balance|coin standings|coins table/i);
});
