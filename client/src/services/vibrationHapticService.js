/**
 * Real-Time Mobile Vibration & Audio Haptic Engine for Restaurant Floor Staff
 * 
 * Provides calibrated haptic vibration patterns and synthesized Web Audio API sounds
 * for busy waitstaff, floor managers, and kitchen display systems:
 * 
 * 1. Floor Haptic Vibration Patterns:
 *    - vibrateCriticalCall():  [300, 100, 300, 100, 400] (Double heavy pulse for overdue/urgent customer call)
 *    - vibrateAdminMessage():  [150, 75, 150, 75, 150]   (Crisp triplet pulse for head chef / admin instructions)
 *    - vibrateTaskResolved():  [80]                     (Soft affirmative tap)
 *    - vibrateNavigationTap(): [40]                     (Subtle UI feedback)
 * 
 * 2. Paired Synthesized Web Audio API Sounds (Zero external audio assets, works 100% offline):
 *    - Dual-harmonic metallic chime (G#5 / G#6) for customer calls
 *    - Soft high-pitch double chirp for admin chat messages
 *    - Uplifting major-third chime for task resolution
 *    - Micro-tap mechanical click for navigation
 * 
 * 3. Continuous Background Pulse Simulation:
 *    - Keeps vibrating and alerting at periodic intervals when urgent customer calls are pending
 *    - Screen Wake Lock API integration to alert active waiters even when screen dims in pocket
 *    - Tab visibility awareness & auto-unlock on user gesture
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

export const VIBRATION_PATTERNS = Object.freeze({
  /** Double heavy pulse for overdue or high-priority customer calls */
  CRITICAL_CALL: [300, 100, 300, 100, 400],

  /** Crisp triplet pulse for head chef or manager instructions */
  ADMIN_MESSAGE: [150, 75, 150, 75, 150],

  /** Soft affirmative tap for completing or marking a task resolved */
  TASK_RESOLVED: [80],

  /** Subtle haptic tick for floor UI navigation, filters, and tab switches */
  NAVIGATION_TAP: [40],

  /** Gentle double nudge for incoming standard orders */
  ORDER_NUDGE: [100, 60, 100],

  /** Error or PIN mismatch buzz */
  ERROR_BUZZ: [200, 80, 200]
});

// Storage keys for persistent preferences
const STORAGE_KEYS = {
  VIBRATION_ENABLED: 'smartdine_haptic_vibration_enabled',
  AUDIO_ENABLED: 'smartdine_haptic_audio_enabled',
  MASTER_VOLUME: 'smartdine_haptic_master_volume',
  CONTINUOUS_ENABLED: 'smartdine_haptic_continuous_enabled'
};

// ============================================================================
// LOCAL STORAGE SAFE WRAPPERS
// ============================================================================

function getStoredBoolean(key, defaultValue = true) {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val === 'true' : defaultValue;
  } catch (_) {
    return defaultValue;
  }
}

function setStoredBoolean(key, value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, String(value));
  } catch (_) {}
}

function getStoredNumber(key, defaultValue = 0.8) {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const val = localStorage.getItem(key);
    if (val !== null) {
      const parsed = parseFloat(val);
      return !Number.isNaN(parsed) && parsed >= 0 && parsed <= 1 ? parsed : defaultValue;
    }
    return defaultValue;
  } catch (_) {
    return defaultValue;
  }
}

function setStoredNumber(key, value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, String(Math.max(0, Math.min(1, value))));
  } catch (_) {}
}

// ============================================================================
// SYNTHESIZED WEB AUDIO API SOUND ENGINE
// ============================================================================

class WebAudioHapticSynthesizer {
  constructor() {
    this.ctx = null;
    this.isAudioUnlocked = false;
    this.audioEnabled = getStoredBoolean(STORAGE_KEYS.AUDIO_ENABLED, true);
    this.masterVolume = getStoredNumber(STORAGE_KEYS.MASTER_VOLUME, 0.85);
    this.masterGainNode = null;
    this._attachUnlockListeners();
  }

  /**
   * Initializes or returns the shared AudioContext instance.
   */
  getContext() {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
          this.masterGainNode = this.ctx.createGain();
          this.masterGainNode.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
          this.masterGainNode.connect(this.ctx.destination);
        } catch (err) {
          console.warn('[HapticEngine] AudioContext creation error:', err);
          return null;
        }
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Auto-unlocks AudioContext on the first user interaction (touch/click/keypress).
   */
  _attachUnlockListeners() {
    if (typeof window === 'undefined') return;

    const unlockHandler = () => {
      this.unlock();
      ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(evt => {
        window.removeEventListener(evt, unlockHandler, { capture: true });
      });
    };

    ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(evt => {
      window.addEventListener(evt, unlockHandler, { capture: true, passive: true });
    });
  }

