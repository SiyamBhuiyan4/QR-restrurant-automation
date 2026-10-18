import React, { useRef, useEffect } from 'react';

/**
 * WaterBackground Component
 * 
 * Provides an organic riverside water reflection experience:
 * - Serene river mirror reflecting the daytime blue sky (cerulean, azure, cyan, deep river water).
 * - Multi-layered flowing river current wave lines with light caustics and dancing water sparkles.
 * - Interactive cursor water ripples:
 *   * When cursor moves: generates smooth fluid ripple wakes.
 *   * When cursor is pointing / stationary: periodically emits gentle, smooth concentric water rings.
 *   * On click/tap: triggers a crisp splash water wave.
 * - GPU 60fps canvas animation with High-DPI retina support and auto pause on hidden tab.
 */
export default function WaterBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId = null;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Pointer state
    let pointer = {
      x: -1000,
      y: -1000,
      active: false,
      lastMoveTime: 0,
      lastStationaryRippleTime: 0
    };

    // Active ripples array
    const ripples = [];
    const MAX_RIPPLES = 45;

    // Floating water sparkles (light glints on river surface)
    const sparkles = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.8 + Math.random() * 1.8,
      speedX: 0.00015 + Math.random() * 0.0003,
      pulseSpeed: 0.002 + Math.random() * 0.003,
      phase: Math.random() * Math.PI * 2
    }));

    // Check reduced motion preference
    const prefersReducedMotion = () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Resize canvas with devicePixelRatio
    const handleResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    // Spawn a new smooth water ripple
    const addRipple = (x, y, intensity = 1.0, maxRad = 190) => {
      if (ripples.length >= MAX_RIPPLES) {
        ripples.shift();
      }
      ripples.push({
        x,
        y,
        radius: 4,
        maxRadius: maxRad,
        speed: 1.6 + intensity * 0.8,
        opacity: Math.min(0.75 * intensity, 0.85),
        crestWidth: 3 + intensity * 2,
        troughWidth: 6 + intensity * 4,
        age: 0
      });
    };

    // Track mouse / pointer movements
    const handlePointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const now = performance.now();
      const dist = Math.hypot(x - pointer.x, y - pointer.y);

      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
      pointer.lastMoveTime = now;

      // Spawn subtle ripple on movement if moved enough
      if (dist > 28 && now - pointer.lastMoveTime > 30) {
        addRipple(x, y, Math.min(dist / 60, 0.9), 160 + Math.random() * 50);
      }
    };

    const handlePointerDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
      addRipple(x, y, 1.4, 240);
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    // Continuous smooth animation loop
    let lastTime = performance.now();

    const render = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!prefersReducedMotion()) {
        // Pointing / stationary cursor ripple:
        // When cursor is pointing / stationary, emit smooth periodic water waves
        if (pointer.active && now - pointer.lastMoveTime > 180) {
          if (now - pointer.lastStationaryRippleTime > 720) {
            pointer.lastStationaryRippleTime = now;
            addRipple(pointer.x, pointer.y, 1.05, 190 + Math.random() * 40);
          }
        }
      }

      // 1. Draw River & Sky Mirror Base Gradient
      // Vertical transition: Blue sky reflection -> river water surface -> deep crystal river depths
      const skyWaterGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyWaterGrad.addColorStop(0, '#02182b');     // Deep river horizon edge
      skyWaterGrad.addColorStop(0.18, '#033356');  // Sky reflection top (azure-blue)
      skyWaterGrad.addColorStop(0.38, '#0284c7');  // Mirrored daytime blue sky
      skyWaterGrad.addColorStop(0.52, '#0ea5e9');  // Clear sky specular highlight
      skyWaterGrad.addColorStop(0.68, '#0284c7');  // Soft azure water surface
      skyWaterGrad.addColorStop(0.85, '#073b61');  // Transitional river water depth
      skyWaterGrad.addColorStop(1, '#021424');     // Deep tranquil riverbed noir

      ctx.fillStyle = skyWaterGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Soft Ambient Water Current Waves (River flow mirroring the sky)
      const t = now * 0.001;
      const waveCount = 4;

      for (let i = 0; i < waveCount; i++) {
        const waveY = (height * (0.28 + i * 0.22)) + Math.sin(t * 0.8 + i) * 16;
        const waveAlpha = 0.05 + i * 0.025;

        ctx.beginPath();
        ctx.moveTo(0, waveY);

        for (let x = 0; x <= width; x += 30) {
          const cy = waveY +
            Math.sin(x * 0.0032 + t * 0.9 + i * 1.5) * 14 +
            Math.cos(x * 0.0068 - t * 0.7 + i) * 8;
          ctx.lineTo(x, cy);
        }

        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const waveGrad = ctx.createLinearGradient(0, waveY - 20, 0, waveY + 80);
        waveGrad.addColorStop(0, `rgba(56, 189, 248, ${waveAlpha * 1.4})`);
        waveGrad.addColorStop(0.5, `rgba(14, 165, 233, ${waveAlpha * 0.8})`);
        waveGrad.addColorStop(1, 'rgba(2, 20, 36, 0)');

        ctx.fillStyle = waveGrad;
        ctx.fill();

        // Wave crest highlight line
        ctx.beginPath();
        for (let x = 0; x <= width; x += 30) {
          const cy = waveY +
            Math.sin(x * 0.0032 + t * 0.9 + i * 1.5) * 14 +
            Math.cos(x * 0.0068 - t * 0.7 + i) * 8;
          if (x === 0) ctx.moveTo(x, cy);
          else ctx.lineTo(x, cy);
        }
        ctx.strokeStyle = `rgba(224, 242, 254, ${waveAlpha * 1.6})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 3. Floating Sunlit Water Sparkles / Caustic Flecks
      sparkles.forEach((s) => {
        s.x = (s.x + s.speedX * dt * 60) % 1;
        const px = s.x * width;
        const py = s.y * height;
        const pulse = (Math.sin(t * 2 + s.phase) + 1) * 0.5;
        const alpha = 0.15 + pulse * 0.55;

        ctx.beginPath();
        ctx.arc(px, py, s.size * (0.8 + pulse * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 242, 254, ${alpha})`;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 4. Cursor Contact Light Pool (Luminous water touch point)
      if (pointer.active && pointer.x > 0 && pointer.y > 0) {
        const pointerGlow = ctx.createRadialGradient(
          pointer.x, pointer.y, 0,
          pointer.x, pointer.y, 90
        );
        pointerGlow.addColorStop(0, 'rgba(186, 230, 253, 0.35)');
        pointerGlow.addColorStop(0.3, 'rgba(56, 189, 248, 0.18)');
        pointerGlow.addColorStop(1, 'rgba(2, 132, 199, 0)');

        ctx.fillStyle = pointerGlow;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 90, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Draw Interactive Smooth Water Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.age += dt;

        const progress = r.radius / r.maxRadius;
        if (progress >= 1) {
          ripples.splice(i, 1);
          continue;
        }

        // Natural smooth ease-out falloff
        const easeAlpha = Math.sin(progress * Math.PI) * (1 - progress * 0.4) * r.opacity;

        // A. Outer Trough Ring (Subtle deep river water refraction shadow)
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(r.radius - 4, 1), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(2, 44, 76, ${easeAlpha * 0.4})`;
        ctx.lineWidth = r.troughWidth * (1 - progress * 0.6);
        ctx.stroke();

        // B. Primary Sky-Blue Water Refraction Ring
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${easeAlpha * 0.75})`;
        ctx.lineWidth = r.crestWidth * (1 - progress * 0.5);
        ctx.stroke();

        // C. Inner Sunlit Highlight Ring (Crystalline caustic crest)
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(r.radius - 2.5, 0.5), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(240, 249, 255, ${easeAlpha * 0.95})`;
        ctx.lineWidth = Math.max(1.5 * (1 - progress * 0.8), 0.6);
        ctx.stroke();

        // D. Secondary Echo Ripple Ring (Creates realistic water interference)
        if (r.radius > 22) {
          const echoRadius = r.radius - 18;
          const echoProgress = echoRadius / r.maxRadius;
          const echoAlpha = easeAlpha * 0.45;

          ctx.beginPath();
          ctx.arc(r.x, r.y, echoRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(186, 230, 253, ${echoAlpha})`;
          ctx.lineWidth = 1.2 * (1 - echoProgress);
          ctx.stroke();
        }
      }

      // Schedule next frame
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    // Pause animation when tab is inactive to save battery
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
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 60fps Interactive River & Sky Water Wave Canvas */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />

      {/* Gentle Vignette Overlay for Crisp Readability of Food Cards */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 90% 70% at 50% 30%, rgba(2, 20, 36, 0.05) 0%, rgba(2, 20, 36, 0.65) 100%)'
        }}
      />
    </div>
  );
}
