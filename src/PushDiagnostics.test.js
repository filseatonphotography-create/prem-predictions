import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PushDiagnostics, { formatPushDiagnostics } from "./PushDiagnostics";

test("a failed test stays prominent when the latest live poll has zero sends", () => {
  const report = formatPushDiagnostics({
    browserPermission: "granted", currentDeviceRegistered: true, deviceCount: 1, liveUpdatesEnabled: true,
    attemptedNotifications: 0, acceptedNotifications: 0,
    lastDelivery: { type: "test", attemptedAt: "2026-10-24T03:40:00Z", acceptedCount: 0, failedCount: 1, failureCodes: [403] },
  });
  expect(report).toContain("Test failed: 1\nTest errors: 403");
  expect(report).toContain("This phone registered: yes");
  expect(report.indexOf("Test failed")).toBeLessThan(report.indexOf("Live-match attempted sends: 0"));
});

test("a live delivery is never reported as a successful test", () => {
  const report = formatPushDiagnostics({
    lastDelivery: { type: "liveUpdates", attemptedAt: "later", acceptedCount: 1, failedCount: 0 },
  });
  expect(report).toContain("Last test: no saved test delivery record");
  expect(report).not.toContain("Test accepted by push provider: 1");
  expect(report).toContain("Latest delivery accepted: 1");
});

test("a scheduled or in-flight test is shown as pending rather than failed", () => {
  const report = formatPushDiagnostics({
    lastTestDelivery: { state: "scheduled", sendAt: "2026-10-24T04:30:00Z" },
  });
  expect(report).toContain("Test state: scheduled");
  expect(report).toContain("Test accepted by push provider: pending");
  expect(report).not.toContain("Last test: undefined");
});

test("reports the exact test failure even after another live push succeeds", () => {
  const report = formatPushDiagnostics({
    lastTestDelivery: { state: "failed", acceptedCount: 0, failedCount: 1, failureCodes: ["ENETUNREACH"],
      failureDetails: [{ code: "ENETUNREACH", message: "Cannot connect", attempts: 2 }] },
    lastDelivery: { type: "liveUpdates", acceptedCount: 1 },
  });
  expect(report).toContain("Test failure: ENETUNREACH: Cannot connect (2 attempts)");
  expect(report).toContain("Test accepted by push provider: 0");
});

test("the report can be copied on a phone without opening a native popup", async () => {
  const writeText = jest.fn(async () => {});
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<PushDiagnostics status={{ deviceCount: 1, browserPermission: "granted" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy notification report" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Report copied"));
  expect(writeText).toHaveBeenCalledWith(screen.getByLabelText("Notification diagnostic report").value);
});

test("clipboard failure leaves the report selected for the phone's copy menu", async () => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
  render(<PushDiagnostics status={{ deviceCount: 1 }} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy notification report" }));
  const report = screen.getByLabelText("Notification diagnostic report");
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Report selected"));
  expect(report.selectionStart).toBe(0);
  expect(report.selectionEnd).toBe(report.value.length);
});