  /**
   * Manually unlock or resume AudioContext.
   */
  async unlock() {
    const ctx = this.getContext();
    if (!ctx) return false;
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.isAudioUnlocked = ctx.state === 'running';
      return this.isAudioUnlocked;
    } catch (_) {
      return false;
    }
  }

  /**
   * Updates master volume (0.0 to 1.0).
   */
  setVolume(volume) {
    const clamped = Math.max(0, Math.min(1, Number(volume) || 0));
    this.masterVolume = clamped;
    setStoredNumber(STORAGE_KEYS.MASTER_VOLUME, clamped);
    if (this.masterGainNode && this.ctx) {
      try {
        this.masterGainNode.gain.setValueAtTime(clamped, this.ctx.currentTime);
      } catch (_) {}
    }
  }

  getVolume() {
    return this.masterVolume;
  }

  setAudioEnabled(enabled) {
    this.audioEnabled = Boolean(enabled);
    setStoredBoolean(STORAGE_KEYS.AUDIO_ENABLED, this.audioEnabled);
  }

  isAudioEnabled() {
    return this.audioEnabled;
  }

  /**
   * Dual-harmonic metallic chime (G#5 / G#6) for customer calls.
   * G#5 = 830.61 Hz (Fundamental metallic bell ring)
   * G#6 = 1661.22 Hz (Upper octave harmonic shimmer)
   * Overlaid with a brass transient strike (~2489 Hz) for high-urgency floor cut-through.
   */
  playCustomerCallChime(options = {}) {
    if (!this.audioEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGainNode) return;

    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const volMultiplier = typeof options.volume === 'number' ? options.volume : 1.0;

      // 1. Fundamental metallic ring: G#5 (830.61 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(830.61, now);
      // Subtle micro-decay pitch drift gives realistic bell resonance
      osc1.frequency.exponentialRampToValueAtTime(826.0, now + 1.4);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.38 * volMultiplier, now + 0.005);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);
      osc1.connect(gain1);
      gain1.connect(this.masterGainNode);
      osc1.start(now);
      osc1.stop(now + 1.45);

      // 2. High harmonic chime: G#6 (1661.22 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1661.22, now);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.linearRampToValueAtTime(0.26 * volMultiplier, now + 0.004);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
      osc2.connect(gain2);
      gain2.connect(this.masterGainNode);
      osc2.start(now);
      osc2.stop(now + 1.15);

      // 3. Crisp brass impact transient strike: ~2489 Hz (D#7 overtone)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(2489.0, now);
      gain3.gain.setValueAtTime(0.001, now);
      gain3.gain.linearRampToValueAtTime(0.18 * volMultiplier, now + 0.002);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc3.connect(gain3);
      gain3.connect(this.masterGainNode);
      osc3.start(now);
      osc3.stop(now + 0.35);
    } catch (err) {
      console.warn('[HapticEngine] Customer call chime error:', err);
    }
  }

  /**
   * Soft high-pitch double chirp for admin / head-chef chat instructions.
   * Fast, crisp, polite 2-chirp tone that cuts through ambient noise.
   */
  playAdminMessageChirp(options = {}) {
    if (!this.audioEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGainNode) return;

    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const volMultiplier = typeof options.volume === 'number' ? options.volume : 1.0;

      // Chirp 1: 1760 Hz (A6) ramping up to 2150 Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1760.0, now);
      osc1.frequency.exponentialRampToValueAtTime(2150.0, now + 0.07);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.24 * volMultiplier, now + 0.005);
      gain1.gain.exponentialRampToValueAtTime(0.0005, now + 0.075);
      osc1.connect(gain1);
      gain1.connect(this.masterGainNode);
      osc1.start(now);
      osc1.stop(now + 0.08);

      // Chirp 2: 1975 Hz (B6) ramping up to 2400 Hz (after 85ms gap)
      const t2 = now + 0.095;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1975.5, t2);
      osc2.frequency.exponentialRampToValueAtTime(2400.0, t2 + 0.08);
      gain2.gain.setValueAtTime(0.001, t2);
      gain2.gain.linearRampToValueAtTime(0.28 * volMultiplier, t2 + 0.005);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.16);
      osc2.connect(gain2);
      gain2.connect(this.masterGainNode);
      osc2.start(t2);
      osc2.stop(t2 + 0.17);
    } catch (err) {
      console.warn('[HapticEngine] Admin message chirp error:', err);
    }
  }

  /**
   * Uplifting major-third chime for task resolution.
   * Plays an ascending, affirming harmonic chord:
   * Tone 1 (Root): C5 (523.25 Hz)
   * Tone 2 (Major Third): E5 (659.25 Hz, frequency ratio 5:4)
   * Tone 3 (Octave Shine): C6 (1046.50 Hz)
   */
  playTaskResolvedChime(options = {}) {
    if (!this.audioEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGainNode) return;

    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const volMultiplier = typeof options.volume === 'number' ? options.volume : 1.0;

      // Note 1: Root C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.32 * volMultiplier, now + 0.005);
      gain1.gain.exponentialRampToValueAtTime(0.0005, now + 0.28);
      osc1.connect(gain1);
      gain1.connect(this.masterGainNode);
      osc1.start(now);
      osc1.stop(now + 0.28);

      // Note 2: Major Third E5 (659.25 Hz) starting at +80ms
      const t2 = now + 0.08;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, t2);
      gain2.gain.setValueAtTime(0.001, t2);
      gain2.gain.linearRampToValueAtTime(0.35 * volMultiplier, t2 + 0.005);
      gain2.gain.exponentialRampToValueAtTime(0.0005, t2 + 0.45);
      osc2.connect(gain2);
      gain2.connect(this.masterGainNode);
      osc2.start(t2);
      osc2.stop(t2 + 0.45);

      // Note 3: Affirming Octave C6 (1046.50 Hz) starting at +170ms
      const t3 = now + 0.17;
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1046.50, t3);
      gain3.gain.setValueAtTime(0.001, t3);
      gain3.gain.linearRampToValueAtTime(0.28 * volMultiplier, t3 + 0.005);
      gain3.gain.exponentialRampToValueAtTime(0.0001, t3 + 0.7);
      osc3.connect(gain3);
      gain3.connect(this.masterGainNode);
      osc3.start(t3);
      osc3.stop(t3 + 0.7);
    } catch (err) {
      console.warn('[HapticEngine] Task resolved chime error:', err);
    }
  }

  /**
   * Micro-tap subtle click for navigation taps and UI buttons.
   */
  playNavigationTapSound(options = {}) {
    if (!this.audioEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGainNode) return;

    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const volMultiplier = typeof options.volume === 'number' ? options.volume : 1.0;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200.0, now);
      osc.frequency.exponentialRampToValueAtTime(400.0, now + 0.015);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08 * volMultiplier, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
      osc.connect(gain);
      gain.connect(this.masterGainNode);
      osc.start(now);
      osc.stop(now + 0.02);
    } catch (_) {}
  }
}

