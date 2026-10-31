const { normalizeGoalEvents, normalizeMatchEvents, mergeMatchEvents, formatGoalMinute } = require("./src/liveMatchEvents");
const { getPredictionPoints } = require("./src/predictionRules");
function didGoalCountIncrease(prevHome, prevAway, nextHome, nextAway) {
  if (!Number.isFinite(nextHome) || !Number.isFinite(nextAway)) return false;

  const hadPreviousScore = Number.isFinite(prevHome) && Number.isFinite(prevAway);
  const previousTotal = hadPreviousScore ? prevHome + prevAway : 0;
  return nextHome + nextAway > previousTotal;
}

function getPersonId(person) {
  const id = person?.id ?? person?.playerId ?? person?.personId;
  return id == null ? "" : String(id);
}

function getPersonName(person) {
  return String(person?.name || person?.playerName || person?.displayName || "").trim();
}

function normalizeLineupPlayer(player = {}) {
  if (!player || typeof player !== "object") return null;
  const name = getPersonName(player);
  if (!name) return null;
  const shirtNumber = Number(player.shirtNumber ?? player.number ?? player.jerseyNumber);
  return {
    id: getPersonId(player),
    name,
    position: String(player.position || player.role || "").trim(),
    shirtNumber: Number.isFinite(shirtNumber) ? shirtNumber : null,
  };
}

function normalizeTeamLineup(team = {}) {
  const lineup = Array.isArray(team?.lineup)
    ? team.lineup.map(normalizeLineupPlayer).filter(Boolean)
    : [];
  const bench = Array.isArray(team?.bench)
    ? team.bench.map(normalizeLineupPlayer).filter(Boolean)
    : [];
  return {
    teamId: team?.id == null ? "" : String(team.id),
    teamName: String(team?.name || team?.shortName || "").trim(),
    formation: String(team?.formation || "").trim(),
    coachName: getPersonName(team?.coach),
    lineup,
    bench,
  };
}

function normalizeLineups(source = {}) {
  const home = normalizeTeamLineup(source?.homeTeam || {});
  const away = normalizeTeamLineup(source?.awayTeam || {});
  if (!home.lineup.length && !away.lineup.length && !home.bench.length && !away.bench.length) {
    return null;
  }
  return { home, away };
}

function namesMatch(a, b) {
  const left = normalizeFootballTeamName(a);
  const right = normalizeFootballTeamName(b);
  return Boolean(left && right && left === right);
}

function getGoalSide(goal, match, fixture) {
  if (goal.teamId) {
    const homeId = match?.homeTeam?.id;
    const awayId = match?.awayTeam?.id;
    if (homeId != null && String(homeId) === goal.teamId) return "home";
    if (awayId != null && String(awayId) === goal.teamId) return "away";
  }

  if (goal.teamName) {
    if (namesMatch(goal.teamName, match?.homeTeam?.name) || namesMatch(goal.teamName, fixture?.homeTeam)) {
      return "home";
    }
    if (namesMatch(goal.teamName, match?.awayTeam?.name) || namesMatch(goal.teamName, fixture?.awayTeam)) {
      return "away";
    }
  }


  return "";
}

