import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Storage keys for audio settings persistence.
 */
const STORAGE_KEYS = {
  MUTED: 'restaurant_menu_book_sound_muted',
  VOLUME: 'restaurant_menu_book_sound_volume',
};

const DEFAULT_VOLUME = 0.65;

/**
 * Safely get Web Audio AudioContext constructor across browsers.
 */
function getAudioContextClass() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

/**
 * Check if Web Audio API is supported in the current environment.
 */
export function isAudioSupported() {
  return Boolean(getAudioContextClass());
}

/**
 * Synthesizes a high-quality paper noise buffer.
 * Uses Paul Kellet's refined pink noise filter algorithm combined with subtle
 * sinusoidal micro-flutter to accurately emulate the acoustic texture of luxury
 * heavyweight parchment / linen book paper rubbing against itself.
 *
 * @param {AudioContext} ctx
 * @param {number} [duration=1.2] Buffer length in seconds
 * @returns {AudioBuffer}
 */
export function createPaperNoiseBuffer(ctx, duration = 1.2) {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;

    // Pink noise filter poles
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.76160 * b5 - white * 0.0168980;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;

    // Natural paper fiber friction modulation: irregular micro-variations
    const friction = 1 + 0.12 * Math.sin(i / 137) + 0.08 * Math.sin(i / 47);
    data[i] = pink * 0.11 * friction;
  }

  return buffer;
}

/**
 * Trigger subtle tactile haptic vibration if supported by device/browser.
 *
 * @param {'turn'|'dogEar'|'tap'} type
 */
export function triggerHapticCue(type = 'turn') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    if (type === 'turn') {
      // Gentle double-pulse mimicking page lift and page settling: 12ms pulse, 35ms pause, 14ms settling
      navigator.vibrate([12, 35, 14]);
    } else if (type === 'dogEar') {
      // Micro-tick for dog ear curl
      navigator.vibrate(8);
    } else {
      navigator.vibrate(10);
    }
  } catch {
    // Graceful fallback for security sandboxes or devices where vibrate is restricted
  }
}

/**
 * useBookSound
 *
 * Hook providing synthesized 3D paper rustle sound & tactile cues for book interactions.
 * - 100% Web Audio API synthesis: zero external audio assets required.
 * - 3D Stereo spatial panning based on flip direction (next vs. prev).
 * - Multi-layer paper acoustics: aerodynamic whoosh + parchment fiber crinkle.
 * - Browser-safe AudioContext activation (handles autoplay policies).
 * - Haptic tactile vibration feedback for mobile devices.
 * - Persistent mute and volume state in localStorage.
 *
 * @param {object} [options]
 * @param {boolean} [options.enabled=true] Whether sound effects are globally enabled.
 * @param {number} [options.defaultVolume=DEFAULT_VOLUME] Default volume (0.0 - 1.0).
 * @param {boolean} [options.defaultMuted=false] Default muted state if not in localStorage.
 */