// Instantiate shared audio synthesizer singleton
const audioSynthesizer = new WebAudioHapticSynthesizer();

// ============================================================================
// CONTINUOUS BACKGROUND PULSE & SCREEN WAKE LOCK ENGINE
// ============================================================================

class ContinuousPulseEngine {
  constructor() {
    this.activePulses = new Map(); // id -> { pattern, options, lastPulsedAt }
    this.timerId = null;
    this.wakeLockSentinel = null;
    this.continuousEnabled = getStoredBoolean(STORAGE_KEYS.CONTINUOUS_ENABLED, true);
    this._attachVisibilityListener();
  }

  _attachVisibilityListener() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.activePulses.size > 0) {
        // Re-acquire screen wake lock if tab became visible
        this._requestWakeLock();
        // Trigger immediate catch-up pulse
        this._tick();
      }
    });
  }

  async _requestWakeLock() {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      if (!this.wakeLockSentinel) {
        this.wakeLockSentinel = await navigator.wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
      }
    } catch (_) {
      // Wake lock might fail if tab is not focused or battery low; safe fallback
    }
  }

  async _releaseWakeLock() {
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
      } catch (_) {}
      this.wakeLockSentinel = null;
    }
  }

  setContinuousEnabled(enabled) {
    this.continuousEnabled = Boolean(enabled);
    setStoredBoolean(STORAGE_KEYS.CONTINUOUS_ENABLED, this.continuousEnabled);
    if (!this.continuousEnabled) {
      this.stopAll();
    }
  }

  isContinuousEnabled() {
    return this.continuousEnabled;
  }

  /**
   * Starts a continuous background pulse for an urgent call or condition.
   * 
   * @param {string} id - Unique identifier (e.g., 'table-call-3' or 'kitchen-urgent')
   * @param {object} options
   * @param {number[]} [options.pattern] - Vibration pattern, defaults to CRITICAL_CALL
   * @param {number} [options.intervalMs] - Repeat period in ms (default: 3500ms)
   * @param {boolean} [options.withAudio] - Whether to pair with synthesized audio (default: true)
   * @param {number} [options.soundInterval] - Play audio every Nth pulse (default: 1)
   * @param {number} [options.maxDurationMs] - Auto-stop watchdog timeout (default: 10 minutes)
   */
  start(id = 'default', options = {}) {
    if (!this.continuousEnabled) return false;

    const pattern = options.pattern || VIBRATION_PATTERNS.CRITICAL_CALL;
    const intervalMs = Math.max(1500, options.intervalMs || 3500);
    const withAudio = options.withAudio !== false;
    const soundInterval = options.soundInterval || 1;
    const maxDurationMs = options.maxDurationMs || 10 * 60 * 1000; // 10 min safety timeout

    const pulseEntry = {
      id,
      pattern,
      intervalMs,
      withAudio,
      soundInterval,
      pulseCount: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + maxDurationMs,
      lastPulsedAt: 0
    };

    this.activePulses.set(id, pulseEntry);

    // Acquire WakeLock so device screen doesn't immediately sleep
    this._requestWakeLock();

    // Trigger immediate first pulse
    this._pulseEntry(pulseEntry);

    // Start tick loop if not running
    if (!this.timerId) {
      this.timerId = setInterval(() => this._tick(), 1000);
    }

    return true;
  }

  /**
   * Stops a specific continuous pulse by ID.
   */
  stop(id = 'default') {
    const existed = this.activePulses.delete(id);
    if (this.activePulses.size === 0) {
      this._cleanupLoop();
    }
    return existed;
  }

  /**
   * Stops all active continuous pulses and cancels physical vibrations.
   */
  stopAll() {
    this.activePulses.clear();
    this._cleanupLoop();
  }

  _cleanupLoop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    cancelVibration();
    this._releaseWakeLock();
  }

  isActive(id) {
    if (id !== undefined) return this.activePulses.has(id);
    return this.activePulses.size > 0;
  }

  getActivePulseIds() {
    return Array.from(this.activePulses.keys());
  }

  _pulseEntry(entry) {
    entry.lastPulsedAt = Date.now();
    entry.pulseCount += 1;

    // Trigger physical haptic vibration
    vibrate(entry.pattern);

    // Trigger paired audio chime if enabled and interval matches
    if (entry.withAudio && (entry.pulseCount % entry.soundInterval === 0)) {
      audioSynthesizer.playCustomerCallChime({ volume: 0.9 });
    }
  }

  _tick() {
    const now = Date.now();
    const expiredIds = [];

    this.activePulses.forEach((entry, id) => {
      // Check watchdog timeout
      if (now >= entry.expiresAt) {
        expiredIds.push(id);
        return;
      }

      // Check if interval has elapsed
      if (now - entry.lastPulsedAt >= entry.intervalMs) {
        this._pulseEntry(entry);
      }
    });

    expiredIds.forEach(id => this.activePulses.delete(id));

    if (this.activePulses.size === 0) {
      this._cleanupLoop();
    }
  }
}

