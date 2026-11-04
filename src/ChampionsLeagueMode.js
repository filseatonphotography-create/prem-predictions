import React, { useEffect, useMemo, useState } from 'react';
import ChampionsLeagueTable from './ChampionsLeagueTable';
import LiveStudioCoverage, { LiveStudioScoreStrip } from './LiveStudioCoverage';
import LiveStudioLineups from './LiveStudioLineups';
import StudioTeamBadge from './StudioTeamBadge';
import TeamFormStrip from './TeamFormStrip';
import useStudioCoverage from './useStudioCoverage';
import { studioRequest } from './studioRequest';
import { currentStudioPush, enableStudioPush, studioPushSupported } from './studioPushClient';
import { PREMIER, WORLD_CUP } from './competitionModes';

export const championsTheme = { bg: '#080d2b', panel: '#111840', panelHi: '#192354', text: '#f0f2ff', muted: '#aab4dd', accent: '#b4a0ff', accent2: '#7dd3fc', line: 'rgba(180,160,255,0.2)' };
const theme = championsTheme;
const cleanName = name => String(name || '').replace(/\s+FC$/, '');
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const pushDefaults = { deadline1h: true, deadline24h: true, liveUpdates: true, noSpoilerFixtureUpdates: false };
const empty = [];
const emptyObject = {};
export default function ChampionsLeagueMode({ auth, base, onModeChange, onLogout }) {
  const [mobile, setMobile] = useState(window.innerWidth < 700);
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState(() => new URLSearchParams(window.location.search).get('view') || localStorage.getItem('activeView') || 'liveStudio');
  const [leaguesOpen, setLeaguesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [fixturePrefs, setFixturePrefs] = useState(() => read('fixture_push_prefs_v1', {}));
  const [pushPrefs, setPushPrefs] = useState(() => ({ ...pushDefaults, ...read('push_prefs_v1', {}) }));
  const [settingsError, setSettingsError] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const resize = () => setMobile(window.innerWidth < 700);
    const restore = () => setView(new URLSearchParams(window.location.search).get('view') || 'liveStudio');
    window.addEventListener('resize', resize); window.addEventListener('popstate', restore);
    currentStudioPush().then(subscription => setPushEnabled(Boolean(subscription))).catch(() => {});
    return () => { clearInterval(timer); window.removeEventListener('resize', resize); window.removeEventListener('popstate', restore); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    studioRequest(`${base}/api/push/prefs`, { headers: { Authorization: `Bearer ${auth.token}` } }).then(data => {
      if (!cancelled) { const prefs = { ...pushDefaults, ...data.prefs }; setPushPrefs(prefs); localStorage.setItem('push_prefs_v1', JSON.stringify(prefs)); }
    }).catch(error => { if (!cancelled && error.status === 401) onLogout(); });
    return () => { cancelled = true; };
  }, [auth.token, base, onLogout]);
  const studio = useStudioCoverage({ active: view === 'liveStudio', poll: true, competition: 'champions', nowMs: now,
    base, token: auth.token, userId: auth.userId, fixtures: empty, states: emptyObject, results: emptyObject,
    primaryLabel: 'Premier League', fixturePrefs, globalAlerts: pushPrefs.liveUpdates !== false,
    enablePush: async () => { const enabled = await enableStudioPush({ base, token: auth.token, prefs: pushPrefs, fixturePrefs }); setPushEnabled(enabled); return enabled; },
    pushEnabled, pushSupported: studioPushSupported(), onAuthExpired: onLogout,
    focusFixtureId: new URLSearchParams(window.location.search).get('fixtureId') || '',
    onFixturePrefs: (values, id) => setFixturePrefs(previous => { const next = { ...previous, [id]: values[id] === true }; localStorage.setItem('fixture_push_prefs_v1', JSON.stringify(next)); return next; }),
  });
  const open = next => {
    setView(next); setLeaguesOpen(false); setMenuOpen(false); localStorage.setItem('activeView', next);
    const url = new URL(window.location.href); url.searchParams.set('mode', 'champions'); url.searchParams.set('view', next);
    if (next !== 'liveStudio') ['studio', 'competition', 'games', 'fixtureId', 'update'].forEach(key => url.searchParams.delete(key));
    window.history.pushState({}, '', url.pathname + url.search + url.hash);
  };
  const entries = studio.filterFeed([...studio.foreignFeed, ...studio.preMatchFeed]).sort((a, b) => (b.momentMs || 0) - (a.momentMs || 0));
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fixtureId = params.get('fixtureId'), update = params.get('update');
    if (!fixtureId || view !== 'liveStudio' || studio.route.page !== 'coverage') return;
    const articles = [...document.querySelectorAll('article[data-live-studio-fixture-id]')];
    const target = articles.find(article => update && article.dataset.studioUpdateKey === update)
      || articles.find(article => article.dataset.liveStudioFixtureId === fixtureId);
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [view, studio.route.page, entries.length]);
  const formFixtures = useMemo(() => new Set(studio.preMatchFeed.filter(entry => entry.formCard).map(entry => entry.fixtureId)), [studio.preMatchFeed]);
  const card = { background: theme.panel, borderRadius: 16, padding: mobile ? 10 : 14, border: `1px solid ${theme.line}`, boxShadow: '0 8px 20px rgba(0,0,0,0.25)' };
  const pill = { borderRadius: 999, padding: '8px 14px', border: `1px solid ${theme.accent}`, background: 'rgba(180,160,255,0.12)', color: theme.accent, cursor: 'pointer', fontWeight: 800, fontSize: 13 };
  const dropdown = { position: 'absolute', top: '100%', left: 0, marginTop: 6, background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 10, padding: 6, minWidth: 210, zIndex: 20, boxShadow: '0 6px 18px rgba(0,0,0,0.35)' };
  const menuButton = { ...pill, display: 'block', textAlign: 'left', width: '100%', border: 'none', borderRadius: 6, margin: '3px 0' };
  const saveSpoilers = async checked => {
    const previous = pushPrefs, next = { ...pushPrefs, noSpoilerFixtureUpdates: checked }; setPushPrefs(next); setSettingsError('');
    try { await studioRequest(`${base}/api/push/prefs`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify(next) }); localStorage.setItem('push_prefs_v1', JSON.stringify(next)); }
    catch (error) { setPushPrefs(previous); setSettingsError(error.message); }
  };
  return <main style={{ minHeight: '100vh', background: `radial-gradient(ellipse at top, #20205b 0%, ${theme.bg} 65%)`, color: theme.text, padding: '16px 8px', display: 'grid', gap: 12, alignContent: 'start', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
    <header style={{ ...card, position: 'sticky', top: 8, zIndex: 10, textAlign: 'center' }}>
      <h1 style={{ margin: '0.8rem 0 0.5rem', fontSize: mobile ? '1.5rem' : '3rem' }}>Predicti<span role="img" aria-label="football">⚽</span>n Addicti<span role="img" aria-label="football">⚽</span>n</h1>
      <div style={{ color: theme.accent, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Champions League Mode</div>
      <nav aria-label="Champions League navigation" style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className={studio.anyLive ? 'live-studio-live-button' : undefined} style={{ ...pill, ...(studio.anyLive ? { background: 'linear-gradient(135deg, #22c55e, #10b981)', color: '#052e16', borderColor: '#22c55e' } : {}) }} onClick={() => { studio.showMatches(); open('liveStudio'); }}>Live Studio</button>
        <div style={{ position: 'relative' }}><button type="button" style={pill} aria-expanded={leaguesOpen} onClick={() => { setLeaguesOpen(!leaguesOpen); setMenuOpen(false); }}>Leagues ▾</button>
          {leaguesOpen && <div style={dropdown}>
            <button type="button" style={menuButton} onClick={() => open('championsLeagueTable')}>Champions League Table</button>
            <button type="button" style={menuButton} onClick={() => onModeChange(PREMIER)}>Premier League Mode</button>
            <button type="button" style={menuButton} onClick={() => onModeChange(WORLD_CUP)}>World Cup Mode</button>
          </div>}
        </div>
        <div style={{ position: 'relative' }}><button type="button" style={pill} aria-expanded={menuOpen} onClick={() => { setMenuOpen(!menuOpen); setLeaguesOpen(false); }}>Menu ▾</button>
          {menuOpen && <div style={{ ...dropdown, left: 'auto', right: 0 }}>
            <button type="button" style={menuButton} onClick={() => open('settings')}>Settings</button>
            <button type="button" style={menuButton} onClick={onLogout}>Log out</button>
          </div>}
        </div>
      </nav>
    </header>
    {view === 'championsLeagueTable' ? <section style={card}><ChampionsLeagueTable base={base} theme={theme} isMobile={mobile} /></section>
      : view === 'settings' ? <section style={{ ...card, display: 'grid', gap: 12 }}><h2 style={{ margin: 0 }}>Settings</h2><div>Signed in as {auth.username}</div>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={pushPrefs.noSpoilerFixtureUpdates} onChange={event => saveSpoilers(event.target.checked)} style={{ margin: 0, transform: 'none' }} />No spoilers for goal push notifications</label>
        {settingsError && <p role="alert">{settingsError}</p>}</section>
      : <section style={{ ...card, display: 'grid', gap: 12 }}>
        {studio.route.page !== 'coverage' ? <LiveStudioCoverage studio={studio} theme={theme} nowMs={now} /> : <>
          <button type="button" onClick={studio.showMatches} style={{ ...pill, justifySelf: 'start' }}>← Live games</button>
          <h2 style={{ margin: 0 }}>Champions League · Live coverage</h2>
          <LiveStudioScoreStrip studio={studio} theme={theme} />
          {(studio.error || studio.detailsError) && <div role="status" style={{ color: theme.muted, fontSize: 12 }}>{studio.error || studio.detailsError}</div>}
          {entries.map(entry => {
            const fixture = entry.fixture, showForm = entry.formCard || entry.footballOnly && entry.updateKey?.includes(':kick-off:') && !formFixtures.has(entry.fixtureId);
            return <article key={entry.id} data-live-studio-fixture-id={entry.fixtureId} data-studio-update-key={entry.updateKey} style={{ border: `1px solid ${entry.prematch ? theme.accent : theme.line}`, borderRadius: 8, background: 'rgba(255,255,255,0.04)', padding: mobile ? 10 : 12, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {fixture && <><StudioTeamBadge src={fixture.homeBadge} team={fixture.homeTeam} /><span style={{ color: theme.muted, fontSize: 10 }}>v</span><StudioTeamBadge src={fixture.awayBadge} team={fixture.awayTeam} /></>}
                <strong style={{ color: theme.accent, fontSize: 12 }}>{entry.minute}</strong>
              </div>
              <strong style={{ fontSize: 15 }}>{entry.icon} <span>{entry.title}</span></strong>
              {entry.lines.map((line, index) => <div key={index} style={{ color: index ? theme.muted : theme.text, fontSize: 13, lineHeight: 1.4 }}>{line}</div>)}
              {entry.lineups && fixture && <LiveStudioLineups theme={theme} isMobile={mobile} teams={['home', 'away'].map(side => ({ ...entry.lineups[side], name: cleanName(fixture[`${side}Team`]), badge: fixture[`${side}Badge`] }))} />}
              {showForm && fixture && <section aria-label={entry.formCard ? 'Team form before kick-off' : 'Team form at kick-off'} style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 13 }}>Champions League form this season · before kick-off · latest first</div>
                {['home', 'away'].map(side => <div key={side} role="group" aria-label={`${cleanName(fixture[`${side}Team`])} form`} style={{ display: 'grid', gap: 5 }}>
                  <strong style={{ fontSize: 13 }}>{cleanName(fixture[`${side}Team`])}</strong>
                  <TeamFormStrip form={entry.championsForm?.[side] || []} emptyLabel={entry.championsForm ? 'No earlier Champions League results this season.' : 'Champions League form is unavailable.'} theme={theme} isMobile={mobile} />
                </div>)}
              </section>}
            </article>;
          })}
        </>}
      </section>}
  </main>;
}
