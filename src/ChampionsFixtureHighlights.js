import React, { useId, useState } from 'react';
import FixtureHighlights from './FixtureHighlights';

export default function ChampionsFixtureHighlights({ match, theme, base }) {
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
        {open && <FixtureHighlights fixtureId={`cl:${match.id}`} finished active base={base} theme={theme}
          searchQuery={`${match.homeTeam.name} vs ${match.awayTeam.name} Champions League official highlights ${match.utcDate?.slice(0, 10) || ''}`.trim()} />}
      </div>
    </div>
  );
}
