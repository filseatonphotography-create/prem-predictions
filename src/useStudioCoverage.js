import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isStudioMatchLive, nextStudioKickoff, readStudioRoute } from './studioNavigation';
const { championsFixture, footballFeed, currentChampionsMatch } = require('./studioCompetitions');

function read(key) {
  try { const value = JSON.parse(localStorage.getItem(key) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; }
}
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

export default function useStudioCoverage({ active, base, token, userId, fixtures, states, results, primaryLabel, resolveBadge, fixturePrefs, globalAlerts, enablePush, pushEnabled, pushSupported = true, onFixturePrefs, focusFixtureId, poll = active, nowMs = Date.now(), onOpenPrimary }) {
  const storageKey = `live-studio-selection:v1:${userId || 'guest'}`;
  const [savedSelection, setSelection] = useState(() => ({ key: storageKey, values: read(storageKey) }));
  const selection = savedSelection.key === storageKey ? savedSelection.values : read(storageKey);
  const [prefsState, setPrefs] = useState({ token, values: {} });
  const prefs = prefsState.token === token ? prefsState.values : {};
  const [matches, setMatches] = useState([]);
  const [upcomingChampion, setUpcomingChampion] = useState(null);
  const [route, setRoute] = useState(readStudioRoute);
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
    const restore = () => { setRoute(readStudioRoute()); setFocused(''); };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsReady, setPrefsReady] = useState(false);
  const [alertError, setAlertError] = useState('');
  const [focused, setFocused] = useState('');
  const generation = useRef(0);
  const refreshRef = useRef(null);
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
    setPrefsLoading(true); setPrefsReady(false); setPrefs({ token, values: {} });
    if (!token) { setPrefsLoading(false); return () => controller.abort(); }
    (async () => {
      try {
        const response = await fetch(`${base}/api/live-studio/prefs`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load match alerts.');
        if (!controller.signal.aborted) { setPrefs({ token, values: data.prefs || {} }); setPrefsReady(true); setAlertError(''); }
      } catch (err) { if (!controller.signal.aborted) setAlertError('Could not load match alerts. Reload Live Studio to try again.'); }
      finally { if (!controller.signal.aborted && current === generation.current) setPrefsLoading(false); }
    })();
    return () => controller.abort();
  }, [active, base, token]);
  useEffect(() => {
    if (!poll) return;
    const controller = new AbortController();
    let timer, pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch(`${base}/api/live-studio/matches?competition=champions`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Champions League updates are unavailable.');
        if (!Array.isArray(data.matches)) throw new Error('Champions League updates are unavailable.');
        if (!controller.signal.aborted) { setMatches(data.matches.map(currentChampionsMatch)); setUpcomingChampion(data.nextFixture || null); setError(''); }
      } catch (err) { if (!controller.signal.aborted) setError(err.message); }
      finally { pending = false; if (!controller.signal.aborted) setLoading(false); }
    };
    const tick = async () => { await refresh(); if (!controller.signal.aborted) timer = setTimeout(tick, 30000); };
    refreshRef.current = refresh;
    tick();
    return () => { controller.abort(); clearTimeout(timer); refreshRef.current = null; };
  }, [poll, base]);

  const primary = fixtures.map(fixture => {
    const state = states[fixture.id] || {};
    const score = results[fixture.id] || {};
    return { ...fixture, homeBadge: resolveBadge?.(fixture.homeTeam) || fixture.homeBadge, awayBadge: resolveBadge?.(fixture.awayTeam) || fixture.awayBadge, competitionLabel: primaryLabel, status: state.status || '', minute: state.minute,
      homeGoals: state.homeGoals ?? score.homeGoals, awayGoals: state.awayGoals ?? score.awayGoals };
  });
  const foreign = matches.map(match => ({ ...championsFixture(match), homeBadge: resolveBadge?.(match.homeTeam?.name) || match.homeTeam?.crest, awayBadge: resolveBadge?.(match.awayTeam?.name) || match.awayTeam?.crest, status: match.status, minute: match.minute,
    homeGoals: match.score?.fullTime?.home, awayGoals: match.score?.fullTime?.away }));
  const groups = [{ id: 'primary', label: primaryLabel, fixtures: primary }, { id: 'champions', label: 'Champions League', fixtures: foreign }].map(group => ({
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
    if (saving || prefsLoading) return;
    setSaving(true); setAlertError('');
    const currentGeneration = generation.current;
    try {
      if (!token) throw new Error('Please sign in to manage match alerts.');
      const next = { ...alertPref(fixture), ...changes };
      if (next.enabled && !pushSupported) throw new Error('Push notifications are not supported in this browser.');
      if (next.enabled && !pushEnabled) {
        const subscription = await enablePush({ refreshExisting: false });
        if (!subscription) throw new Error('Enable notifications on this device before turning on match alerts.');
      }
      const response = await fetch(`${base}/api/live-studio/prefs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fixtureId: String(fixture.id), ...next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save match alerts.');
      if (currentGeneration === generation.current) {
        setPrefs({ token, values: data.prefs || {} });
        if (data.fixturePrefs) onFixturePrefs?.(data.fixturePrefs);
      }
    } catch (err) { if (currentGeneration === generation.current) setAlertError(err.message); }
    finally { setSaving(false); }
  };
  const foreignFeed = useMemo(() => matches.flatMap(footballFeed), [matches]);
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
  return { groups, group, route, anyLive: groups.some(item => item.liveFixtures.length > 0),
    openCompetition: id => { if (id === 'primary') onOpenPrimary?.(); navigate({ page: 'matches', competition: id, gameIds: null }); },
    showCompetitions: () => navigate({ page: 'competitions', competition: 'primary', gameIds: null }),
    showMatches: () => navigate({ page: 'matches', competition: route.competition, gameIds: null }),
    openCoverage: () => navigate({ page: 'coverage', competition: route.competition, gameIds: group.liveFixtures.filter(isSelected).map(fixture => String(fixture.id)) }),
    selected, isSelected, isCovered, select, alertPref, saveAlert, saving: saving || prefsLoading || !prefsReady, alertError, error, loading, foreignFeed, filterFeed,
    focused: effectiveFocused, setFocused, refresh: () => refreshRef.current?.(), selectionScope: route.gameIds ? `:coverage:${route.competition}:${route.gameIds.join(',')}` : deselectedPrimary.length ? `:following:${deselectedPrimary.join(',')}` : '' };
}
