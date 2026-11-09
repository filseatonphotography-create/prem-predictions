import React, { useEffect, useState } from "react";
import "./AppBrand.css";

// Shared by both competition headers; switching modes must not replay the intro.
// A full page load resets this, without persisting anything in browser storage.
let hasShownBrandIntro = false;

export default function AppBrand({ isMobile, tagline }) {
  const [showIntro] = useState(() => !hasShownBrandIntro);

  useEffect(() => {
    hasShownBrandIntro = true;
  }, []);

  return (
    <div className={`app-brand${isMobile ? " app-brand--compact" : ""}${showIntro ? " app-brand--intro" : ""}`}>
      <h1 className="app-brand__logo" aria-label="Prediction Addiction">
        <span className="app-brand__crest" aria-hidden="true">
          <svg viewBox="0 0 80 88" fill="none" focusable="false">
            <path className="app-brand__shield" d="M40 3 74 15v28c0 19-15 32-34 42C21 75 6 62 6 43V15L40 3Z" />
            <path className="app-brand__shield-inset" d="m40 10 27 10v23c0 15-12 26-27 35C25 69 13 58 13 43V20l27-10Z" />
            <path className="app-brand__monogram-p" fillRule="evenodd" d="M22 27h19c9 0 14 4 14 12S50 52 41 52h-9v12H22V27Zm10 9v7h9c3 0 4-1 4-4s-1-3-4-3h-9Z" />
            <path className="app-brand__monogram-a" fillRule="evenodd" d="M48 37h9l12 27H58l-2-5H45l-2 5H32l16-27Zm4 10-4 6h6l-2-6Z" />
            <path className="app-brand__crest-detail" d="M29 18h22M35 71l5 3 5-3" />
          </svg>
        </span>
        <span className="app-brand__wordmark" aria-hidden="true">
          <span className="app-brand__prediction">Prediction</span>
          <span className="app-brand__addiction">Addiction</span>
          <span className="app-brand__light" />
        </span>
      </h1>
      {tagline && <p className="app-brand__tagline">{tagline}</p>}
    </div>
  );
}
