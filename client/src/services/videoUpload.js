import { uploadMediaToTelegram, isVideoMedia } from './telegramClient.js';

/**
 * Admin uploads: videos are first turned into a 480p copy (Reels, dish page) and a 360p copy
 * (menu cards), whatever size the original is, and both go to Telegram. Photos, and videos this
 * browser can't convert, are uploaded as they are.
 *
 * Kept apart from telegramClient.js so the video converter is only loaded by the admin screens
 * (the /api/tg edge function and the customer menu also import telegramClient.js).
 *
 * onProgress({ stage: 'converting' | 'uploading', progress: 0..1 })
 */
export async function uploadMediaWithWebCopies(file, { onProgress } = {}) {
  let copies = null;
  if (file instanceof Blob && isVideoMedia(file)) {
    try {
      const { makeWebVideos } = await import('../utils/videoTranscode.js');
      copies = await makeWebVideos(file, (p) => onProgress?.({ stage: 'converting', progress: p }));
    } catch (err) {
      console.warn('[videoUpload] Could not make 480p/360p copies, uploading the original:', err);
    }
  }
  return uploadMediaToTelegram(file, { onProgress, copies });
}
