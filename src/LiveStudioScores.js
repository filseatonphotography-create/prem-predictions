import React from "react";

function Team({ team, away, size }) {
  const badge = team.flag ? <span aria-hidden="true" style={{ fontSize: size }}>{team.flag}</span>
    : team.badge ? <img src={team.badge} alt="" style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} /> : null;
  const code = <abbr title={team.name} style={{ textDecoration: "none", fontWeight: 900 }}>{team.code}</abbr>;
  return <div style={{ display: "flex", alignItems: "center", justifyContent: away ? "flex-start" : "flex-end", gap: 6, minWidth: 0 }}>
    {away ? code : badge}{away ? badge : code}
  </div>;
}

export default function LiveStudioScores({ matches = [], theme, isMobile }) {
  return <div role="list" aria-label="Scores around the grounds" style={{ display: "grid", gap: 7, marginTop: 10 }}>
    {matches.map(match => <div key={match.id} role="listitem"
      aria-label={`${match.home.name} ${match.score.homeGoals}, ${match.away.name} ${match.score.awayGoals}${match.status ? `, ${match.status}` : ""}`}
      style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", alignItems: "center", gap: isMobile ? 7 : 12, padding: "8px 4px", borderRadius: 8, background: theme.panelHi, color: theme.text, fontSize: isMobile ? 15 : 17 }}>
      <Team team={match.home} size={isMobile ? 24 : 28} />
      <div style={{ textAlign: "center", fontVariantNumeric: "tabular-nums", minWidth: 49 }}>
        <div style={{ fontSize: isMobile ? 21 : 24, fontWeight: 950, whiteSpace: "nowrap" }}>{match.score.homeGoals} – {match.score.awayGoals}</div>
      </div>
      <Team team={match.away} size={isMobile ? 24 : 28} away />
    </div>)}
  </div>;
}
