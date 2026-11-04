import React from 'react';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import LiveStudioCoverage, { LiveStudioCompetitions, LiveStudioScoreStrip } from './LiveStudioCoverage';
import useStudioCoverage from './useStudioCoverage';

const fixture = { id: 57, homeTeam: 'Arsenal', awayTeam: 'Chelsea', kickoff: '2026-11-04T17:45:00Z' };
const finished = { ...fixture, id: 58, homeTeam: 'Completed Home', awayTeam: 'Completed Away' };
const upcoming = { ...fixture, id: 59, homeTeam: 'Future Home', awayTeam: 'Future Away', kickoff: '2026-11-11T20:00:00Z' };
const champion = { id: 77, homeTeam: { name: 'Fenerbahçe' }, awayTeam: { name: 'Liverpool' }, utcDate: fixture.kickoff, status: 'IN_PLAY', minute: 29, score: { fullTime: { home: 1, away: 1 } } };
const theme = { text: '#fff', line: '#333', accent: '#abc', accent2: '#afa', muted: '#aaa', panelHi: '#222' };
const enablePush = jest.fn(async () => true);
const originalFetch = global.fetch;
let saved, feedError, nextMatches;
function Harness({ userId = 'user', pushEnabled = true, focusFixtureId = '' }) {
  const studio = useStudioCoverage({ active: true, base: '', token: userId, userId,
    fixtures: [fixture, finished, upcoming], states: { 57: { status: 'IN_PLAY' }, 58: { status: 'FINISHED' }, 59: { status: 'TIMED' } }, results: {}, primaryLabel: 'Premier League', fixturePrefs: {}, globalAlerts: true,
    enablePush, pushEnabled, focusFixtureId });
  if (studio.route.page === 'competitions') return <LiveStudioCompetitions studio={studio} theme={theme} nowMs={Date.now()} />;
  if (studio.route.page === 'matches') return <LiveStudioCoverage studio={studio} theme={theme} nowMs={Date.now()} />;
  return <><button onClick={studio.showMatches}>Back to live games</button><LiveStudioScoreStrip studio={studio} theme={theme} /><div data-testid="feed">{studio.filterFeed(studio.foreignFeed).map(entry => <p key={entry.id}>{entry.title}</p>)}</div></>;
}
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const open = async league => { await act(async () => { fireEvent.click(screen.getByRole('button', { name: league, exact: true })); await flush(); }); };
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(Date.parse('2026-11-04T18:14:00Z'));
  window.history.replaceState({}, '', '/'); localStorage.clear(); saved = {}; feedError = false;
  nextMatches = [champion, { ...champion, id: 78, status: 'FINISHED', homeTeam: { name: 'Finished Club' } }, { ...champion, id: 79, status: 'TIMED', homeTeam: { name: 'Next Club' }, utcDate: upcoming.kickoff }];
  enablePush.mockReset().mockResolvedValue(true);
  global.fetch = jest.fn(async (url, options = {}) => {
    let data = {};
    if (url.includes('/matches?')) {
      if (feedError) return { ok: false, json: async () => ({ error: 'Provider temporarily unavailable.' }) };
      data = { matches: nextMatches, nextFixture: { id: 'cl:79', kickoff: upcoming.kickoff, status: 'TIMED' } };
    } else if (url.includes('/api/champions-league/standings')) data = { competition: { code: 'CL' }, standings: [] };
    else if (options.method === 'POST') {
      const { fixtureId, ...pref } = JSON.parse(options.body); saved[fixtureId] = pref; data = { prefs: { ...saved } };
    } else data = { prefs: { ...saved } };
    return { ok: true, json: async () => data };
  });
});
afterEach(() => { cleanup(); global.fetch = originalFetch; jest.useRealTimers(); window.history.replaceState({}, '', '/'); });

test('Studio opens with two clear pulsing competition buttons and no match list or feed', async () => {
  render(<Harness />); await act(flush);
  expect(screen.getByRole('button', { name: 'Premier League' })).toHaveClass('live-studio-live-button');
  expect(screen.getByRole('button', { name: 'Champions League' })).toHaveClass('live-studio-live-button');
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.queryByTestId('feed')).not.toBeInTheDocument();
});

test('each competition opens its own live-only list; finished and upcoming games are excluded', async () => {
  render(<Harness />); await act(flush); await open('Premier League');
  expect(screen.getByRole('checkbox', { name: 'Follow Arsenal v Chelsea' })).toBeInTheDocument();
  expect(screen.queryByText('Completed Home')).not.toBeInTheDocument(); expect(screen.queryByText('Future Home')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '← Competitions' })); await open('Champions League');
  expect(screen.getByRole('checkbox', { name: 'Follow Fenerbahçe v Liverpool' })).toBeInTheDocument();
  expect(screen.queryByText('Finished Club')).not.toBeInTheDocument(); expect(screen.queryByText('Next Club')).not.toBeInTheDocument();
  expect(screen.queryByText('Arsenal')).not.toBeInTheDocument();
});

