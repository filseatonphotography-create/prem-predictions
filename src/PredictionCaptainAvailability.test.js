import React from "react";
import { render, screen, within, act, cleanup, fireEvent } from "@testing-library/react";
import App from "./App";
import FIXTURES from "./fixtures";

const originalFetch = global.fetch;
const first = FIXTURES.find(fixture => fixture.gameweek === 1);
const second = FIXTURES.find(fixture => fixture.gameweek === 1 && fixture.id !== first.id);
const nextWeek = FIXTURES.find(fixture => fixture.gameweek === 2);
const card = fixture => screen.getByRole("group", { name: `${fixture.homeTeam} vs ${fixture.awayTeam} predictions` });
const captain = fixture => within(card(fixture)).getByRole("checkbox", { name: /Captain ×2/ });
const triple = fixture => within(card(fixture)).getByRole("checkbox", { name: /Triple ×3/ });

async function openPredictions(predictions) {
  localStorage.clear(); sessionStorage.clear();
  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date("2026-08-01T12:00:00Z"));
  window.scrollTo = jest.fn();
  window.history.replaceState({}, "", "/?mode=premier&view=predictions");
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "test-only", userId: "captain-preview", username: "Captain Preview" }));
  localStorage.setItem("activeView", "predictions");
  localStorage.setItem("sound_effects_enabled_v1", "false");
  global.fetch = jest.fn(async url => ({ ok: true, status: 200, headers: { get: () => null },
    json: async () => String(url).includes("/api/predictions/my") ? { predictions } : {} }));
  render(<App />);
  await act(async () => { for (let index = 0; index < 50; index += 1) await Promise.resolve(); });
}

afterEach(() => { cleanup(); jest.restoreAllMocks(); jest.useRealTimers(); global.fetch = originalFetch; });

test("a selected captain stays editable while other open fixtures that week have muted, disabled boosts", async () => {
  await openPredictions({ [first.id]: { homeGoals: "1", awayGoals: "0", isDouble: true } });
  expect(captain(first)).toBeChecked();
  expect(captain(first)).toBeEnabled();
  expect(captain(first).closest("label")).toHaveStyle({ color: "#ffffff" });
  expect(captain(second)).toBeDisabled();
  expect(captain(second).closest("label")).toHaveStyle({ color: "#9ca3af" });
  expect(triple(second)).toBeDisabled();
  expect(within(card(second)).getAllByRole("textbox").every(input => !input.disabled)).toBe(true);
  expect(within(card(second)).getByRole("button", { name: "H" })).toBeEnabled();
  fireEvent.click(captain(first));
  expect(captain(second)).toBeEnabled();
  expect(captain(second).closest("label")).toHaveStyle({ color: "#ffffff" });
  fireEvent.click(captain(second));
  expect(captain(second)).toBeChecked();
  expect(captain(first)).toBeDisabled();
});

test("a captain in a different gameweek does not disable this week's captain options", async () => {
  await openPredictions({ [nextWeek.id]: { homeGoals: "1", awayGoals: "0", isDouble: true } });
  expect(captain(first)).toBeEnabled();
  expect(captain(second)).toBeEnabled();
  expect(triple(first)).toBeEnabled();
});

test("a triple captain also reserves the captain slot for its gameweek", async () => {
  await openPredictions({ [first.id]: { homeGoals: "1", awayGoals: "0", isTriple: true } });
  expect(triple(first)).toBeChecked();
  expect(triple(first)).toBeEnabled();
  expect(captain(first)).toBeDisabled();
  expect(captain(second)).toBeDisabled();
  expect(captain(second).closest("label")).toHaveStyle({ color: "#9ca3af" });
});

test("a season triple used in another gameweek leaves ordinary captain available", async () => {
  await openPredictions({ [nextWeek.id]: { homeGoals: "1", awayGoals: "0", isTriple: true } });
  expect(captain(first)).toBeEnabled();
  expect(captain(first).closest("label")).toHaveStyle({ color: "#ffffff" });
  expect(triple(first)).toBeDisabled();
});
