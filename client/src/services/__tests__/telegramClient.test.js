import assert from 'node:assert';
import {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  getTelegramConfig,
  escapeHtml,
  dataUrlToBlob,
  isVideoMedia,
  resolveTelegramFileUrl,
  uploadPhotoToTelegram,
  uploadVideoToTelegram,
  uploadMediaToTelegram,
  sendVoiceNoteToTelegram,
  sendOrderToTelegramChannel,
  publishMenuSnapshotToTelegram,
  sendWaiterCallToTelegramChannel,
  sendCustomerReportToTelegramChannel,
  sendSettlementToTelegramChannel,
  sendCorrectionToTelegramChannel,
  sendFloorSnapshotToTelegram
} from '../telegramClient.js';

console.log('Testing telegramClient module...');

// 1. Basic configs
assert.ok(TELEGRAM_BOT_TOKEN, 'TELEGRAM_BOT_TOKEN exists');
assert.ok(TELEGRAM_CHAT_ID, 'TELEGRAM_CHAT_ID exists');
const config = getTelegramConfig();
assert.strictEqual(typeof config.token, 'string');
assert.strictEqual(typeof config.chatId, 'string');

// 2. escapeHtml
assert.strictEqual(escapeHtml('Hello <world> & "friends"'), 'Hello &lt;world&gt; &amp; "friends"');
assert.strictEqual(escapeHtml(null), '');
assert.strictEqual(escapeHtml(123), '123');

// 3. isVideoMedia
assert.strictEqual(isVideoMedia('https://example.com/video.mp4'), true);
assert.strictEqual(isVideoMedia('https://example.com/video.webm'), true);
assert.strictEqual(isVideoMedia('https://example.com/image.jpg'), false);
assert.strictEqual(isVideoMedia({ mediaType: 'video' }), true);
assert.strictEqual(isVideoMedia({ type: 'video/mp4' }), true);
assert.strictEqual(isVideoMedia({ name: 'clip.mov' }), true);

// 4. dataUrlToBlob
const sampleDataUrl = 'data:text/plain;base64,SGVsbG8gV29ybGQ=';
const blob = dataUrlToBlob(sampleDataUrl, 'text/plain');
assert.ok(blob instanceof Blob);
assert.strictEqual(blob.type, 'text/plain');

// 5. Mock global fetch to test all Telegram API callers
const calls = [];
const originalFetch = global.fetch;

global.fetch = async (url, options = {}) => {
  calls.push({ url, options });

  // getFile endpoint
  if (url.includes('/getFile')) {
    return {
      ok: true,
      json: async () => ({
        ok: true,
        result: {
          file_id: 'test_file_id_123',
          file_path: 'photos/file_999.jpg',
          file_size: 10240
        }
      })
    };
  }

  // sendPhoto endpoint
  if (url.includes('/sendPhoto')) {
    return {
      ok: true,
      json: async () => ({
        ok: true,
        result: {
          message_id: 101,
          photo: [
            { file_id: 'small_photo_id', width: 320, height: 240 },
            { file_id: 'large_photo_id', width: 1024, height: 768, file_size: 45000 }
          ]
        }
      })
    };
  }

  // sendVideo endpoint
  if (url.includes('/sendVideo')) {
    return {
      ok: true,
      json: async () => ({
        ok: true,
        result: {
          message_id: 102,
          video: {
            file_id: 'video_file_id_456',
            duration: 15,
            width: 1920,
            height: 1080
          }
        }
      })
    };
  }

  // sendVoice endpoint
  if (url.includes('/sendVoice')) {
    return {
      ok: true,
      json: async () => ({
        ok: true,
        result: {
          message_id: 103,
          voice: {
            file_id: 'voice_file_id_789',
            duration: 5,
            mime_type: 'audio/ogg'
          }
        }
      })
    };
  }

  // sendDocument endpoint
  if (url.includes('/sendDocument')) {
    return {
      ok: true,
      json: async () => ({
        ok: true,
        result: {
          message_id: 104,
          document: {
            file_id: 'doc_file_id_888',
            file_name: 'smartdine_menu_test.json',
            file_size: 2048
          }
        }
      })
    };
  }

  // pinChatMessage endpoint
  if (url.includes('/pinChatMessage')) {
    return {
      ok: true,
      json: async () => ({
        ok: true,
        result: true
      })
    };
  }

  // sendMessage endpoint
  if (url.includes('/sendMessage')) {
    return {
      ok: true,
      json: async () => ({
        ok: true,
        result: {
          message_id: 105
        }
      })
    };
  }

  return {
    ok: true,
    json: async () => ({ ok: true, result: {} })
  };
};