test('selecting a live game opens coverage separately, and remembers the selection on return', async () => {
  render(<Harness />); await act(flush); await open('Champions League');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Follow Fenerbahçe v Liverpool' }));
  fireEvent.click(screen.getByRole('button', { name: 'Follow selected games (1)' }));
  expect(screen.getByTestId('feed')).toHaveTextContent('Kick off!');
  const strip = screen.getByRole('group', { name: 'Selected match scores' });
  fireEvent.click(within(strip).getByRole('button', { name: /Fenerbahçe 1–1 Liverpool/ }));
  expect(within(strip).getByRole('button', { name: /Fenerbahçe 1–1 Liverpool/ })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Back to live games' }));
  expect(screen.getByRole('checkbox', { name: 'Follow Fenerbahçe v Liverpool' })).toBeChecked();
  expect(screen.queryByTestId('feed')).not.toBeInTheDocument();
});

test('both competitions save alert levels independently of feed selection', async () => {
  render(<Harness />); await act(flush); await open('Premier League');
  await act(async () => { fireEvent.click(within(screen.getByRole('group', { name: 'Alert level for Arsenal v Chelsea' })).getByRole('checkbox', { name: 'Goals and final score' })); await flush(); });
  expect(saved['57']).toEqual({ enabled: true, level: 'goals' });
  fireEvent.click(screen.getByRole('button', { name: '← Competitions' })); await open('Champions League');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Push alerts for Fenerbahçe v Liverpool' })); await flush(); });
  expect(saved['cl:77']).toEqual({ enabled: true, level: 'all' });
  expect(screen.getByRole('checkbox', { name: 'Follow Fenerbahçe v Liverpool' })).not.toBeChecked();
  await act(async () => { fireEvent.click(within(screen.getByRole('group', { name: 'Alert level for Fenerbahçe v Liverpool' })).getByRole('checkbox', { name: 'Goals and final score' })); await flush(); });
  expect(saved['cl:77']).toEqual({ enabled: true, level: 'goals' });
});

test('permission failure leaves the bell off and does not save an enabled preference', async () => {
  enablePush.mockRejectedValue(new Error('Permission denied for notifications'));
  render(<Harness pushEnabled={false} />); await act(flush); await open('Champions League');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Push alerts for Fenerbahçe v Liverpool' })); await flush(); });
  expect(screen.getByRole('alert')).toHaveTextContent('Permission denied'); expect(saved['cl:77']).toBeUndefined();
  expect(screen.getByRole('button', { name: 'Push alerts for Fenerbahçe v Liverpool' })).toHaveAttribute('aria-pressed', 'false');
});

test('when the game finishes it leaves the live list, stops pulsing, and shows the next kickoff countdown', async () => {
  render(<Harness />); await act(flush); await open('Champions League');
  nextMatches = [{ ...champion, status: 'FINISHED' }];
  await act(async () => { jest.advanceTimersByTime(30000); await flush(); });
  expect(screen.queryByRole('checkbox', { name: /^Follow / })).not.toBeInTheDocument();
  expect(screen.getByText('No games live right now.')).toBeInTheDocument(); expect(screen.getByText(/Next kick-off in/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '← Competitions' }));
  expect(screen.getByRole('button', { name: 'Champions League' })).not.toHaveClass('live-studio-live-button');
  expect(screen.getByRole('button', { name: 'Premier League' })).toHaveClass('live-studio-live-button');
});

test('a Champions League notification link opens that match’s coverage directly', async () => {
  render(<Harness focusFixtureId="cl:77" />); await act(flush);
  expect(screen.getByTestId('feed')).toHaveTextContent('Kick off!');
  expect(screen.getByRole('group', { name: 'Selected match scores' })).toHaveTextContent('Fenerbahçe 1–1 Liverpool');
});

