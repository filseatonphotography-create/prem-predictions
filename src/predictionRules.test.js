const { getPredictionPoints, normalizePredictionBoosts, applyPredictionSave } = require("./predictionRules");
const fs = require("fs");
const vm = require("vm");
const now = Date.parse("2026-10-15T12:00:00Z");
const fixtures = [1, 2, 3].map(id => ({ id, gameweek: id === 3 ? 8 : 7, kickoff: "2026-10-18T14:00:00Z" }));
const pick = flags => ({ homeGoals: "2", awayGoals: "1", isDouble: false, isTriple: false, ...flags });
const save = (previous, id, incoming, time = now, groups = [fixtures]) => applyPredictionSave(previous, id, incoming, groups, time);

test("the reported duplicate captain keeps the later selection and yields Tintin's 127, not 129", () => {
  const groups = [[{ id: 560610, gameweek: 7 }, { id: 560611, gameweek: 7 }]];
  const raw = {
    560610: { homeGoals: 3, awayGoals: 1, isDouble: true, updatedAt: 1792238035217 },
    560611: { homeGoals: 1, awayGoals: 2, isDouble: true, updatedAt: 1792238035232 },
  };
  const clean = normalizePredictionBoosts(raw, groups);
  const total = 103 + 8 + getPredictionPoints(clean[560610], { homeGoals: 3, awayGoals: 2 }) + getPredictionPoints(clean[560611], { homeGoals: 1, awayGoals: 2 });
  expect(total).toBe(127);
  expect(clean[560610].isDouble).toBe(false);
  expect(raw[560610].isDouble).toBe(true);
});

test("captain moves atomically, including sequential requests from two devices", () => {
  const first = save({}, 1, pick({ isDouble: true })).predictions;
  const second = save(first, 2, pick({ isDouble: true }), now + 1).predictions;
  expect(second[1].isDouble).toBe(false);
  expect(second[2].isDouble).toBe(true);
  const third = save(second, 1, pick({ isDouble: true }), now + 2).predictions;
  expect(Object.values(third).filter(p => p.isDouble)).toHaveLength(1);
});

test("locked captains cannot be moved or replaced by triple captain", () => {
  const prior = save({}, 1, pick({ isDouble: true })).predictions;
  const groups = [[{ ...fixtures[0], predictionLocked: true }, fixtures[1]]];
  expect(() => save(prior, 2, pick({ isDouble: true }), now, groups)).toThrow(/locked/);
  expect(() => save(prior, 2, pick({ isTriple: true }), now, groups)).toThrow(/locked/);
  expect(prior[1].isDouble).toBe(true);
});

test("triple captain replaces the captain for that round and cannot be reused after locking", () => {
  let previous = save({}, 1, pick({ isDouble: true })).predictions;
  previous = save(previous, 2, pick({ isTriple: true })).predictions;
  expect(previous[1].isDouble).toBe(false);
  expect(previous[2].isTriple).toBe(true);
  const groups = [[fixtures[0], { ...fixtures[1], predictionLocked: true }, fixtures[2]]];
  expect(() => save(previous, 3, pick({ isTriple: true }), now, groups)).toThrow(/locked/);
});

test("normalization isolates modes and rounds and deterministically resolves triple conflicts", () => {
  const raw = { 1: pick({ isDouble: true }), 2: pick({ isTriple: true, isDouble: true }), 3: pick({ isDouble: true }), 4: pick({ isDouble: true }) };
  const clean = normalizePredictionBoosts(raw, [fixtures, [{ id: 4, gameweek: 7 }]]);
  expect(clean[1].isDouble).toBe(false);
  expect(clean[2].isDouble).toBe(false);
  expect(clean[2].isTriple).toBe(true);
  expect(clean[3].isDouble).toBe(true);
  expect(clean[4].isDouble).toBe(true);
  const duplicate = { 1: pick({ isDouble: true }), 2: pick({ isDouble: true }) };
  expect(normalizePredictionBoosts(duplicate, [fixtures])).toEqual(normalizePredictionBoosts({ 2: duplicate[2], 1: duplicate[1] }, [fixtures]));
});

test("score-only edits and idempotent retries do not change the boost selection time", () => {
  const first = save({}, 1, pick({ isDouble: true })).predictions;
  const second = save(first, 1, pick({ isDouble: true, homeGoals: 3 }), now + 100).predictions;
  expect(second[1].boostUpdatedAt).toBe(now);
  const retry = save(second, 1, second[1], Date.parse("2026-10-19T00:00:00Z"));
  expect(retry.changed).toBe(false);
  expect(() => save(second, 1, pick(), Date.parse("2026-10-19T00:00:00Z"))).toThrow(/locked/);
});

