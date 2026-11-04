import React from 'react';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import LiveStudioCoverage from './LiveStudioCoverage';
import useStudioCoverage from './useStudioCoverage';

const fixture = { id: 57, homeTeam: 'Arsenal', awayTeam: 'Chelsea', kickoff: '2026-11-04T20:00:00Z' };
const champion = { id: 77, homeTeam: { name: 'Fenerbahçe' }, awayTeam: { name: 'Liverpool' }, utcDate: '2026-11-04T17:45:00Z', status: 'IN_PLAY', minute: 29, score: { fullTime: { home: 1, away: 1 } } };
const theme = { text: '#fff', line: '#333', accent: '#abc', accent2: '#afa', muted: '#aaa', panelHi: '#222' };
const enablePush = jest.fn(async () => true);
const originalFetch = global.fetch;
let saved, feedError;
function Harness({ userId = 'user', pushEnabled = true, focusFixtureId = '' }) {
  const studio = useStudioCoverage({ active: true, base: '', token: userId, userId,
    fixtures: [fixture], states: {}, results: {}, primaryLabel: 'Premier League', fixturePrefs: {}, globalAlerts: true,
    enablePush, pushEnabled, focusFixtureId });
  return <><LiveStudioCoverage studio={studio} theme={theme} /><div data-testid="feed">{studio.filterFeed(studio.foreignFeed).map(entry => <p key={entry.id}>{entry.title}</p>)}</div></>;
}
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
beforeEach(() => {
  localStorage.clear(); saved = {}; feedError = false; enablePush.mockReset().mockResolvedValue(true);
  global.fetch = jest.fn(async (url, options = {}) => {
    let data = {};
    if (url.includes('/matches?')) {
      if (feedError) return { ok: false, json: async () => ({ error: 'Provider temporarily unavailable.' }) };
      data = { matches: [champion] };
    } else if (options.method === 'POST') {
      const { fixtureId, ...pref } = JSON.parse(options.body); saved[fixtureId] = pref; data = { prefs: { ...saved } };
    } else data = { prefs: { ...saved } };
    return { ok: true, json: async () => data };
  });
});
afterEach(() => { cleanup(); global.fetch = originalFetch; jest.useRealTimers(); });

test('selecting and focusing Champions League games updates the score strip and feed, and survives reload', async () => {
  render(<Harness />); await act(flush);
  const input = screen.getByRole('checkbox', { name: /Fenerbahçe v Liverpool/ });
  expect(input).not.toBeChecked();
  expect(screen.getByTestId('feed')).toBeEmptyDOMElement();
  fireEvent.click(input);
  expect(screen.getByTestId('feed')).toHaveTextContent('Kick off!');
  const strip = screen.getByRole('group', { name: 'Selected match scores' });
  fireEvent.click(within(strip).getByRole('button', { name: /Fenerbahçe 1–1 Liverpool/ }));
  expect(within(strip).getByRole('button', { name: /Fenerbahçe 1–1 Liverpool/ })).toHaveAttribute('aria-pressed', 'true');
  expect(within(strip).getByRole('button', { name: 'All matches' })).toHaveAttribute('aria-pressed', 'false');
  cleanup(); render(<Harness />); await act(flush);
  expect(screen.getByRole('checkbox', { name: /Fenerbahçe v Liverpool/ })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Clear Premier League matches' }));
  expect(screen.getByRole('checkbox', { name: /Arsenal v Chelsea/ })).not.toBeChecked();
  expect(screen.getByRole('checkbox', { name: /Fenerbahçe v Liverpool/ })).toBeChecked();
});

test('both competitions save alert levels independently of feed selection', async () => {
  render(<Harness />); await act(flush);
  await act(async () => { fireEvent.change(screen.getByRole('combobox', { name: 'Alert level for Arsenal v Chelsea' }), { target: { value: 'goals' } }); await flush(); });
  expect(saved['57']).toEqual({ enabled: true, level: 'goals' });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Push alerts for Fenerbahçe v Liverpool' })); await flush(); });
  expect(saved['cl:77']).toEqual({ enabled: true, level: 'all' });
  expect(screen.getByRole('checkbox', { name: /Fenerbahçe v Liverpool/ })).not.toBeChecked();
  await act(async () => { fireEvent.change(screen.getByRole('combobox', { name: 'Alert level for Fenerbahçe v Liverpool' }), { target: { value: 'goals' } }); await flush(); });
  expect(saved['cl:77']).toEqual({ enabled: true, level: 'goals' });
  expect(saved['57']).toEqual({ enabled: true, level: 'goals' });
});

test('permission failure leaves the bell off and does not save an enabled preference', async () => {
  enablePush.mockRejectedValue(new Error('Permission denied for notifications'));
  render(<Harness pushEnabled={false} />); await act(flush);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Push alerts for Fenerbahçe v Liverpool' })); await flush(); });
  expect(screen.getByRole('alert')).toHaveTextContent('Permission denied');
  expect(saved['cl:77']).toBeUndefined();
  expect(screen.getByRole('button', { name: 'Push alerts for Fenerbahçe v Liverpool' })).toHaveAttribute('aria-pressed', 'false');
});

test('polling errors retain the last scores, and a retry recovers', async () => {
  jest.useFakeTimers();
  render(<Harness />); await act(flush);
  feedError = true;
  await act(async () => { jest.advanceTimersByTime(30000); await flush(); });
  expect(screen.getByText(/Showing the last received scores/)).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /Fenerbahçe v Liverpool/ })).toBeInTheDocument();
  feedError = false;
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await flush(); });
  expect(screen.queryByText(/Showing the last received scores/)).not.toBeInTheDocument();
});

test('a Champions League notification link selects its match without changing another account’s selections', async () => {
  const view = render(<Harness focusFixtureId="cl:77" />); await act(flush);
  expect(screen.getByRole('checkbox', { name: /Fenerbahçe v Liverpool/ })).toBeChecked();
  expect(screen.getByRole('group', { name: 'Selected match scores' })).toHaveTextContent('Fenerbahçe 1–1 Liverpool');
  view.rerender(<Harness userId="another-user" />); await act(flush);
  expect(screen.getByRole('checkbox', { name: /Fenerbahçe v Liverpool/ })).not.toBeChecked();
});
