import React from 'react';
import StudioTeamBadge from './StudioTeamBadge';
import { studioCountdown } from './studioNavigation';

const buttonStyle = theme => ({ background: theme.panelHi, color: theme.text, border: `1px solid ${theme.line}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 800 });
const score = fixture => fixture.homeGoals != null && fixture.awayGoals != null ? `${fixture.homeGoals}–${fixture.awayGoals}` : 'v';
function matchStatus(fixture) {
  if (['TIMED', 'SCHEDULED'].includes(fixture.status)) return 'Pre-match';
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
    <h2 style={{ margin: 0, fontSize: isMobile ? 22 : 28, textAlign: 'center', color: theme.text, fontFamily: 'inherit' }}>Live Studio</h2>
    <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: theme.muted }}>Choose your competition.</p>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 14, padding: 6, width: '100%', maxWidth: 620, margin: '0 auto', boxSizing: 'border-box' }}>
      {studio.groups.map(group => {
        const live = group.liveFixtures.length > 0;
        return <div key={group.id} style={{ display: 'grid', gap: 12, textAlign: 'center' }}>
          <button type="button" onClick={() => studio.openCompetition(group.id)} className={live ? 'live-studio-live-button' : undefined} aria-label={group.label}
            style={{ ...buttonStyle(theme), padding: '12px 20px', minHeight: 54, borderRadius: 999, fontSize: isMobile ? 16 : 18, border: `1px solid ${live ? 'rgba(34,197,94,0.75)' : theme.line}`, background: live ? 'linear-gradient(135deg, rgba(34,197,94,0.98), rgba(16,185,129,0.88))' : theme.panelHi, color: live ? '#052e16' : theme.text }}>
            <span style={{ display: 'block' }}>{group.label}</span>
            {live && <span style={{ display: 'block', fontSize: 12, marginTop: 6 }}>{group.liveFixtures.length} {group.liveFixtures.length === 1 ? 'game in coverage' : 'games in coverage'}</span>}
          </button>
          {!live && (group.nextFixture ? <div style={{ display: 'grid', gap: 6 }}>
            <NextKickoff group={group} nowMs={nowMs} theme={theme} />
            {group.id === 'champions' && studio.error && <span style={{ color: theme.muted, fontSize: 11 }}>Showing the last confirmed kick-off. <button type="button" style={buttonStyle(theme)} onClick={studio.refresh}>Retry</button></span>}
          </div> : group.id === 'champions' && studio.loading ? <span role="status" style={{ color: theme.muted }}>Checking fixtures…</span> : group.id === 'champions' && studio.error ? <span role="status" style={{ color: '#fbbf24', fontSize: 12 }}>Fixtures are taking longer to load. <button type="button" style={buttonStyle(theme)} onClick={studio.refresh}>Retry</button></span> : <NextKickoff group={group} nowMs={nowMs} theme={theme} />)}
          {live && group.nextFixture && group.liveFixtures.some(fixture => Date.parse(fixture.kickoff) === Date.parse(group.nextFixture.kickoff)) && group.liveFixtures.every(fixture => ['TIMED', 'SCHEDULED'].includes(fixture.status)) && <NextKickoff group={group} nowMs={nowMs} theme={theme} />}
        </div>;
      })}
    </div>
  </div>;
}
export default function LiveStudioCoverage({ studio, theme, nowMs }) {
  const button = buttonStyle(theme), group = studio.group;
  const selectedCount = group.liveFixtures.filter(studio.isSelected).length;
  return <div style={{ display: 'grid', gap: 14 }}>
    {!studio.lockedCompetition && <div><button type="button" style={button} onClick={studio.showCompetitions}>← Competitions</button></div>}
    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, fontFamily: 'inherit', letterSpacing: 0, color: theme.text }}>{studio.lockedCompetition ? 'Live games' : `${group.label} · Live coverage`}</h2>
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
          const busy = studio.saving || studio.isAlertSaving(fixture.id);
          const pref = studio.alertPref(fixture), label = `${fixture.homeTeam} v ${fixture.awayTeam}`;
          const control = { width: 18, height: 18, margin: 0, transform: 'none', flexShrink: 0, position: 'static', accentColor: theme.accent };
          const followId = `studio-follow-${fixture.id}`;
          return <div key={fixture.id} role="group" aria-label={label} style={{ background: theme.panelHi, border: `1px solid ${studio.isSelected(fixture) ? theme.accent : theme.line}`, borderRadius: 12, padding: '14px 16px', display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr) auto', gap: 12, alignItems: 'center' }}>
              <input id={followId} type="checkbox" style={control} aria-label={`Follow ${label}`} checked={studio.isSelected(fixture)} onChange={event => studio.select([fixture.id], event.target.checked)} />
              <label htmlFor={followId} style={{ display: 'grid', gap: 9, cursor: 'pointer', minWidth: 0 }}>
                {[['home', fixture.homeTeam], ['away', fixture.awayTeam]].map(([side, team]) => <span key={side} style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 800 }}>
                  <StudioTeamBadge src={fixture[`${side}Badge`]} team={team} decorative fallback={<span aria-hidden="true">⚽</span>} />
                  <span style={{ overflowWrap: 'anywhere', lineHeight: 1.35 }}>{team}</span>
                </span>)}
              </label>
              <div style={{ textAlign: 'center', minWidth: 42, maxWidth: 90 }}><strong style={{ fontSize: 20, whiteSpace: 'nowrap' }}>{score(fixture)}</strong><div style={{ color: '#22c55e', fontSize: 12, marginTop: 4 }}>{matchStatus(fixture)}</div></div>
            </div>
            <div style={{ borderTop: `1px solid ${theme.line}`, paddingTop: 12, display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: theme.muted }}>Push notifications{studio.isAlertSaving(fixture.id) && <span role="status" style={{ marginLeft: 8, fontWeight: 500 }}>Saving…</span>}</span>
                <button type="button" style={{ ...button, borderRadius: 999, padding: '6px 12px', color: pref.enabled ? theme.accent2 : theme.muted }} aria-label={`Push alerts for ${label}`} aria-pressed={Boolean(pref.enabled)} disabled={busy} onClick={() => studio.saveAlert(fixture, { enabled: !pref.enabled })}>{pref.enabled ? '🔔 On' : '🔕 Off'}</button>
              </div>
              <div role="group" aria-label={`Alert level for ${label}`} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px' }}>
                {[['goals', 'Goals and final score'], ['all', 'All match alerts']].map(([level, title]) => <label key={level} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: busy ? 'default' : 'pointer', fontSize: 12, lineHeight: 1.4, minHeight: 24 }}>
                  <input type="checkbox" style={control} checked={pref.level === level} disabled={busy} onChange={() => { if (pref.level !== level) studio.saveAlert(fixture, { level }); }} />
                  <span>{title}</span>
                </label>)}
              </div>
            </div>
          </div>;
        })}
      </div>
      <button type="button" disabled={!selectedCount} onClick={studio.openCoverage} style={{ ...button, background: selectedCount ? theme.accent : theme.panelHi, color: selectedCount ? '#08111f' : theme.muted, padding: 12 }}>Follow selected games{selectedCount ? ` (${selectedCount})` : ''}</button>
    </>}
    {studio.alertError && <div role="alert" style={{ color: '#fbbf24', fontSize: 12 }}>{studio.alertError}</div>}
    {studio.alertsUnavailable && <button type="button" onClick={studio.retryAlerts} style={button}>Retry notification settings</button>}
  </div>;
}
export function LiveStudioScoreStrip({ studio, theme, showAll = true }) {
  const button = buttonStyle(theme);
  return <div role="group" aria-label="Selected match scores" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
    {showAll && <button type="button" style={button} aria-pressed={!studio.focused} onClick={() => studio.setFocused('')}>All selected games</button>}
    {studio.selected.map(fixture => <button key={fixture.id} type="button" aria-pressed={studio.focused === String(fixture.id)} onClick={() => studio.setFocused(studio.focused === String(fixture.id) ? '' : String(fixture.id))} style={{ ...button, flexShrink: 0, borderColor: studio.focused === String(fixture.id) ? theme.accent : theme.line, textAlign: 'left' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}><StudioTeamBadge src={fixture.homeBadge} team={fixture.homeTeam} decorative />{fixture.homeTeam} {score(fixture)} {fixture.awayTeam}<StudioTeamBadge src={fixture.awayBadge} team={fixture.awayTeam} decorative /></span>
    </button>)}
  </div>;
}
