import { useEffect, useRef } from 'react';
import '../styles/village-bg.css';

/**
 * VillageBackground: a calm Bengal village at dusk behind the customer menu.
 * Palm and banyan trees, a cow grazing, kash flowers and wildflowers swaying in the
 * wind, kash seeds drifting across, a few birds.
 *
 * Light by design: one inline SVG drawn once; only a handful of groups animate, and
 * only with CSS transform/opacity. Animations pause while the page scrolls, when the
 * tab is hidden, and for people who prefer reduced motion.
 */

// Kash clumps: x position, base y, scale, sway delay (s)
const KASH = [
  [40, 800, 1.15, 0], [150, 806, 0.95, 0.6], [260, 812, 1.05, 1.2],
  [930, 806, 1.1, 0.3], [1040, 800, 1.2, 0.9], [1150, 812, 0.95, 1.5],
  [560, 818, 0.8, 0.4], [760, 820, 0.75, 1.1]
];

// Floating kash seeds: start x, start y, duration, delay, drift distance
const SEEDS = [
  [1120, 690, 19, 0, 1], [1040, 720, 23, 3, 0.9], [980, 700, 21, 7, 1.1],
  [1180, 740, 25, 10, 0.8], [1080, 760, 20, 13, 1], [900, 730, 24, 2, 0.95],
  [300, 720, 22, 5, 0.6], [220, 700, 26, 9, 0.7], [160, 740, 21, 12, 0.5],
  [1150, 680, 27, 16, 1.2], [1010, 750, 18, 18, 0.85], [860, 760, 23, 20, 0.9]
];

function KashClump({ x, y, s, delay }) {
  // Stems fan out from one base; plumes are soft white feathers at the tips
  const stems = [-34, -22, -12, -3, 6, 15, 25, 36];
  return (
    <g
      className={x < 400 ? 'vb-kash-left' : x > 800 ? 'vb-kash-right' : undefined}
      transform={`translate(${x} ${y}) scale(${s})`}
    >
      <g className="vb-sway vb-sway--kash" style={{ animationDelay: `${-delay}s` }}>
        {stems.map((a, i) => {
          const h = 120 + ((i * 37) % 50);
          const rad = (a * Math.PI) / 180;
          const tx = Math.sin(rad) * h;
          const ty = -Math.cos(rad) * h;
          return (
            <g key={i}>
              <path d={`M0 0 Q ${tx * 0.35} ${ty * 0.55} ${tx} ${ty}`} stroke="#6f8a52" strokeWidth="2.2" fill="none" />
              {/* soft feathery plume bending with the wind: a wide faint stroke under a brighter core */}
              <path
                d={`M${tx} ${ty} C ${tx - 2} ${ty - 18} ${tx + 10} ${ty - 36} ${tx + 22 + a * 0.2} ${ty - 52}`}
                stroke="#fffaf0"
                strokeWidth="13"
                strokeLinecap="round"
                fill="none"
                opacity="0.28"
              />
              <path
                d={`M${tx} ${ty} C ${tx - 2} ${ty - 18} ${tx + 10} ${ty - 36} ${tx + 22 + a * 0.2} ${ty - 52}`}
                stroke="url(#vb-kash)"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                opacity="0.9"
              />
            </g>
          );
        })}
        {/* leaves at the base */}
        <path d="M-6 0 Q -40 -40 -70 -48 Q -36 -30 -2 0 Z" fill="#4f6e3c" />
        <path d="M6 0 Q 44 -36 76 -40 Q 40 -24 2 0 Z" fill="#5a7a43" />
      </g>
    </g>
  );
}

