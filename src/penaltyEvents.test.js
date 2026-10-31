const { normalizeMatchEvents, normalizeGoalEvents, mergeMatchEvents } = require("./liveMatchEvents");
const { buildLiveStudioEventHeader, buildLiveStudioEventLine, buildLiveStudioRevealLine } = require("./App");
const fixture = { id: 560626, homeTeam: "Chelsea FC", awayTeam: "Manchester United FC" };

test("scored penalties remain one goal and carry the supplied taker, team and minute", () => {
  const raw = { type: "PENALTY", minute: 70, scorer: { name: "Cole Palmer" }, team: { name: "Chelsea FC" }, score: { home: 2, away: 0 } };
  const [goal] = normalizeGoalEvents({ goals: [raw] });
  expect(goal).toMatchObject({ type: "GOAL", goalType: "PENALTY", minute: 70, scorerName: "Cole Palmer" });
  expect(normalizeMatchEvents({ goals: [raw], matchEvents: [goal] })).toHaveLength(1);
  expect(buildLiveStudioEventHeader({ fixture, event: goal, score: { homeGoals: 2, awayGoals: 0 } })).toContain("(penalty)");
  expect(buildLiveStudioRevealLine(fixture, { homeGoals: 2, awayGoals: 0 }, goal)).toMatch(/Cole Palmer scores from the penalty spot.*70'/);
});

test.each([
  ["PENALTY_AWARDED", "Penalty awarded"], ["PENALTY_REVIEW", "Penalty under review"],
  ["PENALTY_MISSED", "Penalty missed"], ["PENALTY_SAVED", "Penalty saved"],
  ["PENALTY_CANCELLED", "Penalty overturned"], ["PENALTY_RETAKE", "Penalty retake"],
])("%s appears as a distinct incident, without becoming a goal", (type, title) => {
  const raw = { type, minute: 60, team: { name: "Chelsea FC" }, taker: { name: "Cole Palmer" },
    goalkeeper: { name: "Senne Lammens" }, reason: "Provider decision detail" };
  const [event] = normalizeMatchEvents({ penaltyEvents: [raw] });
  expect(normalizeGoalEvents({ penaltyEvents: [raw] })).toEqual([]);
  expect(event).toMatchObject({ type, takerName: "Cole Palmer", goalkeeperName: "Senne Lammens" });
  expect(buildLiveStudioEventHeader({ fixture, event })).toContain(title);
  const line = buildLiveStudioEventLine({ fixture, event });
  expect(line).toContain("Cole Palmer"); expect(line).toContain("Senne Lammens"); expect(line).toContain("Provider decision detail");
  expect(mergeMatchEvents([event], [event])).toHaveLength(1);
});

test("missing detail is left unknown and a booking mentioning the penalty area stays a booking", () => {
  const [event] = normalizeMatchEvents({ penaltiesMissed: [{ minute: 80, scored: false }] });
  expect(event.type).toBe("PENALTY_MISSED");
  const line = buildLiveStudioEventLine({ fixture, event });
  expect(line).not.toMatch(/null|undefined|Taker:|Goalkeeper:|VAR/);
  expect(normalizeMatchEvents({ bookings: [{ type: "YELLOW_CARD", reason: "Foul in penalty area", minute: 60 }] })[0].type).toBe("YELLOW_CARD");
});

test("shoot-out kicks are shown as incidents and never added as match goals", () => {
  const match = { status: "PENALTY_SHOOTOUT", penalties: [{ minute: 120, scored: true, taker: { name: "Taker" } }] };
  const [event] = normalizeMatchEvents(match);
  expect(event.type).toBe("PENALTY_SHOOTOUT_SCORED");
  expect(normalizeGoalEvents(match)).toEqual([]);
  expect(buildLiveStudioEventHeader({ fixture, event })).toContain("Shoot-out penalty scored");
});
