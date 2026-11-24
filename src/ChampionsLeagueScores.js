import React, { useEffect, useMemo, useState } from 'react';
import StudioTeamBadge from './StudioTeamBadge';
import { fetchStudioOverview } from './studioOverviewClient';
import { LIVE_STUDIO_STATUSES } from './studioNavigation';

const { numeric } = require('./liveMatchEvents');
const dateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const kickOffTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const liveStatuses = new Set(LIVE_STUDIO_STATUSES);
const finalStatuses = new Set(['FINISHED', 'AWARDED']);

function scorePair(score) {
  const home = numeric(score?.home);
  const away = numeric(score?.away);
  return home == null || away == null ? null : [home, away];
}

function getMatchDisplay({ status, minute, utcDate, score }) {
  const live = liveStatuses.has(status);
  const final = finalStatuses.has(status);
  const penalties = score?.duration === 'PENALTY_SHOOTOUT' || status === 'PENALTY_SHOOTOUT'
    ? scorePair(score?.penalties) : null;
  let goals = live || final || status === 'SUSPENDED' ? scorePair(score?.fullTime) : null;
  if (goals && penalties) {
    const regular = scorePair(score.regularTime);
    const extra = scorePair(score.extraTime);
    if (regular && extra) goals = regular.map((value, index) => value + extra[index]);
    else if (goals.every((value, index) => value >= penalties[index])) goals = goals.map((value, index) => value - penalties[index]);
  }
  const time = Date.parse(utcDate);
  const labels = {
    FINISHED: score?.duration === 'EXTRA_TIME' ? 'AET' : 'FT',
    PAUSED: 'HT', AWARDED: 'Awarded', EXTRA_TIME: 'Extra time', PENALTY_SHOOTOUT: 'Penalties',
    POSTPONED: 'Postponed', SUSPENDED: 'Suspended', CANCELLED: 'Cancelled',
    SCHEDULED: 'Kick-off TBC',
    TIMED: Number.isFinite(time) ? kickOffTime.format(time) : 'Kick-off TBC',
  };
  return {
    live, goals: goals?.join('–'), penalties: penalties?.join('–'),
    label: labels[status] || (live && numeric(minute) != null && minute > 0 ? `${minute}′` : live ? 'Live' : 'Kick-off TBC'),
  };
}

function MatchRow({ match, theme }) {
  const { live, goals, penalties, label } = getMatchDisplay(match);
  const renderTeam = (team, away = false) => {
    const name = team?.name || 'TBD';
    return <span style={{ display: 'flex', flexDirection: away ? 'row' : 'row-reverse', justifyContent: 'flex-start', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <StudioTeamBadge src={team?.crest} team={name} decorative size={20} />
      <span style={{ overflowWrap: 'anywhere', textAlign: away ? 'left' : 'right' }}>{name}</span>
    </span>;
  };
  return (
    <li style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', gap: 8, padding: '9px 8px', borderRadius: 8, background: theme.panelHi, fontSize: 13, fontWeight: 750 }}>
      {renderTeam(match.homeTeam)}
      <div style={{ textAlign: 'center', minWidth: 50, fontVariantNumeric: 'tabular-nums' }}>
        <div style={{ color: live ? '#4ade80' : theme.muted, fontSize: 11 }}>{label}</div>
        {goals && <strong style={{ display: 'block', fontSize: 20 }}>{goals}</strong>}
        {penalties && <div style={{ fontSize: 11, color: theme.muted }}>Pens {penalties}</div>}
      </div>
      {renderTeam(match.awayTeam, true)}
    </li>
  );
}

export default function ChampionsLeagueScores({ base, theme, buttonStyle }) {
  const [matches, setMatches] = useState(null);
  const [tab, setTab] = useState('fixtures');
  const [error, setError] = useState('');
  const [request, setRequest] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer;
    const refresh = async () => {
      try {
        const data = await fetchStudioOverview(base, { scope: 'fixtures', signal: controller.signal });
        if (!controller.signal.aborted) {
          setMatches(data.matches);
          setError(data.stale ? 'Showing the last available score update.' : '');
        }
      } catch {
        if (!controller.signal.aborted) setError('Could not refresh Champions League scores.');
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 30000);
      }
    };
    refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [base, request]);

  const days = useMemo(() => {
    const live = [], dated = new Map();
    const completed = tab === 'results';
    const sorted = [...(matches || [])].sort((a, b) => completed
      ? (Date.parse(b.utcDate) || 0) - (Date.parse(a.utcDate) || 0)
      : (Date.parse(a.utcDate) || Infinity) - (Date.parse(b.utcDate) || Infinity));
    sorted.forEach(match => {
      if (finalStatuses.has(match.status) !== completed) return;
      if (liveStatuses.has(match.status)) { live.push(match); return; }
      const time = Date.parse(match.utcDate);
      const date = Number.isFinite(time) ? dateLabel.format(time) : 'Date to be confirmed';
      if (!dated.has(date)) dated.set(date, []);
      dated.get(date).push(match);
    });
    return [...(live.length ? [['Live now', live]] : []), ...dated];
  }, [matches, tab]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontFamily: 'inherit', fontSize: 18, color: theme.text }}>Champions League scores &amp; fixtures</h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        {[['fixtures', 'Fixtures'], ['results', 'Results']].map(([id, label]) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}
            style={{ ...buttonStyle, ...(tab === id ? { background: theme.accent, color: theme.bg } : {}) }}>{label}</button>
        ))}
      </div>
      {error && <div role="status" style={{ color: theme.muted, fontSize: 13 }}>
        {error} <button type="button" style={buttonStyle} onClick={() => { setError(''); setRequest(value => value + 1); }}>Retry</button>
      </div>}
      {!matches && !error && <p role="status">Loading Champions League matches…</p>}
      {matches && !days.length && <p>{tab === 'results' ? 'No results available yet.' : 'No upcoming fixtures listed.'}</p>}
      {days.map(([date, fixtures]) => (
        <div key={date}>
          <h3 style={{ margin: '0 0 6px', color: theme.muted, font: 'inherit', fontWeight: 800, textAlign: 'left' }}>{date}</h3>
          <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 5, listStyle: 'none' }}>
            {fixtures.map(match => <MatchRow key={match.id} match={match} theme={theme} />)}
          </ul>
        </div>
      ))}
    </div>
  );
}
