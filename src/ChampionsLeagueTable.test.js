import React from 'react';
import { render, screen, within, fireEvent, act, cleanup } from '@testing-library/react';
import ChampionsLeagueTable from './ChampionsLeagueTable';
import App from './App';
const fs = require('fs'), vm = require('vm');

const theme = { text: '#fff', muted: '#aaa', panelHi: '#222', line: '#444' };
const data = { competition: { code: 'CL' }, season: { startDate: '2026-09-08', endDate: '2027-05-29' }, updatedAt: Date.parse('2026-11-04T18:00:00Z'),
  standings: [{ type: 'TOTAL', stage: 'LEAGUE_STAGE', group: 'League phase', table: [
    { position: 9, team: { id: 2, name: 'Liverpool FC', shortName: 'Liverpool', crest: 'https://crests.football-data.org/64.png' }, playedGames: 3, won: 2, draw: 0, lost: 1, goalsFor: 7, goalsAgainst: 2, goalDifference: 5, points: 6 },
    { position: 1, team: { id: 1, name: 'Arsenal FC', shortName: 'Arsenal' }, playedGames: 3, won: 3, draw: 0, lost: 0, goalsFor: 9, goalsAgainst: 0, goalDifference: 9, points: 9 },
  ] }] };
const originalFetch = global.fetch;
const flush = async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); };
afterEach(() => { cleanup(); global.fetch = originalFetch; jest.useRealTimers(); });

test('the league-phase table uses provider ranks, statistics and badges, with a delayed-update notice', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => data }));
  render(<ChampionsLeagueTable base="" theme={theme} />); await act(flush);
  const rows = within(screen.getByRole('group', { name: 'League phase' })).getAllByRole('button');
  expect(rows[0]).toHaveTextContent('Arsenal'); expect(rows[1]).toHaveTextContent('Liverpool');
  expect(rows[1].querySelector('img').src).toBe('https://crests.football-data.org/64.png');
  expect(screen.getByText(/1–8: Round of 16/)).toBeInTheDocument();
  expect(screen.getByText(/may lag live scores/)).toBeInTheDocument();
  expect(rows[0]).toHaveStyle({ gridTemplateColumns: '42px auto 158px' });
  expect(rows[0]).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(rows[0]);
  expect(rows[0]).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText(/Goals for 9/)).toBeInTheDocument();
  global.fetch.mockResolvedValue({ ok: false, json: async () => ({}) });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Refresh table' })); await flush(); });
  expect(screen.getByRole('status')).toHaveTextContent('Showing the last received standings.');
  expect(screen.getByRole('group', { name: 'League phase' })).toBeInTheDocument();
});

test('the Champions League table is available only after switching to its own mode', async () => {
  localStorage.clear(); sessionStorage.clear(); window.scrollTo = jest.fn();
  localStorage.setItem('pl_prediction_auth_v1', JSON.stringify({ token: 'test-only', userId: 'diagnostic', username: 'Diagnostic' }));
  localStorage.setItem('activeView', 'predictions');
  window.history.replaceState({}, '', '/?view=predictions');
  global.fetch = jest.fn(async url => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => String(url).includes('/api/champions-league/standings') ? data : {} }));
  render(<App />); await act(flush);
  fireEvent.click(screen.getByRole('button', { name: 'Leagues ▾' }));
  expect(screen.queryByRole('button', { name: 'Champions League Table' })).not.toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Champions League Mode' })); await flush(); });
  expect(screen.getByText('Champions League Mode')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Leagues ▾' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Champions League Table' })); await flush(); });
  expect(screen.getByRole('heading', { name: 'Champions League Table' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'League phase' })).toBeInTheDocument();
  expect(screen.getByText('Champions League Mode')).toBeInTheDocument();
  expect(new URLSearchParams(window.location.search).get('mode')).toBe('champions');
  expect(new URLSearchParams(window.location.search).get('view')).toBe('championsLeagueTable');
});

test('the standings endpoint keeps a separate CL cache, shares concurrent fetches and reports stale data on failure', async () => {
  const source = fs.readFileSync('server.js', 'utf8'); let handler;
  const fetcher = jest.fn(async () => ({ ok: true, json: async () => data }));
  const context = { app: { get: (_path, callback) => { handler = callback; } }, Date, AbortController, setTimeout, clearTimeout,
    fetch: fetcher, getFootballDataHeaders: () => ({}), FOOTBALL_DATA_API_BASE: 'https://api.football-data.org/v4',
    championsStandingsCache: null, championsStandingsCacheAt: 0, championsStandingsPending: null, console: { error: jest.fn() } };
  const start = source.indexOf('app.get("/api/champions-league/standings"'), end = source.indexOf('app.get("/api/standings"', start);
  vm.runInNewContext(source.slice(start, end), context);
  const response = () => ({ code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(value) { this.data = value; return this; } });
  const first = response(), second = response(); await Promise.all([handler({}, first), handler({}, second)]);
  expect(fetcher).toHaveBeenCalledTimes(1); expect(fetcher.mock.calls[0][0]).toContain('/competitions/CL/standings');
  expect(first.data.competition.code).toBe('CL'); expect(second.data.stale).toBe(false);
  context.championsStandingsCacheAt = 1; fetcher.mockRejectedValue(new Error('provider down'));
  const stale = response(); await handler({}, stale); expect(stale.data.stale).toBe(true); expect(stale.data.competition.code).toBe('CL');
  context.championsStandingsCache = null;
  const failed = response(); await handler({}, failed); expect(failed.code).toBe(502);
});

test('saved standings render immediately on a later visit while the next refresh is pending', async () => {
  localStorage.clear(); sessionStorage.clear();
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => data }));
  render(<ChampionsLeagueTable base="cache-check" theme={theme} />); await act(flush); cleanup();
  let complete;
  global.fetch = jest.fn(() => new Promise(resolve => { complete = resolve; }));
  render(<ChampionsLeagueTable base="cache-check" theme={theme} />);
  expect(screen.getByRole('group', { name: 'League phase' })).toHaveTextContent('Liverpool');
  expect(screen.queryByText('Loading Champions League standings…')).not.toBeInTheDocument();
  await act(async () => { complete({ ok: true, json: async () => data }); await flush(); });
});
