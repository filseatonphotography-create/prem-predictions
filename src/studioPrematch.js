// CommonJS for the browser bundle, Node backend and Netlify fixture feed.
function hasStudioLineups(state = {}) {
  if (state.lineupsAvailable === true) return true;
  const complete = team => Array.isArray(team && team.lineup) && team.lineup.filter(player => String(player && player.name || '').trim()).length >= 11;
  return complete(state.lineups && state.lineups.home || state.homeTeam) && complete(state.lineups && state.lineups.away || state.awayTeam);
}
function lineupTimeKey(fixture) { return `${fixture.id}|${fixture.kickoff}`; }
function getStudioLineupTime(fixture, state = {}, saved, now = Date.now()) {
  const kickoff = Date.parse(fixture.kickoff);
  const candidates = [state.lineupsAnnouncedAt, state.recordedState && state.recordedState.lineupsAnnouncedAt, saved]
    .map(value => Date.parse(value || '')).filter(time => Number.isFinite(time) && time >= kickoff - 90 * 60000 && time <= kickoff && time <= now);
  return candidates.length ? new Date(Math.min(...candidates)).toISOString() : '';
}
function buildStudioPrematchCards({ fixture, state = {}, now = Date.now(), announcedAt, form = null }) {
  const kickoff = Date.parse(fixture.kickoff), announced = Date.parse(announcedAt || state.lineupsAnnouncedAt || '');
  if (!hasStudioLineups(state) || !['TIMED', 'SCHEDULED', 'LIVE', 'IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT', 'FINISHED'].includes(String(state.status || '').toUpperCase())
    || !Number.isFinite(kickoff) || !Number.isFinite(announced) || now - kickoff > 8 * 3600000 || kickoff - now > 90 * 60000 || announced > now) return [];
  const cards = [];
  const add = (kind, moment, title, lines, extra) => {
    if (moment > now || moment >= kickoff) return;
    const key = `${fixture.id}:pre-match-${kind}:${kickoff}`;
    cards.push(Object.assign({ id: key, updateKey: key, fixtureId: fixture.id, fixture,
      competitionLabel: fixture.competitionLabel || 'Premier League', minute: 'PRE', momentMs: moment, title, lines,
      tone: 'live', prematch: true, footballOnly: fixture.competition === 'champions' }, extra));
  };
  add('form', announced + 30 * 60000, 'The pre-match form guide',
    [fixture.competition === 'champions' ? 'A look at both teams’ Champions League form before the first whistle.' : 'A look at both teams’ Premier League form before the first whistle.'],
    { icon: '📊', formCard: true, championsForm: form });
  const buildupAt = Math.max(kickoff - 15 * 60000, announced);
  const minutes = Math.ceil((kickoff - buildupAt) / 60000);
  add('buildup', buildupAt, 'The countdown is on',
    [`${minutes} minutes to kick-off: ${fixture.homeTeam} v ${fixture.awayTeam}.`, 'The teams are confirmed. The wait is almost over—time for the final preparations.'], { icon: '⏳' });
  return cards;
}
module.exports = { hasStudioLineups, lineupTimeKey, getStudioLineupTime, buildStudioPrematchCards };
