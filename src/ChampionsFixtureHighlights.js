import React, { useEffect, useId, useState } from 'react';
import { OfficialHighlightLink } from './FixtureHighlights';
import { findChampionsHighlight, loadChampionsHighlights, UEFA_HIGHLIGHTS } from './championsHighlights';

function ChampionsHighlightLinks({ match, theme }) {
  const [catalogue, setCatalogue] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadChampionsHighlights().then(
      results => { if (!cancelled) setCatalogue(results); },
      () => { if (!cancelled) setCatalogue([]); }
    );
    return () => { cancelled = true; };
  }, []);
  if (!catalogue) return <div role="status">Checking for highlights…</div>;

  const clip = findChampionsHighlight(catalogue, match);
  return <OfficialHighlightLink href={clip?.url || UEFA_HIGHLIGHTS} thumbnail={clip?.thumbnail}
    title={clip ? '▶ Watch match highlights ↗' : 'Browse UEFA highlights ↗'}
    source={clip ? 'UEFA.com · Sign-in or regional restrictions may apply' : 'UEFA.com · Direct clip unavailable in this list'}
    theme={theme} />;
}

export default function ChampionsFixtureHighlights({ match, theme }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
      <button type="button" aria-expanded={open} aria-controls={id}
        aria-label={`Highlights for ${match.homeTeam.name} vs ${match.awayTeam.name}`}
        onClick={() => setOpen(current => !current)}
        style={{ background: 'none', border: 0, color: theme.accent, cursor: 'pointer', fontSize: 12, padding: '5px 8px' }}>
        Highlights <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      <div id={id} hidden={!open} style={{ textAlign: 'left', paddingTop: 4 }}>
        {open && <ChampionsHighlightLinks match={match} theme={theme} />}
      </div>
    </div>
  );
}
