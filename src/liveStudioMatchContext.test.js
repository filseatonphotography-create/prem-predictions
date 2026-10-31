import { buildGoalMatchContext, buildRedCardMatchContext, getCommentaryPhase } from "./liveStudioMatchContext";
import { buildLiveStudioRevealLine, buildLiveStudioEventLine, buildLiveStudioPreMatchContext, mergeLiveStudioDeskHistory } from "./App";
import FIXTURES from "./fixtures";

const fixture = { id: 17, homeTeam: "Arsenal", awayTeam: "Coventry" };
const situation = (overrides = {}) => ({ team: "Arsenal", opponent: "Coventry", side: "home", seed: "test",
  event: { type: "GOAL", minute: 65 }, previousScore: { homeGoals: 0, awayGoals: 0 }, score: { homeGoals: 1, awayGoals: 0 }, ...overrides });

test.each([[5, null, "early"], [44, null, "half-time"], [45, 5, "half-time"], [48, null, "restart"],
  [81, null, "closing"], [88, null, "late"], [90, 4, "injury-time"], [94, null, "injury-time"]])("the %s+%s clock selects %s commentary", (minute, injuryTime, phase) => {
  expect(getCommentaryPhase({ minute, injuryTime })).toBe(phase);
});

test("unknown and estimated clocks never produce timing claims", () => {
  expect(getCommentaryPhase({ minute: null })).toBe("");
  expect(getCommentaryPhase({ minute: 94, estimatedMinute: true })).toBe("");
  const line = buildGoalMatchContext(situation({ event: { minute: 94, estimatedMinute: true } }));
  expect(line).not.toMatch(/late|injury|stoppage|winner|half-time|early/i);
});

test.each(["late", "injury-time"])("a %s lead-taking goal is a possible winner, while an equaliser is not", phase => {
  const event = { minute: phase === "late" ? 89 : 90, injuryTime: phase === "late" ? null : 4 };
  const goal = buildGoalMatchContext(situation({ event }));
  expect(goal).toMatch(/may have|could be|possible/i);
  expect(goal).not.toMatch(/have won|has won|guaranteed/i);
  const equaliser = buildGoalMatchContext(situation({ event, previousScore: { homeGoals: 0, awayGoals: 1 }, score: { homeGoals: 1, awayGoals: 1 } }));
  expect(equaliser).toMatch(/equaliser|level/i);
  expect(equaliser).not.toMatch(/winner|take the lead/i);
});

test("a goal reducing a deficit and a goal extending a lead cannot become a late winner", () => {
  const event = { minute: 90, injuryTime: 5 };
  const response = buildGoalMatchContext(situation({ event, previousScore: { homeGoals: 0, awayGoals: 3 }, score: { homeGoals: 1, awayGoals: 3 } }));
  expect(response).toMatch(/pull one back|response|cut the gap/i);
  expect(response).not.toMatch(/equalis|winner|take the lead|move in front/i);
  const extended = buildGoalMatchContext(situation({ event, previousScore: { homeGoals: 2, awayGoals: 0 }, score: { homeGoals: 3, awayGoals: 0 } }));
  expect(extended).toMatch(/lead|cushion|further clear/i);
  expect(extended).not.toMatch(/winner|equalis/i);
});

test("an away goal credits the correct team and respects the score change", () => {
  const line = buildGoalMatchContext(situation({ side: "away", team: "Coventry", opponent: "Arsenal",
    previousScore: { homeGoals: 2, awayGoals: 1 }, score: { homeGoals: 2, awayGoals: 2 } }));
  expect(line).toMatch(/Coventry.*(?:terms|equaliser|level)|Level again! Coventry/);
  expect(line).not.toMatch(/Arsenal.*equaliser/);
});

test("retaking the lead needs verified earlier history, and cancelled leads do not count", () => {
  const first = { type: "GOAL", minute: 10, homeGoals: 1, awayGoals: 0 };
  const options = situation({ event: { minute: 65 }, previousScore: { homeGoals: 1, awayGoals: 1 }, score: { homeGoals: 2, awayGoals: 1 }, events: [first] });
  expect(buildGoalMatchContext(options)).toMatch(/back in front|swings back|retake the lead/i);
  expect(buildGoalMatchContext({ ...options, events: [] })).not.toMatch(/back in front|retake the lead/i);
  expect(buildGoalMatchContext({ ...options, events: [first, { type: "GOAL_DISALLOWED", minute: 12, homeGoals: 0, awayGoals: 0 }] }))
    .not.toMatch(/back in front|retake the lead/i);
});

test("possible upset language is grounded in valid pre-match probabilities and the current score", () => {
  const options = situation({ probabilities: { home: 20, draw: 20, away: 60 } });
  expect(buildGoalMatchContext(options)).toMatch(/upset|underdogs|model favoured Coventry/i);
  expect(buildGoalMatchContext({ ...options, previousScore: { homeGoals: 0, awayGoals: 3 }, score: { homeGoals: 1, awayGoals: 3 } }))
    .not.toMatch(/upset|underdogs|model favoured/i);
  expect(buildGoalMatchContext(situation())).not.toMatch(/upset|underdogs|favourites/i);
  expect(buildGoalMatchContext({ ...options, probabilities: { home: -20, draw: 60, away: 60 } })).not.toMatch(/upset|underdogs/i);
});

