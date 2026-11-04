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
    } else if (options.method === 'POST') {
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
  fireEvent.click(screen.getByText('Alert settings'));
  await act(async () => { fireEvent.change(screen.getByRole('combobox', { name: 'Alert level for Arsenal v Chelsea' }), { target: { value: 'goals' } }); await flush(); });
  expect(saved['57']).toEqual({ enabled: true, level: 'goals' });
  fireEvent.click(screen.getByRole('button', { name: '← Competitions' })); await open('Champions League');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Push alerts for Fenerbahçe v Liverpool' })); await flush(); });
  expect(saved['cl:77']).toEqual({ enabled: true, level: 'all' });
  expect(screen.getByRole('checkbox', { name: 'Follow Fenerbahçe v Liverpool' })).not.toBeChecked();
  fireEvent.click(screen.getByText('Alert settings'));
  await act(async () => { fireEvent.change(screen.getByRole('combobox', { name: 'Alert level for Fenerbahçe v Liverpool' }), { target: { value: 'goals' } }); await flush(); });
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
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
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
