import React from "react";

export default function TeamFormStrip({ form = [], isMobile, theme }) {
  return <div style={{
    display: "grid",
    gridTemplateColumns: isMobile ? "repeat(5, minmax(0, 1fr))" : "repeat(5, minmax(54px, 1fr))",
    gap: isMobile ? 4 : 6,
    minWidth: 0,
  }}>
    {form.length ? form.map(item => {
      const outcomeColor = item.outcome === "W" ? "#22c55e" : item.outcome === "D" ? "#eab308" : "#ef4444";
      return <div key={`form-${item.fixtureId}`} style={{
        minWidth: 0, width: "100%", padding: isMobile ? "5px 3px" : "6px 8px",
        borderRadius: 10, background: outcomeColor, color: outcomeColor === "#eab308" ? "#111827" : "#ffffff",
        display: "flex", flexDirection: "column", gap: 1, alignItems: "center", justifyContent: "center",
        minHeight: isMobile ? 36 : 48, boxSizing: "border-box",
      }}>
        <div style={{ fontWeight: 800, fontSize: isMobile ? 11 : 12, lineHeight: 1, textAlign: "center" }}>{item.outcome}</div>
        <div style={{ fontSize: isMobile ? 9 : 11, fontWeight: 700, lineHeight: 1.05, textAlign: "center" }}>
          {item.opponentCode}<br />{item.venue}
        </div>
      </div>;
    }) : <div style={{ fontSize: 12, color: theme.muted }}>No completed fixtures yet.</div>}
  </div>;
}
