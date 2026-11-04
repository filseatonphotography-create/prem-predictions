// This module also runs in Node. Use Object.assign so Babel does not inject ESM spread helpers into its CommonJS exports.
const { numeric, normalizeMatchEvents, getMatchEventMomentMs, mergeRecordedMatchState } = require('./liveMatchEvents');

function championsFixture(match) {
  return { id: `cl:${match.id}`, providerId: match.id, competition: 'champions', competitionLabel: 'Champions League',
    homeTeam: match.homeTeam?.name || '', awayTeam: match.awayTeam?.name || '',
    homeBadge: match.homeTeam?.crest || '', awayBadge: match.awayTeam?.crest || '',
    kickoff: match.utcDate, venue: match.venue || '', gameweek: match.matchday, stage: match.stage };
}

// The caller supplies the current Champions League season, not domestic results.
function buildChampionsForm(fixture, seasonMatches = []) {
  const before = Date.parse(fixture.utcDate);
  const formFor = team => {
    if (team?.id == null || !Number.isFinite(before)) return [];
    return seasonMatches.filter(match => {
      const competition = match.competition;
      if (competition?.code && competition.code !== 'CL') return false;
      if (competition?.id != null && Number(competition.id) !== 2001) return false;
      if (String(match.id) === String(fixture.id) || match.status !== 'FINISHED') return false;
      if (![match.homeTeam?.id, match.awayTeam?.id].some(id => id != null && String(id) === String(team.id))) return false;
      const start = Date.parse(match.utcDate);
      const finished = Date.parse(match.finishedAt || '');
      const estimatedEnd = start + (['EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(match.score?.duration) ? 180 : 120) * 60000;
      if (!Number.isFinite(start) || (Number.isFinite(finished) ? finished : estimatedEnd) >= before) return false;
      const score = match.score?.fullTime;
      return numeric(score?.home) != null && numeric(score?.away) != null && Number(score.home) >= 0 && Number(score.away) >= 0;
    }).sort((a, b) => Date.parse(b.utcDate) - Date.parse(a.utcDate)).slice(0, 5).map(match => {
      const home = String(match.homeTeam.id) === String(team.id);
      const opponent = home ? match.awayTeam : match.homeTeam;
      const goalsFor = Number(match.score.fullTime[home ? 'home' : 'away']);
      const goalsAgainst = Number(match.score.fullTime[home ? 'away' : 'home']);
      return { fixtureId: `cl:${match.id}`, outcome: goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D',
        opponent: opponent?.name || '', opponentCode: opponent?.tla || String(opponent?.shortName || opponent?.name || '?').slice(0, 3).toUpperCase(),
        venue: home ? 'H' : 'A', scoreText: `${goalsFor}-${goalsAgainst}` };
    });
  };
  return { home: formFor(fixture.homeTeam), away: formFor(fixture.awayTeam) };
}

function studioAlertAllowed(record = {}, fixtureId, kind) {
  const pref = record.studioPrefs?.[String(fixtureId)];
  if (pref?.enabled === false) return false;
  if (String(fixtureId).startsWith('cl:') && pref?.enabled !== true && record.fixturePrefs?.[fixtureId] !== true) return false;
  return pref?.level !== 'goals' || ['goal', 'goal-disallowed', 'full-time'].includes(kind);
}

function currentChampionsMatch(raw) {
  const incoming = Object.assign({}, raw, { homeGoals: numeric(raw.score?.fullTime?.home), awayGoals: numeric(raw.score?.fullTime?.away),
    goalEvents: normalizeMatchEvents(raw).filter(event => event.type === 'GOAL'), matchEvents: normalizeMatchEvents(raw) });
  const state = mergeRecordedMatchState(incoming, raw.recordedState || {});
  return Object.assign({}, raw, state, { score: Object.assign({}, raw.score, { fullTime: { home: state.homeGoals, away: state.awayGoals } }) });
}

function footballFeed(raw) {
  const match = currentChampionsMatch(raw);
  const fixture = championsFixture(match);
  const status = String(match.status || '').toUpperCase();
  const score = match.score?.fullTime || {};
  const scoreText = numeric(score.home) != null && numeric(score.away) != null ? `${fixture.homeTeam} ${score.home}–${score.away} ${fixture.awayTeam}` : `${fixture.homeTeam} v ${fixture.awayTeam}`;
  const state = Object.assign({}, match, { homeGoals: numeric(score.home), awayGoals: numeric(score.away) });
  const entries = [];
  const add = (key, minute, title, lines, event = {}, extra = {}) => {
    entries.push(Object.assign({ id: `${fixture.id}:${key}`, updateKey: `${fixture.id}:${key}`, fixtureId: fixture.id, fixture,
      competitionLabel: fixture.competitionLabel, matchScore: { homeGoals: numeric(score.home), awayGoals: numeric(score.away) }, minute, title, lines, tone: status === 'FINISHED' ? 'finished' : status === 'PAUSED' ? 'paused' : 'live',
      momentMs: getMatchEventMomentMs(fixture, event, state) }, extra));
  };
  const lineups = match.lineups;
  if (lineups?.home?.lineup?.length && lineups?.away?.lineup?.length) {
    add('lineup:confirmed', 'XI', `Line-ups confirmed: ${fixture.homeTeam} v ${fixture.awayTeam}`, ['The team sheets are in. Here are the starting XIs.'], { type: 'LINEUPS' }, { lineups, icon: '📋' });
  }
  const started = ['IN_PLAY', 'PAUSED', 'FINISHED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(status);
  if (started) add('kick-off:start', 'KO', 'Kick off!', [`${fixture.homeTeam} v ${fixture.awayTeam} is underway.`], { statusLabel: 'KO', minute: 0 }, { icon: '⚽', footballOnly: true, championsForm: match.form || null });
  normalizeMatchEvents(match).forEach((event, index) => {
    const kind = String(event.type || '').toUpperCase();
    if (!['GOAL', 'GOAL_DISALLOWED', 'YELLOW_CARD', 'RED_CARD', 'SECOND_YELLOW_CARD', 'SUBSTITUTION', 'PENALTY_MISSED', 'PENALTY_SAVED'].includes(kind)) return;
    const minute = numeric(event.minute) == null ? 'Live' : `${event.minute}${event.injuryTime ? `+${event.injuryTime}` : ''}'`;
    const person = event.scorerName || event.playerName || '';
    const label = ({ GOAL: 'Goal', GOAL_DISALLOWED: 'Goal ruled out', YELLOW_CARD: 'Yellow card', RED_CARD: 'Red card', SECOND_YELLOW_CARD: 'Second yellow card', SUBSTITUTION: 'Substitution', PENALTY_MISSED: 'Penalty missed', PENALTY_SAVED: 'Penalty saved' })[kind];
    const line = kind === 'SUBSTITUTION' ? [event.playerInName || event.substituteName, 'replaces', event.playerOutName || person].filter(Boolean).join(' ') : [person, event.teamName].filter(Boolean).join(' · ');
    const eventScore = numeric(event.homeGoals) != null && numeric(event.awayGoals) != null ? `${fixture.homeTeam} ${event.homeGoals}–${event.awayGoals} ${fixture.awayTeam}` : '';
    const key = kind === 'GOAL' && eventScore ? `goal:${event.homeGoals}-${event.awayGoals}` : `${kind.toLowerCase().replace(/_/g, '-')}:${event.id ?? `${event.minute}:${index}`}`;
    add(key, minute, `${label}${event.teamName ? ` for ${event.teamName}` : ''}`, [line, eventScore].filter(Boolean), event, { event, events: normalizeMatchEvents(match), championsForm: match.form, icon: kind === 'GOAL' ? '⚽' : kind.includes('CARD') ? '▣' : '↔' });
  });
  if (status === 'PAUSED' || match.score?.halfTime?.home != null && (numeric(match.minute) > 45 || status === 'FINISHED')) {
    const ht = match.score?.halfTime || {};
    add('half-time', 'HT', 'Half-time in the Champions League', [numeric(ht.home) != null && numeric(ht.away) != null ? `${fixture.homeTeam} ${ht.home}–${ht.away} ${fixture.awayTeam}` : scoreText], { statusLabel: 'HT', minute: 45 }, { icon: '☕', phaseScore: { homeGoals: numeric(ht.home) ?? (status === 'PAUSED' ? numeric(score.home) : null), awayGoals: numeric(ht.away) ?? (status === 'PAUSED' ? numeric(score.away) : null) } });
  }
  if (match.secondHalfAt || numeric(match.minute) > 45) add('second-half', '2H', 'Second half underway', [`Back underway: ${fixture.homeTeam} v ${fixture.awayTeam}.`], { statusLabel: 'SH', minute: 45 }, { icon: '▶', phaseScore: { homeGoals: numeric(match.score?.halfTime?.home), awayGoals: numeric(match.score?.halfTime?.away) } });
  if (status === 'FINISHED' || status === 'AWARDED') {
    const penalties = match.score?.penalties;
    const suffix = penalties?.home != null && penalties?.away != null ? `Penalties: ${penalties.home}–${penalties.away}.` : match.score?.duration === 'EXTRA_TIME' ? 'After extra time.' : '';
    add(`full-time:${score.home}-${score.away}`, 'FT', 'Full time in the Champions League', [scoreText, suffix].filter(Boolean), { statusLabel: 'FT', minute: numeric(match.minute) || (['EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(match.score?.duration) ? 120 : 90) }, { icon: '🏁', penalties });
  }
  if (started && status !== 'FINISHED') {
    add('current', status === 'PAUSED' ? 'HT' : numeric(match.minute) != null ? `${match.minute}'` : 'Live', scoreText,
      [status === 'EXTRA_TIME' ? 'Extra time is underway.' : status === 'PENALTY_SHOOTOUT' ? 'Penalty shootout in progress.' : status === 'PAUSED' ? 'The teams are taking a breather.' : 'Live match coverage.'],
      { minute: numeric(match.minute), occurredAt: match.lastUpdated }, { momentMs: Date.parse(match.lastUpdated || fixture.kickoff) });
  }
  return entries;
}

module.exports = { buildChampionsForm, championsFixture, studioAlertAllowed, footballFeed, currentChampionsMatch };
