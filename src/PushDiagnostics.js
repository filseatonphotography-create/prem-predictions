import React, { useRef, useState } from "react";

export function formatPushDiagnostics(status) {
  const test = status.lastDelivery?.type === "test" ? status.lastDelivery : null;
  const lines = [
    `Browser permission: ${status.browserPermission || "unknown"}`,
    `Service worker: ${status.serviceWorkerState || "unknown"}`,
    `This phone registered: ${status.currentDeviceRegistered == null ? "unknown" : status.currentDeviceRegistered ? "yes" : "no"}`,
    `Registered devices: ${status.deviceCount ?? "unknown"}`,
    `Live alerts: ${status.liveUpdatesEnabled ? "enabled" : "disabled"}`,
  ];
  if (test) {
    lines.push(
      `Last test: ${test.attemptedAt}`,
      `Test accepted by push provider: ${test.acceptedCount || 0}`,
      `Test failed: ${test.failedCount || 0}`,
      `Test errors: ${(test.failureCodes || []).join(", ") || "none"}`,
    );
  } else {
    lines.push("Last test: no saved test delivery record");
  }
  if (status.lastDelivery) {
    const last = status.lastDelivery;
    lines.push(`Latest delivery: ${last.type} at ${last.attemptedAt}`,
      `Latest delivery accepted: ${last.acceptedCount || 0}; failed: ${last.failedCount || 0}`,
      `Latest delivery errors: ${(last.failureCodes || []).join(", ") || "none"}`);
  }
  lines.push("", "Live-match poll (separate from the test):",
    `Worker: ${status.running ? "running" : "idle"}`,
    `Last completed poll: ${status.lastFinishedAt || "none yet"}`,
    `Fetched matches: ${status.fetchedMatches || 0}`,
    `Matched fixtures: ${status.matchedFixtures || 0}`,
    `Subscribed fixtures: ${status.subscribedFixtures || 0}`,
    `Live-match attempted sends: ${status.attemptedNotifications || 0}`,
    `Live-match accepted sends: ${status.acceptedNotifications || 0}`);
  Object.entries(status.competitionErrors || {}).forEach(([mode, error]) => lines.push(`${mode} error: ${error}`));
  if (status.lastError) lines.push(`Worker error: ${status.lastError}`);
  if (status.deviceStatusError) lines.push(`Device lookup error: ${status.deviceStatusError}`);
  return lines.join("\n");
}

export default function PushDiagnostics({ status }) {
  const report = formatPushDiagnostics(status);
  const reportRef = useRef(null);
  const [copyStatus, setCopyStatus] = useState("");
  return (
    <div style={{ marginTop: 12 }}>
      <p>Copy this report into the chat. Test delivery appears above the live-match counters.</p>
      <textarea
        ref={reportRef}
        aria-label="Notification diagnostic report"
        readOnly
        value={report}
        rows={16}
        style={{ width: "100%", boxSizing: "border-box", padding: 10, fontSize: 14, userSelect: "text" }}
      />
      <button type="button" onClick={async () => {
        try {
          if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
          await navigator.clipboard.writeText(report);
          setCopyStatus("Report copied. Paste it into the chat.");
        } catch {
          reportRef.current?.focus();
          reportRef.current?.select();
          setCopyStatus("Report selected. Use your phone's Copy option, then paste it into the chat.");
        }
      }}>Copy notification report</button>
      <p role="status">{copyStatus}</p>
    </div>
  );
}
