const FPL_BASE_URL = "https://fantasy.premierleague.com/api";
const MAX_RESPONSE_BYTES = 3_000_000;
const RECENT_START_GAMEWEEK_COUNT = 5;

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function fetchJson(url, signal) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    const error = new Error(`FPL request failed with status ${res.status}`);
    error.status = res.status;
    error.details = errorText.slice(0, 500);
    throw error;
  }
  const text = await res.text();
  if (text.length > MAX_RESPONSE_BYTES) {
    throw new Error("FPL response exceeded size limit");
  }
  return JSON.parse(text);
}

function getRecentFinishedEvents(events = []) {
  return (Array.isArray(events) ? events : [])
    .filter((event) => event?.finished && event?.data_checked !== false)
    .map((event) => ({ id: toNumber(event.id), name: event.name || `GW ${event.id}` }))
    .filter((event) => event.id)
    .sort((a, b) => b.id - a.id)
    .slice(0, RECENT_START_GAMEWEEK_COUNT);
}

function getStartedFlag(element = {}) {
  const starts = toNumber(element?.stats?.starts);
  if (starts != null) return starts > 0 ? 1 : 0;
  const minutes = toNumber(element?.stats?.minutes);
  if (minutes == null) return null;
  return minutes >= 60 ? 1 : 0;
}

function attachRecentStarts(bootstrapPayload = {}, eventLivePayloads = []) {
  const recentStartsByElement = {};
  const gameweeks = [];
  eventLivePayloads.forEach(({ event, payload }) => {
    gameweeks.push(event.id);
    (payload?.elements || []).forEach((element) => {
      const id = toNumber(element?.id);
      const started = getStartedFlag(element);
      if (!id || started == null) return;
      const key = String(id);
      if (!recentStartsByElement[key]) recentStartsByElement[key] = [];
      recentStartsByElement[key].push(started);
    });
  });
  return {
    ...bootstrapPayload,
    recentStartsByElement,
    recentStartsMetadata: {
      source: "official-fpl-event-live",
      gameweeks,
      order: "newest-first",
    },
  };
}

function trimBootstrapPayload(payload = {}) {
  return {
    elements: (Array.isArray(payload.elements) ? payload.elements : []).map((player) => ({
      id: player.id,
      first_name: player.first_name,
      second_name: player.second_name,
      web_name: player.web_name,
      team: player.team,
      element_type: player.element_type,
      now_cost: player.now_cost,
      code: player.code,
      removed: player.removed,
      status: player.status,
      news: player.news,
      news_added: player.news_added,
      chance_of_playing_next_round: player.chance_of_playing_next_round,
      chance_of_playing_this_round: player.chance_of_playing_this_round,
      form: player.form,
      points_per_game: player.points_per_game,
      selected_by_percent: player.selected_by_percent,
      minutes: player.minutes,
      starts: player.starts,
      total_points: player.total_points,
    })),
    teams: (Array.isArray(payload.teams) ? payload.teams : []).map((team) => ({
      id: team.id,
      name: team.name,
      short_name: team.short_name,
    })),
    element_types: (Array.isArray(payload.element_types) ? payload.element_types : []).map((position) => ({
      id: position.id,
      singular_name: position.singular_name,
      plural_name: position.plural_name,
      singular_name_short: position.singular_name_short,
    })),
    events: (Array.isArray(payload.events) ? payload.events : []).map((event) => ({
      id: event.id,
      name: event.name,
      deadline_time: event.deadline_time,
      finished: event.finished,
      is_current: event.is_current,
      is_next: event.is_next,
      data_checked: event.data_checked,
    })),
    fixtures: (Array.isArray(payload.fixtures) ? payload.fixtures : []).map((fixture) => ({
      id: fixture.id,
      code: fixture.code,
      event: fixture.event,
      kickoff_time: fixture.kickoff_time,
      team_h: fixture.team_h,
      team_a: fixture.team_a,
      team_h_difficulty: fixture.team_h_difficulty,
      team_a_difficulty: fixture.team_a_difficulty,
      started: fixture.started,
      finished: fixture.finished,
      finished_provisional: fixture.finished_provisional,
      provisional_start_time: fixture.provisional_start_time,
    })),
    recentStartsByElement: payload.recentStartsByElement || {},
    recentStartsMetadata: payload.recentStartsMetadata || null,
  };
}

export async function handler() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const bootstrapPayload = await fetchJson(`${FPL_BASE_URL}/bootstrap-static/`, controller.signal);
    const fixturesPayload = await fetchJson(`${FPL_BASE_URL}/fixtures/`, controller.signal).catch(() => []);
    bootstrapPayload.fixtures = Array.isArray(fixturesPayload) ? fixturesPayload : [];
    const recentEvents = getRecentFinishedEvents(bootstrapPayload.events);
    const eventLiveResults = await Promise.allSettled(
      recentEvents.map(async (event) => ({
        event,
        payload: await fetchJson(`${FPL_BASE_URL}/event/${event.id}/live/`, controller.signal),
      }))
    );

    const eventLivePayloads = eventLiveResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
    const enrichedPayload = trimBootstrapPayload(attachRecentStarts(bootstrapPayload, eventLivePayloads));
    const text = JSON.stringify(enrichedPayload);
    if (text.length > MAX_RESPONSE_BYTES) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "FPL player data response exceeded size limit" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
      },
      body: text,
    };
  } catch (err) {
    const isTimeout = err?.name === "AbortError";
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: isTimeout ? "Upstream timeout" : "Internal server error",
      }),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