// Instantiate shared continuous pulse singleton
const continuousPulseEngine = new ContinuousPulseEngine();

// ============================================================================
// CORE HAPTIC VIBRATION FUNCTIONS
// ============================================================================

let vibrationEnabled = getStoredBoolean(STORAGE_KEYS.VIBRATION_ENABLED, true);

/**
 * Checks if the Web Vibration API is supported on this browser/platform.
 */
export function isVibrationSupported() {
  return typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function';
}

/**
 * Checks if vibration feedback is currently enabled by user preference.
 */
export function isVibrationEnabled() {
  return vibrationEnabled;
}

/**
 * Enables or disables vibration feedback with localStorage persistence.
 */
export function setVibrationEnabled(enabled) {
  vibrationEnabled = Boolean(enabled);
  setStoredBoolean(STORAGE_KEYS.VIBRATION_ENABLED, vibrationEnabled);
  if (!vibrationEnabled) {
    cancelVibration();
  }
}

/**
 * Low-level trigger for physical device vibration.
 * 
 * @param {number|number[]} pattern - Milliseconds of vibration and pauses
 * @returns {boolean} - Whether the vibration call was dispatched
 */
export function vibrate(pattern) {
  if (!vibrationEnabled) return false;
  if (!isVibrationSupported()) return false;

  try {
    return navigator.vibrate(pattern);
  } catch (err) {
    console.warn('[HapticEngine] navigator.vibrate warning:', err);
    return false;
  }
}