function getLatestGoalEvent({ match, matchState, fixture, prevHome, prevAway, nextHome, nextAway }) {
  const events = mergeMatchEvents(normalizeGoalEvents(match), normalizeGoalEvents(matchState));
  if (!events.length) return null;

  const previousTotal =
    Number.isFinite(prevHome) && Number.isFinite(prevAway) ? prevHome + prevAway : 0;
  const nextTotal = nextHome + nextAway;
  const hadPreviousScore = Number.isFinite(prevHome) && Number.isFinite(prevAway);
  const scoringSide =
    hadPreviousScore && nextHome > prevHome
      ? "home"
      : hadPreviousScore && nextAway > prevAway
      ? "away"
      : "";

  const candidates = events.filter((goal) => {
    const totalAfter =
      Number.isFinite(goal.homeGoals) && Number.isFinite(goal.awayGoals)
        ? goal.homeGoals + goal.awayGoals
        : null;
    if (totalAfter != null && (totalAfter <= previousTotal || totalAfter > nextTotal)) {
      return false;
    }
    const side = getGoalSide(goal, match, fixture);
    return !scoringSide || !side || side === scoringSide;
  });

  const ranked = candidates;
  const selected = ranked.sort((a, b) => {
    const scoreTotalA =
      Number.isFinite(a.homeGoals) && Number.isFinite(a.awayGoals)
        ? a.homeGoals + a.awayGoals
        : -1;
    const scoreTotalB =
      Number.isFinite(b.homeGoals) && Number.isFinite(b.awayGoals)
        ? b.homeGoals + b.awayGoals
        : -1;
    if (scoreTotalB !== scoreTotalA) return scoreTotalB - scoreTotalA;
    return Number(b.minute || -1) - Number(a.minute || -1);
  })[0] || null;
  if (!selected) return null;
  const side = scoringSide || getGoalSide(selected, match, fixture);
  return { ...selected, scoringSide: side,
    teamName: selected.teamName || (side === "home" ? fixture?.homeTeam : side === "away" ? fixture?.awayTeam : "") || "" };
}

function buildGoalAlertBody(fixture, homeGoals, awayGoals, goal) {
  const scorer = String(goal?.scorerName || goal?.playerName || "").trim();
  const team = String(goal?.teamName || "").trim();
  const minute = formatGoalMinute(goal);
  return [scorer ? `${scorer}${team ? ` for ${team}` : ""}` : team ? `Goal for ${team}` : "", minute].filter(Boolean).join(" · ");
}

function buildFullTimeAlertBody(fixture, homeGoals, awayGoals, prediction) {
  const score = `${fixture.homeTeam} ${homeGoals}-${awayGoals} ${fixture.awayTeam}`;
  const valid = prediction && [prediction.homeGoals, prediction.awayGoals].every(value => value !== null
    && value !== undefined && value !== "" && Number.isSafeInteger(Number(value)) && Number(value) >= 0);
  if (!valid) return `${score}\nNo prediction submitted for this match.`;
  const points = getPredictionPoints(prediction, { homeGoals, awayGoals });
  const boost = prediction.isTriple ? " (triple points included)" : prediction.isDouble ? " (captain points included)" : "";
  return `${score}\nYou earned ${points} prediction ${points === 1 ? "point" : "points"}${boost}. Your prediction: ${prediction.homeGoals}-${prediction.awayGoals}.`;
}

function getPredictionScoreValues(prediction, result) {
  const ph = Number(prediction?.homeGoals);
  const pa = Number(prediction?.awayGoals);
  const rh = Number(result?.homeGoals);
  const ra = Number(result?.awayGoals);
  if ([ph, pa, rh, ra].some((value) => !Number.isFinite(value))) return null;
  return { ph, pa, rh, ra };
}

function getPredictionOutcome(home, away) {
  if (home > away) return "H";
  if (home < away) return "A";
  return "D";
}

function getLivePredictionStatus(prediction, result) {
  const values = getPredictionScoreValues(prediction, result);
  if (!values) return null;
  const { ph, pa, rh, ra } = values;
  const multiplier = prediction?.isTriple ? 3 : prediction?.isDouble ? 2 : 1;

  if (ph === rh && pa === ra) {
    return { label: "Bingpot", points: 7 * multiplier };
  }

  const predictedResult = getPredictionOutcome(ph, pa);
  const liveResult = getPredictionOutcome(rh, ra);
  if (predictedResult !== liveResult) return { label: "", points: 0 };

  if (ph - pa === rh - ra) {
    return { label: "Correcto", points: 4 * multiplier };
  }

  return { label: "correct outcome", points: 2 * multiplier };
}

function formatPredictionImpactTarget(status) {
  if (!status || !status.points) return "";
  return `${status.label} (${status.points} pts)`;
}

