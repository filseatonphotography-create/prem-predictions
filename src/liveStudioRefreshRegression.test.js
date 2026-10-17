import { buildLiveStudioUsers, buildLiveStudioDeskEntries, mergeLiveStudioDeskHistory } from "./App";
const kickoff = "2026-10-17T16:30:00Z";
const game = minute => ({ fixture: { id: 1, homeTeam: "Arsenal", awayTeam: "Chelsea", kickoff },
  score: { homeGoals: 1, awayGoals: 1 }, live: true, finished: false, minute,
  lastNewsAt: Date.parse(kickoff), picks: [{ username: "Dave", prediction: { homeGoals: 1, awayGoals: 1 } }],
});

test("loading a partial Originals account list retains its full player roster without adding players to other leagues", () => {
  const options = { selectedMiniLeague: { id: "lg_mi35amos", name: "The Originals" }, currentPlayer: "Phil", currentUserId: "phil" };
  const initial = buildLiveStudioUsers(options);
  const loaded = buildLiveStudioUsers({ ...options, leagueHistoryUsers: [{ username: "Phil", userId: "phil" }] });
  expect(loaded.map(user => user.username).sort()).toEqual(initial.map(user => user.username).sort());
  expect(loaded.find(user => user.username === "Phil").userId).toBe("phil");
  expect(buildLiveStudioUsers({ ...options, selectedMiniLeague: { id: "private" }, leagueHistoryUsers: [{ username: "Phil", userId: "phil" }] })).toEqual([{ username: "Phil", userId: "phil" }]);
});

test("one Watching the clock card covers the scheduled 70-minute check-in and later quiet periods", () => {
  const seventy = buildLiveStudioDeskEntries({ matches: [game(70)], nowMs: Date.parse(kickoff) + 85 * 60000 });
  const eightyTwo = buildLiveStudioDeskEntries({ matches: [game(82)], nowMs: Date.parse(kickoff) + 97 * 60000 });
  const ninety = buildLiveStudioDeskEntries({ matches: [game(90)], nowMs: Date.parse(kickoff) + 105 * 60000 });
  expect(seventy[0].title).toBe("Watching the clock");
  expect(eightyTwo[0].id).toBe(seventy[0].id);
  expect(ninety[0].id).toBe(seventy[0].id);
  const history = mergeLiveStudioDeskHistory(mergeLiveStudioDeskHistory(seventy, eightyTwo), ninety);
  expect(history).toHaveLength(1);
  expect(history[0].momentMs).toBe(seventy[0].momentMs);
  expect(history[0].playerRoundup).toHaveLength(1);
});

test("previously saved duplicate late cards are combined during reload", () => {
  const [scheduled] = buildLiveStudioDeskEntries({ matches: [game(70)], nowMs: Date.parse(kickoff) + 85 * 60000 });
  const old = { ...scheduled, id: "studio:roundup:old-bucket", title: "Watching the clock", momentMs: scheduled.momentMs + 600000 };
  const history = mergeLiveStudioDeskHistory([old, { ...scheduled, title: "70-minute studio check-in" }], []);
  expect(history).toHaveLength(1);
  expect(history[0].title).toBe("Watching the clock");
  expect(history[0].momentMs).toBe(scheduled.momentMs);
});
