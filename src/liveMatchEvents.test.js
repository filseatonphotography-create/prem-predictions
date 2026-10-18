const { normalizeGoalEvents, normalizeMatchEvents, mergeMatchEvents, shouldPushMatchEvent, formatGoalMinute, mergeMatchPhaseState, getConfirmedPhaseFlags, getMatchEventMomentMs } = require("./liveMatchEvents");
const { buildGoalAlertBody, getLatestGoalEvent } = require("../notificationUtils");
const fixture = { homeTeam: "Arsenal", awayTeam: "Chelsea", kickoff: "2026-10-17T14:00:00Z" };
const raw = {
  homeTeam: { id: 57, name: "Arsenal" }, awayTeam: { id: 61, name: "Chelsea" },
  goals: [{ type: "REGULAR", minute: 12, team: { id: 57, name: "Arsenal" }, scorer: { name: "Bukayo Saka" }, score: { home: 1, away: 0 } },
    { type: "PENALTY", minute: 45, injuryTime: 3, team: { id: 61, name: "Chelsea" }, scorer: { name: "Cole Palmer" }, score: { home: 1, away: 1 } }],
  bookings: [{ minute: 30, team: { id: 61, name: "Chelsea" }, player: { name: "Booked player" }, card: "YELLOW" },
    { minute: 62, team: { id: 57, name: "Arsenal" }, player: { name: "Sent off player" }, card: "YELLOW_RED" }],
  substitutions: [{ minute: 70, team: { id: 57, name: "Arsenal" }, playerOut: { name: "Off player" }, playerIn: { name: "On player" } }],
};

test("normalizes provider regular goals and penalties without losing player/time details", () => {
  expect(normalizeGoalEvents(raw)).toEqual([
    expect.objectContaining({ type: "GOAL", scorerName: "Bukayo Saka", minute: 12, homeGoals: 1, awayGoals: 0 }),
    expect.objectContaining({ type: "GOAL", goalType: "PENALTY", scorerName: "Cole Palmer", minute: 45, injuryTime: 3, homeGoals: 1, awayGoals: 1 }),
  ]);
  const latest = getLatestGoalEvent({ match: raw, fixture, prevHome: 1, prevAway: 0, nextHome: 1, nextAway: 1 });
  expect(buildGoalAlertBody(fixture, 1, 1, latest)).toBe("Cole Palmer for Chelsea · 45+3'");
});

test("converts raw substitutions and both kinds of cards to studio event types", () => {
  expect(normalizeMatchEvents(raw)).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "YELLOW_CARD", playerName: "Booked player", minute: 30 }),
    expect.objectContaining({ type: "RED_CARD", playerName: "Sent off player", minute: 62 }),
    expect.objectContaining({ type: "SUBSTITUTION", playerName: "Off player", substituteName: "On player", minute: 70 }),
  ]));
});

test("combines goalEvents and matchEvents without hiding goals behind cards", () => {
  const goalEvents = normalizeGoalEvents(raw);
  const matchEvents = normalizeMatchEvents({ bookings: raw.bookings });
  expect(normalizeMatchEvents({ goalEvents, matchEvents }).filter(event => event.type === "GOAL")).toHaveLength(2);
});

test("recognizes own goals and disallowed goals separately", () => {
  const events = normalizeMatchEvents({ goals: [{ ...raw.goals[0], type: "OWN" }], events: [{ ...raw.goals[1], type: "GOAL_DISALLOWED" }] });
  expect(events[0].goalType).toBe("OWN_GOAL");
  expect(events[1].type).toBe("GOAL_DISALLOWED");
  expect(normalizeGoalEvents({ matchEvents: events })).toHaveLength(1);
});

test("replaces a score-only synthetic goal when the real scorer arrives", () => {
  const synthetic = { type: "GOAL", minute: 15, homeGoals: 1, awayGoals: 0, synthetic: true, estimatedMinute: true, teamName: "Arsenal" };
  const result = mergeMatchEvents([synthetic], normalizeGoalEvents(raw).slice(0, 1));
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ scorerName: "Bukayo Saka", minute: 12 });
  expect(result[0].synthetic).toBeUndefined();
  expect(formatGoalMinute(result[0])).toBe("12'");
  expect(mergeMatchEvents(result, [synthetic])).toEqual(result);
});

test("retains two distinct real goals when VAR allowed the same scoreline twice", () => {
  const one = { ...normalizeGoalEvents(raw)[0] };
  const two = { ...one, minute: 20 };
  expect(mergeMatchEvents([one], [two])).toHaveLength(2);
});

