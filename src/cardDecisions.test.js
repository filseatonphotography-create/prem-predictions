const { normalizeMatchEvents, mergeRecordedMatchState, mergeMatchEvents, isConfirmedVarDecision } = require("./liveMatchEvents");
const { buildLiveStudioEventHeader, buildLiveStudioEventLine, mergeLiveStudioDeskHistory, getVisibleLiveStudioEntries, buildFixtureSyncPayload } = require("./App");
const fixture = { id: 560627, homeTeam: "Tottenham Hotspur FC", awayTeam: "Crystal Palace FC", kickoff: "2026-10-31T17:30:00Z" };
const yellow = { type: "YELLOW_CARD", minute: 12, card: "YELLOW", player: { id: 641, name: "Jean-Philippe Mateta" }, team: { id: 354, name: fixture.awayTeam } };
const red = { ...yellow, type: "RED_CARD", minute: 13, card: "RED" };
const otherYellow = { ...yellow, minute: 15, player: { id: 177040, name: "Archie Gray" }, team: { id: 73, name: fixture.homeTeam } };
const recorded = { status: "IN_PLAY", minute: 14, homeGoals: 0, awayGoals: 0, lastUpdated: "2026-10-31T17:44:00Z",
  matchEvents: normalizeMatchEvents({ matchEvents: [yellow, red] }) };
const incoming = (overrides = {}) => ({ status: "IN_PLAY", minute: 16, homeGoals: 0, awayGoals: 0,
  lastUpdated: "2026-10-31T17:46:00Z", bookingsComplete: true, matchEvents: normalizeMatchEvents({ bookings: [red, otherYellow] }), ...overrides });

test("the Mateta 12-minute yellow replaced by the provider's 13-minute red is one card decision", () => {
  const state = mergeRecordedMatchState(incoming(), recorded);
  expect(state.matchEvents).toHaveLength(2);
  const decision = state.matchEvents.find(event => event.type === "RED_CARD");
  expect(decision.cardUpgrade).toMatchObject({ from: "YELLOW", to: "RED", originalMinute: 12, playerName: "Jean-Philippe Mateta" });
  expect(isConfirmedVarDecision(decision)).toBe(false);
  expect(buildLiveStudioEventHeader({ fixture, event: decision })).toBe("Card decision: yellow upgraded to red · Jean-Philippe Mateta");
  expect(buildLiveStudioEventLine({ fixture, event: decision })).toMatch(/original yellow \(12′\).*upgraded to a straight red/);
  expect(mergeRecordedMatchState(incoming(), state).matchEvents).toHaveLength(2);
  expect(mergeMatchEvents(state.matchEvents, [yellow])).toHaveLength(2);
});

test("explicit VAR yellow-to-red information creates a VAR decision even without an earlier poll", () => {
  const events = normalizeMatchEvents({ bookings: [yellow, { ...red, reason: "VAR upgraded yellow to red: serious foul play" }] });
  expect(events).toHaveLength(1);
  expect(events[0].cardUpgrade.originalMinute).toBe(12);
  expect(buildLiveStudioEventHeader({ fixture, event: events[0] })).toMatch(/^VAR decision: yellow upgraded to red/);
  expect(buildLiveStudioEventLine({ fixture, event: events[0] })).toContain("serious foul play");
  expect(buildLiveStudioEventLine({ fixture, event: events[0] })).toContain("VAR decision:");
});

test("an explicit VAR straight red is not falsely described as a yellow upgrade", () => {
  const [event] = normalizeMatchEvents({ bookings: [{ ...red, reason: "VAR: violent conduct" }] });
  expect(event.cardUpgrade).toBeUndefined();
  expect(buildLiveStudioEventHeader({ fixture, event })).toMatch(/^VAR decision: red card/);
});

test("ordinary separate bookings, incomplete lists, second yellows and other players are not inferred upgrades", () => {
  const cases = [incoming({ bookingsComplete: false }), incoming({ matchEvents: normalizeMatchEvents({ bookings: [yellow, red] }) }),
    incoming({ matchEvents: normalizeMatchEvents({ bookings: [{ ...red, card: "YELLOW_RED" }] }) }),
    incoming({ matchEvents: normalizeMatchEvents({ bookings: [{ ...red, minute: 62 }] }) }),
    incoming({ matchEvents: normalizeMatchEvents({ bookings: [{ ...red, player: { id: 999, name: "Another player" } }] }) }),
    incoming({ lastUpdated: "2026-10-31T17:40:00Z" })];
  for (const current of cases) expect(mergeRecordedMatchState(current, recorded).matchEvents.some(event => event.cardUpgrade)).toBe(false);
});

test("both raw-provider conversion and account-name punctuation preserve the upgrade link", () => {
  const raw = { id: fixture.id, utcDate: fixture.kickoff, status: "IN_PLAY", minute: 16,
    homeTeam: { name: fixture.homeTeam }, awayTeam: { name: fixture.awayTeam }, bookings: [red],
    score: { fullTime: { home: 0, away: 0 } }, lastUpdated: "2026-10-31T17:46:00Z" };
  const state = buildFixtureSyncPayload([raw], [fixture]).matchStateUpdates[fixture.id];
  expect(state.bookingsComplete).toBe(true);
  expect(mergeRecordedMatchState(state, recorded).matchEvents[0].cardUpgrade.originalMinute).toBe(12);
  const prior = { ...recorded, matchEvents: [{ type: "YELLOW_CARD", minute: 12, playerName: "Jean_Philippe Mateta", teamName: fixture.awayTeam }] };
  const fresh = incoming({ matchEvents: [{ type: "RED_CARD", minute: 13, playerName: "Jean-Philippe Mateta", teamName: fixture.awayTeam }] });
  expect(mergeRecordedMatchState(fresh, prior).matchEvents).toHaveLength(1);
});

test("saved and late original-yellow posts are folded into the decision without hiding unrelated cautions", () => {
  const decision = mergeRecordedMatchState(incoming(), recorded).matchEvents.find(event => event.type === "RED_CARD");
  const old = { id: "560627:YELLOW_CARD:12:0", fixtureId: fixture.id, sortMinute: 12,
    updateKey: "560627:yellow-card:12:Jean-Philippe-Mateta", title: "Booking Jean-Philippe Mateta - CRY" };
  const upgraded = { id: "560627:RED_CARD:13:1", fixtureId: fixture.id, cardEvent: decision, title: "Card decision" };
  const unrelated = { ...old, id: "archie", title: "Booking Archie Gray - TOT", updateKey: "560627:yellow-card:15:Archie-Gray", sortMinute: 15 };
  const earlier = { ...old, id: "earlier-caution", sortMinute: 3 };
  const merged = mergeLiveStudioDeskHistory([old, unrelated, earlier], [upgraded]);
  expect(merged.map(event => event.id)).toEqual(expect.arrayContaining([upgraded.id, unrelated.id, earlier.id]));
  expect(merged).toHaveLength(3);
  expect(getVisibleLiveStudioEntries([old, unrelated, upgraded])).toEqual([unrelated, upgraded]);
  expect(mergeLiveStudioDeskHistory(merged, [{ ...old, cardEvent: normalizeMatchEvents({ bookings: [yellow] })[0] }])).toHaveLength(3);
});
