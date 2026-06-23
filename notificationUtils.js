function didGoalCountIncrease(prevHome, prevAway, nextHome, nextAway) {
  if (!Number.isFinite(nextHome) || !Number.isFinite(nextAway)) return false;

  const hadPreviousScore = Number.isFinite(prevHome) && Number.isFinite(prevAway);
  const previousTotal = hadPreviousScore ? prevHome + prevAway : 0;
  return nextHome + nextAway > previousTotal;
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
  normalizeInternationalTeamName,
  normalizeFootballTeamName,
  parseFixtureArraySource,
  getDeviceSubscriptions,
  getPreviousLiveScore,
  isPushTypeEnabled,
};
