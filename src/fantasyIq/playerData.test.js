import {
  FANTASY_PLAYER_DATA_CACHE_KEY,
  FANTASY_PLAYER_DATA_SCHEMA_VERSION,
  adaptFantasyBootstrapPayload,
  buildFallbackFantasyPlayerDataset,
  loadFantasyPlayerData,
  matchFantasyPlayerCandidate,
  normaliseFantasyPlayerName,
  normalisePremierLeagueTeamCode,
  readFantasyPlayerDataCache,
  reconcileFantasyIqSquadWithPlayerData,
  validateFantasyPlayerDataset,
  writeFantasyPlayerDataCache,
} from "./playerData";

const basePayload = {
  teams: [
    { id: 1, name: "Arsenal", short_name: "ARS" },
    { id: 2, name: "Liverpool", short_name: "LIV" },
    { id: 3, name: "Manchester City", short_name: "MCI" },
    { id: 4, name: "Newcastle United", short_name: "NEW" },
  ],
  element_types: [
    { id: 1, singular_name: "Goalkeeper", plural_name: "Goalkeepers", singular_name_short: "GKP" },
    { id: 2, singular_name: "Defender", plural_name: "Defenders", singular_name_short: "DEF" },
    { id: 3, singular_name: "Midfielder", plural_name: "Midfielders", singular_name_short: "MID" },
    { id: 4, singular_name: "Forward", plural_name: "Forwards", singular_name_short: "FWD" },
  ],
  elements: [
    { id: 101, first_name: "Bukayo", second_name: "Saka", web_name: "Saka", team: 1, element_type: 3, status: "a", now_cost: 105 },
    { id: 102, first_name: "Gabriel", second_name: "Magalhaes", web_name: "Gabriel", team: 1, element_type: 2, status: "d", now_cost: 62 },
    { id: 201, first_name: "Mohamed", second_name: "Salah", web_name: "Salah", team: 2, element_type: 3, status: "a", now_cost: 145 },
    { id: 301, first_name: "Erling", second_name: "Haaland", web_name: "Haaland", team: 3, element_type: 4, status: "a", now_cost: 150 },
    { id: 401, first_name: "Nick", second_name: "Pope", web_name: "Pope", team: 4, element_type: 1, status: "i", now_cost: 50 },
  ],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeStorage(initial = {}) {
  const state = { ...initial };
  return {
    getItem: jest.fn((key) => state[key] || null),
    setItem: jest.fn((key, value) => {
      state[key] = value;
    }),
    removeItem: jest.fn((key) => {
      delete state[key];
    }),
    state,
  };
}

function makeResponse(payload, ok = true, status = 200) {
  return {
    ok,
    status,
    text: jest.fn(async () => JSON.stringify(payload)),
  };
}

describe("Fantasy IQ player data adapter", () => {
  test("converts a valid bootstrap response to canonical players", () => {
    const result = adaptFantasyBootstrapPayload(basePayload, { fetchedAt: "2026-08-05T00:00:00.000Z" });
    expect(result.valid).toBe(true);
    expect(result.dataset.players).toHaveLength(5);
    expect(result.dataset.players[0]).toMatchObject({
      id: "fpl:101",
      sourceId: 101,
      displayName: "Bukayo Saka",
      webName: "Saka",
      normalisedName: "bukayo saka",
      teamCode: "ARS",
      teamName: "Arsenal",
      position: "MID",
      price: 10.5,
      priceTenths: 105,
      availabilityStatus: "available",
      dataSource: "official-fpl-bootstrap",
    });
  });

  test("team IDs resolve correctly", () => {
    const { dataset } = adaptFantasyBootstrapPayload(basePayload);
    expect(dataset.players.find((player) => player.id === "fpl:201").teamCode).toBe("LIV");
  });

  test("position IDs resolve correctly", () => {
    const { dataset } = adaptFantasyBootstrapPayload(basePayload);
    expect(dataset.players.find((player) => player.id === "fpl:301").position).toBe("FWD");
  });

  test("invalid player record is rejected without crashing", () => {
    const payload = clone(basePayload);
    payload.elements.push({ id: null, first_name: "", second_name: "", team: 1, element_type: 3 });
    const result = adaptFantasyBootstrapPayload(payload);
    expect(result.dataset.players).toHaveLength(5);
    expect(result.diagnostics.rejectedPlayerCount).toBe(1);
  });

  test("duplicate player ID is detected", () => {
    const payload = clone(basePayload);
    payload.elements.push({ ...payload.elements[0] });
    const result = adaptFantasyBootstrapPayload(payload);
    expect(result.diagnostics.duplicateIdCount).toBe(1);
    expect(result.diagnostics.rejectedPlayerCount).toBe(1);
  });

  test("unknown team is handled safely", () => {
    const payload = clone(basePayload);
    payload.elements.push({ id: 999, first_name: "Unknown", second_name: "Team", web_name: "Team", team: 99, element_type: 3 });
    const result = adaptFantasyBootstrapPayload(payload);
    expect(result.diagnostics.unknownTeamCount).toBe(1);
    expect(result.dataset.players.some((player) => player.id === "fpl:999")).toBe(false);
  });

  test("unknown position is handled safely", () => {
    const payload = clone(basePayload);
    payload.elements.push({ id: 998, first_name: "Unknown", second_name: "Role", web_name: "Role", team: 1, element_type: 99 });
    const result = adaptFantasyBootstrapPayload(payload);
    expect(result.diagnostics.unknownPositionCount).toBe(1);
    expect(result.dataset.players.some((player) => player.id === "fpl:998")).toBe(false);
  });

  test("invalid top-level response is rejected", () => {
    const result = adaptFantasyBootstrapPayload({ elements: [] });
    expect(result.valid).toBe(false);
    expect(result.dataset).toBeNull();
  });

  test("validates canonical datasets", () => {
    const { dataset } = adaptFantasyBootstrapPayload(basePayload);
    expect(validateFantasyPlayerDataset(dataset)).toBe(true);
    expect(validateFantasyPlayerDataset({ ...dataset, players: [] })).toBe(false);
  });

  test("fallback dataset remains selectable when live data is unavailable", () => {
    const fallback = buildFallbackFantasyPlayerDataset([{ name: "Arsenal", shortName: "ARS", code: "ARS" }]);
    expect(fallback.players).toHaveLength(4);
    expect(fallback.players[0].temporary).toBe(true);
    expect(fallback.cacheStatus).toBe("fallback");
  });

  test("preserves canonical FPL event data for gameweek history", () => {
    const payload = clone(basePayload);
    payload.events = [
      { id: 5, name: "Gameweek 5", deadline_time: "2026-08-29T10:30:00Z", finished: false, is_current: true, is_next: false },
      { id: 6, name: "Gameweek 6", deadline_time: "2026-09-12T10:30:00Z", finished: false, is_current: false, is_next: true },
    ];
    const result = adaptFantasyBootstrapPayload(payload);
    expect(result.dataset.events).toEqual([
      expect.objectContaining({ gameweek: 5, name: "Gameweek 5", deadline: "2026-08-29T10:30:00Z", isCurrent: true }),
      expect.objectContaining({ gameweek: 6, name: "Gameweek 6", deadline: "2026-09-12T10:30:00Z", isNext: true }),
    ]);
  });

  test("maps recent gameweek starts into player metadata", () => {
    const payload = {
      ...clone(basePayload),
      recentStartsByElement: {
        101: [1, 1, 1, 1, 1],
        102: [0, 0, 0, 0, 0],
        201: [1, 0, 1, 1, 0],
      },
      recentStartsMetadata: {
        source: "official-fpl-event-live",
        gameweeks: [9, 8, 7, 6, 5],
        order: "newest-first",
      },
    };
    const result = adaptFantasyBootstrapPayload(payload);
    const saka = result.dataset.players.find((player) => player.id === "fpl:101");
    const gabriel = result.dataset.players.find((player) => player.id === "fpl:102");
    const salah = result.dataset.players.find((player) => player.id === "fpl:201");

    expect(saka.externalMetadata).toMatchObject({
      recentStarts: 5,
      startsLast5: 5,
      consecutiveStarts: 5,
      consecutiveNonStarts: 0,
      recentStartGameweeks: [9, 8, 7, 6, 5],
    });
    expect(gabriel.externalMetadata).toMatchObject({
      recentStarts: 0,
      startsLast5: 0,
      consecutiveStarts: 0,
      consecutiveNonStarts: 5,
    });
    expect(salah.externalMetadata).toMatchObject({
      recentStarts: 3,
      startsLast5: 3,
      consecutiveStarts: 1,
      consecutiveNonStarts: 0,
    });
  });
});

describe("Fantasy IQ name and team matching", () => {
  const players = adaptFantasyBootstrapPayload(basePayload).dataset.players;

  test("name normalisation handles accents", () => {
    expect(normaliseFantasyPlayerName("Joao Pedro")).toBe("joao pedro");
    expect(normaliseFantasyPlayerName("João Pedro")).toBe("joao pedro");
  });

  test("name normalisation handles apostrophes and hyphens", () => {
    expect(normaliseFantasyPlayerName("Jean-Ricner Bellegarde")).toBe("jean ricner bellegarde");
    expect(normaliseFantasyPlayerName("O'Neil")).toBe("oneil");
  });

  test("team-code aliases normalise correctly", () => {
    expect(normalisePremierLeagueTeamCode("Man City")).toBe("MCI");
    expect(normalisePremierLeagueTeamCode("spurs")).toBe("TOT");
    expect(normalisePremierLeagueTeamCode("Nottm Forest")).toBe("NFO");
  });

  test("invalid team code returns null", () => {
    expect(normalisePremierLeagueTeamCode("XYZ")).toBeNull();
  });

  test("exact name plus team and position produces exact match", () => {
    const result = matchFantasyPlayerCandidate({ rawName: "Bukayo Saka", rawTeamCode: "ARS", rawPosition: "MID", players });
    expect(result.status).toBe("exact");
    expect(result.player.id).toBe("fpl:101");
    expect(result.confidence).toBe(1);
  });

  test("surname/web-name plus team and position produces high-confidence match", () => {
    const result = matchFantasyPlayerCandidate({ rawName: "Salah", rawTeamCode: "LIV", rawPosition: "MID", players });
    expect(result.status).toBe("high-confidence");
    expect(result.player.id).toBe("fpl:201");
  });

  test("distinctive multi-token FPL web name plus position produces high-confidence match without fixture team code", () => {
    const extra = [
      ...players,
      {
        id: "fpl:de-cuyper",
        sourceId: 777,
        firstName: "Maxim",
        lastName: "De Cuyper",
        displayName: "Maxim De Cuyper",
        name: "Maxim De Cuyper",
        webName: "De Cuyper",
        normalisedName: "maxim de cuyper",
        teamCode: "BHA",
        teamName: "Brighton",
        position: "DEF",
      },
    ];
    const result = matchFantasyPlayerCandidate({ rawName: "De Cuyper", rawPosition: "DEF", players: extra });

    expect(result.status).toBe("high-confidence");
    expect(result.player.id).toBe("fpl:de-cuyper");
    expect(result.candidates.map((player) => player.id)).toEqual(["fpl:de-cuyper"]);
  });

  test("minor OCR typo with exact team and position produces candidates", () => {
    const result = matchFantasyPlayerCandidate({ rawName: "Bukayo Sakae", rawTeamCode: "ARS", rawPosition: "MID", players });
    expect(["high-confidence", "ambiguous"]).toContain(result.status);
    expect(result.candidates.map((player) => player.id)).toContain("fpl:101");
  });

  test("same surname across clubs is constrained by team code", () => {
    const extra = [
      ...players,
      { ...players[0], id: "fpl:777", sourceId: 777, displayName: "John Saka", normalisedName: "john saka", teamCode: "LIV", teamName: "Liverpool" },
    ];
    const result = matchFantasyPlayerCandidate({ rawName: "Saka", rawTeamCode: "ARS", rawPosition: "MID", players: extra });
    expect(result.player.id).toBe("fpl:101");
  });

  test("ambiguous match is not automatically resolved", () => {
    const extra = [
      ...players,
      { ...players[0], id: "fpl:778", sourceId: 778, displayName: "John Saka", normalisedName: "john saka", teamCode: "LIV", teamName: "Liverpool" },
    ];
    const result = matchFantasyPlayerCandidate({ rawName: "Saka", players: extra });
    expect(result.status).toBe("ambiguous");
    expect(result.player).toBeNull();
  });

  test("conflicting team code prevents automatic acceptance", () => {
    const result = matchFantasyPlayerCandidate({ rawName: "Bukayo Saka", rawTeamCode: "LIV", rawPosition: "MID", players });
    expect(result.status).not.toBe("exact");
    expect(result.player?.id).not.toBe("fpl:101");
  });

  test("unknown player returns unmatched", () => {
    const result = matchFantasyPlayerCandidate({ rawName: "Nobody Real", rawTeamCode: "ARS", rawPosition: "MID", players });
    expect(result.status).toBe("unmatched");
  });
});

describe("Fantasy IQ player-data cache and loader", () => {
  test("valid cache loads safely", () => {
    const { dataset } = adaptFantasyBootstrapPayload(basePayload, { fetchedAt: "2026-08-05T00:00:00.000Z" });
    const storage = makeStorage({ [FANTASY_PLAYER_DATA_CACHE_KEY]: JSON.stringify(dataset) });
    const cached = readFantasyPlayerDataCache(storage, Date.parse(dataset.fetchedAt));
    expect(cached.cacheStatus).toBe("fresh-cache");
    expect(cached.players).toHaveLength(5);
  });

  test("expired cache can be used as stale fallback", () => {
    const { dataset } = adaptFantasyBootstrapPayload(basePayload, { fetchedAt: "2026-08-04T00:00:00.000Z" });
    const storage = makeStorage({ [FANTASY_PLAYER_DATA_CACHE_KEY]: JSON.stringify({ ...dataset, expiresAt: "2026-08-04T12:00:00.000Z" }) });
    const cached = readFantasyPlayerDataCache(storage, Date.parse("2026-08-05T00:00:00.000Z"));
    expect(cached.cacheStatus).toBe("stale-cache");
  });

  test("malformed cache is ignored", () => {
    const storage = makeStorage({ [FANTASY_PLAYER_DATA_CACHE_KEY]: "{bad json" });
    expect(readFantasyPlayerDataCache(storage)).toBeNull();
  });

  test("successful live response writes cache", async () => {
    const storage = makeStorage();
    const fetchImpl = jest.fn(async () => makeResponse(basePayload));
    const dataset = await loadFantasyPlayerData({ storage, fetchImpl, endpoint: "/ok", directEndpoint: "/ok", now: Date.parse("2026-08-05T00:00:00.000Z") });
    expect(dataset.cacheStatus).toBe("live");
    expect(storage.setItem).toHaveBeenCalled();
  });

  test("malformed live response does not overwrite good cache", async () => {
    const { dataset } = adaptFantasyBootstrapPayload(basePayload);
    const storage = makeStorage({ [FANTASY_PLAYER_DATA_CACHE_KEY]: JSON.stringify(dataset) });
    const fetchImpl = jest.fn(async () => makeResponse({ elements: [] }));
    await loadFantasyPlayerData({ storage, fetchImpl, endpoint: "/bad", directEndpoint: "/bad", forceRefresh: true });
    expect(JSON.parse(storage.state[FANTASY_PLAYER_DATA_CACHE_KEY]).players).toHaveLength(5);
  });

  test("network failure uses cached data", async () => {
    const { dataset } = adaptFantasyBootstrapPayload(basePayload);
    const storage = makeStorage({ [FANTASY_PLAYER_DATA_CACHE_KEY]: JSON.stringify({ ...dataset, expiresAt: "2026-08-04T00:00:00.000Z" }) });
    const fetchImpl = jest.fn(async () => {
      throw new Error("offline");
    });
    const result = await loadFantasyPlayerData({ storage, fetchImpl, endpoint: "/bad", directEndpoint: "/bad", forceRefresh: true, now: Date.parse("2026-08-05T00:00:00.000Z") });
    expect(result.status).toBe("fallback");
    expect(result.cacheStatus).toBe("stale-cache");
  });

  test("network failure uses final fallback when no cache exists", async () => {
    const storage = makeStorage();
    const fallbackDataset = buildFallbackFantasyPlayerDataset([{ name: "Arsenal", shortName: "ARS", code: "ARS" }]);
    const fetchImpl = jest.fn(async () => {
      throw new Error("offline");
    });
    const result = await loadFantasyPlayerData({ storage, fetchImpl, endpoint: "/bad", directEndpoint: "/bad", fallbackDataset });
    expect(result.status).toBe("fallback");
    expect(result.cacheStatus).toBe("fallback");
    expect(result.players).toHaveLength(4);
  });

  test("write cache rejects malformed datasets", () => {
    const storage = makeStorage();
    expect(writeFantasyPlayerDataCache({ schemaVersion: FANTASY_PLAYER_DATA_SCHEMA_VERSION }, storage)).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});

describe("Fantasy IQ saved-squad reconciliation", () => {
  const dataset = adaptFantasyBootstrapPayload(basePayload).dataset;

  test("existing temporary squad player reconciles by name/team/position", () => {
    const squad = {
      confirmed: true,
      players: [{ id: "tmp-ars-mid", name: "Bukayo Saka", teamCode: "ARS", position: "MID", squadRole: "starter", temporary: true }],
    };
    const result = reconcileFantasyIqSquadWithPlayerData(squad, dataset);
    expect(result.players[0]).toMatchObject({ id: "fpl:101", reconciliationStatus: "matched" });
    expect(result.confirmed).toBe(true);
  });

  test("ambiguous legacy player remains unresolved", () => {
    const ambiguousDataset = {
      ...dataset,
      players: [
        ...dataset.players,
        { ...dataset.players[0], id: "fpl:777", sourceId: 777, displayName: "John Saka", normalisedName: "john saka", teamCode: "LIV" },
      ],
    };
    const squad = {
      confirmed: true,
      players: [{ id: "tmp-saka", name: "Saka", position: "MID", squadRole: "starter", temporary: true }],
    };
    const result = reconcileFantasyIqSquadWithPlayerData(squad, ambiguousDataset);
    expect(result.players[0].reconciliationStatus).toBe("ambiguous");
    expect(result.confirmed).toBe(false);
  });

  test("unmatched saved player causes squad review state", () => {
    const squad = {
      confirmed: true,
      players: [{ id: "legacy-1", name: "Unknown Player", teamCode: "ARS", position: "MID", squadRole: "starter" }],
    };
    const result = reconcileFantasyIqSquadWithPlayerData(squad, dataset);
    expect(result.needsPlayerDataReview).toBe(true);
    expect(result.confirmed).toBe(false);
  });

  test("transferred player updates team and keeps a migration note", () => {
    const squad = {
      confirmed: true,
      players: [{ id: "fpl:101", sourceId: 101, name: "Bukayo Saka", teamCode: "LIV", position: "MID", squadRole: "starter" }],
    };
    const result = reconcileFantasyIqSquadWithPlayerData(squad, dataset);
    expect(result.players[0].teamCode).toBe("ARS");
    expect(result.players[0].migrationNote).toMatch(/club changed/i);
  });

  test("more than three players after transfer can be detected from reconciled team counts", () => {
    const squad = {
      confirmed: true,
      players: [
        { id: "fpl:101", sourceId: 101, name: "Bukayo Saka", teamCode: "LIV", position: "MID", squadRole: "starter" },
        { id: "fpl:102", sourceId: 102, name: "Gabriel Magalhaes", teamCode: "ARS", position: "DEF", squadRole: "starter" },
        { id: "tmp-ars-1", name: "Bukayo Saka", teamCode: "ARS", position: "MID", squadRole: "bench" },
        { id: "tmp-ars-2", name: "Gabriel", teamCode: "ARS", position: "DEF", squadRole: "bench" },
      ],
    };
    const result = reconcileFantasyIqSquadWithPlayerData(squad, dataset);
    const arsenalCount = result.players.filter((player) => player.teamCode === "ARS").length;
    expect(arsenalCount).toBeGreaterThan(3);
  });
});
