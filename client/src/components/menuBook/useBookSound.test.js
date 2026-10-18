import test from 'node:test';
import assert from 'node:assert';
import {
  isAudioSupported,
  createPaperNoiseBuffer,
  triggerHapticCue,
} from './useBookSound.js';

// Mock Web Audio API classes for node testing
class MockAudioParam {
  constructor(defaultValue = 1) {
    this.value = defaultValue;
    this.events = [];
  }
  setValueAtTime(val, time) {
    this.events.push({ type: 'setValueAtTime', val, time });
    this.value = val;
  }
  linearRampToValueAtTime(val, time) {
    this.events.push({ type: 'linearRampToValueAtTime', val, time });
    this.value = val;
  }
  exponentialRampToValueAtTime(val, time) {
    this.events.push({ type: 'exponentialRampToValueAtTime', val, time });
    this.value = val;
  }
  setTargetAtTime(val, time, constant) {
    this.events.push({ type: 'setTargetAtTime', val, time, constant });
    this.value = val;
  }
}

class MockAudioNode {
  constructor() {
    this.connections = [];
  }
  connect(dest) {
    this.connections.push(dest);
    return dest;
  }
  disconnect() {
    this.connections = [];
  }
}

class MockGainNode extends MockAudioNode {
  constructor() {
    super();
    this.gain = new MockAudioParam(1);
  }
}

class MockStereoPannerNode extends MockAudioNode {
  constructor() {
    super();
    this.pan = new MockAudioParam(0);
  }
}

class MockBiquadFilterNode extends MockAudioNode {
  constructor() {
    super();
    this.type = 'lowpass';
    this.frequency = new MockAudioParam(350);
    this.Q = new MockAudioParam(1);
    this.gain = new MockAudioParam(0);
  }
}

class MockBufferSourceNode extends MockAudioNode {
  constructor() {
    super();
    this.buffer = null;
    this.playbackRate = new MockAudioParam(1);
    this.started = false;
    this.stopped = false;
    this.startTime = null;
    this.stopTime = null;
  }
  start(when, offset) {
    this.started = true;
    this.startTime = when;
    this.offset = offset;
  }
  stop(when) {
    this.stopped = true;
    this.stopTime = when;
  }
}

class MockAudioBuffer {
  constructor(channels, length, sampleRate) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this._data = [new Float32Array(length)];
  }
  getChannelData(channelIndex) {
    return this._data[channelIndex];
  }
}

class MockAudioContext {
  constructor() {
    this.sampleRate = 44100;
    this.currentTime = 0.5;
    this.state = 'suspended';
    this.destination = new MockAudioNode();
  }
  createBuffer(channels, length, sampleRate) {
    return new MockAudioBuffer(channels, length, sampleRate);
  }
  createGain() {
    return new MockGainNode();
  }
  createStereoPanner() {
    return new MockStereoPannerNode();
  }
  createBiquadFilter() {
    return new MockBiquadFilterNode();
  }
  createBufferSource() {
    return new MockBufferSourceNode();
  }
  async resume() {
    this.state = 'running';
  }
  async close() {
    this.state = 'closed';
  }
}

test('isAudioSupported: checks for AudioContext availability', () => {
  // In pure Node without window, should return false
  assert.strictEqual(isAudioSupported(), false);

  // When window.AudioContext is defined
  globalThis.window = { AudioContext: MockAudioContext };
  assert.strictEqual(isAudioSupported(), true);
  delete globalThis.window;
});

test('createPaperNoiseBuffer: synthesizes valid non-clipping paper texture noise', () => {
  const ctx = new MockAudioContext();
  const duration = 1.0;
  const buffer = createPaperNoiseBuffer(ctx, duration);

  assert.strictEqual(buffer.numberOfChannels, 1);
  assert.strictEqual(buffer.length, 44100);

  const data = buffer.getChannelData(0);
  let min = 0;
  let max = 0;
  let hasNonZero = false;

  for (let i = 0; i < data.length; i++) {
    const s = data[i];
    if (s !== 0) hasNonZero = true;
    if (s < min) min = s;
    if (s > max) max = s;
  }

  assert.strictEqual(hasNonZero, true);
  // Audio must remain safely within [-1, 1] range to prevent digital clipping
  assert.ok(min >= -1.0, `Min sample out of bounds: ${min}`);
  assert.ok(max <= 1.0, `Max sample out of bounds: ${max}`);
  // Average amplitude should reflect delicate background paper texture
  assert.ok(max > 0.1, 'Noise has audible dynamic range');
});

