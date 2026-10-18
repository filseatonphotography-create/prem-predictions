// CommonJS, shared unchanged by the browser and Node. Avoid object spread here:
// CRA must not inject ESM helpers into this shared module.
function scoreValue(value) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}
function getPredictionPoints(prediction, result) {
  if (!prediction || !result) return 0;
  const values = [prediction.homeGoals, prediction.awayGoals, result.homeGoals, result.awayGoals].map(scoreValue);
  if (values.some(value => value === null)) return 0;
  const [ph, pa, rh, ra] = values;
  const base = ph === rh && pa === ra ? 7 : Math.sign(ph - pa) !== Math.sign(rh - ra) ? 0 : ph - pa === rh - ra ? 4 : 2;
  return base * (prediction.isTriple ? 3 : prediction.isDouble ? 2 : 1);
}
function selectionTime(prediction) {
  const value = prediction.boostUpdatedAt ?? prediction.updatedAt;
  const time = typeof value === "number" ? value : Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}
function normalizePredictionBoosts(predictions = {}, fixtureGroups = []) {
  const out = Object.assign({}, predictions);
  const clear = (id, flag) => { out[id] = Object.assign({}, out[id], { [flag]: false }); };
  fixtureGroups.forEach(fixtures => {
    const ids = fixtures.map(fixture => String(fixture.id)).filter(id => out[id]);
    const newestFirst = (a, b) => selectionTime(out[b]) - selectionTime(out[a]) || a.localeCompare(b);
    // A triple and a double cannot apply to the same pick. Triple takes precedence.
    ids.forEach(id => { if (out[id].isTriple && out[id].isDouble) clear(id, "isDouble"); });
    const triples = ids.filter(id => out[id].isTriple).sort(newestFirst);
    triples.slice(1).forEach(id => clear(id, "isTriple"));
    const rounds = new Map();
    fixtures.forEach(fixture => {
      const id = String(fixture.id);
      if (!out[id]?.isDouble && !out[id]?.isTriple) return;
      const round = String(fixture.gameweek);
      if (!rounds.has(round)) rounds.set(round, []);
      rounds.get(round).push(id);
    });
    rounds.forEach(captains => {
      const triple = captains.find(id => out[id].isTriple);
      captains.filter(id => id !== triple).sort(newestFirst).slice(triple ? 0 : 1).forEach(id => clear(id, "isDouble"));
    });
  });
  return out;
}
function isPredictionLocked(fixture, nowMs = Date.now()) {
  const kickoff = Date.parse(fixture.kickoff || "");
  const deadline = kickoff - (fixture.kickoffTimeConfirmed === false ? 0 : 3600000);
  return Boolean(fixture.predictionLocked) || !Number.isFinite(deadline) || nowMs >= deadline;
}
function predictionError(message, status = 400) {
  const error = new Error(message); error.status = status; return error;
}
function applyPredictionSave(previous = {}, fixtureId, incoming, fixtureGroups = [], nowMs = Date.now()) {
  const id = String(fixtureId);
  const fixtures = fixtureGroups.find(group => group.some(fixture => String(fixture.id) === id));
  const fixture = fixtures?.find(item => String(item.id) === id);
  if (!fixture) throw predictionError("Unknown fixture.");
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) throw predictionError("Invalid prediction.");
  for (const field of ["isDouble", "isTriple"]) {
    if (incoming[field] !== undefined && typeof incoming[field] !== "boolean") throw predictionError("Boost selections must be true or false.");
  }
  if (incoming.isDouble && incoming.isTriple) throw predictionError("A prediction cannot be both captain and triple captain.");
  const clean = { isDouble: Boolean(incoming.isDouble), isTriple: Boolean(incoming.isTriple) };
  for (const field of ["homeGoals", "awayGoals"]) {
    const value = incoming[field];
    if (value === "" || value === null) clean[field] = "";
    else if (scoreValue(value) !== null) clean[field] = String(Number(value));
    else throw predictionError("Predicted scores must be whole numbers of zero or more.");
  }
  const out = normalizePredictionBoosts(previous, fixtureGroups);
  const before = out[id];
  const changed = !before || ["homeGoals", "awayGoals"].some(field => String(before[field] ?? "") !== clean[field])
    || Boolean(before.isDouble) !== clean.isDouble || Boolean(before.isTriple) !== clean.isTriple;
  if (!changed) return { predictions: out, changed: false };
  if (isPredictionLocked(fixture, nowMs)) throw predictionError("This fixture is locked. Your saved prediction has not changed.", 409);
  fixtures.forEach(other => {
    const otherId = String(other.id), pick = out[otherId];
    if (otherId === id || !pick) return;
    const movingCaptain = (clean.isDouble || clean.isTriple) && (pick.isDouble || pick.isTriple) && String(other.gameweek) === String(fixture.gameweek);
    const movingTriple = clean.isTriple && pick.isTriple;
    if (!movingCaptain && !movingTriple) return;
    if (isPredictionLocked(other, nowMs)) throw predictionError(movingTriple ? "Your triple captain is already locked on another fixture." : "Your captain is already locked in this gameweek.", 409);
    out[otherId] = Object.assign({}, pick, movingCaptain ? { isDouble: false, isTriple: false } : { isTriple: false });
  });
  clean.updatedAt = nowMs;
  clean.boostUpdatedAt = !before || Boolean(before.isDouble) !== clean.isDouble || Boolean(before.isTriple) !== clean.isTriple
    ? nowMs : before.boostUpdatedAt ?? before.updatedAt ?? nowMs;
  out[id] = clean;
  return { predictions: out, changed: true };
}
module.exports = { getPredictionPoints, normalizePredictionBoosts, applyPredictionSave, isPredictionLocked };
