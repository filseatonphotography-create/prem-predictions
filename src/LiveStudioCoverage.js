import React from 'react';
import StudioTeamBadge from './StudioTeamBadge';
import { studioCountdown } from './studioNavigation';

const buttonStyle = theme => ({ background: theme.panelHi, color: theme.text, border: `1px solid ${theme.line}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 800 });
const score = fixture => fixture.homeGoals != null && fixture.awayGoals != null ? `${fixture.homeGoals}–${fixture.awayGoals}` : 'v';
function matchStatus(fixture) {
  if (fixture.status === 'PAUSED') return 'HT';
  if (fixture.status === 'EXTRA_TIME') return 'Extra time';
  if (fixture.status === 'PENALTY_SHOOTOUT') return 'Penalties';
  return fixture.minute != null ? `${fixture.minute}'` : 'Live';
}
function NextKickoff({ group, nowMs, theme }) {
  return <div style={{ color: theme.muted, fontSize: 13, lineHeight: 1.5 }}>
    {group.nextFixture ? <>Next kick-off in <strong style={{ color: theme.text, fontVariantNumeric: 'tabular-nums' }}>{studioCountdown(group.nextFixture.kickoff, nowMs)}</strong></> : 'No upcoming fixtures scheduled.'}
  </div>;
}
export function LiveStudioCompetitions({ studio, theme, nowMs, isMobile }) {
  return <div style={{ display: 'grid', gap: 18 }}>
    <h2 style={{ margin: 0, fontSize: isMobile ? 22 : 28, textAlign: 'center' }}>Live Studio</h2>
    <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: theme.muted }}>Choose your competition.</p>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 18, padding: 8 }}>
      {studio.groups.map(group => {
        const live = group.liveFixtures.length > 0;
        return <div key={group.id} style={{ display: 'grid', gap: 12, textAlign: 'center' }}>
          <button type="button" onClick={() => studio.openCompetition(group.id)} className={live ? 'live-studio-live-button' : undefined} aria-label={group.label}
            style={{ ...buttonStyle(theme), padding: '22px 16px', minHeight: 90, fontSize: isMobile ? 20 : 23, border: `1px solid ${live ? 'rgba(34,197,94,0.75)' : theme.line}`, background: live ? 'linear-gradient(135deg, rgba(34,197,94,0.98), rgba(16,185,129,0.88))' : theme.panelHi, color: live ? '#052e16' : theme.text }}>
            <span style={{ display: 'block' }}>{group.label}</span>
            {live && <span style={{ display: 'block', fontSize: 12, marginTop: 6 }}>{group.liveFixtures.length} {group.liveFixtures.length === 1 ? 'game live' : 'games live'}</span>}
          </button>
          {!live && (group.id === 'champions' && studio.loading ? <span role="status" style={{ color: theme.muted }}>Checking fixtures…</span> : group.id === 'champions' && studio.error ? <span role="status" style={{ color: '#fbbf24', fontSize: 12 }}>Live updates unavailable. <button type="button" style={buttonStyle(theme)} onClick={studio.refresh}>Retry</button></span> : <NextKickoff group={group} nowMs={nowMs} theme={theme} />)}
        </div>;
      })}
    </div>
  </div>;
}
export default function LiveStudioCoverage({ studio, theme, nowMs }) {
  const button = buttonStyle(theme), group = studio.group;
  const selectedCount = group.liveFixtures.filter(studio.isSelected).length;
  return <div style={{ display: 'grid', gap: 14 }}>
    <div><button type="button" style={button} onClick={studio.showCompetitions}>← Competitions</button></div>
    <h2 style={{ margin: 0, fontSize: 22 }}>{group.label} · Live games</h2>
    {group.id === 'champions' && studio.loading && <p role="status" style={{ color: theme.muted }}>Loading live games…</p>}
    {group.id === 'champions' && studio.error && <p role="status" style={{ color: '#fbbf24' }}>{studio.error} <button type="button" style={button} onClick={studio.refresh}>Retry</button></p>}
    {!group.liveFixtures.length && !(group.id === 'champions' && (studio.loading || studio.error)) && <div role="status" style={{ textAlign: 'center', padding: '24px 8px', display: 'grid', gap: 12 }}>
      <strong>No games live right now.</strong><NextKickoff group={group} nowMs={nowMs} theme={theme} />
    </div>}
    {group.liveFixtures.length > 0 && <>
      <p style={{ margin: 0, color: theme.muted, fontSize: 13 }}>Choose the games you want to follow.</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" style={button} onClick={() => studio.select(group.liveFixtures.map(fixture => fixture.id), true)}>Select all</button>
        <button type="button" style={button} onClick={() => studio.select(group.liveFixtures.map(fixture => fixture.id), false)}>Clear</button>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {group.liveFixtures.map(fixture => {
          const pref = studio.alertPref(fixture), label = `${fixture.homeTeam} v ${fixture.awayTeam}`;
          return <div key={fixture.id} style={{ background: theme.panelHi, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '12px 14px', display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, cursor: 'pointer', minWidth: 0 }}>
                <input type="checkbox" aria-label={`Follow ${label}`} checked={studio.isSelected(fixture)} onChange={event => studio.select([fixture.id], event.target.checked)} />
                <span style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, fontWeight: 800 }}><StudioTeamBadge src={fixture.homeBadge} team={fixture.homeTeam} decorative />{fixture.homeTeam}</span>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, fontWeight: 800 }}><StudioTeamBadge src={fixture.awayBadge} team={fixture.awayTeam} decorative />{fixture.awayTeam}</span>
                </span>
              </label>
              <div style={{ textAlign: 'center', flexShrink: 0 }}><strong style={{ fontSize: 20 }}>{score(fixture)}</strong><div style={{ color: '#22c55e', fontSize: 12, marginTop: 3 }}>{matchStatus(fixture)}</div></div>
              <button type="button" style={button} aria-label={`Push alerts for ${label}`} aria-pressed={Boolean(pref.enabled)} disabled={studio.saving} onClick={() => studio.saveAlert(fixture, { enabled: !pref.enabled })}>{pref.enabled ? '🔔' : '🔕'}</button>
            </div>
            <details style={{ color: theme.muted, fontSize: 12 }}><summary style={{ cursor: 'pointer' }}>Alert settings</summary>
              <select aria-label={`Alert level for ${label}`} value={pref.level} disabled={studio.saving} style={{ ...button, marginTop: 8, maxWidth: '100%' }} onChange={event => studio.saveAlert(fixture, { level: event.target.value })}>
                <option value="goals">Goals and final score</option><option value="all">All match alerts</option>
              </select>
            </details>
          </div>;
        })}
      </div>
      <button type="button" disabled={!selectedCount} onClick={studio.openCoverage} style={{ ...button, background: selectedCount ? theme.accent : theme.panelHi, color: selectedCount ? '#08111f' : theme.muted, padding: 12 }}>Follow selected games{selectedCount ? ` (${selectedCount})` : ''}</button>
    </>}
    {studio.alertError && <div role="alert" style={{ color: '#fbbf24', fontSize: 12 }}>{studio.alertError}</div>}
  </div>;
}
export function LiveStudioScoreStrip({ studio, theme }) {
  const button = buttonStyle(theme);
  return <div role="group" aria-label="Selected match scores" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
    <button type="button" style={button} aria-pressed={!studio.focused} onClick={() => studio.setFocused('')}>All selected games</button>
    {studio.selected.map(fixture => <button key={fixture.id} type="button" aria-pressed={studio.focused === String(fixture.id)} onClick={() => studio.setFocused(String(fixture.id))} style={{ ...button, flexShrink: 0, borderColor: studio.focused === String(fixture.id) ? theme.accent : theme.line, textAlign: 'left' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}><StudioTeamBadge src={fixture.homeBadge} team={fixture.homeTeam} decorative />{fixture.homeTeam} {score(fixture)} {fixture.awayTeam}<StudioTeamBadge src={fixture.awayBadge} team={fixture.awayTeam} decorative /></span>
    </button>)}
  </div>;
}
