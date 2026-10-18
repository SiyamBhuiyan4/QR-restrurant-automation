import React, { useRef, useEffect } from 'react';

/**
 * CONFIGURATION
 * Easily tweakable parameters for cinematic realism, counts, and physics.
 */
const CONFIG = {
  FISH_COUNT: 5,
  STONE_COUNT: 55,
  GRASS_CLUSTERS: 28,
  RIVER_FLOW_SPEED: 0.95,
  RIPPLE_SENSITIVITY: 5
};

/**
 * WaterRipple Class
 * Simulates expanding, downstream-drifting dual-ring water ripples with refractive highlights.
 */
class WaterRipple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 3;
    this.maxRadius = 140 + Math.random() * 45; // Expansive yet subtle (up to 180px)
    this.opacity = 0.5;
  }

  update() {
    this.radius += (this.maxRadius - this.radius) * 0.04;
    this.x += CONFIG.RIVER_FLOW_SPEED * 0.7; // Ripples drift downstream (+X axis) as they grow
    this.opacity *= 0.968;
  }

  draw(ctx) {
    if (this.opacity < 0.01) return;

    // 1. Thin bright refractive crest (rgba(230, 248, 255, 0.2))
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(230, 248, 255, ${(this.opacity * 0.44).toFixed(3)})`;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // 2. Darker shadow trough (rgba(5, 20, 38, 0.15))
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.radius * 0.84), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(5, 20, 38, ${(this.opacity * 0.32).toFixed(3)})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 3. Subtle inner caustic echo ring for realistic wave interference
    if (this.radius > 25) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.68, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(200, 245, 255, ${(this.opacity * 0.18).toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
}

/**
 * CursorWake Class
 * Soft V-shaped wake trailing behind cursor path during rapid movements.
 */
class CursorWake {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.life = 32;
    this.maxLife = 32;
  }

  update() {
    this.life--;
    this.x += CONFIG.RIVER_FLOW_SPEED * 0.45;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const progress = 1 - this.life / this.maxLife;
    const alpha = (this.life / this.maxLife) * 0.28;
    const armLength = 10 + progress * 28;
    const spread = 0.42 + progress * 0.18;

    const leftAngle = this.angle + Math.PI - spread;
    const rightAngle = this.angle + Math.PI + spread;

    const lx = this.x + Math.cos(leftAngle) * armLength;
    const ly = this.y + Math.sin(leftAngle) * armLength;
    const rx = this.x + Math.cos(rightAngle) * armLength;
    const ry = this.y + Math.sin(rightAngle) * armLength;

    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(this.x, this.y);
    ctx.lineTo(rx, ry);
    ctx.strokeStyle = `rgba(230, 248, 255, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(lx + 1, ly + 1);
    ctx.lineTo(this.x + 1, this.y + 1);
    ctx.lineTo(rx + 1, ry + 1);
    ctx.strokeStyle = `rgba(5, 20, 38, ${(alpha * 0.5).toFixed(3)})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

/**
 * Spine-Kinematics Cinematic Fish Class (Goldfish & Red Carps)
 * 13-segment articulated spine, S-curve propagation, 3D volumetric back shading,
 * translucent rayed fins, trailing veil tail, and soft diffused riverbed shadow.
 */
class CinematicFish {
  constructor(width, height, initialSpawn = false) {
    this.reset(width, height, initialSpawn);
  }

  reset(width, height, initialSpawn = false) {
    this.x = initialSpawn ? Math.random() * (width + 120) - 60 : -160 - Math.random() * 100;
    this.y = Math.random() * (height - 140) + 70;
    this.baseSpeed = 0.7 + Math.random() * 0.75;
    this.swimSpeed = 0.016 + Math.random() * 0.006;
    this.angle = (Math.random() - 0.5) * 0.28; // gentle rightward heading
    this.targetAngle = this.angle;
    this.scale = 0.88 + Math.random() * 0.32;
    // Two distinct types: Kohaku/Calico Goldfish or Village Red Carp
    this.type = Math.random() > 0.42 ? 'kohaku' : 'red_carp';
    this.speedBoost = 1.0;
    this.boostTimer = 0;
    this.wigglePhase = Math.random() * Math.PI * 2;
    this.driftFreq = 0.0007 + Math.random() * 0.0005;
    this.driftOffset = Math.random() * 1000;
  }

  update(width, height, time, cursor) {
    // Subtle cursor awareness: steer away and gain speed boost if within 120px
    if (cursor.active) {
      const distToCursor = Math.hypot(this.x - cursor.x, this.y - cursor.y);
      if (distToCursor < 125) {
        let awayAngle = Math.atan2(this.y - cursor.y, this.x - cursor.x);
        // Clamp to generally forward drift (+X)
        if (Math.abs(awayAngle) > Math.PI / 2) {
          awayAngle = awayAngle > 0 ? Math.PI / 3.2 : -Math.PI / 3.2;
        }
        this.targetAngle = awayAngle;
        this.speedBoost = 1.6;
        this.boostTimer = 65;
      }
    }

    if (this.boostTimer > 0) {
      this.boostTimer--;
      if (this.boostTimer === 0) {
        this.speedBoost = 1.0;
      }
    } else {
      // Natural diagonal drift
      const naturalDrift = Math.sin(time * this.driftFreq + this.driftOffset) * 0.24;
      this.targetAngle = naturalDrift;
    }

    // Smooth heading interpolation
    this.angle += (this.targetAngle - this.angle) * 0.055;

    // Movement with river current
    const currentSpeed = this.baseSpeed * this.speedBoost + CONFIG.RIVER_FLOW_SPEED * 0.35;
    this.x += Math.cos(this.angle) * currentSpeed;
    this.y += Math.sin(this.angle) * currentSpeed;

    // Wrap around
    if (this.x > width + 180) {
      this.reset(width, height, false);
    }
  }

  /**
   * Computes 13 articulated spine points and lateral body profiles
   */
  getGeometry(time) {
    const segCount = 13;
    const segDist = 5.2 * this.scale;
    const spine = [];
    const leftPts = [];
    const rightPts = [];

    // Anatomical width profile along the 13 points (Snout -> Belly -> Peduncle -> Tail)
    const WIDTH_PROFILE = [
      4.2,  // 0: Snout
      7.0,  // 1: Head
      9.8,  // 2: Shoulders / Gills
      11.6, // 3: Widest Chest
      11.8, // 4: Anterior Belly
      11.0, // 5: Mid-body
      9.8,  // 6: Posterior Mid-body
      8.0,  // 7: Anterior Peduncle
      6.4,  // 8: Mid Peduncle
      4.8,  // 9: Posterior Peduncle
      3.6,  // 10: Slender Wrist
      2.6,  // 11: Tail Peduncle End
      1.8   // 12: Caudal Fin Base
    ];

    const currentSpeedVal = this.swimSpeed * this.speedBoost;
    const waveTime = time * currentSpeedVal + this.wigglePhase;

    for (let i = 0; i < segCount; i++) {
      // Natural S-curve body deformation using propagating sine wave:
      // segment.x += Math.sin(time * 0.018 * speed + i * 0.45) * (i * 0.65) * scale;
      const lateralOffset = Math.sin(waveTime - i * 0.45) * (i * 0.65) * this.scale;

      const baseX = this.x - Math.cos(this.angle) * (i * segDist);
      const baseY = this.y - Math.sin(this.angle) * (i * segDist);

      const perpX = -Math.sin(this.angle);
      const perpY = Math.cos(this.angle);

      spine.push({
        x: baseX + perpX * lateralOffset,
        y: baseY + perpY * lateralOffset
      });
    }

    // Tangent vectors and lateral boundary contours
    for (let i = 0; i < segCount; i++) {
      let tanAngle;
      if (i === 0) {
        tanAngle = Math.atan2(spine[1].y - spine[0].y, spine[1].x - spine[0].x);
      } else if (i === segCount - 1) {
        tanAngle = Math.atan2(spine[segCount - 1].y - spine[segCount - 2].y, spine[segCount - 1].x - spine[segCount - 2].x);
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
   * Draws fish geometry (either as depth shadow or volumetric fish)
   */
  draw(ctx, time, isShadow = false) {
    const { spine, leftPts, rightPts } = this.getGeometry(time);
    const ox = isShadow ? 16 : 0;
    const oy = isShadow ? 16 : 0;

    const shadowColor = 'rgba(2, 10, 20, 0.45)';
    const finBaseColor = isShadow
      ? shadowColor
      : (this.type === 'kohaku' ? 'rgba(255, 235, 215, 0.65)' : 'rgba(255, 150, 150, 0.65)');

    ctx.save();

    // 1. PECTORAL FINS (Articulated behind head at segment 2)
    const finFlutter = Math.sin(time * 0.007 + this.wigglePhase) * 0.22;
    const leftFinAngle = this.angle + 2.3 + finFlutter;
    const rightFinAngle = this.angle - 2.3 - finFlutter;
    const finLen = 20 * this.scale;

    // Left pectoral fin with delicate ray ribs
    ctx.beginPath();
    ctx.moveTo(leftPts[2].x + ox, leftPts[2].y + oy);
    ctx.bezierCurveTo(
      leftPts[2].x + Math.cos(leftFinAngle) * (finLen * 0.7) + ox,
      leftPts[2].y + Math.sin(leftFinAngle) * (finLen * 0.7) + oy,
      leftPts[2].x + Math.cos(leftFinAngle + 0.28) * finLen + ox,
      leftPts[2].y + Math.sin(leftFinAngle + 0.28) * finLen + oy,
      leftPts[3].x + ox,
      leftPts[3].y + oy
    );
    ctx.fillStyle = finBaseColor;
    ctx.fill();

    // Fin rays if not shadow
    if (!isShadow) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(leftPts[2].x, leftPts[2].y);
      ctx.lineTo(leftPts[2].x + Math.cos(leftFinAngle + 0.14) * (finLen * 0.85), leftPts[2].y + Math.sin(leftFinAngle + 0.14) * (finLen * 0.85));
      ctx.stroke();
    }

    // Right pectoral fin
    ctx.beginPath();
    ctx.moveTo(rightPts[2].x + ox, rightPts[2].y + oy);
    ctx.bezierCurveTo(
      rightPts[2].x + Math.cos(rightFinAngle) * (finLen * 0.7) + ox,
      rightPts[2].y + Math.sin(rightFinAngle) * (finLen * 0.7) + oy,
      rightPts[2].x + Math.cos(rightFinAngle - 0.28) * finLen + ox,
      rightPts[2].y + Math.sin(rightFinAngle - 0.28) * finLen + oy,
      rightPts[3].x + ox,
      rightPts[3].y + oy
    );
    ctx.fillStyle = finBaseColor;
    ctx.fill();

    if (!isShadow) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(rightPts[2].x, rightPts[2].y);
      ctx.lineTo(rightPts[2].x + Math.cos(rightFinAngle - 0.14) * (finLen * 0.85), rightPts[2].y + Math.sin(rightFinAngle - 0.14) * (finLen * 0.85));
      ctx.stroke();
    }

    // 2. VENTRAL / PELVIC FINS (Segment 6)
    const pelvLen = 12 * this.scale;
    ctx.beginPath();
    ctx.moveTo(leftPts[6].x + ox, leftPts[6].y + oy);
    ctx.lineTo(leftPts[6].x + Math.cos(leftFinAngle) * pelvLen + ox, leftPts[6].y + Math.sin(leftFinAngle) * pelvLen + oy);
    ctx.lineTo(leftPts[7].x + ox, leftPts[7].y + oy);
    ctx.fillStyle = finBaseColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(rightPts[6].x + ox, rightPts[6].y + oy);
    ctx.lineTo(rightPts[6].x + Math.cos(rightFinAngle) * pelvLen + ox, rightPts[6].y + Math.sin(rightFinAngle) * pelvLen + oy);
    ctx.lineTo(rightPts[7].x + ox, rightPts[7].y + oy);
    ctx.fillStyle = finBaseColor;
    ctx.fill();

    // 3. FLOWING VEIL TAIL (Delay trailing behind body sway)
    const tailBase = spine[12];
    const tailPrev = spine[10];
    const tailAngle = Math.atan2(tailBase.y - tailPrev.y, tailBase.x - tailPrev.x);
    const tailLen = 38 * this.scale;
    // Trailing wave delay
    const tailWave = Math.sin(time * 0.018 * this.swimSpeed * this.speedBoost + this.wigglePhase - 1.4) * 8 * this.scale;

    ctx.beginPath();
    ctx.moveTo(tailBase.x + ox, tailBase.y + oy);
    // Upper veil lobe
    ctx.bezierCurveTo(
      tailBase.x + Math.cos(tailAngle - 0.38) * (tailLen * 0.55) + ox,
      tailBase.y + Math.sin(tailAngle - 0.38) * (tailLen * 0.55) + tailWave + oy,
      tailBase.x + Math.cos(tailAngle - 0.22) * tailLen + ox,
      tailBase.y + Math.sin(tailAngle - 0.22) * tailLen + tailWave * 1.4 + oy,
      tailBase.x + Math.cos(tailAngle - 0.05) * (tailLen * 0.8) + ox,
      tailBase.y + Math.sin(tailAngle - 0.05) * (tailLen * 0.8) + tailWave + oy
    );
    // Center notch / Lower veil lobe
    ctx.bezierCurveTo(
      tailBase.x + Math.cos(tailAngle + 0.22) * tailLen + ox,
      tailBase.y + Math.sin(tailAngle + 0.22) * tailLen - tailWave * 1.4 + oy,
      tailBase.x + Math.cos(tailAngle + 0.38) * (tailLen * 0.55) + ox,
      tailBase.y + Math.sin(tailAngle + 0.38) * (tailLen * 0.55) - tailWave + oy,
      tailBase.x + ox,
      tailBase.y + oy
    );
    ctx.closePath();
    ctx.fillStyle = finBaseColor;
    ctx.fill();

    // Subtle fin rays in tail
    if (!isShadow) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 0.7;
      for (let r = -2; r <= 2; r++) {
        ctx.beginPath();
        ctx.moveTo(tailBase.x, tailBase.y);
        ctx.quadraticCurveTo(
          tailBase.x + Math.cos(tailAngle + r * 0.1) * (tailLen * 0.5),
          tailBase.y + Math.sin(tailAngle + r * 0.1) * (tailLen * 0.5) + tailWave * (r * 0.3),
          tailBase.x + Math.cos(tailAngle + r * 0.08) * (tailLen * 0.85),
          tailBase.y + Math.sin(tailAngle + r * 0.08) * (tailLen * 0.85) + tailWave * (r * 0.5)
        );
        ctx.stroke();
      }
    }

    // 4. MAIN VOLUMETRIC FISH BODY CONTOUR
    ctx.beginPath();
    // Rounded snout
    ctx.moveTo(spine[0].x + Math.cos(this.angle) * (6 * this.scale) + ox, spine[0].y + Math.sin(this.angle) * (6 * this.scale) + oy);

    // Left body curvature
    for (let i = 0; i < 12; i++) {
      const mx = (leftPts[i].x + leftPts[i + 1].x) / 2 + ox;
      const my = (leftPts[i].y + leftPts[i + 1].y) / 2 + oy;
      ctx.quadraticCurveTo(leftPts[i].x + ox, leftPts[i].y + oy, mx, my);
    }
    ctx.lineTo(spine[12].x + ox, spine[12].y + oy);

    // Right body curvature
    for (let i = 12; i > 0; i--) {
      const mx = (rightPts[i].x + rightPts[i - 1].x) / 2 + ox;
      const my = (rightPts[i].y + rightPts[i - 1].y) / 2 + oy;
      ctx.quadraticCurveTo(rightPts[i].x + ox, rightPts[i].y + oy, mx, my);
    }
    ctx.closePath();

    if (isShadow) {
      ctx.fillStyle = shadowColor;
      ctx.fill();
    } else {
      // 3D Volumetric body gradient
      const bodyGrad = ctx.createLinearGradient(
        spine[0].x, spine[0].y,
        spine[12].x, spine[12].y
      );

      if (this.type === 'kohaku') {
        // Japanese Kohaku: Pearl white with vibrant crimson/orange saddle patches
        bodyGrad.addColorStop(0, '#ff3b00');     // Vermilion snout
        bodyGrad.addColorStop(0.2, '#ff6a00');    // Vibrant orange head
        bodyGrad.addColorStop(0.42, '#ffffff');   // Pure white belly saddle
        bodyGrad.addColorStop(0.68, '#ff4500');   // Crimson posterior patch
        bodyGrad.addColorStop(1, '#fff5ea');      // Pale pearlescent peduncle
      } else {
        // Village Red Carp: Deep crimson back transitioning to glowing scarlet
        bodyGrad.addColorStop(0, '#8a0815');     // Deep crimson back
        bodyGrad.addColorStop(0.35, '#d91b2b');   // Glowing scarlet red body
        bodyGrad.addColorStop(0.7, '#ff3344');    // Bright sunlit flanks
        bodyGrad.addColorStop(1, 'rgba(255, 120, 140, 0.85)');
      }

      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Volumetric dorsal ridge highlight (catching sunlight along the spine)
      ctx.beginPath();
      ctx.moveTo(spine[1].x, spine[1].y);
      for (let i = 1; i < 9; i++) {
        ctx.lineTo(spine[i].x, spine[i].y);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = 2.2 * this.scale;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Translucent dorsal fin along spine
      ctx.beginPath();
      ctx.moveTo(spine[3].x, spine[3].y);
      ctx.quadraticCurveTo(
        spine[5].x - Math.sin(this.angle) * (4 * this.scale),
        spine[5].y + Math.cos(this.angle) * (4 * this.scale),
        spine[8].x,
        spine[8].y
      );
      ctx.strokeStyle = finBaseColor;
      ctx.lineWidth = 2.0 * this.scale;
      ctx.stroke();

      // Delicate Fish Eyes
      const eyeSideDist = 4.2 * this.scale;
      const eyeForwardDist = 3.2 * this.scale;
      const ex1 = spine[0].x + Math.cos(this.angle) * eyeForwardDist - Math.sin(this.angle) * eyeSideDist;
      const ey1 = spine[0].y + Math.sin(this.angle) * eyeForwardDist + Math.cos(this.angle) * eyeSideDist;
      const ex2 = spine[0].x + Math.cos(this.angle) * eyeForwardDist + Math.sin(this.angle) * eyeSideDist;
      const ey2 = spine[0].y + Math.sin(this.angle) * eyeForwardDist - Math.cos(this.angle) * eyeSideDist;

      // Dark pupil
      ctx.fillStyle = '#06131c';
      ctx.beginPath();
      ctx.arc(ex1, ey1, 1.4 * this.scale, 0, Math.PI * 2);
      ctx.arc(ex2, ey2, 1.4 * this.scale, 0, Math.PI * 2);
      ctx.fill();

      // Specular sunlight glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex1 - 0.4, ey1 - 0.4, 0.55 * this.scale, 0, Math.PI * 2);
      ctx.arc(ex2 - 0.4, ey2 - 0.4, 0.55 * this.scale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * WaterBackground Component
 * Cinematic 2.5D Realistic Village River Background Engine
 */
export default function WaterBackground() {
  const localCanvasRef = useRef(null);

  useEffect(() => {
    // 1. Get or attach to the canvas element
    let canvas = document.getElementById('cinematic-river');
    if (!canvas) {
      canvas = document.getElementById('village-river-canvas');
    }
    if (!canvas) {
      canvas = localCanvasRef.current;
    }
    if (!canvas) return;

    // Apply exact integration styles
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

    // Offscreen Canvas for Layer 1 & Layer 2 Pre-rendering (Zero-Lag 60FPS Optimization)
    const offscreenCanvas = document.createElement('canvas');
    const offCtx = offscreenCanvas.getContext('2d');

    // Pointer tracking state
    const pointer = {
      x: -1000,
      y: -1000,
      lastX: -1000,
      lastY: -1000,
      active: false,
      lastMoveTime: 0,
      lastStationaryRippleTime: 0
    };

    // Layer 2: 3D River Stones data
    const STONE_PALETTES = [
      { base: '#3e4a42', light: '#5c6e63', dark: '#202923', moss: true },  // Warm mossy Slate
      { base: '#2a2f35', light: '#424952', dark: '#13171b', moss: false }, // Weathered River Basalt
      { base: '#847565', light: '#a89784', dark: '#4a4136', moss: true },  // River Sandstone
      { base: '#515751', light: '#747d74', dark: '#2e332e', moss: true }   // Wet Granite
    ];
    let stones = [];

    // Layer 3: Physical River Grass data
    let grassClusters = [];

    // Layer 4: Fish instances
    let fishList = [];

    // Layer 5 & 6: Caustics, Shimmers, Ripples, Wakes, and Motes
    let caustics = [];
    let shimmers = [];
    let motes = [];
    const ripples = [];
    const wakes = [];

    const prefersReducedMotion = () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Helper: Draw organic rounded stone contour
    const drawStonePath = (targetCtx, s, ox = 0, oy = 0) => {
      targetCtx.beginPath();
      const numPts = s.deform.length;
      const pts = [];

      for (let j = 0; j < numPts; j++) {
        const angle = s.rotation + (j / numPts) * Math.PI * 2;
        const rFactor = s.deform[j];
        pts.push({
          x: s.x + ox + Math.cos(angle) * s.rx * rFactor,
          y: s.y + oy + Math.sin(angle) * s.ry * rFactor
        });
      }

      // Smooth closed spline
      targetCtx.moveTo((pts[0].x + pts[numPts - 1].x) / 2, (pts[0].y + pts[numPts - 1].y) / 2);
      for (let j = 0; j < numPts; j++) {
        const next = pts[(j + 1) % numPts];
        const midX = (pts[j].x + next.x) / 2;
        const midY = (pts[j].y + next.y) / 2;
        targetCtx.quadraticCurveTo(pts[j].x, pts[j].y, midX, midY);
      }
      targetCtx.closePath();
    };

    /**
     * Pre-render Layer 1 (Riverbed Base & Sand) and Layer 2 (3D River Stones)
     * Onto Offscreen Canvas Cache once at startup and resize.
     */
    const preRenderRiverbed = () => {
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;
      offCtx.setTransform(1, 0, 0, 1, 0, 0);
      offCtx.scale(dpr, dpr);

      // =======================================================================
      // LAYER 1: Natural Silt & Particle Bed (Bottom)
      // =======================================================================
      // Deep Volumetric Riverbed Gradient:
      // Dark Indigo-Blue (#0a1f33) -> Sky-Reflected Azure (#144e76) -> Sunlit Turquoise (#2882a8)
      const baseGrad = offCtx.createLinearGradient(0, height, width, 0);
      baseGrad.addColorStop(0, '#0a1f33');     // Deep volumetric river channel
      baseGrad.addColorStop(0.38, '#144e76');  // Sky-reflected azure
      baseGrad.addColorStop(0.78, '#2882a8');  // Sunlit turquoise
      baseGrad.addColorStop(1, '#3b9ec7');     // Shimmering bank edge
      offCtx.fillStyle = baseGrad;
      offCtx.fillRect(0, 0, width, height);

      // Warm sandy riverbed glow along the rocky bank (left & lower stream)
      const bankSandGrad = offCtx.createRadialGradient(
        width * 0.18, height * 0.65, 30,
        width * 0.3, height * 0.55, Math.max(width, height) * 0.75
      );
      bankSandGrad.addColorStop(0, 'rgba(148, 131, 107, 0.45)');
      bankSandGrad.addColorStop(0.45, 'rgba(95, 108, 98, 0.22)');
      bankSandGrad.addColorStop(1, 'rgba(10, 31, 51, 0)');
      offCtx.fillStyle = bankSandGrad;
      offCtx.fillRect(0, 0, width, height);

      // 100+ fine, uneven speckled silt & river sand particles (0.5px to 3px, opacity 0.05 to 0.3)
      for (let i = 0; i < 140; i++) {
        const sx = Math.random() * width;
        const sy = Math.random() * height;
        const sRad = 0.5 + Math.random() * 2.5;
        const alpha = 0.05 + Math.random() * 0.25;

        offCtx.fillStyle = (i % 3 === 0)
          ? `rgba(235, 225, 205, ${alpha})`
          : (i % 3 === 1 ? `rgba(180, 160, 135, ${alpha})` : `rgba(15, 35, 50, ${alpha * 1.2})`);

        offCtx.beginPath();
        offCtx.arc(sx, sy, sRad, 0, Math.PI * 2);
        offCtx.fill();
      }

      // =======================================================================
      // LAYER 2: Ultra-Realistic 3D River Stones (Pre-rendered)
      // =======================================================================
      // 1. Deep, diffused underwater drop shadows (rgba(2, 10, 20, 0.75) with 15px offset)
      for (let i = 0; i < stones.length; i++) {
        const s = stones[i];
        drawStonePath(offCtx, s, 15, 15);
        offCtx.fillStyle = 'rgba(2, 10, 20, 0.75)';
        offCtx.fill();
      }

      // 2. 3D Rock Volumetric Bodies & Radial Gradient Overlaps
      for (let i = 0; i < stones.length; i++) {
        const s = stones[i];

        // Bulging radial gradient with light source from top-left
        const lx = s.x - s.rx * 0.38;
        const ly = s.y - s.ry * 0.38;
        const radGrad = offCtx.createRadialGradient(
          lx, ly, s.rx * 0.1,
          s.x, s.y, Math.max(s.rx, s.ry) * 1.35
        );
        radGrad.addColorStop(0, s.palette.light);
        radGrad.addColorStop(0.55, s.palette.base);
        radGrad.addColorStop(1, s.palette.dark);

        drawStonePath(offCtx, s, 0, 0);
        offCtx.fillStyle = radGrad;
        offCtx.fill();

        // Volumetric top highlight (rgba(255, 255, 255, 0.2)) on upper rim
        offCtx.save();
        offCtx.clip();
        const highlightGrad = offCtx.createLinearGradient(
          s.x - s.rx, s.y - s.ry,
          s.x + s.rx * 0.5, s.y + s.ry * 0.5
        );
        highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        highlightGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.08)');
        highlightGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
        offCtx.fillStyle = highlightGrad;
        offCtx.fillRect(s.x - s.rx * 1.2, s.y - s.ry * 1.2, s.rx * 2.4, s.ry * 2.4);

        // Moss patches on upper edges (rgba(28, 69, 44, 0.4))
        if (s.palette.moss) {
          const mossGrad = offCtx.createRadialGradient(
            s.x - s.rx * 0.2, s.y - s.ry * 0.35, 2,
            s.x - s.rx * 0.2, s.y - s.ry * 0.35, s.rx * 0.75
          );
          mossGrad.addColorStop(0, 'rgba(56, 115, 68, 0.55)');
          mossGrad.addColorStop(0.65, 'rgba(28, 69, 44, 0.38)');
          mossGrad.addColorStop(1, 'rgba(28, 69, 44, 0)');
          offCtx.fillStyle = mossGrad;
          offCtx.fillRect(s.x - s.rx, s.y - s.ry, s.rx * 2, s.ry * 2);
        }

        offCtx.restore();

        // Submerged Water Tint overlay
        drawStonePath(offCtx, s, 0, 0);
        offCtx.fillStyle = 'rgba(20, 78, 118, 0.22)';
        offCtx.fill();
      }
    };

    // Initialize scenes and entities
    const initScene = () => {
      // 1. Generate 55 Stones (CONFIG.STONE_COUNT):
      // Dense natural clustering along the left and lower riverbank, exactly like reference artwork!
      stones = [];
      const primaryCount = 36;
      for (let i = 0; i < primaryCount; i++) {
        // Natural distribution biased along riverbank (left 65% and bottom 75%)
        const clusterBiasX = Math.random() < 0.75 ? Math.random() * (width * 0.58) : Math.random() * width;
        const clusterBiasY = Math.random() < 0.65 ? Math.random() * (height * 0.85) : Math.random() * height;

        stones.push({
          x: clusterBiasX,
          y: clusterBiasY,
          rx: 28 + Math.random() * 45, // radiusX: 28 to 73px
          ry: 20 + Math.random() * 34, // radiusY: 20 to 54px
          rotation: Math.random() * Math.PI * 2,
          palette: STONE_PALETTES[Math.floor(Math.random() * STONE_PALETTES.length)],
          deform: Array.from({ length: 12 }, () => 0.86 + Math.random() * 0.28)
        });
      }

      // Small pebble clusters tucked into the gaps
      const pebbleCount = Math.max(0, CONFIG.STONE_COUNT - primaryCount);
      for (let i = 0; i < pebbleCount; i++) {
        const parent = stones[Math.floor(Math.random() * primaryCount)];
        const ang = Math.random() * Math.PI * 2;
        const dist = parent.rx + 10 + Math.random() * 26;
        stones.push({
          x: Math.max(20, Math.min(width - 20, parent.x + Math.cos(ang) * dist)),
          y: Math.max(20, Math.min(height - 20, parent.y + Math.sin(ang) * dist)),
          rx: 10 + Math.random() * 12,
          ry: 7 + Math.random() * 9,
          rotation: Math.random() * Math.PI * 2,
          palette: STONE_PALETTES[Math.floor(Math.random() * STONE_PALETTES.length)],
          deform: Array.from({ length: 8 }, () => 0.90 + Math.random() * 0.20)
        });
      }

      // Sort stones so background stones draw before foreground stones
      stones.sort((a, b) => a.y - b.y);

      // 2. Generate 28 dense tufts of River Grass (CONFIG.GRASS_CLUSTERS)
      // Grouped together naturalistically around rocks as in reference art
      grassClusters = [];
      for (let c = 0; c < CONFIG.GRASS_CLUSTERS; c++) {
        // Bias clusters toward the central-lower rocks
        const anchorStone = stones[c % stones.length];
        const cx = anchorStone
          ? anchorStone.x + (Math.random() - 0.3) * anchorStone.rx * 1.5
          : Math.random() * (width * 0.7);
        const cy = anchorStone
          ? anchorStone.y + anchorStone.ry * 0.4
          : Math.random() * height;

        const bladeCount = 5 + Math.floor(Math.random() * 5); // 5 to 9 blades per tuft
        const blades = [];
        for (let b = 0; b < bladeCount; b++) {
          blades.push({
            x: cx + (b - bladeCount / 2) * 5.5 + (Math.random() - 0.5) * 4,
            y: cy + (Math.random() - 0.5) * 8,
            length: 85 + Math.random() * 95, // Long, sweeping blades
            phase: Math.random() * Math.PI * 2,
            baseWidth: 3.5,
            leanAngle: 0.2 + (Math.random() - 0.5) * 0.25
          });
        }
        grassClusters.push({ cx, cy, blades });
      }

      // 3. Generate Cinematic Fish (CONFIG.FISH_COUNT = 5, strictly 4 to 6 fish)
      fishList = [];
      for (let f = 0; f < CONFIG.FISH_COUNT; f++) {
        fishList.push(new CinematicFish(width, height, true));
      }

      // 4. Generate Sunlight Caustic Web (distorted network of luminous bezier lines)
      caustics = [];
      for (let r = 0; r < 20; r++) {
        caustics.push({
          baseX: Math.random() * width,
          y: (height / 20) * r + (Math.random() - 0.5) * 40,
          span: 340 + Math.random() * 280,
          phase: Math.random() * Math.PI * 2
        });
      }

      // 5. Generate Sky Reflection Blobs (15-20 large, soft drifting blobs)
      shimmers = [];
      for (let s = 0; s < 18; s++) {
        shimmers.push({
          baseX: Math.random() * width,
          y: Math.random() * height,
          radius: 120 + Math.random() * 160,
          phase: Math.random() * Math.PI * 2
        });
      }

      // 6. Floating surface speckles/foam motes moving with current
      motes = [];
      for (let m = 0; m < 30; m++) {
        motes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: 1 + Math.random() * 1.8,
          speed: 0.2 + Math.random() * 0.45,
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

    // Interactive mouse velocity & movement tracking on window
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

      // Spawn subtle water waves if movement threshold met
      if (dist > CONFIG.RIPPLE_SENSITIVITY) {
        ripples.push(new WaterRipple(x, y));

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

    // Main 60FPS Cinematic Render Loop
    let lastTime = performance.now();

    const render = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const time = now;

      // Gentle stationary ripple when cursor rests peacefully
      if (!prefersReducedMotion() && pointer.active && now - pointer.lastMoveTime > 220) {
        if (now - pointer.lastStationaryRippleTime > 850) {
          pointer.lastStationaryRippleTime = now;
          ripples.push(new WaterRipple(pointer.x, pointer.y));
        }
      }

      // =======================================================================
      // LAYERS 1 & 2: Sunlit Riverbed & 3D Stones (Zero-lag Offscreen Stamp)
      // =======================================================================
      ctx.drawImage(offscreenCanvas, 0, 0, width, height);

      // =======================================================================
      // LAYER 3: Physical River Grass (Water Sway & Current)
      // =======================================================================
      ctx.save();
      ctx.globalAlpha = 0.7; // Translucent foliage at 0.7 opacity

      for (let c = 0; c < grassClusters.length; c++) {
        const cluster = grassClusters[c];
        for (let b = 0; b < cluster.blades.length; b++) {
          const blade = cluster.blades[b];

          // Dual-frequency wave algorithm from specification:
          // windSway = Math.sin(time * 0.001 + blade.y * 0.01) * 6;
          // currentDrift = Math.sin(time * 0.0025 + blade.x * 0.005) * 12;
          // Heavily bowed towards +X responding to river current
          const windSway = Math.sin(time * 0.001 + blade.y * 0.01) * 6;
          const currentDrift = Math.sin(time * 0.0025 + blade.x * 0.005) * 12;
          const totalSway = windSway + currentDrift + 28;

          const rootX = blade.x;
          const rootY = blade.y;
          const tipX = rootX + totalSway + Math.sin(blade.leanAngle) * blade.length;
          const tipY = rootY - Math.cos(blade.leanAngle) * blade.length;

          // Mid joints for natural organic bending
          const cp1X = rootX + totalSway * 0.35;
          const cp1Y = rootY - blade.length * 0.38;
          const cp2X = rootX + totalSway * 0.75;
          const cp2Y = rootY - blade.length * 0.72;

          ctx.beginPath();
          // Tapering width: base 3.5px, tip 0.2px
          ctx.moveTo(rootX - blade.baseWidth * 0.5, rootY);
          ctx.bezierCurveTo(
            cp1X - blade.baseWidth * 0.35, cp1Y,
            cp2X - blade.baseWidth * 0.18, cp2Y,
            tipX, tipY
          );
          ctx.bezierCurveTo(
            cp2X + blade.baseWidth * 0.18, cp2Y,
            cp1X + blade.baseWidth * 0.35, cp1Y,
            rootX + blade.baseWidth * 0.5, rootY
          );
          ctx.closePath();

          // Palette: Jungle Green (#0c2e1b) -> Forest Green (#16442b) -> sunlit Emerald (#397a55)
          const grassGrad = ctx.createLinearGradient(rootX, rootY, tipX, tipY);
          grassGrad.addColorStop(0, '#0c2e1b');
          grassGrad.addColorStop(0.48, '#16442b');
          grassGrad.addColorStop(1, '#397a55');

          ctx.fillStyle = grassGrad;
          ctx.fill();
        }
      }
      ctx.restore();

      // =======================================================================
      // LAYER 4: Spine-Kinematics Cinematic Fish (Goldfish & Red Carps)
      // =======================================================================
      // 1. Update fish kinematics
      for (let f = 0; f < fishList.length; f++) {
        fishList[f].update(width, height, time, pointer);
      }

      // 2. Render soft diffused shadows on riverbed (+16px offset)
      for (let f = 0; f < fishList.length; f++) {
        fishList[f].draw(ctx, time, true);
      }

      // 3. Render 3D volumetric fish bodies, flowing fins, and sunlight glints
      for (let f = 0; f < fishList.length; f++) {
        fishList[f].draw(ctx, time, false);
      }

      // =======================================================================
      // LAYER 5: Interactive Natural Fluid Ripple Engine (Pass-By Waves)
      // =======================================================================
      // Wakes
      for (let i = wakes.length - 1; i >= 0; i--) {
        const wake = wakes[i];
        wake.update();
        wake.draw(ctx);
        if (wake.life <= 0) {
          wakes.splice(i, 1);
        }
      }

      // Cascading ripples with downstream drift (+X)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.update();
        r.draw(ctx);
        if (r.opacity < 0.01 || r.radius >= r.maxRadius * 0.99) {
          ripples.splice(i, 1);
        }
      }

      // =======================================================================
      // LAYER 6: Sunlight Caustics & Sky Reflections (Top Layer)
      // =======================================================================
      ctx.save();
      // Use 'overlay' or 'screen' for shimmering sunlight bathing the scene
      ctx.globalCompositeOperation = 'overlay';

      // 1. Dynamic Sunlight Caustic Web (moving slowly at diagonal across water)
      ctx.strokeStyle = 'rgba(200, 245, 255, 0.12)';
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';

      for (let r = 0; r < caustics.length; r++) {
        const rib = caustics[r];
        const driftX = (rib.baseX + time * 0.026 * CONFIG.RIVER_FLOW_SPEED) % (width + 360) - 180;
        const ribY = rib.y + Math.sin(time * 0.0011 + rib.phase) * 22;

        ctx.beginPath();
        ctx.moveTo(driftX, ribY);
        for (let seg = 1; seg <= 4; seg++) {
          const segX = driftX + seg * (rib.span / 4);
          const cpX = segX - rib.span / 8;
          const cpY = ribY + Math.sin(time * 0.0013 + rib.phase + seg) * 34;
          const endY = ribY + Math.cos(time * 0.0009 + rib.phase + seg * 1.3) * 19;
          ctx.quadraticCurveTo(cpX, cpY, segX, endY);
        }
        ctx.stroke();
      }

      // 2. Sky Reflection Blobs (rgba(173, 216, 230, 0.08))
      for (let s = 0; s < shimmers.length; s++) {
        const sm = shimmers[s];
        const sx = (sm.baseX + time * 0.032 * CONFIG.RIVER_FLOW_SPEED) % (width + sm.radius * 2) - sm.radius;
        const sy = sm.y + Math.sin(time * 0.0008 + sm.phase) * 16;

        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sm.radius);
        grad.addColorStop(0, 'rgba(173, 216, 230, 0.08)');
        grad.addColorStop(0.55, 'rgba(173, 216, 230, 0.03)');
        grad.addColorStop(1, 'rgba(173, 216, 230, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, sm.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Floating surface speckles/foam motes moving with current
      ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
      for (let m = 0; m < motes.length; m++) {
        const mote = motes[m];
        mote.x += (CONFIG.RIVER_FLOW_SPEED * 0.8 + mote.speed) * dt * 60;
        if (mote.x > width + 15) {
          mote.x = -15;
          mote.y = Math.random() * height;
        }
        const pulse = (Math.sin(time * 0.0022 + mote.phase) + 1) * 0.5;
        ctx.beginPath();
        ctx.arc(
          mote.x,
          mote.y + Math.sin(time * 0.0012 + mote.phase) * 5,
          mote.size * (0.8 + pulse * 0.4),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.restore(); // Restore globalCompositeOperation

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    // Pause animation when tab is inactive to save GPU/CPU cycles
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

  const hasDirectCanvas =
    typeof document !== 'undefined' &&
    (!!document.getElementById('cinematic-river') || !!document.getElementById('village-river-canvas'));

  if (hasDirectCanvas) {
    return null;
  }

  return (
    <canvas
      id="cinematic-river"
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