function isOneGoalFromBingpot(prediction, result) {
  const values = getPredictionScoreValues(prediction, result);
  if (!values) return false;
  const { ph, pa, rh, ra } = values;
  return Math.abs(ph - rh) + Math.abs(pa - ra) === 1;
}

function buildPredictionImpactLine(prediction, prevResult, nextResult) {
  const nextStatus = getLivePredictionStatus(prediction, nextResult);
  if (!nextStatus) return "";

  const prevStatus = getLivePredictionStatus(prediction, prevResult);
  const nextTarget = formatPredictionImpactTarget(nextStatus);

  if (nextStatus.points > 0) {
    if (!prevStatus) return `You're on for ${nextTarget}.`;
    if (prevStatus.points === nextStatus.points && prevStatus.label === nextStatus.label) {
      return `Still on for ${nextTarget}.`;
    }
    if (nextStatus.points > prevStatus.points) {
      return `That goal moves you onto ${nextTarget}.`;
    }
    return `That goal drops you to ${nextTarget}.`;
  }

  if (prevStatus?.points > 0) {
    return `That goal drops you from ${prevStatus.points} pts to 0.`;
  }

  if (isOneGoalFromBingpot(prediction, nextResult)) {
    return "You're one goal away from Bingpot.";
  }

  return "";
}

function normalizeInternationalTeamName(name) {
  const normalized = String(name || "").trim();
  const aliases = {
    "bosnia herzegovina": "bosnia and herzegovina",
    "cape verde": "cabo verde",
    "czech republic": "czechia",
    "dr congo": "congo dr",
    "iran": "ir iran",
    "ivory coast": "cote divoire",
    "korea republic": "south korea",
    "turkey": "turkiye",
    "trkiye": "turkiye",
    "usa": "united states",
  };
  return aliases[normalized] || normalized;
}

function normalizeFootballTeamName(name) {
  if (!name) return "";
  let s = String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  s = s.replace(/&/g, "and");
  s = s.replace(/football club/g, "");
  s = s.replace(/\b(fc|afc|cfc|cf)\b/g, "");
  s = s.replace(/\butd\b/g, "united");
  s = s.replace(/[^a-z0-9]+/g, "");

  const aliasMap = {
    spurs: "tottenhamhotspur",
    tottenham: "tottenhamhotspur",
    tottenhamhotspur: "tottenhamhotspur",
    wolves: "wolverhamptonwanderers",
    wolverhampton: "wolverhamptonwanderers",
    wolverhamptonwanderers: "wolverhamptonwanderers",
    nottmforest: "nottinghamforest",
    nottinghamforest: "nottinghamforest",
    manunited: "manchesterunited",
    manutd: "manchesterunited",
    manchesterunited: "manchesterunited",
    mancity: "manchestercity",
    manchestercity: "manchestercity",
    leeds: "leedsunited",
    leedsunited: "leedsunited",
    coventry: "coventrycity",
    coventrycity: "coventrycity",
    hull: "hullcity",
    hullcity: "hullcity",
    ipswich: "ipswichtown",
    ipswichtown: "ipswichtown",
    westham: "westhamunited",
    westhamunited: "westhamunited",
    astonvilla: "astonvilla",
    villa: "astonvilla",
    brighton: "brightonandhovealbion",
    brightonhovealbion: "brightonandhovealbion",
    brightonandhovealbion: "brightonandhovealbion",
    bournemouth: "bournemouth",
    crystalpalace: "crystalpalace",
    newcastle: "newcastleunited",
    newcastleunited: "newcastleunited",
    leicester: "leicestercity",
    leicestercity: "leicestercity",
    bosniaherzegovina: "bosniaandherzegovina",
    bosniaandherzegovina: "bosniaandherzegovina",
    korearepublic: "southkorea",
    southkorea: "southkorea",
    usa: "unitedstates",
    unitedstates: "unitedstates",
    turkey: "turkiye",
    trkiye: "turkiye",
    turkiye: "turkiye",
    cotedivoire: "cotedivoire",
    coteivoire: "cotedivoire",
    ivorycoast: "cotedivoire",
    drcongo: "congodr",
    congodr: "congodr",
    capeverde: "caboverde",
    caboverde: "caboverde",
    iran: "iriran",
    iriran: "iriran",
    curacao: "curacao",
    curaao: "curacao",
  };

  return aliasMap[s] || s;
}

