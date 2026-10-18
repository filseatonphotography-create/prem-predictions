import { buildLiveStudioDeskEntries, mergeLiveStudioDeskHistory } from "./App";

const kickoff = "2026-10-17T16:30:00Z";
const nowMs = Date.parse(kickoff) + 25 * 60000;
const match = minute => ({ fixture: { id: 560607, homeTeam: "Newcastle", awayTeam: "Aston Villa", kickoff },
  score: { homeGoals: 0, awayGoals: 1 }, live: true, paused: false, finished: false,
  minute, lastNewsAt: nowMs, picks: [{ username: "Phil", prediction: { homeGoals: 0, awayGoals: 1 } }],
});

test.each([15, 25, 60, 75])("posts a studio check-in around %s minutes even after a recent event", mark => {
  const [entry] = buildLiveStudioDeskEntries({ matches: [match(mark)], nowMs });
  expect(entry.verdictLabel).toBe("Back in the studio");
  expect(entry.minute).toBe(`${mark}'`);
  expect(entry.lines).toContain(`Newcastle United 0–1 Aston Villa (${mark}')`);
  expect(entry.lines.join(" ")).toContain("Phil is on for Bingpot");
  expect(entry.tableSnapshot).toBeUndefined();
});

test("one check-in per mark and kick-off group stays in history without repeated cards", () => {
  const first = buildLiveStudioDeskEntries({ matches: [match(25), { ...match(26), fixture: { ...match(26).fixture, id: 2 } }], nowMs });
  expect(first).toHaveLength(1);
  const later = buildLiveStudioDeskEntries({ matches: [match(29)], nowMs: nowMs + 240000 });
  const retained = mergeLiveStudioDeskHistory(first, later);
  expect(retained).toEqual(first);
  const seventy = buildLiveStudioDeskEntries({ matches: [match(75)], nowMs: nowMs + 60 * 60000 });
  expect(mergeLiveStudioDeskHistory(retained, seventy)).toHaveLength(2);
});

test("does not invent missed check-ins when joining much later or while at half-time", () => {
  for (const minute of [6, 7, 24, 40, 45, 69, 70, 80, 84]) {
    const entries = buildLiveStudioDeskEntries({ matches: [match(minute)], nowMs });
    expect(entries.some(entry => entry.id.startsWith("studio:checkpoint:"))).toBe(false);
  }
  const [halfTime] = buildLiveStudioDeskEntries({ matches: [{ ...match(45), paused: true }], nowMs });
  expect(halfTime.id).toContain("studio:half-time:");
  expect(halfTime.verdictLabel).toBe("Back in the studio");
});

// A late poll should summarise the action just received, rather than put a
// snapshot containing that goal below the goal itself.
test("a checkpoint's timestamp matches the scores it summarises on a late poll", () => {
  const [entry] = buildLiveStudioDeskEntries({ matches: [match(29)], nowMs: nowMs + 240000 });
  expect(entry.momentMs).toBe(Date.parse(kickoff) + 29 * 60000);
});
