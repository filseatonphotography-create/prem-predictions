import React from "react";

export default function FixturePointsBox({ points, prediction, live = false, isMobile, theme, inputStyle }) {
  const available = points != null;
  const boosted = prediction?.isTriple || prediction?.isDouble;
  const background = !available ? theme.panel
    : prediction?.isTriple ? "#ffd700"
    : prediction?.isDouble ? "#C0C0C0"
    : points === 0 ? "#e74c3c" : "#2ecc71";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
      <div style={{ fontSize: 10, textAlign: "center", color: live ? "#22c55e" : theme.muted, marginBottom: 2, lineHeight: "10px", whiteSpace: "nowrap" }}>
        {live ? "LIVE POINTS" : "POINTS"}
      </div>
      <div
        role="status"
        aria-label={available ? `${points} ${live ? "live " : ""}points` : "Points not available yet"}
        style={{
          ...inputStyle,
          minHeight: isMobile ? 32 : 34,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          background,
          color: !available ? theme.text : boosted ? "#000" : "#fff",
          transition: "background-color 200ms ease, color 200ms ease",
        }}
      >
        {available ? points : "—"}
      </div>
    </div>
  );
}