function parseFixtureArraySource(raw, variableName) {
  const source = String(raw || "");
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];

  const arraySource = source.slice(start, end + 1);
  try {
    return JSON.parse(arraySource);
  } catch {}

  try {
    const vm = require("vm");
    const moduleSource = source.replace(/export\s+default\s+\w+;?/g, "");
    const sandbox = {};
    vm.runInNewContext(
      `${moduleSource}; this.__fixtures = ${variableName};`,
      sandbox,
      { timeout: 1000 }
    );
    return Array.isArray(sandbox.__fixtures) ? sandbox.__fixtures : [];
  } catch {
    return [];
  }
}

function getDeviceSubscriptions(record) {
  const candidates = Array.isArray(record?.subscriptions)
    ? record.subscriptions
    : record?.subscription
    ? [record.subscription]
    : [];
  const byEndpoint = new Map();
  candidates.forEach((subscription) => {
    if (subscription?.endpoint) byEndpoint.set(subscription.endpoint, subscription);
  });
  return Array.from(byEndpoint.values());
}

function getPreviousLiveScore(prevState, prevResult) {
  const stateHome = Number(prevState?.homeGoals);
  const stateAway = Number(prevState?.awayGoals);
  if (Number.isFinite(stateHome) && Number.isFinite(stateAway)) {
    return { hadScoreBefore: true, prevHome: stateHome, prevAway: stateAway };
  }

  const resultHome = Number(prevResult?.homeGoals);
  const resultAway = Number(prevResult?.awayGoals);
  if (Number.isFinite(resultHome) && Number.isFinite(resultAway)) {
    return { hadScoreBefore: true, prevHome: resultHome, prevAway: resultAway };
  }

  return { hadScoreBefore: false, prevHome: null, prevAway: null };
}

function isPushTypeEnabled(type, prefs) {
  if (!prefs) return true;
  const liveUpdateTypes = new Set([
    "liveUpdates",
    "fixtureUpdates",
    "bingpot",
    "betWin",
    "badgeEarned",
    "favoriteTeamResult",
  ]);
  if (liveUpdateTypes.has(type)) {
    return prefs.liveUpdates !== false;
  }
  return prefs[type] !== false;
}

function buildLineupAlert(fixture, state = {}, nowMs = Date.now()) {
  if (!["TIMED", "SCHEDULED"].includes(String(state.status || "").toUpperCase())) return null;
  const kickoff = Date.parse(state.utcDate || fixture?.kickoff || "");
  if (!Number.isFinite(kickoff) || kickoff <= nowMs || kickoff - nowMs > 90 * 60000) return null;
  const hasStartingXI = team => Array.isArray(team?.lineup)
    && team.lineup.filter(player => String(player?.name || "").trim()).length >= 11;
  if (!hasStartingXI(state.lineups?.home) || !hasStartingXI(state.lineups?.away)) return null;
  return {
    title: "Line-ups confirmed",
    body: `${fixture.homeTeam} vs ${fixture.awayTeam}. Tap to view both starting XIs in Live Studio.`,
  };
}

module.exports = {
  buildFullTimeAlertBody,
  didGoalCountIncrease,
  buildGoalAlertBody,
  buildPredictionImpactLine,
  getLatestGoalEvent,
  normalizeGoalEvents,
  normalizeMatchEvents,
  normalizeLineups,
  normalizeInternationalTeamName,
  normalizeFootballTeamName,
  parseFixtureArraySource,
  getDeviceSubscriptions,
  getPreviousLiveScore,
  isPushTypeEnabled,
  buildLineupAlert,
};