async function runTests() {
  // Test resolveTelegramFileUrl
  const cdnUrl = await resolveTelegramFileUrl('test_file_id_123');
  assert.ok(cdnUrl.includes('photos/file_999.jpg'), 'CDN URL resolved properly');

  const fullInfo = await resolveTelegramFileUrl('test_file_id_123', { fullInfo: true });
  assert.strictEqual(fullInfo.fileId, 'test_file_id_123');
  assert.strictEqual(fullInfo.fileSize, 10240);
  console.log('✔ resolveTelegramFileUrl passed');

  // Test uploadPhotoToTelegram
  const testPhotoBlob = new Blob(['photo-data'], { type: 'image/jpeg' });
  const photoRes = await uploadPhotoToTelegram(testPhotoBlob);
  assert.strictEqual(photoRes.mediaType, 'photo');
  assert.strictEqual(photoRes.fileId, 'large_photo_id');
  assert.strictEqual(photoRes.messageId, 101);
  assert.ok(photoRes.cdnUrl.includes('photos/file_999.jpg'));
  console.log('✔ uploadPhotoToTelegram passed');

  // Test uploadVideoToTelegram
  const testVideoBlob = new Blob(['video-data'], { type: 'video/mp4' });
  const videoRes = await uploadVideoToTelegram(testVideoBlob);
  assert.strictEqual(videoRes.mediaType, 'video');
  assert.strictEqual(videoRes.fileId, 'video_file_id_456');
  assert.strictEqual(videoRes.messageId, 102);
  assert.strictEqual(videoRes.duration, 15);
  console.log('✔ uploadVideoToTelegram passed');

  // Test uploadMediaToTelegram
  const mediaPhoto = await uploadMediaToTelegram(testPhotoBlob);
  assert.strictEqual(mediaPhoto.mediaType, 'photo');
  const mediaVideo = await uploadMediaToTelegram(testVideoBlob);
  assert.strictEqual(mediaVideo.mediaType, 'video');
  console.log('✔ uploadMediaToTelegram passed');

  // Test sendVoiceNoteToTelegram
  const testVoiceBlob = new Blob(['audio-data'], { type: 'audio/ogg' });
  const voiceRes = await sendVoiceNoteToTelegram(testVoiceBlob, { tableNumber: 5, orderNumber: 'ORD-99' });
  assert.strictEqual(voiceRes.success, true);
  assert.strictEqual(voiceRes.mediaType, 'voice');
  assert.strictEqual(voiceRes.fileId, 'voice_file_id_789');
  assert.strictEqual(voiceRes.messageId, 103);
  console.log('✔ sendVoiceNoteToTelegram passed');

  // Test sendOrderToTelegramChannel
  const orderRes = await sendOrderToTelegramChannel({
    tableNumber: 4,
    orderId: 'ORD-1234',
    items: [
      { name: 'Gourmet Truffle Burger', quantity: 2, price: 14.50, note: 'Medium Rare' },
      { name: 'Crispy Truffle Fries', quantity: 1, price: 6.00 }
    ],
    subtotal: 35.00,
    tax: 1.75,
    discount: 5.00,
    total: 31.75,
    generalNote: 'Extra napkins please!',
    paymentMethod: 'Credit Card',
    paymentStatus: 'Paid'
  });
  assert.strictEqual(orderRes.success, true);
  assert.strictEqual(orderRes.messageId, 105);
  console.log('✔ sendOrderToTelegramChannel passed');

  // Test publishMenuSnapshotToTelegram
  const snapshotRes = await publishMenuSnapshotToTelegram(
    [{ id: 1, name: 'Burger', price: 10 }],
    [{ id: 'main', name: 'Mains' }]
  );
  assert.strictEqual(snapshotRes.success, true);
  assert.strictEqual(snapshotRes.messageId, 104);
  assert.strictEqual(snapshotRes.fileId, 'doc_file_id_888');
  assert.strictEqual(snapshotRes.pinned, true);
  assert.strictEqual(snapshotRes.totalDishes, 1);
  assert.strictEqual(snapshotRes.totalCategories, 1);
  console.log('✔ publishMenuSnapshotToTelegram passed');

  // Test sendWaiterCallToTelegramChannel
  const waiterRes = await sendWaiterCallToTelegramChannel(3, 'Water Refill', 'Alex');
  assert.strictEqual(waiterRes.success, true);
  assert.strictEqual(waiterRes.messageId, 105);
  console.log('✔ sendWaiterCallToTelegramChannel passed');

  // Test sendCustomerReportToTelegramChannel
  const reportRes = await sendCustomerReportToTelegramChannel({
    tableNumber: 7,
    customerName: 'Sarah Connor',
    rating: 5,
    feedback: 'Outstanding food and lightning fast delivery!'
  });
  assert.strictEqual(reportRes.success, true);
  assert.strictEqual(reportRes.messageId, 105);
  console.log('✔ sendCustomerReportToTelegramChannel passed');

  // Test sendSettlementToTelegramChannel
  const settlementRes = await sendSettlementToTelegramChannel({
    orderId: 'ORD-9876',
    tableNumber: 12,
    subtotal: 80.00,
    tax: 4.00,
    total: 84.00,
    paymentMethod: 'bKash',
    transactionId: 'BK-2026-9999'
  });
  assert.strictEqual(settlementRes.success, true);
  assert.strictEqual(settlementRes.messageId, 105);
  console.log('✔ sendSettlementToTelegramChannel passed');

  // Test sendCorrectionToTelegramChannel
  const correctionRes = await sendCorrectionToTelegramChannel({
    type: 'void',
    orderId: 'ORD-9876',
    tableNumber: 12,
    itemName: 'Grilled Salmon',
    quantity: 1,
    amount: 22.00,
    reason: 'Customer cancelled prior to preparation',
    authorizedBy: 'Manager John'
  });
  assert.strictEqual(correctionRes.success, true);
  assert.strictEqual(correctionRes.messageId, 105);
  console.log('✔ sendCorrectionToTelegramChannel passed');

  // Test sendFloorSnapshotToTelegram
  const floorSnapshotRes = await sendFloorSnapshotToTelegram({
    totalTables: 12,
    occupiedTables: 8,
    availableTables: 4,
    orderingTables: 5,
    readyTables: 2,
    assistanceTables: 1,
    occupancyRate: 67,
    activeOrdersCount: 7,
    tables: [
      { tableNumber: 1, location: 'Main Hall', status: 'order_running', assignedStaffName: 'Rakib Ahmed', orderSummary: 'Order #1042: 3 items ($45.00)' },
      { tableNumber: 2, location: 'Patio', status: 'ready_in_kitchen', assignedStaffName: 'Hasan Mahmud' },
      { tableNumber: 9, location: 'Main Hall', status: 'need_assistance', assignedStaffName: 'Priya Sen' }
    ]
  });
  assert.strictEqual(floorSnapshotRes.success, true);
  assert.strictEqual(floorSnapshotRes.messageId, 105);
  console.log('✔ sendFloorSnapshotToTelegram passed');

  console.log('\n🎉 ALL 16 TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
}).finally(() => {
  global.fetch = originalFetch;
});