test('browser back returns from the live list to the competition picker', async () => {
  render(<Harness />); await act(flush); await open('Champions League');
  window.history.replaceState({}, '', '/?view=liveStudio');
  await act(async () => { window.dispatchEvent(new PopStateEvent('popstate')); await flush(); });
  expect(screen.getByRole('button', { name: 'Champions League' })).toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

test('both alert levels are visible without opening anything, and the follow checkbox has its own grid cell', async () => {
  render(<Harness />); await act(flush); await open('Champions League');
  const row = screen.getByRole('group', { name: 'Fenerbahçe v Liverpool' });
  expect(within(row).getByRole('checkbox', { name: 'Goals and final score' })).toBeVisible();
  expect(within(row).getByRole('checkbox', { name: 'All match alerts' })).toBeVisible();
  expect(within(row).queryByRole('combobox')).not.toBeInTheDocument();
  const follow = within(row).getByRole('checkbox', { name: /^Follow / });
  expect(follow).toHaveStyle({ width: '18px', margin: '0', transform: 'none' });
  expect(follow.parentElement).toHaveStyle({ gridTemplateColumns: '22px minmax(0, 1fr) auto' });
});

test('the bell changes immediately during a slow save and rolls back if saving fails', async () => {
  const original = global.fetch;
  let complete;
  global.fetch = jest.fn((url, options = {}) => options.method === 'POST' ? new Promise(resolve => { complete = resolve; }) : original(url, options));
  render(<Harness />); await act(flush); await open('Champions League');
  const bell = screen.getByRole('button', { name: 'Push alerts for Fenerbahçe v Liverpool' });
  fireEvent.click(bell);
  expect(bell).toHaveAttribute('aria-pressed', 'true');
  expect(bell).toBeDisabled();
  await act(async () => { complete({ ok: false, json: async () => ({ error: 'Save failed' }) }); await flush(); });
  expect(bell).toHaveAttribute('aria-pressed', 'false');
  expect(bell).not.toBeDisabled(); expect(screen.getByRole('alert')).toHaveTextContent('Save failed');
});

test('a slow or failing detailed feed does not block the live list or its green indicator', async () => {
  const original = global.fetch;
  global.fetch = jest.fn((url, options) => String(url).includes('/matches?') && !String(url).includes('summary=1')
    ? Promise.resolve({ ok: false, json: async () => ({ error: 'Champions League updates are unavailable.' }) }) : original(url, options));
  render(<Harness />); await act(flush);
  expect(screen.getByRole('button', { name: 'Champions League' })).toHaveClass('live-studio-live-button');
  await open('Champions League');
  expect(screen.getByRole('checkbox', { name: /^Follow Fenerbahçe/ })).toBeVisible();
  expect(screen.queryByText(/updates are unavailable/)).not.toBeInTheDocument();
});

test('cached current games pulse immediately on reload even while the overview refresh waits', async () => {
  render(<Harness />); await act(flush); cleanup();
  const original = global.fetch; let complete;
  global.fetch = jest.fn((url, options) => String(url).includes('/matches?') ? new Promise(resolve => { complete = resolve; }) : original(url, options));
  render(<Harness />);
  expect(screen.getByRole('button', { name: 'Champions League' })).toHaveClass('live-studio-live-button');
  await act(async () => { complete({ ok: true, json: async () => ({ matches: [champion] }) }); await flush(); });
});

test('late detailed data cannot roll back a more recent live score', async () => {
  const original = global.fetch; let complete;
  global.fetch = jest.fn((url, options) => String(url).includes('/matches?') && !String(url).includes('summary=1')
    ? new Promise(resolve => { complete = resolve; }) : original(url, options));
  render(<Harness />); await act(flush); await open('Champions League');
  fireEvent.click(screen.getByRole('checkbox', { name: /^Follow Fenerbahçe/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Follow selected games (1)' })); await act(flush);
  nextMatches = [{ ...champion, score: { fullTime: { home: 1, away: 2 } } }];
  await act(async () => { jest.advanceTimersByTime(30000); await flush(); });
  expect(screen.getByRole('group', { name: 'Selected match scores' })).toHaveTextContent('1–2');
  await act(async () => { complete({ ok: true, json: async () => ({ matches: [champion] }) }); await flush(); });
  expect(screen.getByRole('group', { name: 'Selected match scores' })).toHaveTextContent('1–2');
});

test('saving one game’s bell does not block another game’s notification controls', async () => {
  nextMatches.push({ ...champion, id: 80, homeTeam: { name: 'Other Home' }, awayTeam: { name: 'Other Away' } });
  const original = global.fetch; const pending = {};
  global.fetch = jest.fn((url, options = {}) => options.method === 'POST' ? new Promise(resolve => { pending[JSON.parse(options.body).fixtureId] = resolve; }) : original(url, options));
  render(<Harness />); await act(flush); await open('Champions League');
  const first = screen.getByRole('button', { name: 'Push alerts for Fenerbahçe v Liverpool' });
  const second = screen.getByRole('button', { name: 'Push alerts for Other Home v Other Away' });
  fireEvent.click(first); expect(second).not.toBeDisabled(); fireEvent.click(second);
  expect(first).toHaveAttribute('aria-pressed', 'true'); expect(second).toHaveAttribute('aria-pressed', 'true');
  await act(async () => {
    pending['cl:80']({ ok: true, json: async () => ({ prefs: { 'cl:80': { enabled: true, level: 'all' } } }) }); await flush();
    pending['cl:77']({ ok: true, json: async () => ({ prefs: { 'cl:77': { enabled: true, level: 'all' } } }) }); await flush();
  });
  expect(first).toHaveAttribute('aria-pressed', 'true'); expect(second).toHaveAttribute('aria-pressed', 'true');
  expect(first).not.toBeDisabled(); expect(second).not.toBeDisabled();
});

test('a confirmed pre-match lineup starts coverage and keeps its kickoff countdown visible', async () => {
  const lineup = Array.from({ length: 11 }, (_, id) => ({ id, name: `Player ${id}` }));
  nextMatches = [{ ...champion, status: 'TIMED', utcDate: '2026-11-04T18:30:00Z', lineups: { home: { lineup }, away: { lineup } }, lineupsAnnouncedAt: '2026-11-04T17:30:00Z' }];
  render(<Harness />); await act(flush);
  expect(screen.getByRole('button', { name: 'Champions League' })).toHaveClass('live-studio-live-button');
  expect(screen.getByText(/Next kick-off in/)).toBeInTheDocument();
  await open('Champions League');
  expect(screen.getByRole('checkbox', { name: 'Follow Fenerbahçe v Liverpool' })).toBeVisible();
  expect(screen.getByText('Pre-match')).toBeInTheDocument();
});
test('a known countdown survives an overdue overview refresh and its timeout', async () => {
  localStorage.setItem('studio-overview:v1:', JSON.stringify({ receivedAt: Date.now() - 10 * 60000, matches: [], nextFixture: { id: 'cl:99', kickoff: '2026-11-04T18:30:00Z' } }));
  const original = global.fetch;
  global.fetch = jest.fn((url, options) => String(url).includes('/matches?') ? new Promise(() => {}) : original(url, options));
  render(<Harness />);
  expect(screen.getByText(/Next kick-off in/)).toBeInTheDocument();
  expect(screen.queryByText('Checking fixtures…')).not.toBeInTheDocument();
  await act(async () => { jest.advanceTimersByTime(10000); await flush(); });
  expect(screen.getByText(/Next kick-off in/)).toBeInTheDocument();
  expect(screen.queryByText('Checking fixtures…')).not.toBeInTheDocument();
  expect(screen.getByText(/last confirmed kick-off/)).toBeInTheDocument();
});

test('a known announcement time is retained when joining after kickoff', async () => {
  const lineup = Array.from({ length: 11 }, (_, id) => ({ id, name: `Player ${id}` }));
  nextMatches = [{ ...champion, lineups: { home: { lineup }, away: { lineup } }, lineupsAnnouncedAt: '2026-11-04T16:45:00Z' }];
  render(<Harness />); await act(flush);
  const times = JSON.parse(localStorage.getItem('studio-lineup-times:v1'));
  expect(times['cl:77|2026-11-04T17:45:00Z']).toBe('2026-11-04T16:45:00.000Z');
});

test('a stalled save is confirmed by reading the stored preference after eight seconds', async () => {
  const original = global.fetch;
  global.fetch = jest.fn((url, options = {}) => {
    if (options.method === 'POST') { const { fixtureId, ...pref } = JSON.parse(options.body); saved[fixtureId] = pref; return new Promise(() => {}); }
    return original(url, options);
  });
  render(<Harness />); await act(flush); await open('Champions League');
  const bell = screen.getByRole('button', { name: 'Push alerts for Fenerbahçe v Liverpool' });
  fireEvent.click(bell); expect(screen.getByText('Saving…')).toBeInTheDocument();
  await act(async () => { jest.advanceTimersByTime(8000); await flush(); });
  expect(screen.queryByText('Saving…')).not.toBeInTheDocument(); expect(bell).not.toBeDisabled();
  expect(bell).toHaveAttribute('aria-pressed', 'true'); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
test('an unconfirmed save rolls back and stops saving when both requests stall', async () => {
  render(<Harness />); await act(flush); await open('Champions League');
  global.fetch = jest.fn(() => new Promise(() => {}));
  const bell = screen.getByRole('button', { name: 'Push alerts for Fenerbahçe v Liverpool' });
  fireEvent.click(bell);
  await act(async () => { jest.advanceTimersByTime(8000); await flush(); });
  await act(async () => { jest.advanceTimersByTime(3000); await flush(); });
  expect(screen.queryByText('Saving…')).not.toBeInTheDocument(); expect(bell).not.toBeDisabled();
  expect(bell).toHaveAttribute('aria-pressed', 'false'); expect(screen.getByRole('alert')).toHaveTextContent('taking too long');
});