/**
 * Cancels any ongoing device vibration immediately.
 */
export function cancelVibration() {
  if (isVibrationSupported()) {
    try {
      navigator.vibrate(0);
    } catch (_) {}
  }
}

// ============================================================================
// PRIMARY RESTAURANT FLOOR PATTERN METHODS
// ============================================================================

/**
 * Double heavy pulse for overdue/urgent customer call:
 * Pattern: navigator.vibrate([300, 100, 300, 100, 400])
 * Paired with: Dual-harmonic metallic chime (G#5 / G#6).
 * 
 * @param {object} [options]
 * @param {boolean} [options.withAudio=true] - Whether to pair with synthesized chime
 * @param {number} [options.volume] - Volume multiplier (0.0 to 1.0)
 * @returns {boolean}
 */
export function vibrateCriticalCall(options = {}) {
  const withAudio = options.withAudio !== false;
  const didVibrate = vibrate(VIBRATION_PATTERNS.CRITICAL_CALL);

  if (withAudio) {
    audioSynthesizer.playCustomerCallChime(options);
  }

  return didVibrate;
}

/**
 * Crisp triplet pulse for head chef or admin instructions:
 * Pattern: navigator.vibrate([150, 75, 150, 75, 150])
 * Paired with: Soft high-pitch double chirp.
 * 
 * @param {object} [options]
 * @param {boolean} [options.withAudio=true] - Whether to pair with synthesized chirp
 * @param {number} [options.volume] - Volume multiplier (0.0 to 1.0)
 * @returns {boolean}
 */
export function vibrateAdminMessage(options = {}) {
  const withAudio = options.withAudio !== false;
  const didVibrate = vibrate(VIBRATION_PATTERNS.ADMIN_MESSAGE);

  if (withAudio) {
    audioSynthesizer.playAdminMessageChirp(options);
  }

  return didVibrate;
}

/**
 * Soft affirmative tap for task resolution / bill settlement / table cleared:
 * Pattern: navigator.vibrate([80])
 * Paired with: Uplifting major-third chime.
 * 
 * @param {object} [options]
 * @param {boolean} [options.withAudio=true] - Whether to pair with synthesized chime
 * @param {number} [options.volume] - Volume multiplier (0.0 to 1.0)
 * @returns {boolean}
 */
export function vibrateTaskResolved(options = {}) {
  const withAudio = options.withAudio !== false;
  const didVibrate = vibrate(VIBRATION_PATTERNS.TASK_RESOLVED);

  if (withAudio) {
    audioSynthesizer.playTaskResolvedChime(options);
  }

  return didVibrate;
}

/**
 * Subtle UI feedback for tab switches, floor navigation, filter buttons:
 * Pattern: navigator.vibrate([40])
 * 
 * @param {object} [options]
 * @param {boolean} [options.withAudio=false] - Whether to include micro-tap click sound
 * @returns {boolean}
 */
export function vibrateNavigationTap(options = {}) {
  const didVibrate = vibrate(VIBRATION_PATTERNS.NAVIGATION_TAP);

  if (options.withAudio) {
    audioSynthesizer.playNavigationTapSound(options);
  }

  return didVibrate;
}

// ============================================================================
// CONTINUOUS BACKGROUND PULSE HELPERS
// ============================================================================

/**
 * Initiates continuous background pulsing for an active critical call.
 * 
 * @param {string|number} callId - Call identifier (e.g., table number or call _id)
 * @param {object} [options]
 */
export function startCriticalCallLoop(callId, options = {}) {
  const id = `critical_call_${callId}`;
  return continuousPulseEngine.start(id, {
    pattern: VIBRATION_PATTERNS.CRITICAL_CALL,
    intervalMs: options.intervalMs || 3500,
    withAudio: options.withAudio !== false,
    soundInterval: options.soundInterval || 1,
    maxDurationMs: options.maxDurationMs || 10 * 60 * 1000
  });
}