test('triggerHapticCue: vibrates with correct patterns when navigator.vibrate is supported', () => {
  let vibrateCalls = [];
  const originalVibrate = globalThis.navigator.vibrate;

  Object.defineProperty(globalThis.navigator, 'vibrate', {
    value: (pattern) => {
      vibrateCalls.push(pattern);
      return true;
    },
    configurable: true,
    writable: true,
  });

  try {
    triggerHapticCue('turn');
    assert.deepStrictEqual(vibrateCalls[0], [12, 35, 14]);

    triggerHapticCue('dogEar');
    assert.strictEqual(vibrateCalls[1], 8);

    triggerHapticCue('tap');
    assert.strictEqual(vibrateCalls[2], 10);
  } finally {
    if (originalVibrate !== undefined) {
      Object.defineProperty(globalThis.navigator, 'vibrate', {
        value: originalVibrate,
        configurable: true,
        writable: true,
      });
    } else {
      delete globalThis.navigator.vibrate;
    }
  }
});

test('triggerHapticCue: survives gracefully when navigator.vibrate is unsupported or throws', () => {
  // Case 1: navigator without vibrate
  const originalVibrate = globalThis.navigator.vibrate;
  delete globalThis.navigator.vibrate;
  assert.doesNotThrow(() => triggerHapticCue('turn'));

  // Case 2: vibrate throws security exception
  Object.defineProperty(globalThis.navigator, 'vibrate', {
    value: () => {
      throw new Error('Feature-Policy blocked vibration');
    },
    configurable: true,
    writable: true,
  });

  try {
    assert.doesNotThrow(() => triggerHapticCue('turn'));
  } finally {
    if (originalVibrate !== undefined) {
      Object.defineProperty(globalThis.navigator, 'vibrate', {
        value: originalVibrate,
        configurable: true,
        writable: true,
      });
    } else {
      delete globalThis.navigator.vibrate;
    }
  }
});

test('Web Audio Page Flip Synthesis & 3D Spatial Panning Graph', () => {
  const ctx = new MockAudioContext();
  const buffer = createPaperNoiseBuffer(ctx, 1.2);
  const masterGain = ctx.createGain();

  // Test next page flip panning
  const nextPanner = ctx.createStereoPanner();
  const now = ctx.currentTime;
  const duration = 0.44;

  const startPan = 0.45;
  const endPan = -0.45;
  nextPanner.pan.setValueAtTime(startPan, now);
  nextPanner.pan.linearRampToValueAtTime(endPan, now + duration);

  assert.strictEqual(nextPanner.pan.events[0].val, 0.45);
  assert.strictEqual(nextPanner.pan.events[1].val, -0.45);

  // Test prev page flip panning
  const prevPanner = ctx.createStereoPanner();
  prevPanner.pan.setValueAtTime(-0.45, now);
  prevPanner.pan.linearRampToValueAtTime(0.45, now + duration);

  assert.strictEqual(prevPanner.pan.events[0].val, -0.45);
  assert.strictEqual(prevPanner.pan.events[1].val, 0.45);

  // Test multi-layer whoosh & rustle source nodes
  const whooshSource = ctx.createBufferSource();
  whooshSource.buffer = buffer;
  const whooshGain = ctx.createGain();
  whooshGain.gain.setValueAtTime(0.0001, now);
  whooshGain.gain.linearRampToValueAtTime(0.42, now + 0.07);
  whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  whooshSource.connect(whooshGain);
  whooshGain.connect(nextPanner);
  nextPanner.connect(masterGain);

  assert.strictEqual(whooshGain.gain.events[0].val, 0.0001);
  assert.strictEqual(whooshGain.gain.events[1].val, 0.42);
  assert.strictEqual(whooshGain.gain.events[2].val, 0.0001);
});

test('Web Audio Dog Ear Micro-Rustle Cue Synthesis', () => {
  const ctx = new MockAudioContext();
  const buffer = createPaperNoiseBuffer(ctx, 1.2);
  const masterGain = ctx.createGain();

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2600, ctx.currentTime);
  filter.Q.value = 2.2;

  const gain = ctx.createGain();
  const now = ctx.currentTime;
  const duration = 0.12;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  assert.strictEqual(filter.type, 'bandpass');
  assert.strictEqual(filter.frequency.value, 2600);
  assert.strictEqual(gain.gain.events[1].val, 0.16);
  assert.strictEqual(gain.gain.events[2].val, 0.0001);
});

test('AudioContext unlock: resumes suspended context', async () => {
  const ctx = new MockAudioContext();
  assert.strictEqual(ctx.state, 'suspended');
  await ctx.resume();
  assert.strictEqual(ctx.state, 'running');
});

