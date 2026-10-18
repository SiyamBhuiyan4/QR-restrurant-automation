/*  Realistic River Background — WebGL
    Layer: nodir tola (bali + 3D pathor + shewla) -> dulte thaka ghash -> koi mach
           -> WebGL: panir prisstho (refraction), surjer alor jal (caustics), dheu (ripple), alo-chaya
    WebGL na thakle simple 2D version dekhabe.                                              */
(function () {
  'use strict';

  // ===== Settings (ichchhe moto bodlate paro) =====
  const CONFIG = {
    QUALITY: 1,             // 1 = fast (mobile), 1.5 = beshi sharp
    FISH_COUNT: 12,         // boro screen e eto ta, mobile e ektu kom
    CRAB_COUNT: 4,          // nodir tolay kakra
    STONE_DENSITY: 1,       // 0.5 = kom pathor, 1.5 = beshi
    GRASS_DENSITY: 1.9,      // ghash koto beshi (1 = kom, 2.5 = khub ghono)
    FLOW_ANGLE: -2.3,       // srot er dik (radian). -2.3 = upore-bame
    FLOW_SPEED: 14,         // srot er gati (px / sec)
    CAUSTIC_STRENGTH: 1,    // alor jal koto ujjol
    AUTO_RIPPLES: true      // majhe majhe nijei dheu (mach / brishti-r foter moto)
  };

  const canvas = document.getElementById('village-river-bg');
  if (!canvas) return;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOTION = reduceMotion ? 0.35 : 1;

  // ---------- helpers ----------
  const rnd = (a, b) => a + Math.random() * (b - a);
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  const mk = () => document.createElement('canvas');

  const LIGHT = { x: -0.6, y: -0.8 };   // alo ashche upore-bam theke
  const FX = Math.cos(CONFIG.FLOW_ANGLE), FY = Math.sin(CONFIG.FLOW_ANGLE);

  // offscreen layers
  const bed = mk(), grassC = mk(), fishC = mk(), crabC = mk(), scene = mk(), gShadow = mk(), fShadow = mk();
  const crabX = crabC.getContext('2d');
  const bedX = bed.getContext('2d'), grassX = grassC.getContext('2d'), fishX = fishC.getContext('2d');
  const sceneX = scene.getContext('2d'), gsX = gShadow.getContext('2d'), fsX = fShadow.getContext('2d');

  let W = 0, H = 0, Q = 1, PW = 0, PH = 0;
  let T = 0;
  const stones = [], blades = [], fishes = [], crabs = [], foods = [];
  const mouse = { x: -1e5, y: -1e5 };

  // ripple ring buffer -> shader e jay
  const MAXR = 24;
  const rip = new Float32Array(MAXR * 4);
  let ripI = 0;
  function addRipple(x, y, amp) {
    rip[ripI * 4] = x; rip[ripI * 4 + 1] = y; rip[ripI * 4 + 2] = T; rip[ripI * 4 + 3] = amp;
    ripI = (ripI + 1) % MAXR;
  }

  // smooth closed shape through points
  function smoothClosed(c, pts) {
    const n = pts.length;
    const m0x = (pts[n - 1].x + pts[0].x) / 2, m0y = (pts[n - 1].y + pts[0].y) / 2;
    c.moveTo(m0x, m0y);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      c.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
    }
    c.closePath();
  }

  // =====================================================================
  // ১. নদীর তলদেশ: bali, nuri, 3D pathor, shewla (ekbar-i aka hoy)
  // =====================================================================
  const STONE_PALS = [
    ['#b4b89a', '#7f8469', '#43473a'],  // grey-green
    ['#c2b092', '#8c7d64', '#4a4134'],  // sandstone
    ['#a9b1b6', '#737b80', '#3a4145'],  // blue granite
    ['#979b85', '#666a58', '#33362d'],  // dark slate
    ['#b8ad96', '#867c6b', '#4a4338']   // pale river stone
  ];

  function genStones() {
    stones.length = 0;
    const area = (W * H) / (1920 * 1080);
    const s = Math.max(0.8, Math.sqrt(W * H) / 1440);
    const clusters = [];
    const cn = Math.round(4 + 3 * Math.sqrt(area));
    for (let i = 0; i < cn; i++) clusters.push({ x: rnd(-0.05, 1.05) * W, y: rnd(-0.05, 1.05) * H, r: rnd(170, 360) * s });
    const target = Math.round((W * H) / 5200 * CONFIG.STONE_DENSITY);
    let tries = 0;
    while (stones.length < target && tries < target * 25) {
      tries++;
      let x, y, inCl = Math.random() < 0.82;
      if (inCl) { const cl = pick(clusters); x = cl.x + gauss() * cl.r * 0.7; y = cl.y + gauss() * cl.r * 0.6; }
      else { x = Math.random() * W; y = Math.random() * H; }
      const r = (16 + 54 * Math.pow(Math.random(), 1.25)) * s * (inCl ? 1 : 0.65);
      let ok = true;
      for (const o of stones) { const dx = o.x - x, dy = o.y - y; if (dx * dx + dy * dy < Math.pow((r + o.r) * 0.64, 2)) { ok = false; break; } }
      if (!ok) continue;
      const ry = r * rnd(0.62, 0.92);
      const pts = [];
      const np = 10;
      for (let a = 0; a < np; a++) {
        const th = (a / np) * Math.PI * 2, m = rnd(0.86, 1.1);
        pts.push({ x: Math.cos(th) * r * m, y: Math.sin(th) * ry * m });
      }
      stones.push({ x, y, r, ry, rot: Math.random() * Math.PI, pts, pal: pick(STONE_PALS), moss: Math.random() < 0.6 });
    }
    stones.sort((a, b) => a.y - b.y);   // upore gulo age, nicher gulo upore -> depth
    return clusters;
  }

  function drawStone(c, st) {
    const { r, ry, rot, pts, pal } = st;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const lx = LIGHT.x * cr + LIGHT.y * sr, ly = -LIGHT.x * sr + LIGHT.y * cr; // local light dir
    c.save();
    c.translate(st.x, st.y);
    c.rotate(rot);

    // contact shadow (narom chaya)
    c.save();
    c.shadowColor = 'rgba(8,14,10,0.55)';
    c.shadowBlur = r * 0.5 * Q;
    c.shadowOffsetX = r * 0.2 * Q;
    c.shadowOffsetY = r * 0.28 * Q;
    c.beginPath(); smoothClosed(c, pts);
    c.fillStyle = pal[2]; c.fill();
    c.restore();

    // body
    const g = c.createRadialGradient(lx * r * 0.45, ly * ry * 0.45, r * 0.05, lx * r * 0.12, ly * ry * 0.12, r * 1.15);
    g.addColorStop(0, pal[0]); g.addColorStop(0.55, pal[1]); g.addColorStop(1, pal[2]);
    c.beginPath(); smoothClosed(c, pts);
    c.fillStyle = g; c.fill();

    c.save();
    c.beginPath(); smoothClosed(c, pts); c.clip();

    // mottling
    for (let i = 0; i < 9; i++) {
      const bx = (Math.random() - 0.5) * r * 1.6, by = (Math.random() - 0.5) * ry * 1.6, br = r * rnd(0.2, 0.55);
      const mg = c.createRadialGradient(bx, by, 0, bx, by, br);
      mg.addColorStop(0, Math.random() < 0.5 ? 'rgba(0,0,0,0.13)' : 'rgba(255,250,235,0.09)');
      mg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = mg; c.fillRect(-r, -ry, r * 2, ry * 2);
    }
    // speckles
    const sp = Math.round(r * 1.8);
    for (let i = 0; i < sp; i++) {
      c.fillStyle = Math.random() < 0.55 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.13)';
      c.beginPath(); c.arc((Math.random() - 0.5) * r * 2, (Math.random() - 0.5) * ry * 2, rnd(0.4, 1.3), 0, Math.PI * 2); c.fill();
    }
    // quartz vein
    if (Math.random() < 0.15) {
      c.strokeStyle = 'rgba(232,226,210,0.28)'; c.lineWidth = rnd(0.8, 1.8);
      c.beginPath(); c.moveTo(-r, rnd(-ry, ry) * 0.5); c.quadraticCurveTo(0, rnd(-ry, ry), r, rnd(-ry, ry) * 0.5); c.stroke();
    }
    // moss / shewla
    if (st.moss) {
      c.fillStyle = 'rgba(70,100,38,0.16)'; c.fillRect(-r, -ry, r * 2, ry * 2);
      const mossCols = ['rgba(86,120,44,0.6)', 'rgba(122,142,58,0.5)', 'rgba(58,94,42,0.6)', 'rgba(156,166,82,0.38)'];
      const centers = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < centers; k++) {
        const cx = lx * r * rnd(0.1, 0.5) + gauss() * r * 0.2, cy = ly * ry * rnd(0.1, 0.5) + gauss() * ry * 0.2;
        const n = Math.round(r * rnd(1.5, 3));
        for (let i = 0; i < n; i++) {
          c.fillStyle = pick(mossCols);
          c.beginPath(); c.arc(cx + gauss() * r * 0.32, cy + gauss() * ry * 0.3, rnd(0.7, 2.8), 0, Math.PI * 2); c.fill();
        }
      }
    }
    // volume shading
    const vg = c.createLinearGradient(lx * r, ly * ry, -lx * r, -ly * ry);
    vg.addColorStop(0, 'rgba(255,255,255,0.12)'); vg.addColorStop(0.5, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    c.fillStyle = vg; c.fillRect(-r * 1.2, -ry * 1.2, r * 2.4, ry * 2.4);
    // wet highlight
    const hx = lx * r * 0.42, hy = ly * ry * 0.42;
    const hg = c.createRadialGradient(hx, hy, 0, hx, hy, r * 0.38);
    hg.addColorStop(0, 'rgba(255,255,255,0.22)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hg; c.fillRect(-r, -ry, r * 2, ry * 2);
    // rim
    c.beginPath(); smoothClosed(c, pts);
    c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 2; c.stroke();
    c.restore();

    c.restore();
  }

  function paintBed() {
    const c = bedX;
    c.setTransform(Q, 0, 0, Q, 0, 0);
    c.globalCompositeOperation = 'source-over';

    // bali-r base
    let g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#5c5846'); g.addColorStop(0.5, '#6e6752'); g.addColorStop(1, '#69634e');
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    // boro narom dag
    const blot = Math.round((W * H) / 9000);
    for (let i = 0; i < blot; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = rnd(40, 230);
      const rg = c.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, Math.random() < 0.55 ? `rgba(38,44,32,${rnd(0.08, 0.2)})` : `rgba(170,158,120,${rnd(0.06, 0.14)})`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = rg; c.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // bali-r dana (per-pixel grain)
    // (getImageData chhara — ekta noise tile pattern hishebe boshano)
    const nt = mk(); nt.width = nt.height = 384;
    const ntx = nt.getContext('2d'), nimg = ntx.createImageData(384, 384), nd = nimg.data;
    for (let i = 0; i < nd.length; i += 4) {
      const light = Math.random() < 0.5, v = light ? 235 : 20;
      nd[i] = v; nd[i + 1] = v; nd[i + 2] = light ? 215 : 20; nd[i + 3] = Math.random() * 34;
    }
    ntx.putImageData(nimg, 0, 0);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = c.createPattern(nt, 'repeat');
    c.fillRect(0, 0, PW, PH);
    c.setTransform(Q, 0, 0, Q, 0, 0);

    const clusters = genStones();

    // chhoto nuri (gravel), cluster er ashe-pashe beshi
    const gravelN = Math.round((W * H) / 600 * CONFIG.STONE_DENSITY);
    for (let i = 0; i < gravelN; i++) {
      let x, y;
      if (Math.random() < 0.6 && clusters.length) { const cl = pick(clusters); x = cl.x + gauss() * cl.r * 0.8; y = cl.y + gauss() * cl.r * 0.7; }
      else { x = Math.random() * W; y = Math.random() * H; }
      const r = rnd(0.8, 3.6), pal = pick(STONE_PALS);
      c.fillStyle = 'rgba(15,18,12,0.45)';
      c.beginPath(); c.ellipse(x + r * 0.35, y + r * 0.45, r, r * 0.8, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = pal[1];
      c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, Math.PI * 2); c.fill();
    }

    for (const st of stones) drawStone(c, st);

    // panir nicher rong (blue-green absorption)
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = '#a4d9e6';
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'screen';
    g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(10,80,120,0.30)'); g.addColorStop(1, 'rgba(30,130,170,0.30)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  }

  // =====================================================================
  // ২. নদীর ঘাস (eelgrass) — lomba fita-r moto pata, srote dole
  // =====================================================================
  function genGrass() {
    blades.length = 0;
    const s = Math.max(0.6, Math.min(W, H) / 900);
    const area = (W * H) / (1600 * 900);
    const meadows = Math.max(2, Math.round(3 * Math.sqrt(area) * CONFIG.GRASS_DENSITY));
    const clumps = [];
    for (let m = 0; m < meadows; m++) {
      const cx = rnd(0.05, 0.95) * W, cy = rnd(0.15, 1.05) * H;
      const n = 5 + Math.floor(Math.random() * 5);
      for (let k = 0; k < n; k++) clumps.push({ x: cx + gauss() * 70 * s, y: cy + gauss() * 55 * s });
    }
    // pathorer pash theke chhoto jhop
    const extra = Math.round(7 * Math.sqrt(area) * CONFIG.GRASS_DENSITY);
    for (let i = 0; i < extra && stones.length; i++) { const st = pick(stones); clumps.push({ x: st.x + rnd(-1, 1) * st.r, y: st.y + st.ry * 0.6 }); }

    for (const cl of clumps) {
      const n = 9 + Math.floor(Math.random() * 10);
      const big = Math.random() < 0.75;
      for (let b = 0; b < n; b++) {
        const tone = rnd(-1, 1);
        const hue = 140 + tone * 12;
        blades.push({
          x: cl.x + gauss() * 6, y: cl.y + gauss() * 6,
          len: rnd(big ? 140 : 70, big ? 320 : 150) * s,
          w: rnd(7, 13) * Math.sqrt(s),
          ang: CONFIG.FLOW_ANGLE + gauss() * 0.32,
          curve: gauss() * 0.45,
          phase: Math.random() * Math.PI * 2,
          freq: rnd(0.7, 1.25),
          amp: rnd(0.1, 0.22),
          twist: Math.random() * Math.PI * 2,
          c0: `hsla(${hue + 8},50%,8%,0.97)`,
          c1: `hsla(${hue},48%,${20 + tone * 4}%,0.94)`,
          c2: `hsla(${hue - 14},42%,${33 + tone * 6}%,0.9)`
        });
      }
    }
    blades.sort((a, b) => a.y - b.y);
  }

  const BN = 12;
  const bL = new Float32Array((BN + 1) * 2), bR = new Float32Array((BN + 1) * 2), bC = new Float32Array((BN + 1) * 2);

  function drawGrass(t) {
    const c = grassX;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, PW, PH);
    c.setTransform(Q, 0, 0, Q, 0, 0);
    for (const b of blades) {
      // srot er "dhakka" puro mathe dheu er moto chhoray
      const gust = Math.sin(t * 0.55 - (b.x * FX + b.y * FY) * 0.0045) * 0.16 + Math.sin(t * 1.3 + b.phase * 0.3) * 0.04;
      let x = b.x, y = b.y;
      const seg = b.len / BN;
      for (let i = 0; i <= BN; i++) {
        const k = i / BN;
        const a = b.ang + b.curve * k + (Math.sin(t * b.freq + b.phase - i * 0.38) * b.amp + gust) * k * 1.4;
        if (i > 0) { x += Math.cos(a) * seg; y += Math.sin(a) * seg; }
        let w = b.w * (1 - k * 0.7) * (0.38 + 0.62 * Math.abs(Math.cos(b.twist + k * 2.2 + gust * 3)));
        if (i === BN) w = 0.25;
        const nx = -Math.sin(a) * w * 0.5, ny = Math.cos(a) * w * 0.5;
        bL[i * 2] = x + nx; bL[i * 2 + 1] = y + ny;
        bR[i * 2] = x - nx; bR[i * 2 + 1] = y - ny;
        bC[i * 2] = x; bC[i * 2 + 1] = y;
      }
      const g = c.createLinearGradient(b.x, b.y, x, y);
      g.addColorStop(0, b.c0); g.addColorStop(0.35, b.c1); g.addColorStop(1, b.c2);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(bL[0], bL[1]);
      for (let i = 1; i <= BN; i++) c.lineTo(bL[i * 2], bL[i * 2 + 1]);
      for (let i = BN; i >= 0; i--) c.lineTo(bR[i * 2], bR[i * 2 + 1]);
      c.closePath();
      c.fill();
      if (b.w > 6) {   // majher shira
        c.strokeStyle = 'rgba(170,225,170,0.12)';
        c.lineWidth = 0.8;
        c.beginPath();
        c.moveTo(bC[2], bC[3]);
        for (let i = 2; i < BN; i++) c.lineTo(bC[i * 2], bC[i * 2 + 1]);
        c.stroke();
      }
    }
  }

  // =====================================================================
  // ৩. কই মাছ (koi) — natural shatar, fin, lej, pattern
  // =====================================================================
  const FN = 14;
  const PROFILE = [0.10, 0.165, 0.2, 0.218, 0.224, 0.22, 0.207, 0.188, 0.163, 0.135, 0.105, 0.078, 0.058, 0.046];
  const KOI_TYPES = [
    { name: 'orange', w: 3, base: ['#ffa042', '#f5711e', '#dc4f17'], fin: [255, 214, 178], edge: 'rgba(110,30,5,' },
    { name: 'kohaku', w: 2, base: ['#fbf7f0', '#f1ebe1', '#e2dacd'], fin: [255, 250, 245], edge: 'rgba(70,78,88,', patches: ['#e5381c', '#d92e16'] },
    { name: 'ogon', w: 1, base: ['#ffe07a', '#f4b73a', '#d48a18'], fin: [255, 236, 170], edge: 'rgba(110,60,5,' },
    { name: 'sanke', w: 1, base: ['#fbf7f0', '#f1ebe1', '#e2dacd'], fin: [255, 250, 245], edge: 'rgba(70,78,88,', patches: ['#e3401f'], spots: true },
    { name: 'tancho', w: 1, base: ['#fdfaf5', '#f2ede4', '#e0d8cb'], fin: [255, 252, 248], edge: 'rgba(70,78,88,', tancho: true }
  ];
  function pickType() {
    const tot = KOI_TYPES.reduce((s, k) => s + k.w, 0);
    let r = Math.random() * tot;
    for (const k of KOI_TYPES) { r -= k.w; if (r <= 0) return k; }
    return KOI_TYPES[0];
  }

  function makeFish(x, y) {
    const s = Math.max(0.75, Math.min(1.25, Math.sqrt(W * H) / 1300));
    const size = rnd(70, 115) * s;
    const type = pickType();
    const dir = Math.random() * Math.PI * 2;
    const seg = size / FN;
    const spine = [], r = [];
    for (let i = 0; i < FN; i++) {
      spine.push({ x: x - Math.cos(dir) * seg * i, y: y - Math.sin(dir) * seg * i });
      r.push({ x: 0, y: 0, a: dir });
    }
    const patches = [];
    if (type.patches) {
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) patches.push({ s: rnd(0.5, 10), lat: rnd(-0.5, 0.5), len: rnd(1.4, 3.6), wid: rnd(0.6, 1.15), col: pick(type.patches), j: [rnd(-0.4, 0.4), rnd(-0.4, 0.4)] });
    }
    const spots = [];
    if (type.spots) for (let i = 0; i < 5; i++) spots.push({ s: rnd(2, 11), lat: rnd(-0.8, 0.8), r: rnd(0.025, 0.05) });
    return {
      size, seg, type, patches, spots, spine, r,
      base: rnd(30, 52) * (size / 90),
      speed: 30, dir, phase: Math.random() * 10, seed: Math.random() * 100,
      amp: 0.6, profile: PROFILE.map(p => p * size),
      feed: null, orbit: 0, orbitR: 0
    };
  }

  function genFish() {
    fishes.length = 0;
    const n = Math.max(4, Math.round(CONFIG.FISH_COUNT * Math.min(1, Math.max(0.8, (W * H) / (1600 * 900)))));
    for (let i = 0; i < n; i++) fishes.push(makeFish(rnd(0.1, 0.9) * W, rnd(0.1, 0.9) * H));
  }

  function updateFish(dt, t) {
    for (const f of fishes) {
      const head = f.spine[0];
      let turn = (Math.sin(t * 0.27 + f.seed) * 0.6 + Math.sin(t * 0.11 + f.seed * 1.7) * 0.8) * 0.5;
      // glide + burst — koi er moto
      let target = f.base * (0.5 + 1.15 * Math.pow(Math.max(0, Math.sin(t * 0.45 + f.seed)), 3));
      const fd = feedTarget(f, head.x, head.y, t);
      if (fd) {
        // khabarer dike shatar
        turn = angDiff(Math.atan2(fd.y - head.y, fd.x - head.x), f.dir) * (fd.win ? 5 : 3);
        target = Math.min(f.base * 2.6, fd.d * 1.6 + f.base * 0.4);
      } else {
        // mouse kache ele palay
        const dx = head.x - mouse.x, dy = head.y - mouse.y, dm = Math.hypot(dx, dy);
        if (dm < 170) {
          turn += angDiff(Math.atan2(dy, dx), f.dir) * 4.5 * (1 - dm / 170);
          target = f.base * 3.4;
        }
      }
      // ekjon arekjoner gaye na lage
      for (const o of fishes) {
        if (o === f) continue;
        const ox = head.x - o.spine[0].x, oy = head.y - o.spine[0].y, od = Math.hypot(ox, oy);
        if (od < f.size * 0.9 && od > 0.01) turn += angDiff(Math.atan2(oy, ox), f.dir) * (fd && fd.win ? 0.25 : 1.2) * (1 - od / (f.size * 0.9));
      }
      f.dir += turn * dt;
      f.speed += (target - f.speed) * Math.min(1, dt * (target > f.speed ? 3 : 0.9));
      const sp = Math.min(1.6, f.speed / f.base);
      f.phase += dt * (2 + sp * 6.5);                    // lej nara-r gati
      f.amp += ((0.35 + 0.5 * Math.min(1, sp)) - f.amp) * Math.min(1, dt * 2);
      const hd = f.dir + Math.sin(f.phase) * 0.05;
      head.x += Math.cos(hd) * f.speed * dt;
      head.y += Math.sin(hd) * f.speed * dt;
      if (fd && fd.win && fd.p) {   // shudhu nearest mach-i khay
        const nx = head.x + Math.cos(f.dir) * f.size * 0.08, ny = head.y + Math.sin(f.dir) * f.size * 0.08;
        if (Math.hypot(nx - fd.p.x, ny - fd.p.y) < f.size * 0.14 + fd.p.r) eatPellet(f.feed, fd.p, f);
      }

      // follow-the-leader body
      for (let i = 1; i < FN; i++) {
        const p = f.spine[i - 1], c = f.spine[i];
        const ex = p.x - c.x, ey = p.y - c.y, d = Math.hypot(ex, ey) || 1;
        c.x = p.x - (ex / d) * f.seg; c.y = p.y - (ey / d) * f.seg;
      }

      // screen er baire gele onno pash theke ashbe
      const m = f.size * 1.6;
      let sx = 0, sy = 0;
      if (head.x < -m) sx = W + 2 * m; else if (head.x > W + m) sx = -(W + 2 * m);
      if (head.y < -m) sy = H + 2 * m; else if (head.y > H + m) sy = -(H + 2 * m);
      if (sx || sy) for (const p of f.spine) { p.x += sx; p.y += sy; }

      // render spine: lej er dike baraano traveling wave (S-curve)
      f.r[0].x = head.x; f.r[0].y = head.y;
      for (let i = 1; i < FN; i++) {
        const p = f.spine[i - 1], c = f.spine[i];
        const k = i / (FN - 1);
        const a = Math.atan2(p.y - c.y, p.x - c.x) + Math.sin(f.phase - i * 0.5) * (0.04 + 0.42 * k * k) * f.amp;
        f.r[i].a = a;
        f.r[i].x = f.r[i - 1].x - Math.cos(a) * f.seg;
        f.r[i].y = f.r[i - 1].y - Math.sin(a) * f.seg;
      }
      f.r[0].a = f.r[1].a;
    }
  }

  function finShape(c, x, y, ang, len, spread, rgb, alpha) {
    c.save();
    c.translate(x, y); c.rotate(ang);
    const g = c.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.25})`);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, -spread * 0.2);
    c.quadraticCurveTo(len * 0.6, -spread * 0.85, len, -spread * 0.3);
    c.quadraticCurveTo(len * 1.08, 0, len * 0.95, spread * 0.38);
    c.quadraticCurveTo(len * 0.5, spread * 0.65, 0, spread * 0.2);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 0.6;
    c.beginPath();
    for (let k = -2; k <= 2; k++) { c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, k * spread * 0.13, len * 0.93, k * spread * 0.15); }
    c.stroke();
    c.restore();
  }

  const fL = [], fR = [];
  for (let i = 0; i < FN; i++) { fL.push({ x: 0, y: 0 }); fR.push({ x: 0, y: 0 }); }

  function drawFish(c, f) {
    const r = f.r, P = f.profile, ty = f.type, S = f.size;
    for (let i = 0; i < FN; i++) {
      const a = r[i].a, nx = -Math.sin(a), ny = Math.cos(a);
      fL[i].x = r[i].x + nx * P[i]; fL[i].y = r[i].y + ny * P[i];
      fR[i].x = r[i].x - nx * P[i]; fR[i].y = r[i].y - ny * P[i];
    }
    const ha = r[0].a;
    const nose = { x: r[0].x + Math.cos(ha) * S * 0.075, y: r[0].y + Math.sin(ha) * S * 0.075 };
    const tl = r[FN - 1];
    const tailEnd = { x: tl.x - Math.cos(tl.a) * S * 0.02, y: tl.y - Math.sin(tl.a) * S * 0.02 };

    // --- fins (shorirer niche) ---
    const flap = Math.sin(f.phase * 0.6 + f.seed) * 0.3;
    for (const side of [-1, 1]) {
      const a3 = r[3].a, n3x = -Math.sin(a3) * side, n3y = Math.cos(a3) * side;
      finShape(c, r[3].x + n3x * P[3] * 0.75, r[3].y + n3y * P[3] * 0.75, a3 + side * (2.2 + flap), S * 0.21, S * 0.14, ty.fin, 0.55);
      const a7 = r[7].a, n7x = -Math.sin(a7) * side, n7y = Math.cos(a7) * side;
      finShape(c, r[7].x + n7x * P[7] * 0.6, r[7].y + n7y * P[7] * 0.6, a7 + side * (2.5 - flap * 0.5), S * 0.12, S * 0.08, ty.fin, 0.45);
    }

    // --- tail (lej) ---
    {
      const ta = tl.a + Math.sin(f.phase - FN * 0.5) * 0.3 * f.amp;
      const len = S * 0.34, spr = S * 0.25;
      const flex = Math.sin(f.phase - FN * 0.5 - 0.8) * spr * 0.28 * f.amp;
      c.save();
      c.translate(tl.x, tl.y); c.rotate(ta + Math.PI);
      const g = c.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, ty.base[2]);
      g.addColorStop(0.25, `rgba(${ty.fin[0]},${ty.fin[1]},${ty.fin[2]},0.75)`);
      g.addColorStop(1, `rgba(${ty.fin[0]},${ty.fin[1]},${ty.fin[2]},0.22)`);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, -P[FN - 1]);
      c.bezierCurveTo(len * 0.35, -spr * 0.35, len * 0.72, -spr * 0.98 + flex, len, -spr * 0.86 + flex);
      c.quadraticCurveTo(len * 0.6, flex * 0.6, len, spr * 0.86 + flex);
      c.bezierCurveTo(len * 0.72, spr * 0.98 + flex, len * 0.35, spr * 0.35, 0, P[FN - 1]);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.6;
      c.beginPath();
      for (let k = -3; k <= 3; k++) {
        const ey = (k / 3) * spr * 0.85 + flex;
        const ex = len * (0.62 + 0.38 * Math.abs(k / 3));
        c.moveTo(len * 0.05, 0); c.quadraticCurveTo(ex * 0.5, ey * 0.4, ex * 0.96, ey * 0.96);
      }
      c.stroke();
      c.restore();
    }

    // --- body ---
    const outline = [nose];
    for (let i = 0; i < FN; i++) outline.push(fL[i]);
    outline.push(tailEnd);
    for (let i = FN - 1; i >= 0; i--) outline.push(fR[i]);
    const bodyPath = () => { c.beginPath(); smoothClosed(c, outline); };

    const bg = c.createLinearGradient(nose.x, nose.y, tl.x, tl.y);
    bg.addColorStop(0, ty.base[0]); bg.addColorStop(0.5, ty.base[1]); bg.addColorStop(1, ty.base[2]);
    bodyPath(); c.fillStyle = bg; c.fill();

    c.save();
    bodyPath(); c.clip();
    // patches (kohaku / sanke)
    for (const p of f.patches) {
      const i0 = Math.min(FN - 2, Math.floor(p.s)), fr = p.s - i0;
      const a = r[i0].a, px = r[i0].x + (r[i0 + 1].x - r[i0].x) * fr, py = r[i0].y + (r[i0 + 1].y - r[i0].y) * fr;
      const w = P[i0], nx = -Math.sin(a), ny = Math.cos(a);
      c.fillStyle = p.col;
      for (let k = 0; k < 3; k++) {
        const off = (k - 1) * f.seg * p.len * 0.35;
        const cx = px - Math.cos(a) * off + nx * w * (p.lat + p.j[k % 2] * 0.3);
        const cy = py - Math.sin(a) * off + ny * w * (p.lat + p.j[k % 2] * 0.3);
        c.beginPath(); c.ellipse(cx, cy, f.seg * p.len * 0.55, w * p.wid * (0.8 + k * 0.1), a, 0, Math.PI * 2); c.fill();
      }
    }
    if (ty.tancho) {   // matha-y lal gol daag
      c.fillStyle = '#e4301a';
      c.beginPath(); c.ellipse(r[2].x, r[2].y, S * 0.065, S * 0.06, r[2].a, 0, Math.PI * 2); c.fill();
    }
    for (const sp of f.spots) {
      const i0 = Math.min(FN - 1, Math.floor(sp.s)), a = r[i0].a;
      c.fillStyle = '#16130f';
      c.beginPath(); c.arc(r[i0].x - Math.sin(a) * P[i0] * sp.lat, r[i0].y + Math.cos(a) * P[i0] * sp.lat, S * sp.r, 0, Math.PI * 2); c.fill();
    }
    // golakar 3D shading — kinara dark, pith-e highlight
    bodyPath();
    c.strokeStyle = ty.edge + '0.14)'; c.lineWidth = S * 0.13; c.stroke();
    c.strokeStyle = ty.edge + '0.18)'; c.lineWidth = S * 0.065; c.stroke();
    c.strokeStyle = ty.edge + '0.22)'; c.lineWidth = S * 0.03; c.stroke();
    c.beginPath(); c.moveTo(r[1].x, r[1].y);
    for (let i = 2; i < 10; i++) c.lineTo(r[i].x, r[i].y);
    c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = S * 0.08; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = S * 0.035; c.stroke();
    // matha-r chakchike bhab
    const hg = c.createRadialGradient(r[1].x, r[1].y, 0, r[1].x, r[1].y, S * 0.13);
    hg.addColorStop(0, 'rgba(255,255,255,0.16)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hg; c.fillRect(r[1].x - S * 0.15, r[1].y - S * 0.15, S * 0.3, S * 0.3);
    c.restore();

    // dorsal fin (pither pakhna)
    c.beginPath(); c.moveTo(r[3].x, r[3].y);
    for (let i = 4; i <= 9; i++) c.lineTo(r[i].x, r[i].y);
    c.strokeStyle = 'rgba(255,246,236,0.32)'; c.lineWidth = S * 0.032; c.lineCap = 'round'; c.stroke();

    // chokh
    const ea = r[1].a, enx = -Math.sin(ea), eny = Math.cos(ea);
    for (const side of [-1, 1]) {
      const ex = r[1].x + enx * P[1] * 0.8 * side, ey = r[1].y + eny * P[1] * 0.8 * side;
      c.fillStyle = '#1a120c';
      c.beginPath(); c.arc(ex, ey, S * 0.019, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.beginPath(); c.arc(ex - S * 0.006, ey - S * 0.006, S * 0.006, 0, Math.PI * 2); c.fill();
    }
  }

  function drawFishLayer() {
    const c = fishX;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, PW, PH);
    c.setTransform(Q, 0, 0, Q, 0, 0);
    drawPellets(c, false);   // panite bhasha khabar
    for (const f of fishes) drawFish(c, f);
  }

  // =====================================================================
  // ৪. কাঁকড়া (kakra) — nodir tolay pash-pash kore hNate, damra nare
  // =====================================================================
  const CRAB_PALS = [
    { light: '#f08a52', mid: '#c4502a', dark: '#702812', leg: '#b5482a', claw: '#d8643a', tip: '#2a130b' },  // lal nodir kakra
    { light: '#ffb070', mid: '#e0702e', dark: '#7a3210', leg: '#cf6a32', claw: '#ef8a48', tip: '#2b1408' },  // kamla
    { light: '#e8a070', mid: '#a8603a', dark: '#4e2814', leg: '#9c5634', claw: '#c47648', tip: '#22140c' },  // badami
    { light: '#9ec4e0', mid: '#4f86ad', dark: '#1f3d58', leg: '#4a7fa3', claw: '#6aa0c4', tip: '#e2602a' }   // nilche, kamla damra-r agha
  ];
  const CRAB_PTS = [[0.92, 0], [0.86, 0.42], [0.62, 0.86], [0.3, 1], [-0.1, 0.92], [-0.55, 0.68], [-0.9, 0.36], [-0.98, 0],
                    [-0.9, -0.36], [-0.55, -0.68], [-0.1, -0.92], [0.3, -1], [0.62, -0.86], [0.86, -0.42]];

  function genCrabs() {
    crabs.length = 0;
    const s = Math.max(0.75, Math.min(1.2, Math.sqrt(W * H) / 1300));
    const n = Math.max(2, Math.round(CONFIG.CRAB_COUNT * Math.min(1, Math.max(0.6, (W * H) / (1600 * 900)))));
    for (let i = 0; i < n; i++) {
      const size = rnd(46, 64) * s;
      const L = size * 0.72;
      crabs.push({
        x: rnd(0.1, 0.9) * W, y: rnd(0.1, 0.9) * H, h: Math.random() * Math.PI * 2,
        size, L, s, pal: CRAB_PALS[i % CRAB_PALS.length],
        pts: CRAB_PTS.map(p => ({ x: p[0] * L / 2, y: p[1] * size / 2 })),
        phase: Math.random() * 10, move: 0, speed: 0, side: 1,
        state: 'idle', timer: rnd(0.5, 3), tx: 0, ty: 0,
        claw: 0, snapAt: rnd(1, 4), snapT: -1, raise: 0, seed: Math.random() * 100,
        isCrab: true, feed: null, orbit: 0, orbitR: 0,
        spots: Array.from({ length: 14 }, () => ({ x: rnd(-0.8, 0.8), y: rnd(-0.85, 0.85), r: rnd(0.6, 1.6), l: Math.random() < 0.5 }))
      });
    }
  }

  function updateCrabs(dt, t) {
    for (const k of crabs) {
      const dm = Math.hypot(k.x - mouse.x, k.y - mouse.y);
      let dirX = 0, dirY = 0, targetSpeed = 0;
      const fd = feedTarget(k, k.x, k.y, t);
      if (fd) {                            // khabarer dike hNata
        k.state = 'feed';
        const stop = fd.win ? k.size * 0.3 : k.size * 0.6;
        if (fd.d > stop) { dirX = (fd.x - k.x) / fd.d; dirY = (fd.y - k.y) / fd.d; targetSpeed = (fd.win ? 60 : 45) * k.s; }
        if (fd.win && fd.p && fd.d < k.size * 0.45) { eatPellet(k.feed, fd.p, k); k.snapT = 0; }
      } else if (k.state === 'feed') {
        k.state = 'idle'; k.timer = rnd(1, 3);
      } else if (dm < 130) {               // mouse dekhe palay
        k.state = 'flee'; k.timer = rnd(1.5, 3);
        dirX = (k.x - mouse.x) / (dm || 1); dirY = (k.y - mouse.y) / (dm || 1);
        targetSpeed = 95 * k.s;
      } else if (k.state === 'flee') {
        k.timer -= dt;
        if (k.timer < 0) { k.state = 'idle'; k.timer = rnd(1.5, 4); }
      } else if (k.state === 'idle') {
        k.timer -= dt;
        k.h += Math.sin(t * 0.6 + k.seed) * 0.15 * dt;
        if (k.timer < 0) {
          const a = Math.random() * Math.PI * 2, d = rnd(80, 260);
          k.tx = Math.min(W - 40, Math.max(40, k.x + Math.cos(a) * d));
          k.ty = Math.min(H - 40, Math.max(40, k.y + Math.sin(a) * d));
          k.state = 'walk';
        }
      } else if (k.state === 'walk') {
        const dx = k.tx - k.x, dy = k.ty - k.y, d = Math.hypot(dx, dy);
        if (d < 8) { k.state = 'idle'; k.timer = rnd(2, 6); }
        else { dirX = dx / d; dirY = dy / d; targetSpeed = 28 * k.s; }
      }

      if (targetSpeed > 0) {
        // kakra pash-pash kore hNate: sharir ghuriye pash-ta gontobbo-r dike ane
        const want = Math.atan2(dirY, dirX);
        const dR = angDiff(want, k.h + Math.PI / 2), dL = angDiff(want, k.h - Math.PI / 2);
        if (Math.abs(dR) < Math.abs(dL) - 0.3) k.side = 1; else if (Math.abs(dL) < Math.abs(dR) - 0.3) k.side = -1;
        const err = k.side === 1 ? dR : dL;
        k.h += err * Math.min(1, dt * (k.state === 'flee' ? 5 : 1.6));
        const aligned = Math.max(0, 1 - Math.abs(err) / 1.2);
        targetSpeed *= 0.25 + 0.75 * aligned;
      }
      k.speed += (targetSpeed - k.speed) * Math.min(1, dt * (targetSpeed > k.speed ? 6 : 4));
      const md = k.h + k.side * Math.PI / 2;
      k.x += Math.cos(md) * k.speed * dt;
      k.y += Math.sin(md) * k.speed * dt;
      const m = k.size;
      k.x = Math.min(W - m, Math.max(m, k.x)); k.y = Math.min(H - m, Math.max(m, k.y));
      k.phase += dt * (k.speed * 0.22 / k.s) * k.side;
      k.move += ((k.speed > 3 ? 1 : 0) - k.move) * Math.min(1, dt * 6);
      k.raise += ((k.state === 'flee' ? 1 : 0) - k.raise) * Math.min(1, dt * 5);

      // damra khola-bondho (snap)
      if (k.snapT < 0 && t > k.snapAt) k.snapT = 0;
      if (k.snapT >= 0) {
        k.snapT += dt;
        const ot = k.snapT;
        k.claw = ot < 0.45 ? ot / 0.45 : Math.max(0, 1 - (ot - 0.45) / 0.09);
        if (ot > 0.6) { k.snapT = -1; k.claw = 0; k.snapAt = t + (k.state === 'flee' ? rnd(0.3, 0.8) : rnd(2, 6)); }
      }
    }
  }

  function crabFinger(c, px, py, ang, len, w, bend, col, tip) {
    c.save(); c.translate(px, py); c.rotate(ang);
    const g = c.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, col); g.addColorStop(0.55, col); g.addColorStop(1, tip);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, -w);
    c.quadraticCurveTo(len * 0.6, -w * 0.9 + bend, len, bend * 1.5);
    c.quadraticCurveTo(len * 0.6, w * 0.8 + bend, 0, w);
    c.closePath(); c.fill();
    c.restore();
  }

  function drawCrab(c, k, t) {
    const S = k.size, L = k.L, P = k.pal;
    const cr = Math.cos(k.h), sr = Math.sin(k.h);
    const lx = LIGHT.x * cr + LIGHT.y * sr, ly = -LIGHT.x * sr + LIGHT.y * cr;

    // narom chaya
    c.save();
    c.translate(k.x + S * 0.14, k.y + S * 0.18); c.rotate(k.h); c.scale(0.85, 1.25);
    const sg = c.createRadialGradient(0, 0, 0, 0, 0, S * 0.75);
    sg.addColorStop(0, 'rgba(3,12,10,0.5)'); sg.addColorStop(1, 'rgba(3,12,10,0)');
    c.fillStyle = sg; c.beginPath(); c.arc(0, 0, S * 0.75, 0, Math.PI * 2); c.fill();
    c.restore();

    c.save();
    c.translate(k.x, k.y); c.rotate(k.h);   // local: +x = samne, ±y = dui pash
    c.lineCap = 'round'; c.lineJoin = 'round';

    // --- 8 ta pa ---
    const tilts = [-0.42, -0.1, 0.22, 0.55];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const ax = L * 0.5 * (0.28 - i * 0.3), ay = side * S * 0.4;
        const g = Math.sin(k.phase + i * 1.7 + (side > 0 ? 0 : Math.PI));
        const lift = Math.max(0, g) * k.move;
        const a1 = side * (Math.PI / 2 + tilts[i] + g * 0.26 * k.move);
        const l1 = S * 0.4 * (1 - lift * 0.14);
        const kx = ax + Math.cos(a1) * l1, ky = ay + Math.sin(a1) * l1;
        const a2 = a1 + side * (0.55 + i * 0.1 - lift * 0.25);
        const l2 = S * 0.42 * (1 - lift * 0.1);
        const fx = kx + Math.cos(a2) * l2, fy = ky + Math.sin(a2) * l2;
        c.strokeStyle = P.dark; c.lineWidth = S * 0.1;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(kx, ky); c.stroke();
        c.strokeStyle = P.leg; c.lineWidth = S * 0.075;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(kx, ky); c.stroke();
        c.lineWidth = S * 0.052;
        c.beginPath(); c.moveTo(kx, ky); c.lineTo(fx, fy); c.stroke();
        c.strokeStyle = P.tip; c.lineWidth = S * 0.028;
        c.beginPath(); c.moveTo(kx + (fx - kx) * 0.72, ky + (fy - ky) * 0.72); c.lineTo(fx, fy); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = S * 0.022;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(kx, ky); c.stroke();
        c.fillStyle = P.dark; c.beginPath(); c.arc(kx, ky, S * 0.035, 0, Math.PI * 2); c.fill();
      }
    }

    // --- 2 ta damra (claws) ---
    for (const side of [-1, 1]) {
      const ax = L * 0.36, ay = side * S * 0.3;
      const a1 = side * (0.85 + k.raise * 0.4 + Math.sin(t * 0.7 + k.seed + side) * 0.05);
      const ex = ax + Math.cos(a1) * S * 0.3, ey = ay + Math.sin(a1) * S * 0.3;
      const a2 = side * (-0.2 + k.raise * 0.25);
      const wx = ex + Math.cos(a2) * S * 0.2, wy = ey + Math.sin(a2) * S * 0.2;
      c.strokeStyle = P.dark; c.lineWidth = S * 0.13;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(ex, ey); c.lineTo(wx, wy); c.stroke();
      c.strokeStyle = P.leg; c.lineWidth = S * 0.1;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(ex, ey); c.lineTo(wx, wy); c.stroke();

      c.save();
      c.translate(wx, wy); c.rotate(side * (-0.5 + k.raise * 0.15));
      const open = Math.min(1, k.claw + k.raise * 0.35);
      // fixed finger (bhetorer dik) + nora finger
      crabFinger(c, S * 0.28, -side * S * 0.045, 0, S * 0.32, S * 0.05, side * S * 0.02, P.claw, P.tip);
      crabFinger(c, S * 0.26, side * S * 0.07, side * open * 0.6, S * 0.31, S * 0.045, -side * S * 0.02, P.claw, P.tip);
      // palm
      const pg = c.createRadialGradient(S * 0.1 + lx * S * 0.05, ly * S * 0.04, S * 0.02, S * 0.13, 0, S * 0.22);
      pg.addColorStop(0, P.light); pg.addColorStop(0.6, P.claw); pg.addColorStop(1, P.dark);
      c.fillStyle = pg;
      c.beginPath(); c.ellipse(S * 0.14, side * S * 0.01, S * 0.22, S * 0.135, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.18)';
      for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(S * (0.05 + i * 0.045), side * S * (0.05 - (i % 2) * 0.03), S * 0.012, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,0.22)';
      c.beginPath(); c.ellipse(S * 0.12, -side * S * 0.03, S * 0.07, S * 0.025, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    }

    // --- khol (carapace) ---
    const g = c.createRadialGradient(lx * L * 0.22, ly * S * 0.2, S * 0.03, 0, 0, S * 0.62);
    g.addColorStop(0, P.light); g.addColorStop(0.55, P.mid); g.addColorStop(1, P.dark);
    c.beginPath(); smoothClosed(c, k.pts);
    c.fillStyle = g; c.fill();
    c.save();
    c.beginPath(); smoothClosed(c, k.pts); c.clip();
    // H-shape khaj (groove)
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = Math.max(1, S * 0.025);
    c.beginPath();
    c.moveTo(L * 0.22, -S * 0.3); c.quadraticCurveTo(0, -S * 0.08, -L * 0.25, -S * 0.2);
    c.moveTo(L * 0.22, S * 0.3); c.quadraticCurveTo(0, S * 0.08, -L * 0.25, S * 0.2);
    c.moveTo(-L * 0.02, -S * 0.12); c.lineTo(-L * 0.02, S * 0.12);
    c.stroke();
    for (const p of k.spots) {
      c.fillStyle = p.l ? 'rgba(255,240,220,0.14)' : 'rgba(0,0,0,0.16)';
      c.beginPath(); c.arc(p.x * L * 0.5, p.y * S * 0.5, p.r * k.s, 0, Math.PI * 2); c.fill();
    }
    const vg = c.createLinearGradient(lx * S * 0.5, ly * S * 0.5, -lx * S * 0.5, -ly * S * 0.5);
    vg.addColorStop(0, 'rgba(255,255,255,0.14)'); vg.addColorStop(0.5, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    c.fillStyle = vg; c.fillRect(-S, -S, S * 2, S * 2);
    const hx = lx * L * 0.2, hy = ly * S * 0.18;
    const hg = c.createRadialGradient(hx, hy, 0, hx, hy, S * 0.2);
    hg.addColorStop(0, 'rgba(255,255,255,0.28)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hg; c.fillRect(-S, -S, S * 2, S * 2);
    c.beginPath(); smoothClosed(c, k.pts);
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = Math.max(1.2, S * 0.035); c.stroke();
    c.restore();
    // samner chhoto dNat
    c.fillStyle = P.mid;
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const p = 0.45 + i * 0.12;
      c.beginPath(); c.arc(L * 0.5 * (0.86 - (p - 0.45) * 1.6), side * S * 0.5 * (0.42 + (p - 0.45) * 2.6), S * 0.028, 0, Math.PI * 2); c.fill();
    }

    // --- chokh (stalk eyes) ---
    for (const side of [-1, 1]) {
      const tw = Math.sin(t * 1.3 + k.seed * 3 + side) * 0.03;
      const bx = L * 0.42, by = side * S * 0.1, exx = L * 0.55, eyy = side * S * (0.15 + tw);
      c.strokeStyle = P.mid; c.lineWidth = S * 0.045;
      c.beginPath(); c.moveTo(bx, by); c.lineTo(exx, eyy); c.stroke();
      c.fillStyle = '#0f0c0a';
      c.beginPath(); c.arc(exx, eyy, S * 0.045, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.65)';
      c.beginPath(); c.arc(exx - S * 0.012, eyy - S * 0.012, S * 0.014, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  function drawCrabLayer(t) {
    const c = crabX;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, PW, PH);
    c.setTransform(Q, 0, 0, Q, 0, 0);
    drawPellets(c, true);    // tolay dube jaoa khabar
    for (const k of crabs) drawCrab(c, k, t);
    // panir nicher rong — tolar sathe mil rakhte
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(30,115,145,0.12)';
    c.fillRect(0, 0, PW, PH);
    c.globalCompositeOperation = 'source-over';
  }

  // =====================================================================
  // ৫. খাবার (food) — click / tap korle khabar pore,
  //    kachher koyekta mach/kakra ashe, kintu khay shudhu sobcheye kachher jon
  // =====================================================================
  const FOOD_COLS = ['#b5652a', '#9a5222', '#c47a35', '#86501f'];

  function dropFood(x, y) {
    const n = 3 + Math.floor(Math.random() * 6);   // 3-8 ta dana, random
    const g = { pellets: [], t0: T, cx: x, cy: y, winner: null };
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rnd(8, 42);
      g.pellets.push({ x: x + gauss() * 3, y: y + gauss() * 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                       r: rnd(3.4, 4.8), age: 0, col: pick(FOOD_COLS), bob: Math.random() * 6 });
    }
    foods.push(g);
    // kache thaka mach + kakra, je nijer khabar khacche na
    const all = [];
    for (const f of fishes) all.push({ k: f, d: Math.hypot(f.spine[0].x - x, f.spine[0].y - y) });
    for (const c of crabs) all.push({ k: c, d: Math.hypot(c.x - x, c.y - y) });
    const free = all.filter(o => !(o.k.feed && o.k.feed.winner === o.k && o.k.feed.pellets.length)).sort((a, b) => a.d - b.d);
    const m = Math.min(free.length, 2 + Math.floor(Math.random() * 4));   // 2-5 jon ashbe
    for (let i = 0; i < m; i++) {
      const k = free[i].k;
      k.feed = g; k.orbit = Math.random() * Math.PI * 2;
      k.orbitR = k.isCrab ? rnd(70, 110) : rnd(55, 115);
    }
    g.winner = m ? free[0].k : null;   // sobcheye kachher jon-i khabe
    addRipple(x, y, 1.0);
  }

  function feedTarget(k, x, y, t) {
    const g = k.feed;
    if (!g) return null;
    if (!g.pellets.length || T - g.t0 > 25) { k.feed = null; return null; }
    if (g.winner === k) {
      let best = null, bd = 1e9;
      for (const p of g.pellets) {
        if (k.isCrab && p.age < 1) continue;   // kakra tolay dubar por khay
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bd) { bd = d; best = p; }
      }
      if (best) return { x: best.x, y: best.y, d: bd, win: true, p: best };
    }
    // baki ra ashe-pashe ghure, khete pay na
    const a = k.isCrab ? k.orbit : t * 0.6 + k.orbit;
    const ox = g.cx + Math.cos(a) * k.orbitR, oy = g.cy + Math.sin(a) * k.orbitR;
    return { x: ox, y: oy, d: Math.hypot(ox - x, oy - y), win: false };
  }

  function eatPellet(g, p, k) {
    const i = g.pellets.indexOf(p);
    if (i < 0) return;
    g.pellets.splice(i, 1);
    if (!k.isCrab) addRipple(p.x, p.y, 0.3);   // mach khele choto dheu
  }

  function updateFood(dt) {
    const drift = CONFIG.FLOW_SPEED * 0.25;
    for (let gi = foods.length - 1; gi >= 0; gi--) {
      const g = foods[gi];
      let sx = 0, sy = 0;
      for (const p of g.pellets) {
        p.age += dt;
        const damp = Math.pow(0.04, dt);
        p.vx *= damp; p.vy *= damp;
        const fl = p.age < 1.2 ? 1 : 0.15;   // dube gele srot kom
        p.x += (p.vx + FX * drift * fl) * dt;
        p.y += (p.vy + FY * drift * fl) * dt;
        sx += p.x; sy += p.y;
      }
      if (g.pellets.length) { g.cx = sx / g.pellets.length; g.cy = sy / g.pellets.length; }
      if (!g.pellets.length || T - g.t0 > 25) {
        for (const f of fishes) if (f.feed === g) f.feed = null;
        for (const c of crabs) if (c.feed === g) c.feed = null;
        foods.splice(gi, 1);
      }
    }
  }

  function drawPellets(c, sunk) {
    for (const g of foods) {
      const fade = Math.min(1, Math.max(0, 25 - (T - g.t0)) / 2);
      for (const p of g.pellets) {
        const s = Math.min(1, p.age / 1.2);
        if ((s >= 1) !== sunk) continue;
        const r = p.r * (1 - 0.2 * s) * (1 + (sunk ? 0 : Math.sin(T * 3 + p.bob) * 0.05));
        c.globalAlpha = fade;
        if (sunk) {
          c.fillStyle = 'rgba(4,14,10,0.4)';
          c.beginPath(); c.ellipse(p.x + r * 0.5, p.y + r * 0.7, r, r * 0.8, 0, 0, Math.PI * 2); c.fill();
        }
        const pg = c.createRadialGradient(p.x - r * 0.35, p.y - r * 0.35, r * 0.1, p.x, p.y, r);
        pg.addColorStop(0, '#ffd08a'); pg.addColorStop(0.5, p.col); pg.addColorStop(1, '#3a2210');
        c.fillStyle = pg;
        c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  // =====================================================================
  // compose: bed + crab + soft shadow + grass + soft shadow + fish
  // =====================================================================
  function shadowOf(src, sc, sx) {
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.globalCompositeOperation = 'source-over';
    sx.clearRect(0, 0, sc.width, sc.height);
    sx.drawImage(src, 0, 0, sc.width, sc.height);
    sx.globalCompositeOperation = 'source-in';
    sx.fillStyle = 'rgb(3,16,22)';
    sx.fillRect(0, 0, sc.width, sc.height);
    sx.globalCompositeOperation = 'source-over';
  }

  function compose() {
    const c = sceneX;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.drawImage(bed, 0, 0);
    c.drawImage(crabC, 0, 0);
    shadowOf(grassC, gShadow, gsX);
    c.globalAlpha = 0.42; c.drawImage(gShadow, 8 * Q, 11 * Q, PW, PH);
    c.globalAlpha = 1; c.drawImage(grassC, 0, 0);
    shadowOf(fishC, fShadow, fsX);
    c.globalAlpha = 0.38; c.drawImage(fShadow, 24 * Q, 32 * Q, PW, PH);
    c.globalAlpha = 1; c.drawImage(fishC, 0, 0);
  }

  // =====================================================================
  // ৬. WebGL water surface: refraction, caustics, ripples, alo-chaya
  // =====================================================================
  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uScene;
uniform vec2 uRes;
uniform float uQ;
uniform float uTime;
uniform vec2 uFlow;
uniform float uCaus;
uniform vec4 uRip[${MAXR}];

float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 h22(vec2 p){float n=h21(p);return vec2(n,h21(p+n+17.17));}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  float a=h21(i),b=h21(i+vec2(1.,0.)),c=h21(i+vec2(0.,1.)),d=h21(i+vec2(1.,1.));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vnoise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}

// panir prisstho-r uchchota
float surf(vec2 p){
  float t=uTime;
  vec2 q=p-uFlow*t;
  float h=0.;
  h+=sin(dot(p,vec2(.010,.006))-t*1.05)*.30;
  h+=sin(dot(p,vec2(-.006,.012))-t*.85)*.26;
  h+=sin(dot(p,vec2(.017,-.005))-t*1.45)*.14;
  h+=(vnoise(q*.010+vec2(t*.10,-t*.07))-.5)*1.1;
  h+=(vnoise(q*.026+vec2(-t*.22,t*.18))-.5)*.45;
  for(int i=0;i<${MAXR};i++){
    vec4 r=uRip[i];
    float age=t-r.z;
    if(r.w>0.&&age>0.&&age<5.){
      vec2 c=r.xy+uFlow*age;
      float d=length(p-c);
      float rad=age*95.;
      float x=d-rad;
      float env=exp(-x*x/(600.+age*500.))*exp(-age*.8)/sqrt(1.+rad*.03);
      h+=r.w*sin(x*.19)*env*.26;
    }
  }
  return h;
}

// voronoi edge -> alor jal
float vedge(vec2 x,float t){
  vec2 n=floor(x),f=fract(x);
  float d1=8.,d2=8.;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
    vec2 g=vec2(float(i),float(j));
    vec2 o=h22(n+g);
    o=.5+.42*sin(t+6.2831*o);
    vec2 r=g+o-f;
    float d=dot(r,r);
    if(d<d1){d2=d1;d1=d;}else if(d<d2){d2=d;}
  }
  return sqrt(d2)-sqrt(d1);
}
float caustic(vec2 p,float t){
  vec2 q=p*.0095;
  q+=.5*vec2(vnoise(q*.9+t*.12),vnoise(q*.9+vec2(5.2,1.3)-t*.1))-.25;
  float e1=vedge(q,t*.55);
  float e2=vedge(q*1.55+vec2(3.1,1.7),t*.75+2.);
  float c1=1.-smoothstep(0.,.11,e1);
  float c2=1.-smoothstep(0.,.09,e2);
  c1=c1*c1*c1; c2=c2*c2*c2;
  return c1*.8+c2*.3+c1*c2*1.2;
}

void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y*uQ-gl_FragCoord.y)/uQ;
  float t=uTime;
  float e=1.5;
  float h0=surf(p);
  vec2 g=vec2(surf(p+vec2(e,0.))-h0,surf(p+vec2(0.,e))-h0)/e;

  // refraction (alo beke jay) + halka chromatic
  vec2 off=g*260.;
  vec3 col;
  col.r=texture2D(uScene,(p+off*1.08)/uRes).r;
  col.g=texture2D(uScene,(p+off)/uRes).g;
  col.b=texture2D(uScene,(p+off*.92)/uRes).b;

  // caustics — dheu-te o beke jay
  vec2 cp=p+g*700.-uFlow*t*.6;
  float cR=caustic(cp+vec2(1.8,0.),t);
  float cB=caustic(cp-vec2(1.8,0.),t);
  vec3 cc=vec3(cR,(cR+cB)*.5,cB);
  float sun=.55+.45*vnoise(p*.0035+vec2(t*.05,-t*.03));
  col+=col*cc*1.25*uCaus*sun+cc*vec3(.05,.10,.12)*uCaus*sun;

  // gobhirota (deep = dark)
  float depth=fbm(p*.0018+vec2(7.,3.));
  col*=mix(1.2,.82,depth);
  col=mix(col,vec3(.0,.34,.52),.10+depth*.14);
  col=mix(vec3(dot(col,vec3(.3,.59,.11))),col,1.18);

  // prisstho-r alo-chaya (dheu 3D dekhay)
  vec2 n2=-g*28.;
  float facing=dot(n2,normalize(vec2(-.6,-.8)));
  col+=vec3(.7,.9,1.)*clamp(facing,-.6,1.)*.16;
  col+=vec3(.92,.98,1.)*smoothstep(.4,.85,facing)*.35;

  // surjer dike halka ujjol, kinara-y vignette
  vec2 uv=p/uRes;
  col*=1.+.16*exp(-length(uv-vec2(.85,.12))*2.6);
  vec2 v=uv-.5;
  col*=1.-dot(v,v)*.6;
  gl_FragColor=vec4(col,1.);
}`;

  let gl = null, prog = null, tex = null, U = {}, ctx2d = null;

  function setupGL() {
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false }) ||
           canvas.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) return false;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return false; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    ['uScene', 'uRes', 'uQ', 'uTime', 'uFlow', 'uCaus', 'uRip'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
    gl.uniform1i(U.uScene, 0);
    return true;
  }

  function renderGL() {
    gl.viewport(0, 0, PW, PH);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uQ, Q);
    gl.uniform1f(U.uTime, T);
    gl.uniform2f(U.uFlow, FX * CONFIG.FLOW_SPEED, FY * CONFIG.FLOW_SPEED);
    gl.uniform1f(U.uCaus, CONFIG.CAUSTIC_STRENGTH);
    gl.uniform4fv(U.uRip, rip);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // =====================================================================
  // init / resize / input / loop
  // =====================================================================
  function init() {
    Q = Math.min(window.devicePixelRatio || 1, CONFIG.QUALITY);
    W = window.innerWidth; H = window.innerHeight;
    PW = Math.max(1, Math.round(W * Q)); PH = Math.max(1, Math.round(H * Q));
    for (const c of [bed, grassC, fishC, crabC, scene]) { c.width = PW; c.height = PH; }
    gShadow.width = fShadow.width = Math.max(1, Math.ceil(W / 4));
    gShadow.height = fShadow.height = Math.max(1, Math.ceil(H / 4));
    canvas.width = PW; canvas.height = PH;
    paintBed();
    genGrass();
    if (!crabs.length) genCrabs();
    else for (const k of crabs) { k.x = Math.min(W - k.size, Math.max(k.size, k.x)); k.y = Math.min(H - k.size, Math.max(k.size, k.y)); }
    if (!fishes.length) genFish();
    else for (const f of fishes) {   // resize-er pore mach screen-er bhetore rakho
      const h = f.spine[0], nx = Math.min(W, Math.max(0, h.x)) - h.x, ny = Math.min(H, Math.max(0, h.y)) - h.y;
      for (const p of f.spine) { p.x += nx; p.y += ny; }
    }
  }

  // mouse nilei dheu (click lagbe na)
  let lastRip = { x: -1e5, y: -1e5, t: -1 };
  function onMove(x, y) {
    mouse.x = x; mouse.y = y;
    const d = Math.hypot(x - lastRip.x, y - lastRip.y);
    if (d > 22 && T - lastRip.t > 0.045) {
      addRipple(x, y, Math.min(1, 0.35 + d * 0.004));
      lastRip = { x, y, t: T };
    }
  }
  window.addEventListener('pointermove', e => onMove(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', e => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }, { passive: true });
  // click / tap = khabar (button / link e click korle na)
  window.addEventListener('pointerdown', e => {
    if (e.target && e.target.closest && e.target.closest('a,button,input,textarea,select,label,[role="button"],[contenteditable]')) return;
    dropFood(e.clientX, e.clientY);
  }, { passive: true });
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) { mouse.x = mouse.y = -1e5; } });

  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(init, 150); });

  init();
  if (!setupGL()) {
    // WebGL nai -> notun 2D canvas diye fallback
    gl = null;
    const c2 = canvas.cloneNode(false);
    canvas.parentNode.replaceChild(c2, canvas);
    c2.width = PW; c2.height = PH;
    ctx2d = c2.getContext('2d');
    window.addEventListener('resize', () => setTimeout(() => { c2.width = PW; c2.height = PH; }, 200));
  }

  let nextAuto = 1.5, last = performance.now();
  function frame(now) {
    // 30fps cap: phone/low-end laptop e bhari kaj kome, UI smooth thake
    if (now - last < 1000 / 30 - 1) { requestAnimationFrame(frame); return; }
    const dt = Math.min(0.05, (now - last) / 1000) * MOTION;
    last = now;
    T += dt;

    if (CONFIG.AUTO_RIPPLES && T > nextAuto) {
      if (Math.random() < 0.5 && fishes.length) { const f = pick(fishes); addRipple(f.r[0].x, f.r[0].y, rnd(0.5, 0.8)); }
      else addRipple(rnd(0.05, 0.95) * W, rnd(0.05, 0.95) * H, rnd(0.6, 1));
      nextAuto = T + rnd(2.5, 5.5);
    }

    updateFood(dt);
    updateFish(dt, T);
    updateCrabs(dt, T);
    drawGrass(T);
    drawCrabLayer(T);
    drawFishLayer();
    compose();
    if (gl) renderGL();
    else if (ctx2d) { ctx2d.setTransform(1, 0, 0, 1, 0, 0); ctx2d.drawImage(scene, 0, 0); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