export default function useBookSound({
  enabled = true,
  defaultVolume = DEFAULT_VOLUME,
  defaultMuted = false,
} = {}) {
  // Load persisted mute preference or fallback to default
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined') return defaultMuted;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MUTED);
      return saved !== null ? JSON.parse(saved) : defaultMuted;
    } catch {
      return defaultMuted;
    }
  });

  // Load persisted volume preference or fallback to default
  const [volume, setVolumeState] = useState(() => {
    if (typeof window === 'undefined') return defaultVolume;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VOLUME);
      if (saved !== null) {
        const parsed = Number(saved);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
          return parsed;
        }
      }
      return defaultVolume;
    } catch {
      return defaultVolume;
    }
  });

  const [isSupported] = useState(() => isAudioSupported());

  // Web Audio instances
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const noiseBufferRef = useRef(null);
  const activeSourcesRef = useRef([]);

  /**
   * Lazily initialize AudioContext and master routing graph.
   */
  const initAudioContext = useCallback(() => {
    if (!isSupported || audioCtxRef.current) return audioCtxRef.current;

    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) return null;

    try {
      const ctx = new AudioContextClass();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : volume, ctx.currentTime);
      masterGain.connect(ctx.destination);

      audioCtxRef.current = ctx;
      masterGainRef.current = masterGain;

      // Pre-synthesize the realistic parchment noise buffer
      noiseBufferRef.current = createPaperNoiseBuffer(ctx, 1.2);

      return ctx;
    } catch {
      return null;
    }
  }, [isSupported, isMuted, volume]);

  /**
   * Ensure AudioContext is running after browser autoplay restrictions.
   */
  const unlockAudio = useCallback(async () => {
    const ctx = initAudioContext();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Ignored if user hasn't interacted yet
      }
    }
    return ctx;
  }, [initAudioContext]);

  /**
   * Global browser interaction listener to unlock AudioContext on first gesture.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleFirstGesture = () => {
      unlockAudio();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('pointerdown', handleFirstGesture);
    };

    window.addEventListener('click', handleFirstGesture, { passive: true });
    window.addEventListener('touchstart', handleFirstGesture, { passive: true });
    window.addEventListener('keydown', handleFirstGesture, { passive: true });
    window.addEventListener('pointerdown', handleFirstGesture, { passive: true });

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('pointerdown', handleFirstGesture);
    };
  }, [unlockAudio]);

  /**
   * Sync master gain with volume and mute state.
   */
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const masterGain = masterGainRef.current;
    if (ctx && masterGain) {
      const targetGain = isMuted ? 0 : volume;
      try {
        masterGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.03);
      } catch {
        masterGain.gain.value = targetGain;
      }
    }
  }, [isMuted, volume]);

  /**
   * Toggle mute state and persist in localStorage.
   */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.MUTED, JSON.stringify(next));
      } catch {
        // Storage access might fail in private windows
      }
      return next;
    });
  }, []);

  /**
   * Adjust volume and persist in localStorage.
   */
  const setVolume = useCallback((newVolume) => {
    const clamped = Math.max(0, Math.min(1, Number(newVolume) || 0));
    setVolumeState(clamped);
    try {
      localStorage.setItem(STORAGE_KEYS.VOLUME, clamped.toString());
    } catch {
      // Storage access might fail
    }
  }, []);

  /**
   * Synthesize and play realistic 3D paper rustle sound & trigger tactile haptics.
   *
   * @param {'next'|'prev'|'none'} [direction='next'] Flip direction for 3D stereo panning
   */
  const playPageFlip = useCallback((direction = 'next') => {
    // Always trigger tactile feedback on physical devices
    triggerHapticCue('turn');

    if (!enabled || isMuted || !isSupported) return;

    const ctx = initAudioContext();
    if (!ctx || !masterGainRef.current) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Duration: ~420ms - 480ms with subtle organic variance
    const duration = 0.44 + (Math.random() * 0.06 - 0.03);

    const noiseBuffer = noiseBufferRef.current || createPaperNoiseBuffer(ctx, 1.2);
    noiseBufferRef.current = noiseBuffer;

    // Optional 3D Stereo Panning
    let panner = null;
    if (typeof ctx.createStereoPanner === 'function') {
      try {
        panner = ctx.createStereoPanner();
        // Forward flip (next) sweeps from right (+0.45) to left (-0.45)
        // Backward flip (prev) sweeps from left (-0.45) to right (+0.45)
        const startPan = direction === 'prev' ? -0.45 : direction === 'next' ? 0.45 : 0;
        const endPan = direction === 'prev' ? 0.45 : direction === 'next' ? -0.45 : 0;

        panner.pan.setValueAtTime(startPan, now);
        panner.pan.linearRampToValueAtTime(endPan, now + duration);
        panner.connect(masterGainRef.current);
      } catch {
        panner = null;
      }
    }

    const soundDestination = panner || masterGainRef.current;

    // -------------------------------------------------------------
    // LAYER 1: Aerodynamic Whoosh (Air displacement of swinging page)
    // -------------------------------------------------------------
    const whooshSource = ctx.createBufferSource();
    whooshSource.buffer = noiseBuffer;
    whooshSource.playbackRate.value = 0.92 + Math.random() * 0.12;

    const whooshBandpass = ctx.createBiquadFilter();
    whooshBandpass.type = 'bandpass';
    const initialFreq = 360 * (0.95 + Math.random() * 0.1);
    whooshBandpass.frequency.setValueAtTime(initialFreq, now);
    // Sweeps up mid-turn as leaf stands perpendicular, then settles
    whooshBandpass.frequency.linearRampToValueAtTime(820, now + duration * 0.45);
    whooshBandpass.frequency.linearRampToValueAtTime(320, now + duration);
    whooshBandpass.Q.value = 1.15;

    const whooshLowpass = ctx.createBiquadFilter();
    whooshLowpass.type = 'lowpass';
    whooshLowpass.frequency.setValueAtTime(1400, now);

    const whooshGain = ctx.createGain();
    whooshGain.gain.setValueAtTime(0.0001, now);
    whooshGain.gain.linearRampToValueAtTime(0.42, now + 0.07);
    whooshGain.gain.exponentialRampToValueAtTime(0.24, now + duration * 0.55);
    whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    whooshSource.connect(whooshBandpass);
    whooshBandpass.connect(whooshLowpass);
    whooshLowpass.connect(whooshGain);
    whooshGain.connect(soundDestination);

    // -------------------------------------------------------------
    // LAYER 2: Crisp Paper Rustle (Friction of heavy parchment fibers)
    // -------------------------------------------------------------
    const rustleSource = ctx.createBufferSource();
    rustleSource.buffer = noiseBuffer;
    rustleSource.playbackRate.value = 0.98 + Math.random() * 0.14;

    const rustleHighpass = ctx.createBiquadFilter();
    rustleHighpass.type = 'highpass';
    rustleHighpass.frequency.setValueAtTime(1300, now);

    const rustleBandpass = ctx.createBiquadFilter();
    rustleBandpass.type = 'bandpass';
    rustleBandpass.frequency.setValueAtTime(2800 + Math.random() * 300, now);
    rustleBandpass.frequency.linearRampToValueAtTime(3400, now + duration * 0.4);
    rustleBandpass.frequency.linearRampToValueAtTime(2200, now + duration * 0.9);
    rustleBandpass.Q.value = 1.7;

    const rustleShelf = ctx.createBiquadFilter();
    rustleShelf.type = 'highshelf';
    rustleShelf.frequency.setValueAtTime(7500, now);
    rustleShelf.gain.setValueAtTime(-9, now); // Soften harsh digital highs for warm luxury feel

    const rustleGain = ctx.createGain();
    rustleGain.gain.setValueAtTime(0.0001, now);
    // Rapid initial peel/flick transient
    rustleGain.gain.linearRampToValueAtTime(0.28, now + 0.04);
    rustleGain.gain.exponentialRampToValueAtTime(0.12, now + 0.16);
    // Second soft flutter ripple as page turns over
    rustleGain.gain.linearRampToValueAtTime(0.22, now + duration * 0.6);
    rustleGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.92);

    rustleSource.connect(rustleHighpass);
    rustleHighpass.connect(rustleBandpass);
    rustleBandpass.connect(rustleShelf);
    rustleShelf.connect(rustleGain);
    rustleGain.connect(soundDestination);

    // Start playback with slight random offset into buffer
    const randomOffset = Math.random() * 0.4;
    whooshSource.start(now, randomOffset);
    rustleSource.start(now, randomOffset + 0.08);

    whooshSource.stop(now + duration);
    rustleSource.stop(now + duration);

    // Track active sources to stop gracefully on unmount
    const sources = [whooshSource, rustleSource];
    activeSourcesRef.current.push(...sources);

    setTimeout(() => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => !sources.includes(s));
    }, Math.ceil(duration * 1000) + 50);
  }, [enabled, isMuted, isSupported, initAudioContext]);

  /**
   * Play subtle micro-paper curl audio & tactile tick for dog-ear corners.
   */
  const playDogEarCue = useCallback(() => {
    triggerHapticCue('dogEar');

    if (!enabled || isMuted || !isSupported) return;

    const ctx = initAudioContext();
    if (!ctx || !masterGainRef.current) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const duration = 0.12;

    const noiseBuffer = noiseBufferRef.current || createPaperNoiseBuffer(ctx, 1.2);
    noiseBufferRef.current = noiseBuffer;

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.playbackRate.value = 1.1 + Math.random() * 0.15;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, now);
    filter.Q.value = 2.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainRef.current);

    source.start(now, Math.random() * 0.5);
    source.stop(now + duration);
  }, [enabled, isMuted, isSupported, initAudioContext]);

  // Clean up any active audio on unmount
  useEffect(() => {
    return () => {
      activeSourcesRef.current.forEach((src) => {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // Already stopped
        }
      });
      activeSourcesRef.current = [];

      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch {
          // Ignore close errors
        }
      }
    };
  }, []);

  return {
    isMuted,
    volume,
    toggleMute,
    setVolume,
    playPageFlip,
    playDogEarCue,
    unlockAudio,
    isSupported,
  };
}
