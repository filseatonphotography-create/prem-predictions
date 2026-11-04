import React from 'react';
import StudioTeamBadge from './StudioTeamBadge';

function matchStatus(fixture) {
  if (fixture.status === 'FINISHED' || fixture.status === 'AWARDED') return 'FT';
  if (fixture.status === 'PAUSED') return 'HT';
  if (fixture.status === 'EXTRA_TIME') return 'Extra time';
  if (fixture.status === 'PENALTY_SHOOTOUT') return 'Penalties';
  if (fixture.status === 'IN_PLAY') return fixture.minute != null ? `${fixture.minute}'` : 'Live';
  if (['POSTPONED', 'CANCELLED', 'SUSPENDED'].includes(fixture.status)) return fixture.status.toLowerCase();
  const time = new Date(fixture.kickoff);
  return Number.isFinite(time.getTime()) ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled';
}
function score(fixture) {
  return fixture.homeGoals != null && fixture.awayGoals != null ? `${fixture.homeGoals}–${fixture.awayGoals}` : 'v';
}

export default function LiveStudioCoverage({ studio, theme }) {
  const button = { background: theme.panelHi, color: theme.text, border: `1px solid ${theme.line}`, borderRadius: 8, padding: '7px 10px', cursor: 'pointer' };
  return <div style={{ display: 'grid', gap: 10 }}>
    <details style={{ border: `1px solid ${theme.line}`, borderRadius: 10, padding: 10 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 900 }}>Follow matches · {studio.selected.length} selected</summary>
      <p style={{ color: theme.muted, fontSize: 12 }}>Tick games for your feed. Use the bell for push alerts, even when you leave Live Studio.</p>
      {studio.groups.map(group => <details key={group.id} open style={{ marginTop: 10 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 850 }}>{group.label}{group.id === 'primary' ? ' · includes prediction updates' : ' · football updates'}</summary>
        <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
          <button type="button" style={button} onClick={() => studio.select(group.fixtures.map(f => f.id), true)} disabled={!group.fixtures.length} aria-label={`Select all ${group.label} matches`}>Select all</button>
          <button type="button" style={button} onClick={() => studio.select(group.fixtures.map(f => f.id), false)} disabled={!group.fixtures.length} aria-label={`Clear ${group.label} matches`}>Clear</button>
        </div>
        {group.id === 'champions' && studio.loading && <div role="status">Loading Champions League matches…</div>}
        {group.id === 'champions' && studio.error && <div role="status" style={{ color: '#fbbf24', fontSize: 12 }}>{studio.error}{group.fixtures.length > 0 ? ' Showing the last received scores.' : ''} <button type="button" style={button} onClick={studio.refresh}>Retry</button></div>}
        {group.id === 'champions' && !studio.loading && !studio.error && !group.fixtures.length && <p style={{ color: theme.muted, fontSize: 12 }}>No Champions League games in the next or previous 24 hours.</p>}
        {group.fixtures.map(fixture => {
          const pref = studio.alertPref(fixture);
          const label = `${fixture.homeTeam} v ${fixture.awayTeam}`;
          return <div key={fixture.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '9px 0', borderTop: `1px solid ${theme.line}` }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, flex: '1 1 210px', fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={studio.isSelected(fixture)} onChange={event => studio.select([fixture.id], event.target.checked)} />
              <span><StudioTeamBadge src={fixture.homeBadge} team={fixture.homeTeam} decorative /> {fixture.homeTeam} v <StudioTeamBadge src={fixture.awayBadge} team={fixture.awayTeam} decorative /> {fixture.awayTeam} <span style={{ color: theme.muted }}>{score(fixture)} · {matchStatus(fixture)}</span></span>
            </label>
            <button type="button" style={{ ...button, color: pref.enabled ? theme.accent2 : theme.muted }} aria-label={`Push alerts for ${label}`} aria-pressed={Boolean(pref.enabled)} disabled={studio.saving} onClick={() => studio.saveAlert(fixture, { enabled: !pref.enabled })}>{pref.enabled ? '🔔 On' : '🔕 Off'}</button>
            <select aria-label={`Alert level for ${label}`} value={pref.level} disabled={studio.saving} style={{ ...button, maxWidth: '100%' }} onChange={event => studio.saveAlert(fixture, { level: event.target.value })}>
              <option value="goals">Goals and final score</option>
              <option value="all">All match alerts</option>
            </select>
          </div>;
        })}
      </details>)}
      <p style={{ color: theme.muted, fontSize: 11 }}>All match alerts includes confirmed line-ups, kick-off, goals, disallowed goals, half-time, second-half and full-time. Your no-spoilers preference applies.</p>
      {studio.alertError && <div role="alert" style={{ color: '#fbbf24', fontSize: 12 }}>{studio.alertError}</div>}
    </details>
    <div role="group" aria-label="Selected match scores" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
      <button type="button" style={button} aria-pressed={!studio.focused} onClick={() => studio.setFocused('')}>All matches</button>
      {studio.selected.map(fixture => <button key={fixture.id} type="button" aria-pressed={studio.focused === String(fixture.id)} onClick={() => studio.setFocused(String(fixture.id))} style={{ ...button, flexShrink: 0, borderColor: studio.focused === String(fixture.id) ? theme.accent : theme.line, textAlign: 'left' }}>
        <span style={{ display: 'block', fontSize: 10, color: theme.muted }}>{fixture.competitionLabel} · {matchStatus(fixture)}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 850 }}><StudioTeamBadge src={fixture.homeBadge} team={fixture.homeTeam} decorative />{fixture.homeTeam} {score(fixture)} {fixture.awayTeam}<StudioTeamBadge src={fixture.awayBadge} team={fixture.awayTeam} decorative /></span>
      </button>)}
    </div>
    {!studio.selected.length && <p role="status" style={{ color: theme.muted }}>Select games in “Follow matches” to start your coverage.</p>}
  </div>;
}
