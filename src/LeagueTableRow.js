import React from 'react';
import StudioTeamBadge from './StudioTeamBadge';

export default function LeagueTableRow({ row, teamName, badgeSrc, borderColor, first, expanded, onToggle, isMobile, theme, children }) {
  return <div data-league-team-id={row.team?.id} style={{ background: theme.panelHi, border: `2px solid ${borderColor || theme.line}`, borderRadius: 12, overflow: 'hidden' }}>
    <div role="button" tabIndex={0} aria-expanded={expanded} aria-label={`${teamName} details`} onClick={onToggle}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onToggle(); } }}
      style={{ display: 'grid', gridTemplateColumns: isMobile ? '36px auto 78px' : '42px auto 158px', gap: 10, alignItems: 'center', padding: isMobile ? '10px 12px' : '12px 14px', cursor: 'pointer' }}>
      <div style={{ minWidth: 0 }}><div style={{ color: first ? '#FFD700' : theme.muted, fontWeight: 800, fontSize: 16, textAlign: 'center' }}>{row.position}</div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <StudioTeamBadge src={badgeSrc} team={teamName} size={isMobile ? 28 : 32} />
        <div style={{ minWidth: 0 }}>
          <div title={row.team?.name || teamName} style={{ fontWeight: 700, fontSize: isMobile ? 14 : 15, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teamName}</div>
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>P {row.playedGames ?? 0} GD {row.goalDifference ?? 0}</div>
        </div>
        <div style={{ marginLeft: 'auto', color: theme.muted, fontSize: 14, fontWeight: 700 }}>{expanded ? '▲' : '▼'}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: 6, textAlign: 'center' }}>
        {[{ label: 'W', value: row.won }, { label: 'D', value: row.draw }, { label: 'L', value: row.lost }, { label: 'PTS', value: row.points, accent: true }].map(stat => <div key={stat.label}>
          <div style={{ fontSize: 10, color: theme.muted, letterSpacing: 0.3 }}>{stat.label}</div>
          <div style={{ fontWeight: 800, fontSize: stat.accent ? 16 : 14, color: stat.accent ? theme.accent : theme.text }}>{stat.value ?? 0}</div>
        </div>)}
      </div>
    </div>
    {children}
  </div>;
}