export default function VillageBackground({ paused = false }) {
  const rootRef = useRef(null);

  // Depth: pointer (desktop) or phone tilt (where allowed without a prompt) nudges the
  // camera; nearer layers move more. Updates are batched to one per animation frame.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let tx = 0, ty = 0, frame = 0;
    const apply = () => {
      frame = 0;
      root.style.setProperty('--vb-x', tx.toFixed(3));
      root.style.setProperty('--vb-y', ty.toFixed(3));
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(apply); };
    const onPointer = (e) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      queue();
    };
    const onTilt = (e) => {
      if (e.gamma == null || e.beta == null) return;
      tx = Math.max(-1, Math.min(1, e.gamma / 25));
      ty = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
      queue();
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('deviceorientation', onTilt, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onTilt);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Pause all animation while scrolling (the menu is what people look at then)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let timer = 0;
    const onScroll = () => {
      root.classList.add('is-still');
      clearTimeout(timer);
      timer = setTimeout(() => root.classList.remove('is-still'), 200);
    };
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={rootRef} className={`vb-root${paused ? ' is-paused' : ''}`} aria-hidden="true">
      <svg className="vb-svg" viewBox="0 0 1200 860" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="vb-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#081d29" />
            <stop offset="0.45" stopColor="#123f4f" />
            <stop offset="0.68" stopColor="#3f6a6a" />
            <stop offset="0.8" stopColor="#c98b52" />
            <stop offset="0.86" stopColor="#e6ad6a" />
          </linearGradient>
          <radialGradient id="vb-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffe3a8" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="#ffc979" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffb35c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="vb-field" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#56763f" />
            <stop offset="1" stopColor="#24401f" />
          </linearGradient>
          <linearGradient id="vb-kash" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#e9e2cf" />
            <stop offset="1" stopColor="#ffffff" />
          </linearGradient>
          {/* rounded, lit-from-the-sun shading for canopies and the cow */}
          <radialGradient id="vb-canopy" cx="0.38" cy="0.32" r="0.75">
            <stop offset="0" stopColor="#5f9a4c" />
            <stop offset="0.55" stopColor="#36652f" />
            <stop offset="1" stopColor="#1f3d1d" />
          </radialGradient>
          <radialGradient id="vb-canopy-light" cx="0.35" cy="0.3" r="0.7">
            <stop offset="0" stopColor="#7cb85f" />
            <stop offset="1" stopColor="#3d7038" />
          </radialGradient>
          <linearGradient id="vb-frond" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5d8f45" />
            <stop offset="1" stopColor="#2c5226" />
          </linearGradient>
          <radialGradient id="vb-cow" cx="0.4" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#fffaf1" />
            <stop offset="0.7" stopColor="#ece1cf" />
            <stop offset="1" stopColor="#c9b89c" />
          </radialGradient>
          <linearGradient id="vb-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3b2a1e" />
            <stop offset="0.45" stopColor="#6b4e36" />
            <stop offset="1" stopColor="#3b2a1e" />
          </linearGradient>
          <radialGradient id="vb-shadow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#0d1f0c" stopOpacity="0.55" />
            <stop offset="1" stopColor="#0d1f0c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="vb-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9fc4c4" stopOpacity="0" />
            <stop offset="1" stopColor="#d9b88a" stopOpacity="0.35" />
          </linearGradient>
          <radialGradient id="vb-seed" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky and setting sun */}
        <rect width="1200" height="860" fill="url(#vb-sky)" />
        {/* FAR layer: sun, birds, hills (moves least) */}
        <g className="vb-layer vb-layer--far">
        <g className="vb-sunwrap">
          <circle cx="800" cy="610" r="150" fill="url(#vb-sun)" />
          <circle cx="800" cy="612" r="34" fill="#ffe2a6" opacity="0.9" />
        </g>

        {/* Birds gliding home */}
        <g className="vb-birds" fill="none" stroke="#1d2f33" strokeWidth="2.4" strokeLinecap="round">
          <path className="vb-bird" d="M0 0 q 9 -8 18 0 q 9 -8 18 0" transform="translate(520 300)" />
          <path className="vb-bird vb-bird--2" d="M0 0 q 7 -6 14 0 q 7 -6 14 0" transform="translate(568 322)" />
          <path className="vb-bird vb-bird--3" d="M0 0 q 6 -5 12 0 q 6 -5 12 0" transform="translate(600 290)" />
        </g>

        {/* Far hills and village huts */}
        <path d="M-80 645 L 0 640 Q 160 580 330 615 T 650 610 T 960 600 T 1200 615 L 1280 620 V 700 H -80 Z" fill="#2b4f45" opacity="0.85" />
        <g fill="#1e3a33">
          <path d="M300 622 l 26 -22 l 26 22 z" /><rect x="306" y="621" width="40" height="16" />
          <path d="M352 626 l 20 -17 l 20 17 z" /><rect x="357" y="625" width="30" height="12" />
          <path d="M890 612 l 24 -20 l 24 20 z" /><rect x="896" y="611" width="36" height="15" />
          {/* distant tree line */}
          <circle cx="420" cy="618" r="16" /><circle cx="440" cy="612" r="20" /><circle cx="462" cy="620" r="14" />
          <circle cx="960" cy="606" r="15" /><circle cx="982" cy="600" r="19" /><circle cx="1004" cy="608" r="13" />
          <circle cx="150" cy="624" r="14" /><circle cx="168" cy="618" r="18" />
        </g>

          {/* atmospheric haze: distant things fade toward the sky colour */}
          <rect x="-80" y="560" width="1360" height="100" fill="url(#vb-haze)" />
        </g>

        {/* MID layer: field and trees */}
        <g className="vb-layer vb-layer--mid">
        {/* Field */}
        <path d="M-80 674 L 0 670 Q 300 640 600 660 T 1200 650 L 1280 652 V 900 H -80 Z" fill="url(#vb-field)" />
        <path d="M-80 722 L 0 720 Q 280 700 620 716 T 1200 708 L 1280 708 V 900 H -80 Z" fill="#2f5229" opacity="0.7" />

        {/* Left: coconut palm */}
        <g className="vb-palm" transform="translate(120 760)">
          <ellipse cx="20" cy="4" rx="90" ry="14" fill="url(#vb-shadow)" />
          <path d="M0 0 C 10 -120 -10 -250 34 -360" stroke="url(#vb-trunk)" strokeWidth="16" fill="none" strokeLinecap="round" />
          <path d="M0 0 C 10 -120 -10 -250 34 -360" stroke="#7a5a3e" strokeWidth="6" fill="none" strokeDasharray="4 10" />
          <g className="vb-sway vb-sway--palm" style={{ transformOrigin: '48% 50%' }}>
            <g fill="url(#vb-frond)">
              <path d="M34 -360 Q -40 -400 -110 -350 Q -40 -380 34 -352 Z" />
              <path d="M34 -360 Q -20 -440 -60 -470 Q -6 -420 38 -356 Z" />
              <path d="M34 -360 Q 90 -440 150 -450 Q 90 -410 36 -354 Z" />
              <path d="M34 -360 Q 120 -380 190 -330 Q 110 -360 36 -350 Z" />
              <path d="M34 -360 Q 70 -300 110 -250 Q 58 -300 30 -352 Z" />
              <path d="M34 -360 Q -10 -300 -50 -260 Q 4 -300 30 -354 Z" />
            </g>
            <circle cx="30" cy="-350" r="8" fill="#6b5a2a" /><circle cx="42" cy="-346" r="7" fill="#7a672f" />
          </g>
        </g>

        {/* Right: big banyan-like tree */}
        <g className="vb-banyan" transform="translate(1080 770)">
          <ellipse cx="0" cy="4" rx="170" ry="20" fill="url(#vb-shadow)" />
          <path d="M-14 0 C -10 -80 -20 -150 0 -210 L 18 -210 C 30 -150 20 -80 26 0 Z" fill="#4a3627" />
          <path d="M2 -150 C -40 -170 -70 -190 -90 -230" stroke="#4a3627" strokeWidth="10" fill="none" />
          <path d="M14 -170 C 50 -190 80 -205 100 -240" stroke="#4a3627" strokeWidth="9" fill="none" />
          <g className="vb-sway vb-sway--tree" style={{ transformOrigin: '49% 84%' }}>
            <g fill="url(#vb-canopy)">
              <circle cx="-90" cy="-260" r="62" /><circle cx="-20" cy="-300" r="78" />
              <circle cx="70" cy="-280" r="70" /><circle cx="120" cy="-230" r="52" />
              <circle cx="-130" cy="-210" r="44" />
            </g>
            <g fill="url(#vb-canopy-light)" opacity="0.9">
              <circle cx="-60" cy="-290" r="40" /><circle cx="20" cy="-330" r="44" /><circle cx="90" cy="-300" r="36" />
            </g>
            {/* little flowers on the tree */}
            <g fill="#f2a1b5">
              <circle cx="-40" cy="-250" r="4" /><circle cx="40" cy="-270" r="4" /><circle cx="100" cy="-245" r="4" />
              <circle cx="-100" cy="-230" r="4" /><circle cx="0" cy="-300" r="4" />
            </g>
          </g>
        </g>

        </g>

        {/* NEAR layer: cow and wildflowers */}
        <g className="vb-layer vb-layer--near">
        {/* Cow grazing */}
        <g transform="translate(600 712)">
          <ellipse cx="0" cy="48" rx="70" ry="9" fill="#1d3518" opacity="0.5" />
          {/* tail */}
          <g className="vb-tail" style={{ transformOrigin: '0% 0%' }}>
            <path d="M50 -6 Q 64 8 60 36" stroke="#d8cab3" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <ellipse cx="60" cy="40" rx="4" ry="7" fill="#5b4330" />
          </g>
          {/* legs */}
          <g fill="#e6dac6">
            <rect x="-36" y="10" width="9" height="34" rx="3" /><rect x="-20" y="12" width="9" height="32" rx="3" />
            <rect x="22" y="10" width="9" height="34" rx="3" /><rect x="36" y="12" width="9" height="32" rx="3" />
          </g>
          <g fill="#3a2a1e">
            <rect x="-36" y="40" width="9" height="5" /><rect x="-20" y="40" width="9" height="5" />
            <rect x="22" y="40" width="9" height="5" /><rect x="36" y="40" width="9" height="5" />
          </g>
          {/* body */}
          <ellipse cx="4" cy="0" rx="54" ry="26" fill="url(#vb-cow)" />
          <ellipse cx="-8" cy="-8" rx="14" ry="9" fill="#7a5638" />
          <ellipse cx="26" cy="6" rx="10" ry="7" fill="#7a5638" />
          <ellipse cx="14" cy="22" rx="8" ry="4" fill="#e6b4ae" />
          {/* head and neck, lowered to the grass and lifting now and then */}
          <g className="vb-graze" style={{ transformOrigin: '81% 11%' }}>
            <path d="M-44 -16 Q -64 -4 -70 22 L -54 26 Q -50 4 -34 6 Z" fill="#ece2d1" />
            <ellipse cx="-70" cy="30" rx="13" ry="16" fill="#efe5d5" transform="rotate(18 -70 30)" />
            <ellipse cx="-76" cy="42" rx="8" ry="6" fill="#d9a69c" />
            <path d="M-62 16 l 10 -10" stroke="#cdbb9e" strokeWidth="3" strokeLinecap="round" />
            <path d="M-78 18 l -8 -8" stroke="#cdbb9e" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="-56" cy="22" rx="7" ry="3.5" fill="#d8cbb4" transform="rotate(-20 -56 22)" />
            <circle cx="-72" cy="28" r="1.8" fill="#2a1f17" />
          </g>
          {/* grass the cow is eating */}
          <g className="vb-sway vb-sway--grass" >
            <path d="M-90 50 q 2 -16 -4 -26 M-82 50 q 0 -18 6 -28 M-74 50 q -2 -14 -8 -22" stroke="#6f9a46" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
        </g>

        {/* Wildflowers */}
        <g className="vb-sway vb-sway--flowers" >
          {[[360, 790], [395, 800], [430, 786], [470, 798], [505, 788]].map(([fx, fy], i) => (
            <g key={i}>
              <path d={`M${fx} ${fy + 40} Q ${fx + 4} ${fy + 18} ${fx} ${fy}`} stroke="#5f8a3f" strokeWidth="2" fill="none" />
              <circle cx={fx} cy={fy} r="6" fill={i % 2 ? '#f2c14e' : '#e8665a'} />
              <circle cx={fx} cy={fy} r="2.4" fill="#5b3a1d" />
            </g>
          ))}
        </g>
        <g className="vb-sway vb-sway--flowers" style={{ animationDelay: '-1.4s' }}>
          {[[760, 800], [792, 792], [826, 804], [858, 794]].map(([fx, fy], i) => (
            <g key={i}>
              <path d={`M${fx} ${fy + 40} Q ${fx - 4} ${fy + 18} ${fx} ${fy}`} stroke="#5f8a3f" strokeWidth="2" fill="none" />
              <circle cx={fx} cy={fy} r="5.5" fill={i % 2 ? '#e8665a' : '#f6e7a1'} />
              <circle cx={fx} cy={fy} r="2.2" fill="#5b3a1d" />
            </g>
          ))}
        </g>

        </g>

        {/* FRONT layer: kash flowers and drifting seeds (moves most) */}
        <g className="vb-layer vb-layer--front">
        {/* Kash flower clumps */}
        {KASH.map(([x, y, s, d], i) => <KashClump key={i} x={x} y={y} s={s} delay={d} />)}

        {/* Kash seeds drifting on the wind */}
        <g>
          {SEEDS.map(([x, y, dur, delay, dist], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <g
                className="vb-seed"
                style={{ animationDuration: `${dur}s`, animationDelay: `${-delay}s`, '--vb-dist': dist }}
              >
                <circle r="6" fill="url(#vb-seed)" />
                <path d="M0 0 l -7 -5 M0 0 l -8 1 M0 0 l -6 6 M0 0 l 3 -7" stroke="#ffffff" strokeWidth="0.8" opacity="0.8" />
              </g>
            </g>
          ))}
        </g>

        </g>

        {/* Soft darkening at the top so menu text stays easy to read */}
        <rect width="1200" height="860" fill="#06141c" opacity="0.18" />
      </svg>
    </div>
  );
}