/**
 * Stops continuous background pulsing for a resolved critical call.
 * 
 * @param {string|number} callId - Call identifier
 */
export function stopCriticalCallLoop(callId) {
  const id = `critical_call_${callId}`;
  return continuousPulseEngine.stop(id);
}

/**
 * Checks if a specific critical call loop is currently active.
 */
export function isCriticalCallLooping(callId) {
  return continuousPulseEngine.isActive(`critical_call_${callId}`);
}

/**
 * Generic continuous pulse starter.
 */
export function startContinuousPulse(options = {}) {
  const id = options.id || 'general_pulse';
  return continuousPulseEngine.start(id, options);
}

/**
 * Generic continuous pulse stopper.
 */
export function stopContinuousPulse(id = 'general_pulse') {
  return continuousPulseEngine.stop(id);
}

/**
 * Stops all continuous pulse loops.
 */
export function stopAllContinuousPulses() {
  continuousPulseEngine.stopAll();
}

/**
 * Checks if any continuous pulse is currently running.
 */
export function isContinuousPulseActive(id) {
  return continuousPulseEngine.isActive(id);
}

/**
 * Returns diagnostic status of continuous pulse engine.
 */
export function getContinuousPulseStatus() {
  return {
    enabled: continuousPulseEngine.isContinuousEnabled(),
    isActive: continuousPulseEngine.isActive(),
    activeCount: continuousPulseEngine.getActivePulseIds().length,
    activePulseIds: continuousPulseEngine.getActivePulseIds(),
    wakeLockActive: Boolean(continuousPulseEngine.wakeLockSentinel)
  };
}

// ============================================================================
// AUDIO CONTROL HELPERS
// ============================================================================

export function isAudioSupported() {
  return typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext);
}

export function isAudioEnabled() {
  return audioSynthesizer.isAudioEnabled();
}

export function setAudioEnabled(enabled) {
  audioSynthesizer.setAudioEnabled(enabled);
}

export function getMasterVolume() {
  return audioSynthesizer.getVolume();
}

export function setMasterVolume(vol) {
  audioSynthesizer.setVolume(vol);
}

export function unlockAudioContext() {
  return audioSynthesizer.unlock();
}

export function isContinuousPulseEnabled() {
  return continuousPulseEngine.isContinuousEnabled();
}

export function setContinuousPulseEnabled(enabled) {
  continuousPulseEngine.setContinuousEnabled(enabled);
}

// Sound playback directly
export const playCustomerCallChime = (opt) => audioSynthesizer.playCustomerCallChime(opt);
export const playAdminMessageChirp = (opt) => audioSynthesizer.playAdminMessageChirp(opt);
export const playTaskResolvedChime = (opt) => audioSynthesizer.playTaskResolvedChime(opt);
export const playNavigationTapSound = (opt) => audioSynthesizer.playNavigationTapSound(opt);

// Screen wake lock manual controls
export async function requestScreenWakeLock() {
  return continuousPulseEngine._requestWakeLock();
}

export async function releaseScreenWakeLock() {
  return continuousPulseEngine._releaseWakeLock();
}

// ============================================================================
// DEFAULT EXPORTED SERVICE OBJECT
// ============================================================================

const vibrationHapticService = {
  // Vibration Patterns
  PATTERNS: VIBRATION_PATTERNS,
  VIBRATION_PATTERNS,

  // Primary Floor Triggers
  vibrateCriticalCall,
  vibrateAdminMessage,
  vibrateTaskResolved,
  vibrateNavigationTap,

  // Core Physical Vibration
  vibrate,
  cancelVibration,
  isVibrationSupported,
  isVibrationEnabled,
  setVibrationEnabled,

  // Web Audio Chimes
  playCustomerCallChime,
  playAdminMessageChirp,
  playTaskResolvedChime,
  playNavigationTapSound,
  isAudioSupported,
  isAudioEnabled,
  setAudioEnabled,
  getMasterVolume,
  setMasterVolume,
  unlockAudioContext,

  // Continuous Floor Pulsing
  startCriticalCallLoop,
  stopCriticalCallLoop,
  isCriticalCallLooping,
  startContinuousPulse,
  stopContinuousPulse,
  stopAllContinuousPulses,
  isContinuousPulseActive,
  getContinuousPulseStatus,
  isContinuousPulseEnabled,
  setContinuousPulseEnabled,

  // Wake Lock
  requestScreenWakeLock,
  releaseScreenWakeLock
};

export default vibrationHapticService;
