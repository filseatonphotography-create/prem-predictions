export const FANTASY_PLAYER_MATCH_CONFIG = {
  autoConfirmThreshold: 0.94,
  highConfidenceThreshold: 0.82,
  candidateThreshold: 0.6,
};

const TEAM_CODE_ALIASES = {
  ARS: ["ARS", "ARSENAL"],
  AVL: ["AVL", "AST", "ASTON VILLA", "VILLA"],
  BOU: ["BOU", "BOURNEMOUTH", "AFC BOURNEMOUTH"],
  BRE: ["BRE", "BRF", "BRENTFORD"],
  BHA: ["BHA", "BRI", "BRIGHTON", "BRIGHTON HOVE"],
  BUR: ["BUR", "BURNLEY"],
  CHE: ["CHE", "CHELSEA"],
  COV: ["COV", "COVENTRY", "COVENTRY CITY"],
  CRY: ["CRY", "CPA", "PAL", "CRYSTAL PALACE", "PALACE"],
  EVE: ["EVE", "EVERTON"],
  FUL: ["FUL", "FULHAM"],
  HUL: ["HUL", "HULL", "HULL CITY"],
  IPS: ["IPS", "IPT", "IPSWICH", "IPSWICH TOWN"],
  LEE: ["LEE", "LEEDS", "LEEDS UNITED"],
  LEI: ["LEI", "LEICESTER", "LEICESTER CITY"],
  LIV: ["LIV", "LIVERPOOL"],
  MCI: ["MCI", "MCY", "MAN CITY", "MANCHESTER CITY"],
  MUN: ["MUN", "MU", "MNU", "MAN UTD", "MAN UNITED", "MANCHESTER UNITED"],
  NEW: ["NEW", "NEWCASTLE", "NEWCASTLE UNITED"],
  NFO: ["NFO", "NOT", "NFOREST", "NOTTINGHAM FOREST", "NOTTM FOREST", "FOREST"],
  SOU: ["SOU", "SOUTHAMPTON"],
  SUN: ["SUN", "SUND", "SUNDERLAND"],
  TOT: ["TOT", "THF", "SPURS", "TOTTENHAM", "TOTTENHAM HOTSPUR"],
  WHU: ["WHU", "WHA", "WEST HAM", "WEST HAM UNITED"],
  WOL: ["WOL", "WOLVES", "WOLVERHAMPTON", "WOLVERHAMPTON WANDERERS"],
};

const TEAM_CODE_LOOKUP = Object.entries(TEAM_CODE_ALIASES).reduce((out, [code, aliases]) => {
  aliases.forEach((alias) => {
    const key = String(alias)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (key) out[key] = code;
  });
  return out;
}, {});

export function normalisePremierLeagueTeamCode(value) {
  const key = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!key) return null;
  return TEAM_CODE_LOOKUP[key] || null;
}

export function normaliseFantasyPlayerName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[-_/.,()]/g, " ")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function tokeniseFantasyPlayerName(value) {
  const normalised = normaliseFantasyPlayerName(value);
  return normalised ? normalised.split(" ").filter(Boolean) : [];
}

function getFantasyPlayerSurname(player) {
  const names = [
    player?.lastName,
    player?.webName,
    player?.displayName,
    player?.name,
  ].filter(Boolean);
  for (const name of names) {
    const tokens = tokeniseFantasyPlayerName(name);
    if (tokens.length) return tokens[tokens.length - 1];
  }
  return "";
}

function getFantasyPlayerInitialSurnameAliases(player = {}) {
  const fullNameTokens = [
    tokeniseFantasyPlayerName([player?.firstName, player?.lastName].filter(Boolean).join(" ")),
    tokeniseFantasyPlayerName(player?.displayName || player?.name),
  ].find((tokens) => tokens.length >= 2) || [];
  const surname = getFantasyPlayerSurname(player) || fullNameTokens[fullNameTokens.length - 1] || "";
  if (!fullNameTokens.length || !surname || surname.length < 3) return [];
  return [`${fullNameTokens[0][0]} ${surname}`];
}

function levenshteinDistance(a, b) {
  const left = normaliseFantasyPlayerName(a);
  const right = normaliseFantasyPlayerName(b);
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array(right.length + 1).fill(0);
  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }
    for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
  }
  return previous[right.length];
}

