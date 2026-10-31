function penaltyEventType(event = {}, source = "") {
  const type = String(event.type || event.eventType || event.kind || "").toUpperCase();
  const text = `${type} ${event.outcome || (typeof event.result === "string" ? event.result : event.result?.type) || ""} ${event.reason || event.description || ""}`.toUpperCase();
  const penalty = /PENALT/.test(type) || /penalt/i.test(source) || /PENALTY/i.test(event.goalType || "")
    || /VAR|REVIEW/.test(type) && /PENALT/.test(text);
  if (!penalty) return "";
  if (type === "GOAL_DISALLOWED") return "";
  if (type === "GOAL" || source === "goals" || source === "goalEvents" || source === "scorers") return "GOAL";
  if (/CANCEL|OVERTURN|RESCIND|DISALLOW/.test(text)) return "PENALTY_CANCELLED";
  if (/SAVED/.test(text) || /saved/i.test(source)) return "PENALTY_SAVED";
  if (/MISSED|FAILED|OFF.TARGET/.test(text) || /missed/i.test(source) || event.scored === false) return "PENALTY_MISSED";
  if (/RETAKE|RETAKEN/.test(text)) return "PENALTY_RETAKE";
  if (/REVIEW|CHECK|VAR/.test(text)) return "PENALTY_REVIEW";
  if (/AWARD|GIVEN/.test(text) || /awarded/i.test(source)) return "PENALTY_AWARDED";
  if (event.scored === true || /SCORED|CONVERTED/.test(text)
    || type === "PENALTY" && (event.scorer || event.scorerName || event.score)) return "GOAL";
  return "PENALTY_UPDATE";
}
function isPenaltyGoal(event = {}) {
  return String(event.goalType || event.type || "").toUpperCase() === "PENALTY";
}
function penaltyLabel(type) {
  if (String(type).startsWith("PENALTY_SHOOTOUT_")) return `Shoot-out ${penaltyLabel(String(type).replace("PENALTY_SHOOTOUT_", "PENALTY_")).toLowerCase()}`;
  return { PENALTY_AWARDED: "Penalty awarded", PENALTY_MISSED: "Penalty missed", PENALTY_SAVED: "Penalty saved",
    PENALTY_CANCELLED: "Penalty overturned", PENALTY_REVIEW: "Penalty under review", PENALTY_RETAKE: "Penalty retake", PENALTY_SCORED: "Penalty scored" }[type] || "Penalty update";
}
function penaltyDetails(event = {}) {
  const details = [];
  if (event.takerName || event.scorerName || event.playerName) details.push(`Taker: ${event.takerName || event.scorerName || event.playerName}.`);
  if (event.goalkeeperName) details.push(`Goalkeeper: ${event.goalkeeperName}.`);
  const reason = String(event.reason || event.description || event.detail || "").trim();
  if (reason) details.push(reason);
  return details.join(" ");
}
module.exports = { penaltyEventType, isPenaltyGoal, penaltyLabel, penaltyDetails };
