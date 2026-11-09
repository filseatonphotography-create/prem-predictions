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
          <img src="/icon_180.png" alt="" width="180" height="180" />
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
