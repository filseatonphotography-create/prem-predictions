import { getLiveStudioGameUpdates } from "./App";
const villa = { id: 1, homeTeam: "Aston Villa FC", awayTeam: "Manchester City FC" };
const arsenal = { id: 2, homeTeam: "Arsenal FC", awayTeam: "Everton FC" };
const pick = (username, homeGoals, awayGoals, extra = {}) => ({ username, prediction: { homeGoals, awayGoals, ...extra } });
const entry = { id: "studio:checkpoint:20", roundupMatches: [
  { fixture: villa, score: { homeGoals: 1, awayGoals: 0 }, picks: [pick("Phil", 1, 0, { isDouble: true }), pick("Dave", 1, 1)] },
  { fixture: arsenal, score: { homeGoals: 0, awayGoals: 0 }, picks: [pick("Phil", 1, 0), pick("Dave", 0, 1)] },
] };

test("rundowns separate each game's players and points into short specific lines", () => {
  const games = getLiveStudioGameUpdates(entry);
  expect(games.map(game => game.fixture.id)).toEqual([1, 2]);
  expect(games[0].players.find(player => player.username === "Phil").line).toBe("14 prediction points (double). Bingpot in play. No more goals, please.");
  expect(games[0].players.find(player => player.username === "Dave").line).toContain("Manchester City FC goal for Bingpot");
  expect(games[1].players.find(player => player.username === "Phil").line).toContain("Arsenal FC goal for Bingpot");
  expect(games[1].players.find(player => player.username === "Phil").line).not.toContain("Manchester City");
  for (const game of games) for (const player of game.players) expect(player.line.split(/\s+/).length).toBeLessThan(25);
});

test("settled games stay concise and factual, and unchanged visits omit the rundown", () => {
  expect(getLiveStudioGameUpdates({ ...entry, compactCheckIn: true })).toEqual([]);
  const games = getLiveStudioGameUpdates({ ...entry, id: "studio:closing" });
  expect(games[0].players[0].line).toContain("Bingpot banked");
  expect(games[0].players[0].line).not.toContain("No more goals");
});
