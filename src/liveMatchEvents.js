// Shared provider conversion: the studio and notifier must see the same events.
// Keep this CommonJS module free of object spread: CRA injects ESM helpers for
// spread, which makes Webpack reject module.exports at browser startup.
function numeric(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
}
function personName(value) {
  return typeof value === "string" ? value : String(value?.name || value?.playerName || value?.displayName || "").trim();
}
function eventKind(event = {}, source = "") {
  const text = `${event.type || event.eventType || event.kind || ""} ${event.card || event.cardType || ""} ${event.reason || ""}`.toUpperCase();
  if (/DISALLOW|RULED.OUT|CHALKED.OFF|CANCELLED|CANCELED/.test(text)) return "GOAL_DISALLOWED";
  if (source === "bookings" || /YELLOW|RED|BOOKING|CARD/.test(text)) {
    return /RED|DISMISS/.test(text) ? "RED_CARD" : "YELLOW_CARD";
  }
  if (source === "substitutions" || /SUB/.test(text) || event.playerOut || event.playerIn || event.substituteName) return "SUBSTITUTION";
  if (/HALF.?TIME|SECOND.?HALF|FULL.?TIME|KICK.?OFF/.test(text)) return String(event.type || event.eventType).toUpperCase();
  if (["goals", "goalEvents", "scorers"].includes(source) || /GOAL/.test(text) || ["REGULAR", "PENALTY", "OWN"].includes(String(event.type || "").toUpperCase()) || event.scorer || event.scorerName) return "GOAL";
  if (/INJUR|KNOCK/.test(text)) return "INJURY";
  return String(event.type || event.eventType || event.kind || "UPDATE").toUpperCase();
}
function normalizeEvent(event, source = "", match = {}) {
  const type = eventKind(event, source);
  let minute = numeric(event.minute ?? event.matchMinute ?? event.time?.elapsed ?? event.time);
  let injuryTime = numeric(event.injuryTime ?? event.addedTime ?? event.stoppageTime ?? event.time?.extra);
  const added = String(event.minute ?? event.time ?? "").match(/^(\d+)\s*\+\s*(\d+)'?$/);
  if (added) { minute = Number(added[1]); injuryTime = Number(added[2]); }
  const teamId = event.team?.id ?? event.teamId ?? event.club?.id;
  const team = [match.homeTeam, match.awayTeam].find(candidate => teamId != null && candidate?.id != null && String(candidate.id) === String(teamId));
  const playerOutName = personName(event.playerOut || event.playerOutName);
  const playerInName = personName(event.playerIn || event.playerInName || event.substitute || event.substituteName || event.substitution);
  const scorerName = personName(event.scorer || event.scorerName || (type === "GOAL" ? event.player || event.playerName : ""));
  return Object.assign({}, event, {
    type,
    goalType: event.goalType || (type === "GOAL" ? event.type === "OWN" ? "OWN_GOAL" : event.type || "" : ""),
    scorerName,
    playerName: personName(event.player || event.playerName || event.footballer || event.athlete || event.name) || scorerName || playerOutName,
    teamName: personName(event.team) || personName(event.teamName) || personName(event.club) || personName(team),
    teamId: teamId == null ? "" : String(teamId),
    minute,
    injuryTime: injuryTime > 0 ? injuryTime : null,
    homeGoals: numeric(event.homeGoals ?? event.score?.home ?? event.score?.homeGoals ?? event.result?.home),
    awayGoals: numeric(event.awayGoals ?? event.score?.away ?? event.score?.awayGoals ?? event.result?.away),
    card: String(event.card || event.cardType || ""),
    reason: String(event.reason || event.description || ""),
    substituteName: playerInName,
    playerOutName,
    playerInName,
    assistName: personName(event.assist || event.assistName),
  });
}
function sameEvent(a, b) {
  if (a.type !== b.type) return false;
  if (a.id != null && b.id != null) return String(a.id) === String(b.id);
  const scoring = ["GOAL", "GOAL_DISALLOWED"].includes(a.type);
  const sameScore = a.homeGoals != null && a.awayGoals != null && a.homeGoals === b.homeGoals && a.awayGoals === b.awayGoals;
  if (scoring && sameScore && (a.synthetic || b.synthetic)) return true;
  if (a.minute !== b.minute || a.injuryTime !== b.injuryTime) return false;
  if (a.teamName && b.teamName && a.teamName !== b.teamName) return false;
  if (a.playerName && b.playerName && a.playerName !== b.playerName) return false;
  if (scoring && a.homeGoals != null && b.homeGoals != null && !sameScore) return false;
  return Boolean(sameScore || a.playerName || b.playerName || a.teamName || b.teamName);
}
function mergeMatchEvents(...lists) {
  const result = [];
  lists.flat().filter(event => event && typeof event === "object").forEach(raw => {
    const event = normalizeEvent(raw);
    const index = result.findIndex(previous => sameEvent(previous, event));
    if (index < 0) { result.push(event); return; }
    const previous = result[index];
    const preferred = previous.synthetic && !event.synthetic ? event : event.synthetic && !previous.synthetic ? previous : event;
    const fallback = preferred === event ? previous : event;
    const merged = Object.assign({}, fallback, preferred);
    Object.keys(merged).forEach(key => { if (merged[key] == null || merged[key] === "") merged[key] = fallback[key]; });
    if (!preferred.synthetic) { delete merged.synthetic; delete merged.estimatedMinute; }
    result[index] = merged;
  });
  return result.map(event => {
    if (event.type !== "GOAL_DISALLOWED" || !event.estimatedMinute) return event;
    const removedGoal = result.filter(goal => goal.type === "GOAL"
      && numeric(event.previousHomeGoals) != null && numeric(event.previousAwayGoals) != null
      && goal.homeGoals === Number(event.previousHomeGoals) && goal.awayGoals === Number(event.previousAwayGoals))
      .sort((a, b) => (numeric(b.minute) || 0) - (numeric(a.minute) || 0))[0];
    if (!removedGoal) return event;
    // Keep an estimated correction after the goal it cancels, even when an old
    // fallback clock placed it near kick-off. Do not invent a verified minute.
    return Object.assign({}, event, {
      sortMinute: Math.max(numeric(event.sortMinute) || numeric(event.minute) || 0,
        (numeric(removedGoal.minute) || 0) + (numeric(removedGoal.injuryTime) || 0) / 100 + 0.001),
    });
  });
}
function normalizeMatchEvents(source = {}) {
  if (!source || typeof source !== "object") return [];
  const events = [];
  for (const key of ["goalEvents", "goals", "scorers", "events", "matchEvents", "incidents", "bookings", "substitutions"]) {
    if (Array.isArray(source[key])) source[key].forEach(event => { if (event && typeof event === "object") events.push(normalizeEvent(event, key, source)); });
  }
  if (Array.isArray(source.score?.goals)) source.score.goals.forEach(event => events.push(normalizeEvent(event, "goals", source)));
  return mergeMatchEvents(events);
}
function normalizeGoalEvents(source) {
  return normalizeMatchEvents(source).filter(event => event.type === "GOAL");
}
function shouldPushMatchEvent(kind) {
  return ["goal", "goal-disallowed", "kick-off", "second-half", "half-time", "full-time"].includes(String(kind).toLowerCase().replace(/_/g, "-"));
}

function isMeaningfulFixturePush(kind, payload = {}) {
  if (!shouldPushMatchEvent(kind) || !payload || typeof payload !== "object") return false;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!title || !body) return false;
  const brokenScore = /(?:null|undefined|NaN)\s*[-–]\s*(?:\d+|null|undefined|NaN)|\d+\s*[-–]\s*(?:null|undefined|NaN)/i;
  return !brokenScore.test(`${title} ${body}`);
}
function formatGoalMinute(event) {
  if (event?.estimatedMinute || numeric(event?.minute) == null) return "";
  return `${Number(event.minute)}${numeric(event.injuryTime) > 0 ? `+${Number(event.injuryTime)}` : ""}'`;
}
function mergeMatchPhaseState(previous = {}, incoming = {}, observedAt = new Date().toISOString()) {
  const merged = Object.assign({}, previous, incoming);
  const status = String(incoming.status || previous.status || "").toUpperCase();
  const prevStatus = String(previous.status || "").toUpperCase();
  const confirmedPause = status === "PAUSED";
  const secondHalf = status === "IN_PLAY" && (prevStatus === "PAUSED" || previous.secondHalfAt || numeric(incoming.minute) > 45);
  if (confirmedPause) merged.halfTimeAt = previous.halfTimeAt || incoming.halfTimeAt || observedAt;
  if (secondHalf) merged.secondHalfAt = previous.secondHalfAt || incoming.secondHalfAt || observedAt;
  if (["FINISHED", "AWARDED"].includes(status)) merged.finishedAt = previous.finishedAt || incoming.finishedAt || incoming.lastUpdated || observedAt;
  // A thin browser refresh must not erase detailed lineups or recorded phase transitions.
  for (const key of ["halfTimeAt", "secondHalfAt", "finishedAt", "lineups"]) if (!incoming[key] && previous[key]) merged[key] = previous[key];
  return merged;
}
function getConfirmedPhaseFlags(state = {}) {
  const status = String(state.status || "").toUpperCase();
  const finished = ["FINISHED", "AWARDED"].includes(status);
  const secondHalf = Boolean(state.secondHalfAt || (status === "IN_PLAY" && numeric(state.minute) > 45));
  return { halfTime: finished || status === "PAUSED" || Boolean(state.halfTimeAt) || secondHalf, secondHalf, finished };
}
function getMatchEventMomentMs(fixture, event = {}, state = {}) {
  const kickoff = Date.parse(state.utcDate || fixture?.kickoff || "");
  const phaseKey = { HT: "halfTimeAt", SH: "secondHalfAt", FT: "finishedAt" }[event.statusLabel];
  if (phaseKey && Number.isFinite(Date.parse(state[phaseKey]))) return Date.parse(state[phaseKey]);
  if (Number.isFinite(Date.parse(event.occurredAt))) return Date.parse(event.occurredAt);
  if (event.estimatedMinute && Number.isFinite(Date.parse(event.detectedAt))) return Date.parse(event.detectedAt);
  const minute = numeric(event.minute);
  if (!Number.isFinite(kickoff) || minute == null) return kickoff;
  const secondHalfStart = Date.parse(state.secondHalfAt);
  if (minute > 45 && Number.isFinite(secondHalfStart)) return secondHalfStart + (minute - 45 + (numeric(event.injuryTime) || 0)) * 60000;
  return kickoff + (minute + (minute > 45 ? 15 : 0) + (numeric(event.injuryTime) || 0)) * 60000;
}
function mergeRecordedMatchState(incoming = {}, recorded = {}) {
  const incomingTime = Date.parse(incoming.lastUpdated || "");
  const recordedTime = Date.parse(recorded.lastUpdated || "");
  const recordedIsNewer = Number.isFinite(incomingTime) && Number.isFinite(recordedTime) && recordedTime > incomingTime;
  const current = recordedIsNewer ? Object.assign({}, incoming, recorded) : Object.assign({}, recorded, incoming);
  const merged = mergeMatchPhaseState(recorded, current);
  merged.goalEvents = mergeMatchEvents(recorded.goalEvents, incoming.goalEvents);
  merged.matchEvents = mergeMatchEvents(recorded.matchEvents, incoming.matchEvents);
  return merged;
}
module.exports = { mergeRecordedMatchState, numeric, normalizeMatchEvents, normalizeGoalEvents, mergeMatchEvents, shouldPushMatchEvent, isMeaningfulFixturePush, formatGoalMinute, mergeMatchPhaseState, getConfirmedPhaseFlags, getMatchEventMomentMs };
