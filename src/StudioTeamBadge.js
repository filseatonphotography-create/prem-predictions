import React, { useState } from 'react';

export default function StudioTeamBadge({ src, team, size = 18, fallback = null, decorative = false }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (!src || failedSrc === src) return fallback;
  return <img src={src} alt={decorative ? '' : team} loading="lazy" referrerPolicy="no-referrer"
    onError={() => setFailedSrc(src)} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0, verticalAlign: 'middle' }} />;
}
