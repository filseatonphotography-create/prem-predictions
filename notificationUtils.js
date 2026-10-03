function didGoalCountIncrease(prevHome, prevAway, nextHome, nextAway) {
  if (!Number.isFinite(nextHome) || !Number.isFinite(nextAway)) return false;

  const hadPreviousScore = Number.isFinite(prevHome) && Number.isFinite(prevAway);
  const previousTotal = hadPreviousScore ? prevHome + prevAway : 0;
  return nextHome + nextAway > previousTotal;
}

function getGoalEventArrays(source) {
  if (!source || typeof source !== "object") return [];
  return [
    source.goalEvents,
    source.goals,
    source.scorers,
    source.events,
    source.incidents,
    source.bookings,
    source.substitutions,
    source.score?.goals,
  ].filter(Array.isArray);
}

function getGoalPersonName(goal) {
  return String(
    goal?.scorer?.name ||
      goal?.player?.name ||
      goal?.footballer?.name ||
      goal?.athlete?.name ||
      goal?.scorerName ||
      goal?.playerName ||
      goal?.name ||
      ""
  ).trim();
}

function getGoalTeamName(goal) {
  return String(
    goal?.team?.name ||
      goal?.teamName ||
      goal?.club?.name ||
      goal?.side ||
      ""
  ).trim();
}

function getGoalTeamId(goal) {
  const id = goal?.team?.id ?? goal?.teamId ?? goal?.club?.id;
  return id == null ? "" : String(id);
}

function getGoalMinute(goal) {
  const minute = Number(goal?.minute ?? goal?.time ?? goal?.matchMinute);
  const injuryTime = Number(goal?.injuryTime ?? goal?.addedTime ?? goal?.stoppageTime);
  if (!Number.isFinite(minute)) return null;
  return {
    minute,
    injuryTime: Number.isFinite(injuryTime) && injuryTime > 0 ? injuryTime : null,
  };
}

function getGoalScore(goal) {
  const score = goal?.score || goal?.result || {};
  const home = Number(score.home ?? score.homeGoals);
  const away = Number(score.away ?? score.awayGoals);
  return {
    home: Number.isFinite(home) ? home : null,
    away: Number.isFinite(away) ? away : null,
  };
}

function isGoalLikeEvent(goal) {
  const type = String(goal?.type || goal?.eventType || goal?.kind || "").toUpperCase();
  if (!type) return true;
  return type.includes("GOAL");
}

function normalizeGoalEvents(source) {
  return getGoalEventArrays(source)
    .flat()
    .filter((goal) => goal && typeof goal === "object" && isGoalLikeEvent(goal))
    .map((goal) => {
      const time = getGoalMinute(goal);
      const score = getGoalScore(goal);
      return {
        scorerName: getGoalPersonName(goal),
        teamName: getGoalTeamName(goal),
        teamId: getGoalTeamId(goal),
        minute: time?.minute ?? null,
        injuryTime: time?.injuryTime ?? null,
        homeGoals: score.home,
        awayGoals: score.away,
        type: String(goal.type || goal.eventType || goal.kind || "").trim(),
      };
    })
    .filter(
      (goal) =>
        goal.scorerName ||
        goal.teamName ||
        goal.teamId ||
        Number.isFinite(goal.minute) ||
        (Number.isFinite(goal.homeGoals) && Number.isFinite(goal.awayGoals))
    );
}

function normalizeMatchEvents(source) {
  return getGoalEventArrays(source)
    .flat()
    .filter((event) => event && typeof event === "object")
    .map((event) => {
      const type = String(event.type || event.eventType || event.kind || event.detail || "").trim();
      const playerName = String(
        getGoalPersonName(event) || event.playerOut?.name || event.playerOut || ""
      ).trim();
      const teamName = getGoalTeamName(event);
      const time = getGoalMinute(event);
      const card = String(event.card || event.cardType || event.booking || "").trim();
      const reason = String(event.reason || event.injury || event.description || "").trim();
      const substituteName = String(
        event.substitute?.name ||
          event.substitution?.name ||
          event.substituteName ||
          event.playerIn?.name ||
          event.playerIn ||
          ""
      ).trim();
      return {
        type,
        playerName,
        teamName,
        minute: time?.minute ?? null,
        injuryTime: time?.injuryTime ?? null,
        card,
        reason,
        substituteName,
        playerOutName: String(event.playerOut?.name || event.playerOut || event.assist?.name || "").trim(),
      };
    })
    .filter((event) => event.type || event.playerName || event.teamName || Number.isFinite(event.minute));
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

  if (Number.isFinite(goal.homeGoals) && Number.isFinite(goal.awayGoals)) {
    return Number(goal.homeGoals) > Number(goal.awayGoals) ? "home" : "away";
  }

  return "";
}

function getLatestGoalEvent({ match, matchState, fixture, prevHome, prevAway, nextHome, nextAway }) {
  const events = [
    ...normalizeGoalEvents(match),
    ...normalizeGoalEvents(matchState),
  ];
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

  const ranked = candidates.length ? candidates : events;
  return ranked.sort((a, b) => {
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
}

function formatGoalMinute(goal) {
  if (!goal || !Number.isFinite(Number(goal.minute))) return "";
  const minute = Number(goal.minute);
  const injuryTime = Number(goal.injuryTime);
  return Number.isFinite(injuryTime) && injuryTime > 0
    ? `${minute}+${injuryTime}'`
    : `${minute}'`;
}

function buildGoalAlertBody(fixture, homeGoals, awayGoals, goal) {
  const scoreText = `${fixture.homeTeam} ${homeGoals}-${awayGoals} ${fixture.awayTeam}`;
  const scorer = String(goal?.scorerName || "").trim();
  const minute = formatGoalMinute(goal);
  const detail = [scorer, minute].filter(Boolean).join(" ");
  return detail ? `${detail} - ${scoreText}` : scoreText;
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
  return type === "fixtureUpdates" || !prefs || prefs[type] !== false;
}

module.exports = {
  didGoalCountIncrease,
  buildGoalAlertBody,
  buildPredictionImpactLine,
  getLatestGoalEvent,
  normalizeGoalEvents,
  normalizeMatchEvents,
  normalizeInternationalTeamName,
  normalizeFootballTeamName,
  parseFixtureArraySource,
  getDeviceSubscriptions,
  getPreviousLiveScore,
  isPushTypeEnabled,
};
