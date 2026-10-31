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
function sameEvent(a, b, allEvents = []) {
  if (a.type !== b.type) return false;
  if (a.id != null && b.id != null) return String(a.id) === String(b.id);
  const scoring = ["GOAL", "GOAL_DISALLOWED"].includes(a.type);
  const sameScore = a.homeGoals != null && a.awayGoals != null && a.homeGoals === b.homeGoals && a.awayGoals === b.awayGoals;
  if (a.type === "GOAL" && sameScore) {
    const time = item => (numeric(item.sortMinute) ?? numeric(item.minute) ?? 0) + (numeric(item.injuryTime) || 0) / 100;
    // A changed scorer/minute can describe the same goal. The same score may
    // legitimately recur after VAR, so keep goals on either side of a reversal.
    const reversalBetween = allEvents.some(item => item.type === "GOAL_DISALLOWED"
      && time(item) >= Math.min(time(a), time(b)) && time(item) < Math.max(time(a), time(b)));
    if (reversalBetween) return false;
    // Provider corrections can move a goal by several minutes. A second
    // record of the same score is an update unless a reversal explains it.
    return true;
  }
  if (scoring && sameScore && (a.synthetic || b.synthetic)) return true;
  if (a.minute !== b.minute || a.injuryTime !== b.injuryTime) return false;
  if (a.teamName && b.teamName && a.teamName !== b.teamName) return false;
  if (a.playerName && b.playerName && a.playerName !== b.playerName) return false;
  if (scoring && a.homeGoals != null && b.homeGoals != null && !sameScore) return false;
  return Boolean(sameScore || a.playerName || b.playerName || a.teamName || b.teamName);
}
function mergeMatchEvents(...lists) {
  const result = [];
  const events = lists.flat().filter(event => event && typeof event === "object").map(raw => normalizeEvent(raw))
    // A score decrease is not evidence that a referee disallowed a goal.
    // Drop legacy inferred cancellations as well as new unverified ones.
    .filter(event => !(event.synthetic && event.type === "GOAL_DISALLOWED" && !isObservedScoreCorrection(event)));
  events.forEach(event => {
    const index = result.findIndex(previous => sameEvent(previous, event, events));
    if (index < 0) { result.push(event); return; }
    const previous = result[index];
    const preferred = previous.synthetic && !event.synthetic ? event : event.synthetic && !previous.synthetic ? previous : event;
    const fallback = preferred === event ? previous : event;
    const merged = Object.assign({}, fallback, preferred);
    Object.keys(merged).forEach(key => { if (merged[key] == null || merged[key] === "") merged[key] = fallback[key]; });
    if (!preferred.synthetic) {
      delete merged.synthetic; delete merged.estimatedMinute;
      if (!preferred.scoreCorrection) { delete merged.scoreCorrection; if (merged.source === "observed-score-correction") delete merged.source; }
    }
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
function isObservedScoreCorrection(event = {}) {
  if (event.scoreCorrection !== true || event.source !== "observed-score-correction") return false;
  const scores = [event.previousHomeGoals, event.previousAwayGoals, event.homeGoals, event.awayGoals].map(numeric);
  if (scores.some(value => value == null || value < 0)) return false;
  const home = scores[0] - scores[2], away = scores[1] - scores[3];
  return home === 1 && away === 0 || home === 0 && away === 1;
}
function reconcileReportedGoals(previous = {}, incoming = {}) {
  const reported = normalizeGoalEvents(incoming);
  let events = mergeMatchEvents(normalizeMatchEvents(previous), normalizeMatchEvents(incoming));
  const goals = events.filter(event => event.type === "GOAL");
  const home = numeric(incoming.homeGoals), away = numeric(incoming.awayGoals);
  const status = String(incoming.status || "").toUpperCase();
  const previousTime = Date.parse(previous.lastUpdated || ""), incomingTime = Date.parse(incoming.lastUpdated || "");
  if (["IN_PLAY", "PAUSED"].includes(status) && home != null && away != null
    && !(Number.isFinite(previousTime) && Number.isFinite(incomingTime) && incomingTime < previousTime)) {
    const removed = goals.filter(goal => {
      if (goal.id != null && reported.some(current => current.id === goal.id)) return false;
      const candidate = { scoreCorrection: true, source: "observed-score-correction",
        previousHomeGoals: goal.homeGoals, previousAwayGoals: goal.awayGoals, homeGoals: home, awayGoals: away };
      return isObservedScoreCorrection(candidate)
        && !reported.some(current => current.homeGoals === goal.homeGoals && current.awayGoals === goal.awayGoals)
        && !events.some(event => event.type === "GOAL_DISALLOWED" && event.homeGoals === home && event.awayGoals === away
          && (numeric(event.sortMinute) ?? numeric(event.minute) ?? 0) >= (numeric(goal.sortMinute) ?? numeric(goal.minute) ?? 0));
    }).sort((a, b) => (numeric(b.minute) || 0) - (numeric(a.minute) || 0))[0];
    if (removed) {
      const correction = Object.assign({}, removed, {
        type: "GOAL_DISALLOWED", synthetic: true, estimatedMinute: true,
        scoreCorrection: true, source: "observed-score-correction", reason: "Reported goal removed from the score",
        previousHomeGoals: removed.homeGoals, previousAwayGoals: removed.awayGoals, homeGoals: home, awayGoals: away,
        minute: numeric(incoming.minute), injuryTime: null,
        sortMinute: Math.max(numeric(incoming.minute) || 0, (numeric(removed.sortMinute) ?? numeric(removed.minute) ?? 0) + 0.001),
        detectedAt: incoming.observedAt || incoming.lastUpdated || new Date().toISOString(),
      });
      delete correction.id;
      delete correction.score;
      // A withdrawal already reflected in the half-time score belongs before
      // that whistle. Its exact decision minute remains unknown.
      const halfTime = Date.parse(incoming.halfTimeAt || previous.halfTimeAt || "");
      const kickoff = Date.parse(incoming.utcDate || previous.utcDate || "");
      if (status === "PAUSED" && Number.isFinite(halfTime) && Number.isFinite(kickoff)
        && halfTime > kickoff + (numeric(removed.minute) || 0) * 60000) {
        correction.occurredAt = new Date(halfTime - 1).toISOString();
      }
      events = mergeMatchEvents(events, [correction]);
    }
  }
  return Object.assign({}, incoming, { goalEvents: goals, matchEvents: events });
}
function shouldPushMatchEvent(kind) {
  return ["lineup", "goal", "goal-disallowed", "kick-off", "second-half", "half-time", "full-time"].includes(String(kind).toLowerCase().replace(/_/g, "-"));
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
  if (secondHalf) {
    const minute = numeric(incoming.minute);
    const observation = Date.parse(observedAt);
    // Joining midway through a half is not a new restart. Anchor the inferred
    // transition once so later polls cannot advance it with the current clock.
    const inferredStart = minute > 48 && Number.isFinite(observation)
      ? new Date(observation - (minute - 45) * 60000).toISOString() : observedAt;
    merged.secondHalfAt = previous.secondHalfAt || incoming.secondHalfAt || inferredStart;
  }
  if (["FINISHED", "AWARDED"].includes(status)) merged.finishedAt = previous.finishedAt || incoming.finishedAt || incoming.lastUpdated || observedAt;
  // A thin browser refresh must not erase detailed lineups or recorded phase transitions.
  for (const key of ["halfTimeAt", "secondHalfAt", "finishedAt", "lineups", "lineupsAnnouncedAt"]) if (!incoming[key] && previous[key]) merged[key] = previous[key];
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
  if (!Number.isFinite(kickoff)) return 0;
  const minute = numeric(event.minute);
  const injury = numeric(event.injuryTime) || 0;
  const observed = Date.parse(state.observedAt || "");
  const latest = Math.min(Date.now(), Number.isFinite(observed) ? observed : Date.now()) + 30000;
  const validTime = (value, from, to) => {
    const time = Date.parse(value || "");
    return Number.isFinite(time) && time >= kickoff + from * 60000
      && time <= kickoff + to * 60000 && time <= latest ? time : null;
  };
  const secondHalf = validTime(state.secondHalfAt, 50, 100);
  if (event.statusLabel === "KO") return kickoff;
  if (event.statusLabel === "SH") return secondHalf ?? kickoff + 60 * 60000;
  if (["HT", "FT"].includes(event.statusLabel)) {
    const halfTime = event.statusLabel === "HT";
    const phase = halfTime ? validTime(state.halfTimeAt, 35, 75) : validTime(state.finishedAt, 90, 180);
    const fallback = halfTime ? kickoff + (45 + injury) * 60000
      : secondHalf != null ? secondHalf + (Math.max(90, minute || 90) - 45 + injury) * 60000
      : kickoff + (Math.max(90, minute || 90) + 15 + injury) * 60000;
    // The whistle must follow stoppage-time goals/cards, including when the
    // provider's finish timestamp is missing or unusable.
    const latestEvent = (state.matchEvents || []).concat(state.goalEvents || [])
      .filter(item => !["KO", "HT", "SH", "FT"].includes(item.statusLabel)
        && !["KICK_OFF", "HALF_TIME", "SECOND_HALF", "FULL_TIME"].includes(item.type)
        && (!halfTime || (numeric(item.minute) != null && Number(item.minute) <= 45)))
      .reduce((latestTime, item) => Math.max(latestTime, getMatchEventMomentMs(fixture, item, state) + 1), kickoff);
    return Math.max(phase ?? fallback, latestEvent);
  }
  // A confirmed XI precedes kick-off, even if first fetched after play starts.
  if (String(event.type || "").toUpperCase() === "LINEUPS") {
    const announced = validTime(state.lineupsAnnouncedAt, -90, 0);
    // Legacy records have no announcement timestamp. Use the pre-match lineup
    // window, never the future minute immediately before kickoff.
    return announced ?? kickoff - 60 * 60000;
  }
  const elapsed = (minute ?? 0) + (minute > 45 ? 15 : 0) + injury;
  const occurred = validTime(event.occurredAt, Math.max(-60, elapsed - 15), elapsed + 15);
  if (occurred != null) return occurred;
  if (event.estimatedMinute) {
    const detected = validTime(event.detectedAt, 0, 180);
    if (detected != null) return detected;
  }
  if (minute > 45 && secondHalf != null) return secondHalf + (minute - 45 + injury) * 60000;
  return kickoff + elapsed * 60000;
}
function shouldSendRecentFullTimeUpdate(fixture, state = {}, nowMs = Date.now()) {
  if (!["FINISHED", "AWARDED"].includes(String(state.status).toUpperCase())
    || numeric(state.homeGoals) == null || numeric(state.awayGoals) == null) return false;
  const kickoff = Date.parse(state.utcDate || fixture?.kickoff || "");
  if (!Number.isFinite(kickoff) || nowMs < kickoff || nowMs - kickoff > 6 * 60 * 60000) return false;
  const finished = getMatchEventMomentMs(fixture, { statusLabel: "FT", minute: 90 }, state);
  return finished <= nowMs && nowMs - finished <= 90 * 60000;
}
function mergeRecordedMatchState(incoming = {}, recorded = {}) {
  const hasObservationTimes = Number.isFinite(Date.parse(incoming.observedAt || "")) && Number.isFinite(Date.parse(recorded.observedAt || ""));
  const incomingTime = Date.parse((hasObservationTimes ? incoming.observedAt : incoming.lastUpdated) || "");
  const recordedTime = Date.parse((hasObservationTimes ? recorded.observedAt : recorded.lastUpdated) || "");
  const sameProviderVersion = !hasObservationTimes && Number.isFinite(incomingTime) && incomingTime === recordedTime;
  const recordedClockAhead = numeric(recorded.minute) != null && numeric(incoming.minute) != null && Number(recorded.minute) > Number(incoming.minute);
  const recordedFinal = ["FINISHED", "AWARDED"].includes(String(recorded.status).toUpperCase())
    && !["FINISHED", "AWARDED"].includes(String(incoming.status).toUpperCase());
  const recordedAtHalfTime = String(recorded.status).toUpperCase() === "PAUSED"
    && String(incoming.status).toUpperCase() === "IN_PLAY"
    && (numeric(incoming.minute) == null || Number(incoming.minute) <= 45)
    && !incoming.secondHalfAt;
  const recordedIsNewer = Number.isFinite(incomingTime) && Number.isFinite(recordedTime) && recordedTime > incomingTime
    || sameProviderVersion && (recordedClockAhead || recordedFinal || recordedAtHalfTime);
  const current = recordedIsNewer ? Object.assign({}, incoming, recorded) : Object.assign({}, recorded, incoming);
  const merged = mergeMatchPhaseState(recorded, current);
  return reconcileReportedGoals(recorded, Object.assign({}, merged, {
    goalEvents: incoming.goalEvents || [], matchEvents: incoming.matchEvents || [],
  }));
}
module.exports = { reconcileReportedGoals, isObservedScoreCorrection, shouldSendRecentFullTimeUpdate, mergeRecordedMatchState, numeric, normalizeMatchEvents, normalizeGoalEvents, mergeMatchEvents, shouldPushMatchEvent, isMeaningfulFixturePush, formatGoalMinute, mergeMatchPhaseState, getConfirmedPhaseFlags, getMatchEventMomentMs };
