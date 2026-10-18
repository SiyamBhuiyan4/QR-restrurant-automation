import React, { useEffect } from 'react';

// Fixed full-screen canvas drawn by public/river-background.js (WebGL, 2D fallback).
// The script looks up #village-river-bg, so the canvas must be in the DOM first.
const RIVER_CSS = `
  #village-river-bg {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    display: block;
    z-index: -1;
    pointer-events: none;
    background: #0b3a4f;
  }
`;

export default function RiverBackground() {
  useEffect(() => {
    // Load the script once; StrictMode and remounts must not start a second loop.
    if (document.querySelector('script[data-river-bg]')) return;
    const script = document.createElement('script');
    script.src = '/river-background.js';
    script.async = true;
    script.dataset.riverBg = 'true';
    document.body.appendChild(script);
  }, []);

  return (
    <>
      <style>{RIVER_CSS}</style>
      <canvas id="village-river-bg" />
    </>
  );
}