function getNameSimilarity(left, right) {
  const normalisedLeft = normaliseFantasyPlayerName(left);
  const normalisedRight = normaliseFantasyPlayerName(right);
  if (!normalisedLeft || !normalisedRight) return 0;
  if (normalisedLeft === normalisedRight) return 1;
  const maxLength = Math.max(normalisedLeft.length, normalisedRight.length, 1);
  return Math.max(0, 1 - levenshteinDistance(normalisedLeft, normalisedRight) / maxLength);
}

function getTokenOverlapScore(rawName, player) {
  const rawTokens = tokeniseFantasyPlayerName(rawName);
  if (!rawTokens.length) return 0;
  const playerTokens = new Set([
    ...tokeniseFantasyPlayerName(player?.displayName),
    ...tokeniseFantasyPlayerName(player?.webName),
    ...tokeniseFantasyPlayerName(player?.firstName),
    ...tokeniseFantasyPlayerName(player?.lastName),
  ]);
  const matched = rawTokens.filter((token) => playerTokens.has(token));
  const prefixMatched = rawTokens.filter((token) =>
    Array.from(playerTokens).some((playerToken) => playerToken.startsWith(token) && token.length >= 2)
  );
  return Math.min(1, (matched.length + prefixMatched.length * 0.65) / rawTokens.length);
}

function getPlayerNameScore(rawName, player) {
  const normalisedRaw = normaliseFantasyPlayerName(rawName);
  const displayName = player?.normalisedName || normaliseFantasyPlayerName(player?.displayName || player?.name);
  const webName = normaliseFantasyPlayerName(player?.webName);
  const surname = getFantasyPlayerSurname(player);
  const initialSurnameAliases = getFantasyPlayerInitialSurnameAliases(player)
    .map((alias) => normaliseFantasyPlayerName(alias))
    .filter(Boolean);

  if (!normalisedRaw) return { score: 0, exactDisplay: false, exactWeb: false, exactSurname: false, prefixName: false, fuzzyDistinctiveWeb: false };
  if (normalisedRaw === displayName) return { score: 1, exactDisplay: true, exactWeb: false, exactSurname: false, prefixName: false, fuzzyDistinctiveWeb: false };
  if (normalisedRaw === webName && webName) return { score: 0.94, exactDisplay: false, exactWeb: true, exactSurname: false, prefixName: false, fuzzyDistinctiveWeb: false };
  if (initialSurnameAliases.includes(normalisedRaw)) return { score: 0.91, exactDisplay: false, exactWeb: true, exactSurname: false, prefixName: false, fuzzyDistinctiveWeb: false };
  if (normalisedRaw === surname && surname) return { score: 0.9, exactDisplay: false, exactWeb: false, exactSurname: true, prefixName: false, fuzzyDistinctiveWeb: false };
  const prefixName = normalisedRaw.length >= 7 && [displayName, webName, surname]
    .concat(initialSurnameAliases)
    .filter(Boolean)
    .some((name) => name.startsWith(normalisedRaw));
  if (prefixName) return { score: 0.88, exactDisplay: false, exactWeb: false, exactSurname: false, prefixName: true, fuzzyDistinctiveWeb: false };

  const displaySimilarity = getNameSimilarity(normalisedRaw, displayName);
  const webSimilarity = getNameSimilarity(normalisedRaw, webName);
  const fuzzyDistinctiveWeb = webName.includes(" ") && normalisedRaw.length >= 7 && webSimilarity >= 0.87;
  const tokenOverlap = getTokenOverlapScore(rawName, player);
  return {
    score: Math.max(displaySimilarity, webSimilarity, tokenOverlap * 0.92),
    exactDisplay: false,
    exactWeb: false,
    exactSurname: false,
    prefixName: false,
    fuzzyDistinctiveWeb,
  };
}

export function buildFantasyPlayerSearchIndex(players = []) {
  return (players || []).map((player) => ({
    player,
    id: player?.id,
    teamCode: normalisePremierLeagueTeamCode(player?.teamCode) || String(player?.teamCode || "").toUpperCase(),
    position: String(player?.position || "").toUpperCase(),
    normalisedName: player?.normalisedName || normaliseFantasyPlayerName(player?.displayName || player?.name),
    webName: normaliseFantasyPlayerName(player?.webName),
    surname: getFantasyPlayerSurname(player),
    tokens: tokeniseFantasyPlayerName(player?.displayName || player?.name),
  }));
}

