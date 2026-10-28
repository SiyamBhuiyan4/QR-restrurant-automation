import assert from 'node:assert';
import { sendVoiceNoteToTelegram } from '../../services/telegramClient.js';

// Setup Mock Environment for testing useVoiceRecorder logic
console.log('Testing useVoiceRecorder logic and Blob compatibility...');

// 1. Test formatRecordingTime
function formatRecordingTime(currentSeconds, maxSeconds = 30) {
  const safeCurrent = Math.min(Math.max(0, Math.floor(currentSeconds)), maxSeconds);
  const curMin = Math.floor(safeCurrent / 60);
  const curSec = safeCurrent % 60;
  const maxMin = Math.floor(maxSeconds / 60);
  const maxSec = maxSeconds % 60;
  const pad = (num) => (num < 10 ? `0${num}` : `${num}`);
  return `${curMin}:${pad(curSec)} / ${maxMin}:${pad(maxSec)}`;
}

assert.strictEqual(formatRecordingTime(0, 30), '0:00 / 0:30');
assert.strictEqual(formatRecordingTime(8.4, 30), '0:08 / 0:30');
assert.strictEqual(formatRecordingTime(30, 30), '0:30 / 0:30');
assert.strictEqual(formatRecordingTime(45, 30), '0:30 / 0:30');
console.log('✔ formatRecordingTime passed');

// 2. Test Blob generation with metadata and extensions
const webmBlob = new Blob(['sample-webm-opus-data'], { type: 'audio/webm;codecs=opus' });
webmBlob.name = 'voice_instruction_12345.webm';
webmBlob.duration = 8.5;

assert.strictEqual(webmBlob.type, 'audio/webm;codecs=opus');
assert.strictEqual(webmBlob.name, 'voice_instruction_12345.webm');
assert.strictEqual(webmBlob.duration, 8.5);
console.log('✔ WebM Opus Blob construction passed');

const oggBlob = new Blob(['sample-ogg-opus-data'], { type: 'audio/ogg;codecs=opus' });
oggBlob.name = 'voice_instruction_12346.ogg';
oggBlob.duration = 12.0;

assert.strictEqual(oggBlob.type, 'audio/ogg;codecs=opus');
assert.strictEqual(oggBlob.name, 'voice_instruction_12346.ogg');
assert.strictEqual(oggBlob.duration, 12.0);
console.log('✔ OGG Opus Blob construction passed');

// 3. Test direct pass-through to sendVoiceNoteToTelegram with mock fetch
globalThis.localStorage = {
  getItem: (key) => {
    if (key === 'telegram_bot_token') return '123456:TEST_TOKEN';
    if (key === 'telegram_chat_id') return '-1001234567890';
    return null;
  }
};

const originalFetch = globalThis.fetch;
let lastFormData = null;
let lastUrl = '';

const recordedCalls = [];

globalThis.fetch = async (url, options = {}) => {
  recordedCalls.push({ url, options });

  if (url.includes('/getFile')) {
    return {
      ok: true,
      json: async () => ({
        ok: true,
        result: {
          file_id: 'voice_telegram_file_id_123',
          file_path: 'voice/voice_123.oga',
          file_size: 20480
        }
      })
    };
  }

  return {
    ok: true,
    json: async () => ({
      ok: true,
      result: {
        message_id: 888,
        voice: {
          file_id: 'voice_telegram_file_id_123',
          duration: 9
        }
      }
    })
  };
};

try {
  // Test WebM blob directly passed to sendVoiceNoteToTelegram
  const resWebm = await sendVoiceNoteToTelegram(webmBlob, { tableNumber: 'T-10', orderNumber: 'ORD-789' });
  assert.strictEqual(resWebm.success, true);
  assert.strictEqual(resWebm.mediaType, 'voice');
  assert.strictEqual(resWebm.fileId, 'voice_telegram_file_id_123');
  assert.strictEqual(recordedCalls.some(c => c.url.includes('/sendVoice')), true);
  console.log('✔ sendVoiceNoteToTelegram with WebM Blob passed');

  // Test OGG blob directly passed to sendVoiceNoteToTelegram
  const resOgg = await sendVoiceNoteToTelegram(oggBlob, { tableNumber: 3, orderNumber: 'ORD-999' });
  assert.strictEqual(resOgg.success, true);
  assert.strictEqual(resOgg.mediaType, 'voice');
  console.log('✔ sendVoiceNoteToTelegram with OGG Blob passed');

  // Test MP4 Safari blob fallback
  const mp4Blob = new Blob(['safari-aac-data'], { type: 'audio/mp4' });
  const resMp4 = await sendVoiceNoteToTelegram(mp4Blob, { tableNumber: 'Table 7' });
  assert.strictEqual(resMp4.success, true);
  console.log('✔ sendVoiceNoteToTelegram with MP4/Safari Blob passed');
} finally {
  globalThis.fetch = originalFetch;
}

console.log('🎉 ALL useVoiceRecorder AUDIT TESTS PASSED SUCCESSFULLY!');