test("does not fabricate 0-0 or a zero-minute goal from null values", () => {
  const event = normalizeGoalEvents({ goals: [{ scorerName: "Saka", minute: null, homeGoals: null, awayGoals: null }] })[0];
  expect(event.minute).toBeNull();
  expect(event.homeGoals).toBeNull();
  expect(formatGoalMinute(event)).toBe("");
  expect(formatGoalMinute({ minute: 85, synthetic: true, estimatedMinute: true })).toBe("");
  expect(formatGoalMinute({ minute: 90, injuryTime: 4 })).toBe("90+4'");
});

test.each(["substitution", "yellow-card", "red-card", "SUBSTITUTION", "YELLOW_CARD", "RED_CARD", "lineup", "update"])("%s stays out of push notifications", kind => {
  expect(shouldPushMatchEvent(kind)).toBe(false);
});

test.each(["goal", "goal-disallowed", "kick-off", "half-time", "second-half", "full-time"])("keeps %s pushes enabled", kind => {
  expect(shouldPushMatchEvent(kind)).toBe(true);
});

test("a populated half-time score does not prove the whistle has gone", () => {
  expect(getConfirmedPhaseFlags({ status: "IN_PLAY", minute: 36, halfTimeHomeGoals: 1, halfTimeAwayGoals: 0 })).toEqual({ halfTime: false, secondHalf: false, finished: false });
});

test("records confirmed phases and preserves them across thin refreshes", () => {
  const lineups = { home: { lineup: [{ name: "Starter" }] } };
  const paused = mergeMatchPhaseState({ lineups }, { status: "PAUSED" }, "2026-10-17T14:49:00Z");
  const resumed = mergeMatchPhaseState(paused, { status: "IN_PLAY" }, "2026-10-17T15:05:00Z");
  const refresh = mergeMatchPhaseState(resumed, { status: "IN_PLAY" }, "2026-10-17T15:06:00Z");
  expect(refresh.lineups).toEqual(lineups);
  expect(refresh.halfTimeAt).toBe("2026-10-17T14:49:00Z");
  expect(refresh.secondHalfAt).toBe("2026-10-17T15:05:00Z");
  expect(getConfirmedPhaseFlags(refresh)).toEqual({ halfTime: true, secondHalf: true, finished: false });
  expect(getMatchEventMomentMs(fixture, { minute: 70 }, refresh)).toBe(Date.parse("2026-10-17T15:30:00Z"));
});

test("does not attribute an unknown new goal to an earlier scorer", () => {
  expect(getLatestGoalEvent({ match: { goals: raw.goals.slice(0, 1) }, fixture, prevHome: 3, prevAway: 0, nextHome: 3, nextAway: 1 })).toBeNull();
});

test("a late synthetic goal cannot mask the real scorer and verified minute", () => {
  const real = normalizeGoalEvents(raw)[0];
  const synthetic = { type: "GOAL", homeGoals: 1, awayGoals: 0, minute: 18, synthetic: true, estimatedMinute: true };
  const event = getLatestGoalEvent({ match: { goals: [raw.goals[0]] }, matchState: { goalEvents: [synthetic] }, fixture, prevHome: 0, prevAway: 0, nextHome: 1, nextAway: 0 });
  expect(event.scorerName).toBe(real.scorerName);
  expect(formatGoalMinute(event)).toBe("12'");
});

describe("recorded goal and VAR history between browser refreshes", () => {
  const { mergeRecordedMatchState } = require("./liveMatchEvents");
  const goal = { type: "GOAL", minute: 76, teamName: "Manchester City FC", scorerName: "City scorer", homeGoals: 4, awayGoals: 1 };
  const ruledOut = { type: "GOAL_DISALLOWED", minute: 78, teamName: "Manchester City FC", previousHomeGoals: 4, previousAwayGoals: 1, homeGoals: 3, awayGoals: 1 };
  const recorded = { status: "IN_PLAY", homeGoals: 3, awayGoals: 1, lastUpdated: "2026-10-17T15:35:00Z", goalEvents: [goal], matchEvents: [goal, ruledOut] };

  test("a corrected provider list cannot erase a goal and its cancellation recorded by the server", () => {
    const incoming = { status: "IN_PLAY", homeGoals: 3, awayGoals: 1, lastUpdated: "2026-10-17T15:36:00Z", goalEvents: [], matchEvents: [] };
    const merged = mergeRecordedMatchState(incoming, recorded);
    expect(merged.matchEvents.map(event => event.type)).toEqual(["GOAL", "GOAL_DISALLOWED"]);
    expect(merged.homeGoals).toBe(3);
    expect(merged.goalEvents[0].scorerName).toBe("City scorer");
  });

  test("a stale response cannot roll back a newer VAR correction or repeat a goal", () => {
    const stale = { status: "IN_PLAY", homeGoals: 4, awayGoals: 1, lastUpdated: "2026-10-17T15:33:00Z", goalEvents: [goal], matchEvents: [goal] };
    const merged = mergeRecordedMatchState(stale, recorded);
    expect(merged.homeGoals).toBe(3);
    expect(merged.matchEvents.map(event => event.type)).toEqual(["GOAL", "GOAL_DISALLOWED"]);
  });
});

