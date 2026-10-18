import React, { useRef, useEffect } from 'react';

/**
 * CONFIGURATION
 * Easily tweakable parameters for performance, counts, and physics.
 */
const CONFIG = {
  FISH_COUNT: 5,
  STONE_COUNT: 55,
  GRASS_CLUSTERS: 28,
  RIVER_FLOW_SPEED: 0.9,
  RIPPLE_SENSITIVITY: 6
};

/**
 * WaterRipple Class
 * Simulates expanding, downstream-drifting dual-ring water ripples.
 */
class WaterRipple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 2;
    this.maxRadius = 95 + Math.random() * 30;
    this.opacity = 0.45;
  }

  update() {
    this.radius += (this.maxRadius - this.radius) * 0.045;
    this.x += CONFIG.RIVER_FLOW_SPEED * 0.6;
    this.opacity *= 0.965;
  }

  draw(ctx) {
    if (this.opacity < 0.01) return;

    // 1. Outer Highlight Ring (Sunlight catching the wave crest)
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(225, 248, 255, ${this.opacity.toFixed(3)})`;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 2. Inner Shadow Trough (Dip of the water wave)
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.radius * 0.82), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(8, 42, 68, ${(this.opacity * 0.7).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/**
 * CursorWake Class
 * Soft V-shaped wake line trailing behind the cursor when moving quickly.
 */
class CursorWake {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.life = 30;
    this.maxLife = 30;
  }

  update() {
    this.life--;
    this.x += CONFIG.RIVER_FLOW_SPEED * 0.4;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const progress = 1 - this.life / this.maxLife;
    const alpha = (this.life / this.maxLife) * 0.35;
    const armLength = 8 + progress * 24;
    const spread = 0.42 + progress * 0.18; // ~24° to 35° divergence

    const leftAngle = this.angle + Math.PI - spread;
    const rightAngle = this.angle + Math.PI + spread;

    const lx = this.x + Math.cos(leftAngle) * armLength;
    const ly = this.y + Math.sin(leftAngle) * armLength;
    const rx = this.x + Math.cos(rightAngle) * armLength;
    const ry = this.y + Math.sin(rightAngle) * armLength;

    // Outer highlight
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(this.x, this.y);
    ctx.lineTo(rx, ry);
    ctx.strokeStyle = `rgba(225, 248, 255, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Inner shadow trough
    ctx.beginPath();
    ctx.moveTo(lx + 0.8, ly + 0.8);
    ctx.lineTo(this.x + 0.8, this.y + 0.8);
    ctx.lineTo(rx + 0.8, ry + 0.8);
    ctx.strokeStyle = `rgba(8, 42, 68, ${(alpha * 0.55).toFixed(3)})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

/**
 * Organic Spine-Kinematics Fish Class
 * 8-segment S-curve wave propagation, translucent fins/veil tail, and depth shadow.
 */
class RiverFish {
  constructor(width, height, initialSpawn = false) {
    this.reset(width, height, initialSpawn);
  }

  reset(width, height, initialSpawn = false) {
    this.x = initialSpawn ? Math.random() * (width + 100) - 50 : -130 - Math.random() * 80;
    this.y = Math.random() * (height - 120) + 60;
    this.baseSpeed = 0.6 + Math.random() * 0.8; // gentle 0.6 to 1.4 px/frame
    this.swimSpeed = 0.0035 + Math.random() * 0.002;
    this.angle = (Math.random() - 0.5) * 0.3; // gentle rightward heading
    this.targetAngle = this.angle;
    this.scale = 0.85 + Math.random() * 0.3;
    this.type = Math.random() > 0.45 ? 'goldfish' : 'redfish';
    this.speedBoost = 1.0;
    this.boostTimer = 0;
    this.wigglePhase = Math.random() * Math.PI * 2;
    this.driftFreq = 0.0008 + Math.random() * 0.0006;
    this.driftOffset = Math.random() * 1000;
  }

  update(width, height, time, cursor) {
    // Cursor awareness: if within 120px, steer away and boost speed by 1.5x for 1s (~60 frames)
    if (cursor.active) {
      const distToCursor = Math.hypot(this.x - cursor.x, this.y - cursor.y);
      if (distToCursor < 120) {
        let awayAngle = Math.atan2(this.y - cursor.y, this.x - cursor.x);
        // Ensure the fish still swims generally forward (+X), avoiding reversing into the screen edge
        if (Math.abs(awayAngle) > Math.PI / 2) {
          awayAngle = awayAngle > 0 ? Math.PI / 3 : -Math.PI / 3;
        }
        this.targetAngle = awayAngle;
        this.speedBoost = 1.5;
        this.boostTimer = 60;
      }
    }

    if (this.boostTimer > 0) {
      this.boostTimer--;
      if (this.boostTimer === 0) {
        this.speedBoost = 1.0;
      }
    } else {
      // Natural gentle diagonal drift
      const naturalDrift = Math.sin(time * this.driftFreq + this.driftOffset) * 0.22;
      this.targetAngle = naturalDrift;
    }

    // Smoothly interpolate angle
    this.angle += (this.targetAngle - this.angle) * 0.06;

    // Move forward with stream
    const effectiveSpeed = (this.baseSpeed * this.speedBoost + CONFIG.RIVER_FLOW_SPEED * 0.35);
    this.x += Math.cos(this.angle) * effectiveSpeed;
    this.y += Math.sin(this.angle) * effectiveSpeed;

    // Reset when off-screen right
    if (this.x > width + 140) {
      this.reset(width, height, false);
    }
  }

  /**
   * Computes the 8 spine points and lateral body contours
   */
  getGeometry(time) {
    const segCount = 8;
    const segDist = 7.5 * this.scale;
    const spine = [];
    const leftPts = [];
    const rightPts = [];

    // Width profile along spine (Head to Tail)
    const WIDTH_PROFILE = [5.5, 9.5, 10.5, 9.2, 7.5, 5.2, 3.4, 1.8];

    const currentSpeedVal = this.swimSpeed * this.speedBoost;
    const waveTime = time * currentSpeedVal + this.wigglePhase;

    for (let i = 0; i < segCount; i++) {
      // S-curve wave equation from specification:
      // lateralOffset = Math.sin(time * fish.swimSpeed - segmentIndex * 0.6) * (segmentIndex * 1.8)
      const lateralOffset = Math.sin(waveTime - i * 0.6) * (i * 1.8 * this.scale);

      // Spine base along swimming direction
      const baseX = this.x - Math.cos(this.angle) * (i * segDist);
      const baseY = this.y - Math.sin(this.angle) * (i * segDist);

      // Perpendicular vector
      const perpX = -Math.sin(this.angle);
      const perpY = Math.cos(this.angle);

      const pt = {
        x: baseX + perpX * lateralOffset,
        y: baseY + perpY * lateralOffset
      };
      spine.push(pt);
    }

    // Calculate normal angles and lateral body contour points
    for (let i = 0; i < segCount; i++) {
      let tanAngle;
      if (i === 0) {
        tanAngle = Math.atan2(spine[1].y - spine[0].y, spine[1].x - spine[0].x);
      } else if (i === segCount - 1) {
        tanAngle = Math.atan2(spine[7].y - spine[6].y, spine[7].x - spine[6].x);
      } else {
        tanAngle = Math.atan2(spine[i + 1].y - spine[i - 1].y, spine[i + 1].x - spine[i - 1].x);
      }

      const normX = -Math.sin(tanAngle);
      const normY = Math.cos(tanAngle);
      const w = WIDTH_PROFILE[i] * this.scale;

      leftPts.push({ x: spine[i].x + normX * w, y: spine[i].y + normY * w });
      rightPts.push({ x: spine[i].x - normX * w, y: spine[i].y - normY * w });
    }

    return { spine, leftPts, rightPts };
  }

  /**
   * Draws fish geometry (either as depth shadow or realistic fish)
   */
  draw(ctx, time, isShadow = false) {
    const { spine, leftPts, rightPts } = this.getGeometry(time);
    const ox = isShadow ? 14 : 0;
    const oy = isShadow ? 14 : 0;

    const shadowColor = 'rgba(3, 15, 28, 0.32)';

    // Fin colors
    const goldfishFin = 'rgba(255, 209, 102, 0.65)';
    const redfishFin = 'rgba(255, 143, 163, 0.65)';
    const finColor = isShadow ? shadowColor : (this.type === 'goldfish' ? goldfishFin : redfishFin);

    ctx.save();

    // 1. PECTORAL FINS (Behind head at segment 1)
    const finFlutter = Math.sin(time * 0.006 + this.wigglePhase) * 0.25;
    const leftFinAngle = this.angle + 2.3 + finFlutter;
    const rightFinAngle = this.angle - 2.3 - finFlutter;
    const finLen = 16 * this.scale;

    // Left fin
    ctx.beginPath();
    ctx.moveTo(leftPts[1].x + ox, leftPts[1].y + oy);
    ctx.bezierCurveTo(
      leftPts[1].x + Math.cos(leftFinAngle) * (finLen * 0.7) + ox,
      leftPts[1].y + Math.sin(leftFinAngle) * (finLen * 0.7) + oy,
      leftPts[1].x + Math.cos(leftFinAngle + 0.25) * finLen + ox,
      leftPts[1].y + Math.sin(leftFinAngle + 0.25) * finLen + oy,
      leftPts[2].x + ox,
      leftPts[2].y + oy
    );
    ctx.fillStyle = finColor;
    ctx.fill();

    // Right fin
    ctx.beginPath();
    ctx.moveTo(rightPts[1].x + ox, rightPts[1].y + oy);
    ctx.bezierCurveTo(
      rightPts[1].x + Math.cos(rightFinAngle) * (finLen * 0.7) + ox,
      rightPts[1].y + Math.sin(rightFinAngle) * (finLen * 0.7) + oy,
      rightPts[1].x + Math.cos(rightFinAngle - 0.25) * finLen + ox,
      rightPts[1].y + Math.sin(rightFinAngle - 0.25) * finLen + oy,
      rightPts[2].x + ox,
      rightPts[2].y + oy
    );
    ctx.fillStyle = finColor;
    ctx.fill();

    // 2. FORKED FLOWING VEIL TAIL (Attached at segment 7)
    const tailBase = spine[7];
    const tailPrev = spine[6];
    const tailAngle = Math.atan2(tailBase.y - tailPrev.y, tailBase.x - tailPrev.x);
    const tailLen = 30 * this.scale;
    const tailWave = Math.sin(time * 0.005 + this.wigglePhase - 1.2) * 6;

    // Upper veil lobe
    ctx.beginPath();
    ctx.moveTo(tailBase.x + ox, tailBase.y + oy);
    ctx.bezierCurveTo(
      tailBase.x + Math.cos(tailAngle - 0.35) * (tailLen * 0.5) + ox,
      tailBase.y + Math.sin(tailAngle - 0.35) * (tailLen * 0.5) + tailWave + oy,
      tailBase.x + Math.cos(tailAngle - 0.2) * tailLen + ox,
      tailBase.y + Math.sin(tailAngle - 0.2) * tailLen + tailWave * 1.3 + oy,
      tailBase.x + Math.cos(tailAngle - 0.05) * (tailLen * 0.75) + ox,
      tailBase.y + Math.sin(tailAngle - 0.05) * (tailLen * 0.75) + tailWave + oy
    );
    // Lower veil lobe
    ctx.bezierCurveTo(
      tailBase.x + Math.cos(tailAngle + 0.2) * tailLen + ox,
      tailBase.y + Math.sin(tailAngle + 0.2) * tailLen - tailWave * 1.3 + oy,
      tailBase.x + Math.cos(tailAngle + 0.35) * (tailLen * 0.5) + ox,
      tailBase.y + Math.sin(tailAngle + 0.35) * (tailLen * 0.5) - tailWave + oy,
      tailBase.x + ox,
      tailBase.y + oy
    );
    ctx.closePath();
    ctx.fillStyle = finColor;
    ctx.fill();

    // 3. MAIN FISH BODY CONTOUR
    ctx.beginPath();
    // Head snout
    ctx.moveTo(spine[0].x + Math.cos(this.angle) * (6 * this.scale) + ox, spine[0].y + Math.sin(this.angle) * (6 * this.scale) + oy);

    // Left body curve from head to tail
    for (let i = 0; i < 7; i++) {
      const mx = (leftPts[i].x + leftPts[i + 1].x) / 2 + ox;
      const my = (leftPts[i].y + leftPts[i + 1].y) / 2 + oy;
      ctx.quadraticCurveTo(leftPts[i].x + ox, leftPts[i].y + oy, mx, my);
    }
    ctx.lineTo(spine[7].x + ox, spine[7].y + oy);

    // Right body curve from tail to head
    for (let i = 7; i > 0; i--) {
      const mx = (rightPts[i].x + rightPts[i - 1].x) / 2 + ox;
      const my = (rightPts[i].y + rightPts[i - 1].y) / 2 + oy;
      ctx.quadraticCurveTo(rightPts[i].x + ox, rightPts[i].y + oy, mx, my);
    }
    ctx.closePath();

    if (isShadow) {
      ctx.fillStyle = shadowColor;
      ctx.fill();
    } else {
      // Fish color gradients
      const bodyGrad = ctx.createLinearGradient(
        spine[0].x, spine[0].y,
        spine[7].x, spine[7].y
      );

      if (this.type === 'goldfish') {
        bodyGrad.addColorStop(0, '#ff7b00');      // Head/back
        bodyGrad.addColorStop(0.45, '#ffaa00');   // Body
        bodyGrad.addColorStop(1, 'rgba(255, 209, 102, 0.7)'); // Tail transition
      } else {
        bodyGrad.addColorStop(0, '#9b111e');      // Deep crimson back
        bodyGrad.addColorStop(0.5, '#e63946');    // Bright red body
        bodyGrad.addColorStop(1, 'rgba(255, 143, 163, 0.7)'); // Translucent
      }

      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Delicate fish eye on head
      const eyeSideDist = 3.2 * this.scale;
      const eyeForwardDist = 2.0 * this.scale;
      const eyeAngle = this.angle;
      const ex1 = spine[0].x + Math.cos(eyeAngle) * eyeForwardDist - Math.sin(eyeAngle) * eyeSideDist;
      const ey1 = spine[0].y + Math.sin(eyeAngle) * eyeForwardDist + Math.cos(eyeAngle) * eyeSideDist;
      const ex2 = spine[0].x + Math.cos(eyeAngle) * eyeForwardDist + Math.sin(eyeAngle) * eyeSideDist;
      const ey2 = spine[0].y + Math.sin(eyeAngle) * eyeForwardDist - Math.cos(eyeAngle) * eyeSideDist;

      ctx.fillStyle = '#0a1d2a';
      ctx.beginPath();
      ctx.arc(ex1, ey1, 1.3 * this.scale, 0, Math.PI * 2);
      ctx.arc(ex2, ey2, 1.3 * this.scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(ex1 - 0.4, ey1 - 0.4, 0.5 * this.scale, 0, Math.PI * 2);
      ctx.arc(ex2 - 0.4, ey2 - 0.4, 0.5 * this.scale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * WaterBackground Component
 * Full production-grade implementation of the Village River Stream Background engine.
 */
export default function WaterBackground() {
  const localCanvasRef = useRef(null);

  useEffect(() => {
    // 1. Get or attach to the canvas element
    let canvas = document.getElementById('village-river-canvas');
    if (!canvas) {
      canvas = localCanvasRef.current;
    }
    if (!canvas) return;

    // Ensure requested styles are present
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId = null;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Offscreen Canvas for Layer 1 & Layer 2 Pre-rendering (60FPS Optimization)
    const offscreenCanvas = document.createElement('canvas');
    const offCtx = offscreenCanvas.getContext('2d');

    // Pointer state
    const pointer = {
      x: -1000,
      y: -1000,
      lastX: -1000,
      lastY: -1000,
      active: false,
      lastMoveTime: 0,
      lastStationaryRippleTime: 0
    };

    // Layer 2: Stones data
    const STONE_PALETTES = [
      { light: '#8898a3', mid: '#5c6b73', dark: '#384349' }, // Warm Slate
      { light: '#728b77', mid: '#4a5d4e', dark: '#2d3b30' }, // Mossy Grey
      { light: '#b5ada5', mid: '#8d867e', dark: '#59534c' }, // River Sandstone
      { light: '#5f6a73', mid: '#3b444b', dark: '#22272b' }, // Deep Pebble
      { light: '#a1947e', mid: '#7a6f5d', dark: '#4c4438' }  // Soft Ochre
    ];
    let stones = [];

    // Layer 3: Grass clusters data
    let grassClusters = [];

    // Layer 4: Fish instances
    let fishList = [];

    // Layer 5: Caustics, Shimmers, and Motes
    let caustics = [];
    let shimmers = [];
    let motes = [];

    // Layer 6: Ripples and Wakes
    const ripples = [];
    const wakes = [];

    // Check reduced motion preference
    const prefersReducedMotion = () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Helper: Draw organic rounded stone shape
    const drawStonePath = (targetCtx, s, ox = 0, oy = 0) => {
      targetCtx.beginPath();
      const numPts = s.deform.length;
      for (let j = 0; j < numPts; j++) {
        const angle = s.rotation + (j / numPts) * Math.PI * 2;
        const rFactor = s.deform[j];
        const px = s.x + ox + Math.cos(angle) * s.rx * rFactor;
        const py = s.y + oy + Math.sin(angle) * s.ry * rFactor;
        if (j === 0) targetCtx.moveTo(px, py);
        else targetCtx.lineTo(px, py);
      }
      targetCtx.closePath();
    };

    // Pre-render Layer 1 (Base & Silt) and Layer 2 (3D Stones) onto Offscreen Canvas
    const preRenderRiverbed = () => {
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;
      offCtx.setTransform(1, 0, 0, 1, 0, 0);
      offCtx.scale(dpr, dpr);

      // --- LAYER 1: Sunlit Riverbed Base & Soft Silt ---
      // Sky-Reflected Water Base (Linear Gradient from Top-Left to Bottom-Right)
      const baseGrad = offCtx.createLinearGradient(0, 0, width, height);
      baseGrad.addColorStop(0, '#0a2e46');     // Stop 0%: Deep shaded bank water
      baseGrad.addColorStop(0.45, '#165b8a');  // Stop 45%: Clear mid-stream sky reflection
      baseGrad.addColorStop(0.85, '#2980b9');  // Stop 85%: Bright sunlit shallow water
      baseGrad.addColorStop(1, '#48a9e6');     // Stop 100%: Crystal sunlit edge

      offCtx.fillStyle = baseGrad;
      offCtx.fillRect(0, 0, width, height);

      // 80 tiny static riverbed sand/silt specks
      for (let i = 0; i < 80; i++) {
        const sx = Math.random() * width;
        const sy = Math.random() * height;
        const sRad = 0.5 + Math.random() * 0.75;
        offCtx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(10, 30, 45, 0.25)';
        offCtx.beginPath();
        offCtx.arc(sx, sy, sRad, 0, Math.PI * 2);
        offCtx.fill();
      }

      // --- LAYER 2: 3D Submerged Stones (Pre-Rendered) ---
      // Step 1: Drop Shadows for all stones
      for (let i = 0; i < stones.length; i++) {
        const s = stones[i];
        drawStonePath(offCtx, s, 6, 8);
        offCtx.fillStyle = 'rgba(4, 18, 30, 0.45)';
        offCtx.fill();
      }

      // Step 2 & 3: 3D Body & Submerged Water Tint
      for (let i = 0; i < stones.length; i++) {
        const s = stones[i];

        // 3D Body: Off-center radial gradient (light from top-left)
        const lx = s.x - s.rx * 0.35;
        const ly = s.y - s.ry * 0.35;
        const grad = offCtx.createRadialGradient(
          lx, ly, s.rx * 0.08,
          s.x, s.y, Math.max(s.rx, s.ry) * 1.15
        );
        grad.addColorStop(0, s.palette.light);
        grad.addColorStop(0.55, s.palette.mid);
        grad.addColorStop(1, s.palette.dark);

        drawStonePath(offCtx, s, 0, 0);
        offCtx.fillStyle = grad;
        offCtx.fill();

        // Submerged Water Tint: Overlay each stone with rgba(22, 91, 138, 0.22)
        offCtx.fillStyle = 'rgba(22, 91, 138, 0.22)';
        offCtx.fill();
      }
    };

    // Initialize scenes and entities
    const initScene = () => {
      // 1. Generate 55 Stones (CONFIG.STONE_COUNT) with clustered pebbles
      stones = [];
      const primaryCount = 35;
      for (let i = 0; i < primaryCount; i++) {
        stones.push({
          x: Math.random() * width,
          y: Math.random() * height,
          rx: 22 + Math.random() * 42, // radiusX: 22 to 64px
          ry: 16 + Math.random() * 30, // radiusY: 16 to 46px
          rotation: Math.random() * Math.PI * 2,
          palette: STONE_PALETTES[Math.floor(Math.random() * STONE_PALETTES.length)],
          deform: Array.from({ length: 10 }, () => 0.88 + Math.random() * 0.24)
        });
      }

      const clusterPebblesCount = Math.max(0, CONFIG.STONE_COUNT - primaryCount);
      for (let i = 0; i < clusterPebblesCount; i++) {
        const parent = stones[Math.floor(Math.random() * primaryCount)];
        const ang = Math.random() * Math.PI * 2;
        const dist = parent.rx + 8 + Math.random() * 22;
        stones.push({
          x: Math.max(20, Math.min(width - 20, parent.x + Math.cos(ang) * dist)),
          y: Math.max(20, Math.min(height - 20, parent.y + Math.sin(ang) * dist)),
          rx: 11 + Math.random() * 11,
          ry: 8 + Math.random() * 8,
          rotation: Math.random() * Math.PI * 2,
          palette: STONE_PALETTES[Math.floor(Math.random() * STONE_PALETTES.length)],
          deform: Array.from({ length: 8 }, () => 0.9 + Math.random() * 0.2)
        });
      }

      // 2. Generate 28 Grass Clusters (CONFIG.GRASS_CLUSTERS), anchored near stones
      grassClusters = [];
      for (let c = 0; c < CONFIG.GRASS_CLUSTERS; c++) {
        const anchorStone = stones[c % stones.length];
        const cx = anchorStone
          ? anchorStone.x + (Math.random() - 0.5) * anchorStone.rx * 1.4
          : Math.random() * width;
        const cy = anchorStone
          ? anchorStone.y + anchorStone.ry * 0.55
          : Math.random() * height;

        const bladeCount = 4 + Math.floor(Math.random() * 4); // 4 to 7 blades
        const blades = [];
        for (let b = 0; b < bladeCount; b++) {
          blades.push({
            ox: (b - bladeCount / 2) * 5 + (Math.random() - 0.5) * 3,
            length: 65 + Math.random() * 65,
            phase: Math.random() * Math.PI * 2,
            baseWidth: 3.5 + Math.random() * 0.9,
            lean: (Math.random() - 0.15) * 16
          });
        }
        grassClusters.push({ cx, cy, blades });
      }

      // 3. Generate Fish (CONFIG.FISH_COUNT = 5)
      fishList = [];
      for (let f = 0; f < CONFIG.FISH_COUNT; f++) {
        fishList.push(new RiverFish(width, height, true));
      }

      // 4. Generate Caustics ribbons (18 ribbons)
      caustics = [];
      for (let r = 0; r < 18; r++) {
        caustics.push({
          baseX: Math.random() * width,
          y: (height / 18) * r + (Math.random() - 0.5) * 35,
          span: 320 + Math.random() * 260,
          phase: Math.random() * Math.PI * 2
        });
      }

      // 5. Generate Sky Surface Shimmer patches (12 patches)
      shimmers = [];
      for (let s = 0; s < 12; s++) {
        shimmers.push({
          baseX: Math.random() * width,
          y: Math.random() * height,
          radius: 100 + Math.random() * 140, // radius 100px to 240px
          phase: Math.random() * Math.PI * 2
        });
      }

      // 6. Generate Floating River Motes (25 particles)
      motes = [];
      for (let m = 0; m < 25; m++) {
        motes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: 1 + Math.random() * 1.2,
          speed: 0.15 + Math.random() * 0.35,
          phase: Math.random() * Math.PI * 2
        });
      }

      preRenderRiverbed();
    };

    // Resize handler for Retina / High-DPI screens
    const handleResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      initScene();
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    // Non-Intrusive Mouse Tracking on window
    const handleMouseMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      const now = performance.now();

      if (pointer.lastX < 0) {
        pointer.lastX = x;
        pointer.lastY = y;
      }

      const dist = Math.hypot(x - pointer.lastX, y - pointer.lastY);

      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
      pointer.lastMoveTime = now;

      // Spawn new WaterRipple object if distance > CONFIG.RIPPLE_SENSITIVITY (6px)
      if (dist > CONFIG.RIPPLE_SENSITIVITY) {
        ripples.push(new WaterRipple(x, y));

        // Cursor Wake Trail: fast mouse movement triggers V-shaped wake
        if (dist > 8) {
          const moveAngle = Math.atan2(y - pointer.lastY, x - pointer.lastX);
          wakes.push(new CursorWake(x, y, moveAngle));
        }

        pointer.lastX = x;
        pointer.lastY = y;
      }
    };

    const handleMouseLeave = () => {
      pointer.active = false;
      pointer.lastX = -1000;
      pointer.lastY = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    // Continuous 60FPS Strict 6-Layer Rendering Loop
    let lastTime = performance.now();

    const render = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const time = now;

      // Gentle periodic ripple when cursor is resting/stationary
      if (!prefersReducedMotion() && pointer.active && now - pointer.lastMoveTime > 200) {
        if (now - pointer.lastStationaryRippleTime > 800) {
          pointer.lastStationaryRippleTime = now;
          ripples.push(new WaterRipple(pointer.x, pointer.y));
        }
      }

      // =========================================================================
      // LAYERS 1 & 2: Sunlit Riverbed Base & Submerged Stones (Pre-rendered buffer)
      // =========================================================================
      ctx.drawImage(offscreenCanvas, 0, 0, width, height);

      // =========================================================================
      // LAYER 3: Flowing Underwater River Grass
      // =========================================================================
      ctx.save();
      ctx.globalAlpha = 0.8;

      for (let c = 0; c < grassClusters.length; c++) {
        const cluster = grassClusters[c];
        for (let b = 0; b < cluster.blades.length; b++) {
          const blade = cluster.blades[b];

          // Fluid Physics Equation from specification:
          // sway = Math.sin(time * 0.0018 + blade.phase) * 14 + Math.cos(time * 0.0009 + blade.phase) * 6;
          // Always bias sway +18px in the direction of the river current (+X)
          const sway =
            Math.sin(time * 0.0018 + blade.phase) * 14 +
            Math.cos(time * 0.0009 + blade.phase) * 6 +
            18;

          const rootX = cluster.cx + blade.ox;
          const rootY = cluster.cy;
          const tipX = rootX + sway + blade.lean;
          const tipY = rootY - blade.length;
          const midX = rootX + sway * 0.55;
          const midY = rootY - blade.length * 0.52;

          ctx.beginPath();
          ctx.moveTo(rootX - blade.baseWidth * 0.5, rootY);
          ctx.quadraticCurveTo(midX - blade.baseWidth * 0.25, midY, tipX, tipY);
          ctx.quadraticCurveTo(midX + blade.baseWidth * 0.25, midY, rootX + blade.baseWidth * 0.5, rootY);
          ctx.closePath();

          // Palette: Base: #143627, Mid-blade: #245c42, Sunlit Tip: #52b788
          const grassGrad = ctx.createLinearGradient(rootX, rootY, tipX, tipY);
          grassGrad.addColorStop(0, '#143627');
          grassGrad.addColorStop(0.5, '#245c42');
          grassGrad.addColorStop(1, '#52b788');

          ctx.fillStyle = grassGrad;
          ctx.fill();
        }
      }
      ctx.restore();

      // =========================================================================
      // LAYER 4: Multi-Segment Realistic Swimming Fish
      // =========================================================================
      // 1. Update fish positions
      for (let f = 0; f < fishList.length; f++) {
        fishList[f].update(width, height, time, pointer);
      }

      // 2. Render all Riverbed Depth Shadows (+14px offset) before real fish
      for (let f = 0; f < fishList.length; f++) {
        fishList[f].draw(ctx, time, true);
      }

      // 3. Render real fish bodies, fins, and eyes
      for (let f = 0; f < fishList.length; f++) {
        fishList[f].draw(ctx, time, false);
      }

      // =========================================================================
      // LAYER 5: Underwater Sunlight Caustics & Sky Reflections
      // =========================================================================
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';

      // 1. Sunlight Caustic Web (18 large soft overlapping wave ribbons)
      ctx.strokeStyle = 'rgba(180, 235, 255, 0.07)';
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';

      for (let r = 0; r < caustics.length; r++) {
        const rib = caustics[r];
        const driftX = (rib.baseX + time * 0.025 * CONFIG.RIVER_FLOW_SPEED) % (width + 300) - 150;
        const ribY = rib.y + Math.sin(time * 0.001 + rib.phase) * 20;

        ctx.beginPath();
        ctx.moveTo(driftX, ribY);
        for (let seg = 1; seg <= 4; seg++) {
          const segX = driftX + seg * (rib.span / 4);
          const cpX = segX - rib.span / 8;
          const cpY = ribY + Math.sin(time * 0.0012 + rib.phase + seg) * 32;
          const endY = ribY + Math.cos(time * 0.0009 + rib.phase + seg * 1.3) * 18;
          ctx.quadraticCurveTo(cpX, cpY, segX, endY);
        }
        ctx.stroke();
      }

      // 2. Sky Surface Shimmer (12 large radial light patches drifting with stream)
      for (let s = 0; s < shimmers.length; s++) {
        const sm = shimmers[s];
        const sx = (sm.baseX + time * 0.03 * CONFIG.RIVER_FLOW_SPEED) % (width + sm.radius * 2) - sm.radius;
        const sy = sm.y + Math.sin(time * 0.0008 + sm.phase) * 15;

        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sm.radius);
        grad.addColorStop(0, 'rgba(230, 248, 255, 0.14)');
        grad.addColorStop(0.55, 'rgba(230, 248, 255, 0.05)');
        grad.addColorStop(1, 'rgba(230, 248, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, sm.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Tiny Floating River Motes (25 glowing water particles)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      for (let m = 0; m < motes.length; m++) {
        const mote = motes[m];
        mote.x += (CONFIG.RIVER_FLOW_SPEED * 0.75 + mote.speed) * dt * 60;
        if (mote.x > width + 10) {
          mote.x = -10;
          mote.y = Math.random() * height;
        }
        const pulse = (Math.sin(time * 0.002 + mote.phase) + 1) * 0.5;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y + Math.sin(time * 0.001 + mote.phase) * 6, mote.size * (0.8 + pulse * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore(); // Restore globalCompositeOperation to 'source-over'

      // =========================================================================
      // LAYER 6: Interactive Cursor Water-Wave Engine (Pass-By Ripples & Wakes)
      // =========================================================================
      // 1. Draw and update Cursor Wakes
      for (let i = wakes.length - 1; i >= 0; i--) {
        const wake = wakes[i];
        wake.update();
        wake.draw(ctx);
        if (wake.life <= 0) {
          wakes.splice(i, 1);
        }
      }

      // 2. Draw and update Water Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.update();
        r.draw(ctx);
        if (r.opacity < 0.01 || r.radius >= r.maxRadius * 0.99) {
          ripples.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    // Pause animation when tab is inactive to preserve resources
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animId);
      } else {
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const hasDirectCanvas = typeof document !== 'undefined' && !!document.getElementById('village-river-canvas');

  if (hasDirectCanvas) {
    return null;
  }

  return (
    <canvas
      id="village-river-canvas"
      ref={localCanvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none'
      }}
      aria-hidden="true"
    />
  );
}
