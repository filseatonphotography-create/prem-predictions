import { readLiveStudioCache, writeLiveStudioCache } from "./liveStudioStorage";
import { mergeRecordedMatchState } from "./liveMatchEvents";

const keyFor = mode => `live-studio-match-states:v1:${mode}`;

export function readLiveStudioMatchStates(mode, nowMs = Date.now()) {
  const saved = readLiveStudioCache(keyFor(mode), {});
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
  return Object.fromEntries(Object.entries(saved).filter(([, state]) => {
    const kickoff = Date.parse(state?.utcDate || "");
    return Number.isFinite(kickoff) && kickoff <= nowMs + 90 * 60000 && kickoff >= nowMs - 6 * 3600000;
  }));
}

export function writeLiveStudioMatchStates(mode, states, fixtures, nowMs = Date.now()) {
  const fixtureById = new Map(fixtures.map(fixture => [String(fixture.id), fixture]));
  const existing = readLiveStudioMatchStates(mode, nowMs);
  const retained = Object.fromEntries(Object.entries(states).flatMap(([id, state]) => {
    const fixture = fixtureById.get(id);
    if (!fixture) return [];
    const kickoff = Date.parse(state?.utcDate || existing[id]?.utcDate || fixture.kickoff || "");
    if (!Number.isFinite(kickoff) || kickoff > nowMs + 90 * 60000 || kickoff < nowMs - 6 * 3600000) return [];
    return [[id, mergeRecordedMatchState({ ...state, utcDate: state?.utcDate || existing[id]?.utcDate || fixture.kickoff }, existing[id] || {})]];
  }));
  writeLiveStudioCache(keyFor(mode), { ...existing, ...retained });
}
