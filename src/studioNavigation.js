const { hasStudioLineups } = require('./studioPrematch');
export const LIVE_STUDIO_STATUSES = ['LIVE', 'IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'];
export function isStudioMatchLive(fixture, nowMs = Date.now()) {
  const kickoff = Date.parse(fixture?.kickoff || fixture?.utcDate || '');
  const status = String(fixture?.status || '').toUpperCase();
  if (['TIMED', 'SCHEDULED'].includes(status)) return Number.isFinite(kickoff) && nowMs - kickoff <= 30 * 60000 && kickoff - nowMs <= 90 * 60000 && hasStudioLineups(fixture);
  return LIVE_STUDIO_STATUSES.includes(status)
    && (!Number.isFinite(kickoff) || (kickoff <= nowMs && nowMs - kickoff <= 8 * 3600000));
}
export function nextStudioKickoff(fixtures, nowMs) {
  return fixtures.filter(fixture => (!fixture.status || ['TIMED', 'SCHEDULED'].includes(String(fixture.status).toUpperCase())) && Date.parse(fixture.kickoff) > nowMs)
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))[0] || null;
}
export function studioCountdown(kickoff, nowMs) {
  const remaining = Math.max(0, Math.ceil((Date.parse(kickoff) - nowMs) / 1000));
  const days = Math.floor(remaining / 86400), hours = Math.floor(remaining % 86400 / 3600), minutes = Math.floor(remaining % 3600 / 60), seconds = remaining % 60;
  return `${days ? `${days}d ` : ''}${hours}h ${minutes}m ${seconds}s`;
}
export function readStudioRoute() {
  const params = new URLSearchParams(window.location.search);
  const fixture = params.get('fixtureId');
  if (fixture) return { page: 'coverage', competition: fixture.startsWith('cl:') ? 'champions' : 'primary', gameIds: [fixture] };
  const page = params.get('studio');
  return { page: ['matches', 'coverage'].includes(page) ? page : 'competitions', competition: params.get('competition') === 'champions' ? 'champions' : 'primary',
    gameIds: params.get('games')?.split(',').filter(id => /^(cl:)?\d+$/.test(id)) || null };
}
