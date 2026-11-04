import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { studioRequest } from './studioRequest';
import { fetchChampionsStandings } from './championsStandingsClient';
import { fetchStudioOverview } from './studioOverviewClient';
import { isStudioMatchLive, nextStudioKickoff, readStudioRoute } from './studioNavigation';
const { championsFixture, footballFeed, currentChampionsMatch } = require('./studioCompetitions');
const { hasStudioLineups, lineupTimeKey, getStudioLineupTime, buildStudioPrematchCards } = require('./studioPrematch');

function read(key) {
  try { const value = JSON.parse(localStorage.getItem(key) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; }
}
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

export default function useStudioCoverage({ active, base, token, userId, fixtures, states, results, primaryLabel, resolveBadge, fixturePrefs, globalAlerts, enablePush, pushEnabled, pushSupported = true, onFixturePrefs, focusFixtureId, poll = active, nowMs = Date.now(), onOpenPrimary, competition = null, onAuthExpired, prematchEnabled = true }) {
  const storageKey = `live-studio-selection:v1:${userId || 'guest'}`;
  const [savedSelection, setSelection] = useState(() => ({ key: storageKey, values: read(storageKey) }));
  const selection = savedSelection.key === storageKey ? savedSelection.values : read(storageKey);
  const [prefsState, setPrefs] = useState({ token, values: {} });
  const prefs = prefsState.token === token ? prefsState.values : {};
  const overviewKey = `studio-overview:v1:${base}`;
  const cachedOverview = useMemo(() => {
    const saved = read(overviewKey);
    return saved.receivedAt && Date.now() - (saved.updatedAt || saved.receivedAt) <= 120000 && Array.isArray(saved.matches) ? saved : null;
  }, [overviewKey]);
  const cachedSchedule = useMemo(() => {
    const saved = read(overviewKey);
    if (!saved.receivedAt || Date.now() - saved.receivedAt > 24 * 3600000) return null;
    return nextStudioKickoff([...(saved.nextFixture ? [saved.nextFixture] : []), ...(Array.isArray(saved.matches) ? saved.matches : []).map(match => ({ ...championsFixture(match), status: match.status }))], Date.now());
  }, [overviewKey]);
  const [lineupTimes, setLineupTimes] = useState(() => read('studio-lineup-times:v1'));
  const [matches, setMatches] = useState(() => cachedOverview?.matches || []);
  const [upcomingChampion, setUpcomingChampion] = useState(() => cachedOverview?.nextFixture || cachedSchedule);
  const [route, setRoute] = useState(() => {
    const value = readStudioRoute();
    return competition ? { ...value, competition, page: value.page === 'competitions' ? 'matches' : value.page } : value;
  });
  const navigate = useCallback(next => {
    setRoute(next); setFocused('');
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'liveStudio');
    url.searchParams.delete('fixtureId'); url.searchParams.delete('update');
    if (next.page === 'competitions') {
      ['studio', 'competition', 'games'].forEach(key => url.searchParams.delete(key));
    } else {
      url.searchParams.set('studio', next.page);
      url.searchParams.set('competition', next.competition === 'champions' ? 'champions' : 'premier');
      if (next.gameIds?.length) url.searchParams.set('games', next.gameIds.join(','));
      else url.searchParams.delete('games');
    }
    window.history.pushState({}, '', url.pathname + url.search + url.hash);
  }, []);
  useEffect(() => {
    const restore = () => { const value = readStudioRoute(); setRoute(competition ? { ...value, competition, page: value.page === 'competitions' ? 'matches' : value.page } : value); setFocused(''); };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [competition]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!cachedOverview && !cachedSchedule);
  const [detailsError, setDetailsError] = useState('');
  const [savingIds, setSavingIds] = useState([]);
  const alertSaves = useRef(new Set());
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsReady, setPrefsReady] = useState(false);
  const [prefsRetry, setPrefsRetry] = useState(0);
  const [alertError, setAlertError] = useState('');
  const [focused, setFocused] = useState('');
  const generation = useRef(0);
  const refreshRef = useRef(null);
  const overviewVersion = useRef(0);
  const isSelected = useCallback(fixture => selection[String(fixture.id)] ?? !String(fixture.id).startsWith('cl:'), [selection]);
  const select = useCallback((ids, enabled) => {
    setSelection(previous => {
      const values = { ...(previous.key === storageKey ? previous.values : read(storageKey)) };
      ids.forEach(id => { values[String(id)] = enabled; });
      write(storageKey, values);
      return { key: storageKey, values };
    });
    if (!enabled) setFocused(previous => ids.map(String).includes(previous) ? '' : previous);
  }, [storageKey]);
  useEffect(() => {
    if (focusFixtureId) { select([focusFixtureId], true); setFocused(String(focusFixtureId)); setRoute({ page: 'coverage', competition: String(focusFixtureId).startsWith('cl:') ? 'champions' : 'primary', gameIds: [String(focusFixtureId)] }); }
  }, [focusFixtureId, select]);
  useEffect(() => {
    const controller = new AbortController();
    const current = ++generation.current;
    alertSaves.current.clear(); setSavingIds([]); setPrefsLoading(true); setPrefsReady(false); setPrefs({ token, values: {} });
    if (!token) { setPrefsLoading(false); return () => controller.abort(); }
    (async () => {
      try {
        const data = await studioRequest(`${base}/api/live-studio/prefs`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (!controller.signal.aborted) { setPrefs({ token, values: data.prefs || {} }); setPrefsReady(true); setAlertError(''); }
      } catch (err) { if (!controller.signal.aborted) { if (err.status === 401) onAuthExpired?.(); setAlertError(err.message || 'Could not load match alerts.'); } }
      finally { if (!controller.signal.aborted && current === generation.current) setPrefsLoading(false); }
    })();
    return () => controller.abort();
  }, [active, base, token, prefsRetry]);
  useEffect(() => {
    if (!poll || competition === 'primary') return;
    const controller = new AbortController();
    let timer, pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const data = await fetchStudioOverview(base, { signal: controller.signal });
        if (!controller.signal.aborted) {
          overviewVersion.current += 1;
          setMatches(previous => data.matches.map(raw => {
            const detail = previous.find(match => match.id === raw.id);
            return currentChampionsMatch({ ...detail, ...raw, homeTeam: { ...detail?.homeTeam, ...raw.homeTeam }, awayTeam: { ...detail?.awayTeam, ...raw.awayTeam } });
          }));
          setUpcomingChampion(data.nextFixture || null); setError('');
          write(overviewKey, { matches: data.matches, nextFixture: data.nextFixture || null, updatedAt: data.updatedAt, receivedAt: Date.now() });
        }
      } catch (err) { if (!controller.signal.aborted) setError(err.message); }
      finally { pending = false; if (!controller.signal.aborted) setLoading(false); }
    };
    const tick = async () => { await refresh(); if (!controller.signal.aborted) timer = setTimeout(tick, 30000); };
    refreshRef.current = refresh;
    tick();
    return () => { controller.abort(); clearTimeout(timer); refreshRef.current = null; };
  }, [poll, base, overviewKey, competition]);

  useEffect(() => {
    if (poll && competition !== 'primary') fetchChampionsStandings(base).catch(() => {});
  }, [poll, base, competition]);
  useEffect(() => {
    if (!active || route.page !== 'coverage' || route.competition !== 'champions') return;
    const controller = new AbortController();
    let timer;
    const refresh = async () => {
      const startedVersion = overviewVersion.current;
      try {
        const response = await fetch(`${base}/api/live-studio/matches?competition=champions`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.matches)) throw new Error('Detailed match updates are delayed. Live scores are still updating.');
        if (!controller.signal.aborted) {
          setMatches(previous => data.matches.map(raw => {
            const detail = currentChampionsMatch(raw), current = previous.find(match => match.id === raw.id);
            const detailNewer = Date.parse(detail.lastUpdated || '') > Date.parse(current?.lastUpdated || '');
            if (current && overviewVersion.current !== startedVersion && !detailNewer) {
              return { ...detail, score: current.score, homeGoals: current.homeGoals, awayGoals: current.awayGoals, status: current.status, minute: current.minute, lastUpdated: current.lastUpdated };
            }
            return detail;
          }));
          setDetailsError('');
        }
      } catch (err) { if (!controller.signal.aborted) setDetailsError('Detailed match updates are delayed. Live scores are still updating.'); }
      finally { if (!controller.signal.aborted) timer = setTimeout(refresh, 30000); }
    };
    refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [active, route.page, route.competition, base]);

  useEffect(() => {
    const next = { ...lineupTimes };
    let changed = false;
    const remember = (fixture, state) => {
      const kickoff = Date.parse(fixture.kickoff);
      if (!hasStudioLineups(state) || !Number.isFinite(kickoff) || Date.now() - kickoff > 8 * 3600000 || kickoff - Date.now() > 90 * 60000) return;
      const key = lineupTimeKey(fixture);
      let announcedAt = getStudioLineupTime(fixture, state, next[key]);
      if (!announcedAt) {
        if (!['TIMED', 'SCHEDULED'].includes(String(state.status).toUpperCase()) || kickoff <= Date.now()) return;
        announcedAt = new Date().toISOString();
      }
      if (next[key] !== announcedAt) { next[key] = announcedAt; changed = true; }
    };
    fixtures.forEach(fixture => remember(fixture, states[fixture.id] || {}));
    matches.forEach(match => remember(championsFixture(match), match));
    if (changed) { write('studio-lineup-times:v1', next); setLineupTimes(next); }
  }, [fixtures, states, matches, lineupTimes]);
  const lineupTime = useCallback((fixture, state = {}) => getStudioLineupTime(fixture, state, lineupTimes[lineupTimeKey(fixture)]), [lineupTimes]);

  const primary = fixtures.map(fixture => {
    const state = states[fixture.id] || {};
    const score = results[fixture.id] || {};
    return { ...fixture, homeBadge: resolveBadge?.(fixture.homeTeam) || fixture.homeBadge, awayBadge: resolveBadge?.(fixture.awayTeam) || fixture.awayBadge, competitionLabel: primaryLabel, status: state.status || '', minute: state.minute, lineups: state.lineups, lineupsAnnouncedAt: lineupTime(fixture, state), lineupsAvailable: hasStudioLineups(state),
      homeGoals: state.homeGoals ?? score.homeGoals, awayGoals: state.awayGoals ?? score.awayGoals };
  });
  const foreign = matches.map(match => ({ ...championsFixture(match), homeBadge: resolveBadge?.(match.homeTeam?.name) || match.homeTeam?.crest, awayBadge: resolveBadge?.(match.awayTeam?.name) || match.awayTeam?.crest, status: match.status, minute: match.minute, lineups: match.lineups, lineupsAvailable: hasStudioLineups(match), lineupsAnnouncedAt: lineupTime(championsFixture(match), match), championsForm: match.form,
    homeGoals: match.score?.fullTime?.home, awayGoals: match.score?.fullTime?.away }));
  const groups = [{ id: 'primary', label: primaryLabel, fixtures: primary }, { id: 'champions', label: 'Champions League', fixtures: foreign }].filter(group => !competition || group.id === competition).map(group => ({
    ...group, liveFixtures: group.fixtures.filter(fixture => isStudioMatchLive(fixture, nowMs)),
    nextFixture: nextStudioKickoff(group.id === 'champions' && upcomingChampion ? [...group.fixtures, upcomingChampion] : group.fixtures, nowMs),
  }));
  const group = groups.find(item => item.id === route.competition) || groups[0];
  const selected = (route.page === 'coverage' && route.gameIds ? group.fixtures.filter(fixture => route.gameIds.includes(String(fixture.id))) : group.liveFixtures.filter(isSelected));
  const effectiveFocused = selected.some(fixture => String(fixture.id) === focused) ? focused : '';
  const isCovered = useCallback(fixture => (String(fixture.id).startsWith('cl:') ? 'champions' : 'primary') === route.competition
    && (route.gameIds ? route.gameIds.includes(String(fixture.id)) : isSelected(fixture)), [route.competition, route.gameIds, isSelected]);
  const alertPref = fixture => ({ enabled: prefs[fixture.id]?.enabled ?? (fixturePrefs[fixture.id] === true || (!String(fixture.id).startsWith('cl:') && globalAlerts)), level: prefs[fixture.id]?.level || 'all' });
  const saveAlert = async (fixture, changes) => {
    const fixtureKey = String(fixture.id);
    if (prefsLoading || !prefsReady || alertSaves.current.has(fixtureKey)) return;
    alertSaves.current.add(fixtureKey); setSavingIds([...alertSaves.current]); setAlertError('');
    const currentGeneration = generation.current;
    const previous = alertPref(fixture);
    const previousExplicit = prefs[fixture.id];
    const next = { ...previous, ...changes };
    setPrefs(current => ({ token, values: { ...current.values, [fixture.id]: next } }));
    try {
      if (!token) throw new Error('Please sign in to manage match alerts.');
      if (next.enabled && !pushSupported) throw new Error('Push notifications are not supported in this browser.');
      if (next.enabled && !pushEnabled) {
        const subscription = await enablePush({ refreshExisting: false });
        if (!subscription) throw new Error('Enable notifications on this device before turning on match alerts.');
      }
      let data;
      try {
        data = await studioRequest(`${base}/api/live-studio/prefs`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ fixtureId: String(fixture.id), ...next }),
        });
      } catch (error) {
        if (!error.unconfirmed) throw error;
        // A delayed POST may have reached the server. Confirm its stored value before declaring success or retrying.
        data = await studioRequest(`${base}/api/live-studio/prefs`, { timeoutMs: 3000, headers: { Authorization: `Bearer ${token}` } });
        const saved = data.prefs?.[fixtureKey];
        if (!saved || saved.enabled !== next.enabled || saved.level !== next.level) throw error;
      }
      if (currentGeneration === generation.current) {
        setPrefs(current => ({ token, values: { ...current.values, [fixtureKey]: data.prefs?.[fixtureKey] || next } }));
        if (data.fixturePrefs) onFixturePrefs?.(data.fixturePrefs, fixtureKey);
      }
    } catch (err) {
      if (currentGeneration === generation.current) {
        if (err.status === 401) onAuthExpired?.();
        setPrefs(current => { const values = { ...current.values }; if (previousExplicit) values[fixture.id] = previousExplicit; else delete values[fixture.id]; return { token, values }; });
        setAlertError(err.message);
      }
    }
    finally { if (currentGeneration === generation.current) { alertSaves.current.delete(fixtureKey); setSavingIds([...alertSaves.current]); } }
  };
  const foreignFeed = useMemo(() => matches.flatMap(match => footballFeed({ ...match, lineupsAnnouncedAt: lineupTime(championsFixture(match), match) })), [matches, lineupTime]);
  const preMatchFeed = prematchEnabled ? group.fixtures.filter(isCovered).flatMap(fixture => buildStudioPrematchCards({ fixture, state: fixture, announcedAt: fixture.lineupsAnnouncedAt, now: nowMs, form: fixture.championsForm || null })) : [];
  const filterFeed = entries => {
    const included = id => (String(id).startsWith('cl:') ? 'champions' : 'primary') === route.competition
      && (route.gameIds ? route.gameIds.includes(String(id)) : isSelected({ id })) && (!effectiveFocused || String(id) === effectiveFocused);
    const filtered = entries.filter(entry => {
      if (entry.fixtureId != null) return included(entry.fixtureId);
      if (entry.roundupMatches?.length) return entry.roundupMatches.some(match => included(match.fixture.id));
      return route.competition === 'primary' && !effectiveFocused && primary.some(fixture => included(fixture.id));
    });
    // Match focus also scopes the score and player rows inside studio roundups.
    return filtered.map(entry => !entry.roundupMatches ? entry : {
      ...entry, roundupMatches: entry.roundupMatches.filter(match => included(match.fixture.id)),
      ...(effectiveFocused ? { playerRoundup: [], lines: ['An update from your selected match.'] } : {}),
    });
  };
  const deselectedPrimary = fixtures.filter(fixture => !isSelected(fixture)).map(fixture => String(fixture.id)).sort();
  return { groups, group, route, lockedCompetition: Boolean(competition), anyLive: groups.some(item => item.liveFixtures.length > 0),
    openCompetition: id => { if (id === 'primary') onOpenPrimary?.(); navigate({ page: 'matches', competition: id, gameIds: null }); },
    showCompetitions: () => navigate({ page: competition ? 'matches' : 'competitions', competition: competition || 'primary', gameIds: null }),
    showMatches: () => navigate({ page: 'matches', competition: route.competition, gameIds: null }),
    openCoverage: () => navigate({ page: 'coverage', competition: route.competition, gameIds: group.liveFixtures.filter(isSelected).map(fixture => String(fixture.id)) }),
    selected, isSelected, isCovered, lineupTime, preMatchFeed, select, alertPref, saveAlert, saving: prefsLoading || !prefsReady, isAlertSaving: id => savingIds.includes(String(id)), alertError, error, detailsError, loading, foreignFeed, filterFeed,
    retryAlerts: () => setPrefsRetry(value => value + 1), alertsUnavailable: !prefsLoading && !prefsReady, focused: effectiveFocused, setFocused, refresh: () => refreshRef.current?.(), selectionScope: route.gameIds ? `:coverage:${route.competition}:${route.gameIds.join(',')}` : deselectedPrimary.length ? `:following:${deselectedPrimary.join(',')}` : '' };
}