test("winning and losing runs are counted from the most recent completed matches and remain conditional", () => {
  const wins = buildGoalMatchContext(situation({ form: ["W", "W", "W", "W", "L"] }));
  expect(wins).toMatch(/5 wins in a row|4 straight wins|4 straight victories/);
  expect(wins).not.toMatch(/have won five|have won 5/);
  const losses = buildGoalMatchContext(situation({ form: ["L", "L", "L", "L", "L"] }));
  expect(losses).toMatch(/5 straight defeats|last 5|5 straight losses/);
  expect(buildGoalMatchContext(situation({ form: ["W", "L", "W", "L", "W"] }))).not.toMatch(/straight|in a row|winning habit/i);
  expect(buildGoalMatchContext(situation({ form: ["W", "W", "?", "W", "W"] }))).not.toMatch(/straight|in a row|winning habit/i);
  expect(buildGoalMatchContext(situation({ form: ["W", "W", "W", "W", "W", "W", "L"] }))).toMatch(/7 wins in a row|6 straight/);
});

test.each([5, 44, 48, 89, 94])("a red card at %s reflects its timing and the affected team's score", minute => {
  const line = buildRedCardMatchContext(situation({ event: { type: "RED_CARD", minute }, score: { homeGoals: 1, awayGoals: 0 } }));
  expect(line).toMatch(/lead/);
  expect(line).toMatch(/early|barely|half-time|second-half|break|closing|late|Stoppage|injury|game changes/i);
  const trailing = buildRedCardMatchContext(situation({ event: { minute }, score: { homeGoals: 0, awayGoals: 2 } }));
  expect(trailing).toMatch(/behind|chasing|mountain/i);
  expect(trailing).not.toMatch(/protecting.*lead|hang on to.*lead/i);
});

test("variations stay stable for an event and vary across different events", () => {
  const lines = Array.from({ length: 30 }, (_, index) => {
    const options = situation({ seed: `event-${index}`, event: { minute: 44 } });
    const line = buildGoalMatchContext(options);
    expect(buildGoalMatchContext(options)).toBe(line);
    return line;
  });
  expect(new Set(lines).size).toBeGreaterThan(5);
});

test("the real goal, penalty and red-card renderers include the contextual prose", () => {
  const score = { homeGoals: 1, awayGoals: 0 }, event = { type: "GOAL", minute: 45, injuryTime: 3, teamName: "Arsenal", scorerName: "Saka" };
  expect(buildLiveStudioRevealLine(fixture, score, event)).toMatch(/half-time|break|dressing room/);
  expect(buildLiveStudioRevealLine(fixture, score, { ...event, goalType: "PENALTY" })).toMatch(/penalty spot.*(?:half-time|break|dressing room)/);
  expect(buildLiveStudioEventLine({ fixture, score, event: { type: "RED_CARD", minute: 5, teamName: "Arsenal", playerName: "Defender" }, seed: "red" }))
    .toMatch(/early|barely|afternoon/i);
});

test("pre-match context excludes this fixture, unfinished matches, and results learned after kick-off", () => {
  const games = FIXTURES.filter(game => game.homeTeam === "Arsenal FC" || game.awayTeam === "Arsenal FC").slice(0, 7);
  const current = games[5], results = {}, states = {};
  games.forEach(game => {
    results[game.id] = game.homeTeam === "Arsenal FC" ? { homeGoals: 0, awayGoals: 1 } : { homeGoals: 1, awayGoals: 0 };
    states[game.id] = { status: "FINISHED", finishedAt: new Date(Date.parse(game.kickoff) + 105 * 60000).toISOString() };
  });
  const before = buildLiveStudioPreMatchContext(current, results, states);
  const form = current.homeTeam === "Arsenal FC" ? before.homeForm : before.awayForm;
  expect(form).toHaveLength(5);
  expect(form.every(match => match.outcome === "L")).toBe(true);
  const changed = { ...results, [current.id]: { homeGoals: 9, awayGoals: 9 }, [games[6].id]: { homeGoals: 9, awayGoals: 0 } };
  expect(buildLiveStudioPreMatchContext(current, changed, states)).toEqual(before);
  states[games[0].id].status = "IN_PLAY";
  const liveExcluded = buildLiveStudioPreMatchContext(current, results, states);
  const partialForm = current.homeTeam === "Arsenal FC" ? liveExcluded.homeForm : liveExcluded.awayForm;
  expect(partialForm.filter(match => match.outcome === "L")).toHaveLength(4);
  expect(partialForm.some(match => match.outcome === "?")).toBe(true);
});

test("a partial reload cannot strip previously verified form knowledge from a goal", () => {
  const score = { homeGoals: 1, awayGoals: 0 };
  const event = { type: "GOAL", minute: 60, teamName: "Arsenal", scorerName: "Saka" };
  const matchContext = { homeForm: Array.from({ length: 4 }, () => ({ outcome: "W" })), awayForm: [] };
  const original = { id: "17:GOAL:60:0", updateKey: "17:goal:1-0", momentMs: 100,
    goalCommentary: { fixture, score, event, entryKind: "goal", history: [], picks: [], seed: "saved", matchContext,
      revealLine: buildLiveStudioRevealLine(fixture, score, event, matchContext) } };
  const [saved] = mergeLiveStudioDeskHistory([], [original]);
  const partial = { ...original, goalCommentary: { ...original.goalCommentary,
    matchContext: { homeForm: [{ outcome: "?" }], awayForm: [] }, revealLine: "A generic goal report" } };
  const [restored] = mergeLiveStudioDeskHistory([saved], [partial]);
  expect(restored.goalCommentary.matchContext).toEqual(matchContext);
  expect(restored.lines.join(" ")).toMatch(/5 wins in a row|4 straight/);
});
