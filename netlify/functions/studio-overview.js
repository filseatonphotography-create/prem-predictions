const { normalizeLineups } = require('../../notificationUtils');
const { buildChampionsForm } = require('../../src/studioCompetitions');
const { hasStudioLineups } = require('../../src/studioPrematch');
const lineupTimes = new Map();
const { createStudioOverviewCache } = require('../../src/studioOverviewCache');

const overview = createStudioOverviewCache({ fetchMatches: async () => {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error('Football feed is not configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch('https://api.football-data.org/v4/competitions/CL/matches', {
      headers: { 'X-Auth-Token': token, 'X-Unfold-Lineups': 'true' }, signal: controller.signal,
    });
    if (!response.ok) throw new Error('Football feed is unavailable');
    const data = await response.json();
    if (!Array.isArray(data.matches)) throw new Error('Invalid football feed');
    return data.matches.map(match => {
      const key = `${match.id}|${match.utcDate}`;
      if (['TIMED', 'SCHEDULED'].includes(match.status) && hasStudioLineups(match) && !lineupTimes.has(key)) lineupTimes.set(key, new Date().toISOString());
      return Object.assign({}, match, { lineupsAnnouncedAt: lineupTimes.get(key) || '' });
    });
  } finally { clearTimeout(timer); }
} });

exports.handler = async () => {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const data = await overview.get(), now = Date.now();
    const next = data.matches.filter(match => ['TIMED', 'SCHEDULED'].includes(match.status) && Date.parse(match.utcDate) > now)
      .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate))[0];
    const matches = data.matches.filter(match => Math.abs(Date.parse(match.utcDate) - now) <= 24 * 3600000).map(match => ({
      id: match.id, utcDate: match.utcDate, status: match.status, minute: match.minute, lastUpdated: match.lastUpdated,
      lineups: normalizeLineups(match), lineupsAvailable: hasStudioLineups(match), lineupsAnnouncedAt: match.lineupsAnnouncedAt, form: buildChampionsForm(match, data.matches),
      homeTeam: { id: match.homeTeam?.id, name: match.homeTeam?.name, crest: match.homeTeam?.crest },
      awayTeam: { id: match.awayTeam?.id, name: match.awayTeam?.name, crest: match.awayTeam?.crest }, score: match.score,
    }));
    const nextFixture = next ? { id: `cl:${next.id}`, kickoff: next.utcDate, homeTeam: next.homeTeam?.name || '', awayTeam: next.awayTeam?.name || '' } : null;
    return { statusCode: 200, headers: Object.assign({}, headers, { 'Cache-Control': 'public, max-age=0, s-maxage=15' }),
      body: JSON.stringify({ matches, nextFixture, updatedAt: data.updatedAt, stale: data.stale }) };
  } catch {
    return { statusCode: 503, headers: Object.assign({}, headers, { 'Cache-Control': 'no-store' }), body: JSON.stringify({ error: 'Fixture updates are temporarily unavailable.' }) };
  }
};
