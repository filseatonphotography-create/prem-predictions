import React from "react";

export default function StudioEventIcon({ icon, theme }) {
  return <span aria-hidden="true" style={{
    width: 22,
    height: 22,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.08)",
    border: `1px solid ${theme.line}`,
    flex: "0 0 auto",
    fontSize: 14,
    lineHeight: 1,
  }}>{icon || "•"}</span>;
}