test("corrected goal details replace the original event, while a new goal after VAR is retained", () => {
  const { mergeMatchEvents } = require("./liveMatchEvents");
  const original = { type: "GOAL", minute: 6, scorerName: "Initial scorer", homeGoals: 0, awayGoals: 1 };
  const corrected = { ...original, minute: 7, scorerName: "Confirmed scorer" };
  expect(mergeMatchEvents([original], [corrected])).toEqual([expect.objectContaining({ minute: 7, scorerName: "Confirmed scorer" })]);
  const reversed = { type: "GOAL_DISALLOWED", minute: 8, homeGoals: 0, awayGoals: 0, previousHomeGoals: 0, previousAwayGoals: 1 };
  const later = { ...original, minute: 10, scorerName: "Another scorer" };
  const events = mergeMatchEvents([original], [later, reversed]);
  expect(events.filter(event => event.type === "GOAL").map(event => event.minute)).toEqual([6, 10]);
  expect(events.filter(event => event.type === "GOAL_DISALLOWED")).toHaveLength(1);
});


test("lineup timeline uses the recorded announcement time and preserves it through thin refreshes", () => {
  const { mergeRecordedMatchState } = require("./liveMatchEvents");
  const fixture = { kickoff: "2026-10-18T15:30:00Z" };
  const announcedAt = "2026-10-18T14:20:00Z";
  const state = mergeRecordedMatchState({ status: "TIMED" }, { lineupsAnnouncedAt: announcedAt });
  expect(state.lineupsAnnouncedAt).toBe(announcedAt);
  expect(getMatchEventMomentMs(fixture, { type: "LINEUPS" }, state)).toBe(Date.parse(announcedAt));
  expect(getMatchEventMomentMs(fixture, { type: "LINEUPS" })).toBeLessThan(Date.parse(fixture.kickoff) - 60000);
});


test("the server records a fresh lineup announcement once and does not invent a new announcement for legacy lineups", () => {
  const fs = require("fs"), vm = require("vm");
  const source = fs.readFileSync("server.js", "utf8");
  const start = source.indexOf("function mergeMatchStatePreservingEvents(");
  const end = source.indexOf("\nfunction buildLiveMatchEventPayload(", start);
  const context = { mergeMatchPhaseState, mergeMatchStateEventLists: mergeMatchEvents };
  vm.runInNewContext(`${source.slice(start, end)}; this.merge = mergeMatchStatePreservingEvents;`, context);
  const lineups = { home: { lineup: [{ name: "Keeper" }] } };
  const first = context.merge({}, { status: "TIMED", lineups, observedAt: "2026-10-18T14:20:00Z" });
  expect(first.lineupsAnnouncedAt).toBe("2026-10-18T14:20:00Z");
  expect(context.merge(first, { status: "TIMED", lineups, observedAt: "2026-10-18T14:30:00Z" }).lineupsAnnouncedAt).toBe(first.lineupsAnnouncedAt);
  expect(context.merge({ lineups }, { status: "TIMED", lineups }).lineupsAnnouncedAt).toBeUndefined();
});


test("recent confirmed full-time remains eligible after the status transition, while old results never replay", () => {
  const { shouldSendRecentFullTimeUpdate } = require("./liveMatchEvents");
  const kickoff = Date.parse("2026-10-18T13:00:00Z");
  const fixture = { kickoff: new Date(kickoff).toISOString() };
  const state = { status: "FINISHED", minute: 90, utcDate: fixture.kickoff, homeGoals: 2, awayGoals: 1, finishedAt: "2026-10-18T14:55:00Z" };
  jest.useFakeTimers(); jest.setSystemTime(kickoff + 140 * 60000);
  try {
    expect(shouldSendRecentFullTimeUpdate(fixture, state)).toBe(true);
    expect(shouldSendRecentFullTimeUpdate(fixture, { ...state, status: "IN_PLAY" })).toBe(false);
    expect(shouldSendRecentFullTimeUpdate(fixture, { ...state, homeGoals: null })).toBe(false);
    jest.setSystemTime(kickoff + 300 * 60000);
    expect(shouldSendRecentFullTimeUpdate(fixture, state)).toBe(false);
  } finally { jest.useRealTimers(); }
});