export function matchFantasyPlayerCandidate({
  rawName,
  rawTeamCode,
  rawPosition,
  players = [],
} = {}) {
  const teamCode = normalisePremierLeagueTeamCode(rawTeamCode);
  const position = String(rawPosition || "").trim().toUpperCase();
  const normalisedName = normaliseFantasyPlayerName(rawName);
  const reasons = [];
  if (!normalisedName) {
    return { status: "unmatched", player: null, candidates: [], confidence: 0, reasons: ["Missing player name."] };
  }
  if (rawTeamCode && !teamCode) reasons.push("Team code was not recognised.");

  const index = buildFantasyPlayerSearchIndex(players);
  const constrained = index.filter((entry) => {
    if (teamCode && entry.teamCode !== teamCode) return false;
    if (position && entry.position !== position) return false;
    return true;
  });
  const nameOnlyPool = constrained.length ? constrained : index.filter((entry) => {
    if (position && entry.position !== position) return false;
    return true;
  });

  const exact = constrained.filter((entry) => entry.normalisedName === normalisedName);
  if (exact.length === 1 && teamCode && position) {
    return {
      status: "exact",
      player: exact[0].player,
      candidates: [exact[0].player],
      confidence: 1,
      reasons: ["Exact name, team and position match."],
    };
  }
  if (exact.length > 1) {
    return {
      status: "ambiguous",
      player: null,
      candidates: exact.map((entry) => entry.player),
      confidence: 0.8,
      reasons: ["Multiple exact name matches need confirmation."],
    };
  }

  const scored = nameOnlyPool
    .map((entry) => {
      const nameScore = getPlayerNameScore(rawName, entry.player);
      const teamScore = teamCode && entry.teamCode === teamCode ? 0.18 : teamCode ? -0.4 : 0;
      const positionScore = position && entry.position === position ? 0.08 : position ? -0.2 : 0;
      const confidence = Math.max(0, Math.min(1, nameScore.score * 0.74 + teamScore + positionScore));
      return {
        ...entry,
        confidence,
        nameScore,
      };
    })
    .filter((entry) => entry.confidence >= FANTASY_PLAYER_MATCH_CONFIG.candidateThreshold)
    .sort((a, b) => b.confidence - a.confidence || String(a.player?.displayName || "").localeCompare(String(b.player?.displayName || "")));

  if (!scored.length) {
    return {
      status: "unmatched",
      player: null,
      candidates: [],
      confidence: 0,
      reasons: reasons.length ? reasons : ["No candidate met the matching threshold."],
    };
  }

  const best = scored[0];
  const runnerUp = scored[1];
  const isAmbiguous =
    (runnerUp && best.confidence - runnerUp.confidence < 0.08) ||
    (!teamCode && scored.filter((entry) => entry.nameScore.exactSurname || entry.nameScore.exactWeb).length > 1);
  if (isAmbiguous) {
    return {
      status: "ambiguous",
      player: null,
      candidates: scored.slice(0, 5).map((entry) => entry.player),
      confidence: Number(best.confidence.toFixed(2)),
      reasons: [...reasons, "Multiple plausible player matches need confirmation."].filter(Boolean),
    };
  }

  const highConfidence =
    (best.confidence >= FANTASY_PLAYER_MATCH_CONFIG.highConfidenceThreshold ||
      (!runnerUp && (best.nameScore.exactDisplay || best.nameScore.exactWeb || best.nameScore.exactSurname || best.nameScore.prefixName || best.nameScore.fuzzyDistinctiveWeb))) &&
    (!teamCode || best.teamCode === teamCode) &&
    (!position || best.position === position);
  return {
    status: highConfidence ? "high-confidence" : "ambiguous",
    player: highConfidence ? best.player : null,
    candidates: highConfidence ? [best.player] : scored.slice(0, 5).map((entry) => entry.player),
    confidence: Number(best.confidence.toFixed(2)),
    reasons: [
      ...reasons,
      best.nameScore.exactWeb || best.nameScore.exactSurname
        ? "Matched by FPL web name or surname with constraints."
        : "Matched by normalised name similarity and constraints.",
    ].filter(Boolean),
  };
}