test.each([-1, 1.5, "bad", undefined, true, {}])("rejects invalid predicted goals: %p", value => {
  expect(() => save({}, 1, pick({ homeGoals: value }))).toThrow(/whole numbers/);
});
test("rejects unknown fixtures, combined boosts and nonboolean flags", () => {
  expect(() => save({}, 999, pick())).toThrow(/Unknown/);
  expect(() => save({}, 1, pick({ isDouble: true, isTriple: true }))).toThrow(/both/);
  expect(() => save({}, 1, pick({ isDouble: "true" }))).toThrow(/true or false/);
});
test("blank scores earn no points and boost multiplication is exclusive", () => {
  expect(getPredictionPoints(pick({ homeGoals: "" }), { homeGoals: 0, awayGoals: 1 })).toBe(0);
  expect(getPredictionPoints(pick({ isDouble: true, isTriple: true }), { homeGoals: 2, awayGoals: 1 })).toBe(21);
});

// Execute the actual Express save handler without starting a server or touching live data.
function routeHarness({ failWrite = false } = {}) {
  const source = fs.readFileSync("server.js", "utf8");
  const start = source.indexOf('app.post("/api/predictions/save"');
  const end = source.indexOf('\n// ---------------------------------------------------------------------------', start);
  let records = {};
  let handler;
  const context = {
    app: { post: (_path, _auth, fn) => { handler = fn; } }, authMiddleware: () => {},
    loadPredictions: () => JSON.parse(JSON.stringify(records)), loadMatchStates: () => ({}),
    loadFixturesFromSrc: () => fixtures.map(f => ({ ...f, kickoff: "2999-10-18T14:00:00Z" })), loadWorldCupFixturesFromSrc: () => [],
    applyMatchStateKickoffOverrides: f => f, hasStartedMatchStatus: () => false, applyPredictionSave,
    savePredictions: next => { if (failWrite) throw new Error("Disk full"); records = next; }, console: { error: () => {} },
  };
  vm.runInNewContext(source.slice(start, end), context);
  return (fixtureId, prediction) => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } };
    handler({ user: { id: "test-user" }, body: { fixtureId, prediction } }, res);
    return res;
  };
}
test("actual save endpoint returns canonical picks with just one captain", () => {
  const request = routeHarness();
  expect(request(1, pick({ isDouble: true })).statusCode).toBe(200);
  const response = request(2, pick({ isDouble: true }));
  expect(response.data.predictions[1].isDouble).toBe(false);
  expect(response.data.predictions[2].isDouble).toBe(true);
});
test("actual save endpoint never acknowledges a failed write", () => {
  const response = routeHarness({ failWrite: true })(1, pick());
  expect(response.statusCode).toBe(500);
  expect(response.data.error).toMatch(/Could not save/);
  expect(response.data.ok).toBeUndefined();
});

test("the server's shared reader normalizes legacy records and its writer preserves the previous file on failure", () => {
  const source = fs.readFileSync("server.js", "utf8");
  const start = source.indexOf("const loadPredictions = () =>");
  const end = source.indexOf("\n// Totals/history", start);
  const raw = { user: { 1: pick({ isDouble: true, updatedAt: 1 }), 2: pick({ isDouble: true, updatedAt: 2 }) } };
  const disk = { authoritative: JSON.stringify(raw) };
  const context = {
    loadJson: () => raw, PREDICTIONS_FILE: "authoritative", loadFixturesFromSrc: () => fixtures,
    loadWorldCupFixturesFromSrc: () => [], normalizePredictionBoosts, process: { pid: 1 },
    crypto: { randomBytes: () => ({ toString: () => "test" }) },
    fs: {
      writeFileSync: (path, body) => { disk[path] = body; },
      renameSync: () => { throw new Error("Rename failed"); },
      existsSync: path => path in disk, unlinkSync: path => { delete disk[path]; },
    },
  };
  vm.runInNewContext(`${source.slice(start, end)}; this.read = loadPredictions; this.write = savePredictions;`, context);
  expect(context.read().user[1].isDouble).toBe(false);
  expect(context.read().user[2].isDouble).toBe(true);
  expect(raw.user[1].isDouble).toBe(true);
  expect(() => context.write(context.read())).toThrow("Rename failed");
  expect(JSON.parse(disk.authoritative)).toEqual(raw);
  expect(Object.keys(disk)).toEqual(["authoritative"]);
});
