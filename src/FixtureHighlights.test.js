import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ResultsFixtureRow from "./ResultsFixtureRow";

const originalFetch = global.fetch;
const props = { home: { name: "Arsenal", code: "ARS" }, away: { name: "Chelsea", code: "CHE" }, score: {},
  theme: { muted: "#aaa", text: "#fff", accent: "#ff0", line: "#444" },
  highlights: { fixtureId: 123, finished: true, base: "https://example.test" } };
const highlight = { videoId: "Abcdef123_-", title: "Arsenal v Chelsea | Highlights", channelName: "Sky Sports Premier League" };
afterEach(() => { cleanup(); global.fetch = originalFetch; });

test("highlights are fetched only on expansion and display an official YouTube thumbnail link", async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ status: "available", videos: [highlight] }) }));
  render(<ResultsFixtureRow {...props} />);
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button"));
  const link = await screen.findByRole("link", { name: /Watch on YouTube/ });
  expect(global.fetch.mock.calls[0][0]).toBe("https://example.test/api/fixtures/123/highlights");
  expect(link).toHaveAttribute("href", "https://www.youtube.com/watch?v=Abcdef123_-");
  expect(link).toHaveAttribute("target", "_blank");
  expect(link.querySelector("img")).toHaveAttribute("src", "https://i.ytimg.com/vi/Abcdef123_-/hqdefault.jpg");
  expect(screen.getByText(highlight.channelName)).toBeVisible();
  fireEvent.click(link);
  expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
});

test("unfinished fixtures show a full-time message without requesting highlights", () => {
  global.fetch = jest.fn();
  render(<ResultsFixtureRow {...props} highlights={{ ...props.highlights, finished: false }} />);
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText(/Highlights will appear after full time/)).toBeVisible();
  expect(global.fetch).not.toHaveBeenCalled();
});

test("missing highlights or an unconfigured service has a clear empty state", async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ status: "unavailable", videos: [] }) }));
  render(<ResultsFixtureRow {...props} />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByText("Official highlights are not available yet.")).toBeVisible();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

test("a failed lookup can be retried without affecting predictions or bets", async () => {
  global.fetch = jest.fn().mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValueOnce({ ok: true, json: async () => ({ videos: [highlight] }) });
  render(<ResultsFixtureRow {...props} />);
  fireEvent.click(screen.getByRole("button"));
  fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("link", { name: /Watch on YouTube/ })).toBeVisible();
  expect(screen.getByText("No prediction made.")).toBeVisible();
});

test("collapsing a fixture cancels its pending request", async () => {
  let requestSignal;
  global.fetch = jest.fn((_url, { signal }) => { requestSignal = signal; return new Promise(() => {}); });
  render(<ResultsFixtureRow {...props} />);
  const toggle = screen.getByRole("button");
  fireEvent.click(toggle);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  fireEvent.click(toggle);
  expect(requestSignal.aborted).toBe(true);
});
