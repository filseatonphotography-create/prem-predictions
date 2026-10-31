const fs = require("fs");
const vm = require("vm");
const rules = require("./badgeRules");
const fixtures = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, gameweek: i + 1 }));
const predictions = Object.fromEntries(fixtures.map(fixture => [fixture.id, { homeGoals: 2, awayGoals: 0, isDouble: true }]));
const results = Object.fromEntries(fixtures.map(fixture => [fixture.id, { homeGoals: 2, awayGoals: 0 }]));
const states = Object.fromEntries(fixtures.map(fixture => [fixture.id, { status: fixture.id === 10 ? "IN_PLAY" : "FINISHED", minute: 90 }]));
const record = { id: "premier-test-2026/27", mode: "premier", seasonLabel: "2026/27", userId: "test", player: "Test",
  playedSeason: true, exactScores: 10, correctCaptains: 10, earnedBadgeIds: ["founder", "sharpShooter", "sniper", "captainClever"] };

test.each(["IN_PLAY", "PAUSED", "SUSPENDED", "TIMED", "POSTPONED", ""])("a %s match cannot earn the tenth exact score or captain badge", status => {
  const currentStates = Object.assign({}, states, { 10: { status, minute: 95 } });
  expect(rules.countFinalPredictionBadges(fixtures, predictions, results, currentStates)).toEqual({ exactScores: 9, correctCaptains: 9 });
  expect(rules.validatePredictionBadgeRecord(record, fixtures, predictions, results, currentStates).earnedBadgeIds).toEqual(["founder", "sharpShooter"]);
});

test("both badge thresholds unlock only after the full-time status arrives", () => {
  const finished = Object.assign({}, states, { 10: { status: "FINISHED" } });
  expect(rules.countFinalPredictionBadges(fixtures, predictions, results, finished)).toEqual({ exactScores: 10, correctCaptains: 10 });
  expect(rules.validatePredictionBadgeRecord(record, fixtures, predictions, results, finished).earnedBadgeIds).toEqual(record.earnedBadgeIds);
  expect(rules.countFinalPredictionBadges(fixtures, predictions, results, {})).toEqual({ exactScores: 0, correctCaptains: 0 });
  expect(rules.isFinalBadgeFixture({ id: 10 }, { 10: { homeGoals: null, awayGoals: 0 } }, finished)).toBe(false);
});

test.each([[0, 0], [1, 0], [0, 1], [1, 1], [3, 2]])("a live %s-%s score never counts until its result is final", (homeGoals, awayGoals) => {
  const score = { homeGoals, awayGoals };
  const slips = Object.assign({}, predictions, { 10: Object.assign({}, score, { isDouble: true }) });
  const scores = Object.assign({}, results, { 10: score });
  expect(rules.countFinalPredictionBadges(fixtures, slips, scores, states)).toEqual({ exactScores: 9, correctCaptains: 9 });
  expect(rules.countFinalPredictionBadges(fixtures, slips, scores, Object.assign({}, states, { 10: { status: "FINISHED" } })))
    .toEqual({ exactScores: 10, correctCaptains: 10 });
});

test("the actual badge sanitizer corrects premature current-season awards and retains archived seasons", () => {
  const source = fs.readFileSync("server.js", "utf8");
  const context = Object.assign({}, rules, {
    normalizeLeagueMode: () => "premier", getFixturesForMode: () => fixtures,
    getSeasonLabelFromFixtures: () => "2026/27", shouldStripUnstartedPerformanceBadges: () => false,
    loadPredictions: () => ({ test: predictions }), loadResults: () => results, loadMatchStates: () => states,
  });
  vm.runInNewContext(source.slice(source.indexOf("function sanitizeBadgeHistoryRecord("), source.indexOf("// Legacy map")), context);
  const safe = context.sanitizeBadgeHistoryRecord(record);
  expect(safe).toMatchObject({ exactScores: 9, correctCaptains: 9 });
  expect(safe.earnedBadgeIds).not.toContain("sniper");
  expect(safe.earnedBadgeIds).not.toContain("captainClever");
  expect(context.sanitizeBadgeHistoryRecord(Object.assign({}, record, { seasonLabel: "2025/26" })).earnedBadgeIds).toEqual(record.earnedBadgeIds);
});

test("the badge endpoint refuses a premature push from an old client and sends it after full-time", async () => {
  const source = fs.readFileSync("server.js", "utf8");
  let saved = [Object.assign({}, record, { exactScores: 9, correctCaptains: 9, earnedBadgeIds: ["founder", "sharpShooter"] })];
  let currentStates = states, handler;
  const context = Object.assign({}, rules, {
    console, normalizeLeagueMode: () => "premier", getFixturesForMode: () => fixtures,
    getSeasonLabelFromFixtures: () => "2026/27", shouldStripUnstartedPerformanceBadges: () => false,
    loadPredictions: () => ({ test: predictions }), loadResults: () => results, loadMatchStates: () => currentStates,
    app: { post: (_path, _auth, callback) => { handler = callback; } }, authMiddleware: () => {},
    loadBadgeHistory: () => saved, saveBadgeHistory: records => { saved = records; }, sendPushNotification: jest.fn(),
  });
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf("function sanitizeBadgeHistoryRecord("), source.indexOf("// Legacy map")), context);
  vm.runInContext(source.slice(source.indexOf('app.post("/api/history/badges",'), source.indexOf("// -------------------- COINS DEBUG")), context);
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await handler({ user: { id: "test" }, body: { record } }, res);
  expect(context.sendPushNotification).not.toHaveBeenCalled();
  expect(saved[0].earnedBadgeIds).not.toContain("sniper");
  currentStates = Object.assign({}, states, { 10: { status: "FINISHED" } });
  await handler({ user: { id: "test" }, body: { record } }, res);
  expect(context.sendPushNotification).toHaveBeenCalledTimes(1);
  expect(saved[0].earnedBadgeIds).toContain("sniper");
  expect(saved[0].earnedBadgeIds).toContain("captainClever");
});

test("full-time cards list milestones crossed by their completed matches, once per player and badge", () => {
  const matches = [{ fixture: fixtures[9], finished: true, score: results[10] }];
  const players = [{ userId: "test", username: "Test", predictions }];
  expect(rules.buildFinalBadgeAwards({ matches, fixtures, players, results, states })).toEqual([]);
  const finalStates = Object.assign({}, states, { 10: { status: "FINISHED" } });
  const awards = rules.buildFinalBadgeAwards({ matches, fixtures, players: [...players, ...players], results, states: finalStates });
  expect(awards.map(award => award.badgeId)).toEqual(["sniper", "captainClever"]);
  expect(awards[0]).toMatchObject({ username: "Test", milestone: "10 exact scores" });
  const { buildLiveStudioFinalRoundup } = require("./App");
  const card = buildLiveStudioFinalRoundup({ matches, nowMs: Date.now(), getBadgeAwards: () => awards });
  expect(card.badgeAwards).toEqual(awards);
  expect(buildLiveStudioFinalRoundup({ matches: [{ ...matches[0], finished: false }], nowMs: Date.now() })).toBeNull();
});
