// Card revisions are separate from two-yellow dismissals. This module is shared
// with Node, so avoid object spread and browser-only helpers.
function number(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
}
function key(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function playerId(event) { return event.playerId || event.player?.id || ""; }
function teamId(event) { return event.teamId || event.team?.id || ""; }
function playerName(event) { return event.playerName || event.player?.name || ""; }
function teamName(event) { return event.teamName || event.team?.name || ""; }
function samePlayer(a, b) {
  const sameTeam = teamId(a) && teamId(b) ? String(teamId(a)) === String(teamId(b))
    : !teamName(a) || !teamName(b) || key(teamName(a)) === key(teamName(b));
  const samePerson = playerId(a) && playerId(b) ? String(playerId(a)) === String(playerId(b))
    : Boolean(key(playerName(a)) && key(playerName(a)) === key(playerName(b)));
  return sameTeam && samePerson;
}
function time(event) {
  return number(event.minute) == null ? null : Number(event.minute) + (number(event.injuryTime) || 0) / 100;
}
function secondYellow(event) {
  return /YELLOW[_ -]?RED|SECOND[_ -]?YELLOW|2ND[_ -]?YELLOW|TWO[_ -]?YELLOW/i.test(
    `${event.card || ""} ${event.cardType || ""} ${event.type || ""} ${event.reason || ""}`);
}
function metadata(red, yellow) {
  return { from: "YELLOW", to: "RED", originalMinute: number(yellow?.minute), originalInjuryTime: number(yellow?.injuryTime),
    originalEventId: yellow?.id == null ? "" : String(yellow.id),
    playerId: String(playerId(red) || playerId(yellow || {})), playerName: playerName(red) || playerName(yellow || {}),
    teamId: String(teamId(red) || teamId(yellow || {})), teamName: teamName(red) || teamName(yellow || {}) };
}
function normalizeCardDecision(event, original = event) {
  if (event.type !== "RED_CARD") return event;
  if (secondYellow(original)) {
    const ordinary = Object.assign({}, event); delete ordinary.cardUpgrade; return ordinary;
  }
  if (event.cardUpgrade?.from === "YELLOW" && event.cardUpgrade?.to === "RED") return event;
  const prior = String(original.previousCard || original.originalCard || original.upgradedFrom || original.fromCard || "").toUpperCase();
  const text = `${original.type || ""} ${original.reason || ""} ${original.description || ""} ${original.detail || ""}`;
  const explicit = prior === "YELLOW" || /YELLOW[_ -]+TO[_ -]+RED/i.test(text)
    || /YELLOW/i.test(text) && /RED/i.test(text) && /UPGRAD|CHANG|REPLAC|OVERTURN/i.test(text);
  if (!explicit) return event;
  const yellow = { minute: original.originalMinute ?? original.previousMinute, injuryTime: original.originalInjuryTime,
    id: original.originalEventId || original.previousEventId };
  return Object.assign({}, event, { cardUpgrade: metadata(event, yellow) });
}
function isOriginalYellow(red, yellow) {
  if (red.type !== "RED_CARD" || yellow.type !== "YELLOW_CARD" || !red.cardUpgrade || !samePlayer(red, yellow)) return false;
  const original = red.cardUpgrade;
  if (original.originalEventId && yellow.id != null) return original.originalEventId === String(yellow.id);
  const yellowAt = time(yellow), redAt = time(red);
  if (yellowAt == null || redAt == null) return false;
  const recordedAt = number(original.originalMinute);
  const nearOriginal = recordedAt == null || Math.abs(yellowAt - (recordedAt + (number(original.originalInjuryTime) || 0) / 100)) <= 1;
  return nearOriginal && yellowAt <= redAt && redAt - yellowAt <= 3;
}
function resolveCardDecisions(events) {
  const resolved = events.map(event => {
    const normalized = normalizeCardDecision(event);
    if (!normalized.cardUpgrade || number(normalized.cardUpgrade.originalMinute) != null) return normalized;
    const yellow = events.filter(old => isOriginalYellow(normalized, old)).sort((a, b) => (time(b) || 0) - (time(a) || 0))[0];
    return yellow ? Object.assign({}, normalized, { cardUpgrade: metadata(normalized, yellow) }) : normalized;
  });
  const upgraded = resolved.filter(event => event.type === "RED_CARD" && event.cardUpgrade);
  return resolved.filter(event => !upgraded.some(red => isOriginalYellow(red, event)));
}
function reconcileCardDecisions(previous, incoming, reported, completeBookings) {
  const oldEvents = (previous.matchEvents || []);
  const events = (incoming.matchEvents || []).map(event => {
    if (event.type !== "RED_CARD" || event.cardUpgrade || secondYellow(event)) return event;
    const current = reported.find(red => red.type === "RED_CARD" && samePlayer(red, event) && time(red) === time(event));
    if (!current) return event;
    const yellow = oldEvents.filter(old => old.type === "YELLOW_CARD" && samePlayer(old, current))
      .filter(old => old.id != null && current.id != null && String(old.id) === String(current.id)
        || completeBookings && time(old) != null && time(current) != null && time(old) <= time(current) && time(current) - time(old) <= 3)
      .filter(old => !reported.some(item => item.type === "YELLOW_CARD" && samePlayer(item, old) && time(item) === time(old)))
      .sort((a, b) => (time(b) || 0) - (time(a) || 0))[0];
    if (!yellow) return event;
    return Object.assign({}, event, { cardUpgrade: metadata(event, yellow) });
  });
  return Object.assign({}, incoming, { matchEvents: resolveCardDecisions(events) });
}
function isSupersededYellowPost(entry, decisions) {
  const yellow = entry.cardEvent;
  const yellowPost = yellow?.type === "YELLOW_CARD" || /:YELLOW_CARD:|:yellow-card:/i.test(`${entry.id || ""} ${entry.updateKey || ""}`);
  if (!yellowPost) return false;
  return decisions.some(redPost => {
    if (String(redPost.fixtureId) !== String(entry.fixtureId) || !redPost.cardEvent?.cardUpgrade) return false;
    const red = redPost.cardEvent;
    if (yellow) return isOriginalYellow(red, yellow);
    // Repair saved posts from before card event metadata was retained.
    const name = key(red.cardUpgrade.playerName || playerName(red));
    if (!name || !key(`${entry.title || ""} ${entry.updateKey || ""}`).includes(name)) return false;
    const at = number(entry.sortMinute), redAt = time(red), originalAt = number(red.cardUpgrade.originalMinute);
    return at != null && redAt != null && at <= redAt && redAt - at <= 3 && (originalAt == null || Math.abs(at - originalAt) <= 1);
  });
}
module.exports = { normalizeCardDecision, resolveCardDecisions, reconcileCardDecisions, isSupersededYellowPost };
