import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import App from './App';
import { championsTheme } from './ChampionsLeagueMode';
const original = global.fetch;
const flush = async () => { for (let i = 0; i < 70; i++) await Promise.resolve(); };
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); window.scrollTo = jest.fn();
  window.history.replaceState({}, '', '/?mode=champions&view=liveStudio');
  localStorage.setItem('pl_prediction_auth_v1', JSON.stringify({ token: 'test-only', userId: 'user', username: 'Example' }));
  global.fetch = jest.fn(async url => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => String(url).includes('/matches?') ? { matches: [] } : { prefs: {} } }));
});
afterEach(() => { cleanup(); global.fetch = original; localStorage.clear(); window.history.replaceState({}, '', '/'); });
test('Champions mode uses its own palette and never requests prediction or coin data', async () => {
  render(<App />); await act(flush);
  expect(screen.getByText('Champions League Mode')).toBeInTheDocument();
  expect(screen.getByRole('main')).toHaveStyle({ color: championsTheme.text });
  expect(championsTheme.accent).toBe('#b4a0ff');
  expect(global.fetch.mock.calls.map(([url]) => String(url)).some(url => /predictions|coins|mini-league/.test(url))).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Leagues ▾' }));
  expect(screen.getByRole('button', { name: 'Champions League Table' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Premier League Table' })).not.toBeInTheDocument();
});
test.each([['Premier League Mode', 'premierLeague', 'premier'], ['World Cup Mode', 'worldCup', 'worldcup']])('switching from Champions to %s opens its existing game', async (label, stored, query) => {
  render(<App />); await act(flush);
  fireEvent.click(screen.getByRole('button', { name: 'Leagues ▾' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: label })); await flush(); });
  expect(localStorage.getItem('prediction_game_mode_v1')).toBe(stored);
  expect(new URLSearchParams(window.location.search).get('mode')).toBe(query);
  expect(screen.getByText(label)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Leagues ▾' }));
  expect(screen.queryByRole('button', { name: 'Champions League Table' })).not.toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Champions League Mode' })); await flush(); });
  expect(screen.getByText('Champions League Mode')).toBeInTheDocument();
  expect(localStorage.getItem('prediction_game_mode_v1')).toBe(stored);
});
