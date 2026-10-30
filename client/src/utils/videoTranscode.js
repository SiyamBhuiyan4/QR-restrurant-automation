/**
 * Web copies of an uploaded dish / reel video, made in the browser before it goes to Telegram.
 *
 * Whatever the admin picks (even 1080p or 4K), two H.264 MP4 copies are made:
 *   reel: 480p with sound   -> Reels and the dish page
 *   card: 360p, no sound    -> menu cards (they always play muted)
 * "480p" / "360p" is the short side, so portrait videos become 480x854 / 360x640.
 * Videos already smaller than a target are never scaled up.
 *
 * Uses the browser's own video encoder (WebCodecs, via Mediabunny); a 10 s 1080p clip takes
 * roughly 10-20 s depending on the computer. Browsers without it throw, and the caller
 * uploads the original file instead.
 */
import {
  Input,
  Output,
  Conversion,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
  ALL_FORMATS,
  canEncodeVideo
} from 'mediabunny';

export const VIDEO_RENDITIONS = {
  reel: { shortSide: 480, bitrate: 1_000_000, keepAudio: true },
  card: { shortSide: 360, bitrate: 450_000, keepAudio: false }
};

// H.264 needs even dimensions
const even = (n) => Math.max(2, Math.round(n / 2) * 2);

async function convert(file, { shortSide, bitrate, keepAudio }, onProgress) {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error('No video track found in this file');

  const w = track.displayWidth;
  const h = track.displayHeight;
  const scale = Math.min(1, shortSide / Math.min(w, h));
  const width = even(w * scale);
  const height = even(h * scale);
  if (!(await canEncodeVideo('avc', { width, height, bitrate }))) {
    throw new Error('This browser cannot encode H.264 video');
  }

  const output = new Output({
    // Index at the front of the file, so playback starts before the whole file has loaded
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget()
  });
  const conversion = await Conversion.init({
    input,
    output,
    video: {
      width,
      height,
      fit: 'fill',
      codec: 'avc',
      bitrate,
      keyFrameInterval: 2,
      forceTranscode: true,
      // Bake phone rotation into the frames so every player shows it upright
      allowTransformationMetadata: false
    },
    audio: keepAudio ? { codec: 'aac', bitrate: 96_000 } : { discard: true },
    showWarnings: false
  });
  if (!conversion.isValid || !conversion.utilizedTracks.some((t) => t.type === 'video')) {
    const reasons = conversion.discardedTracks.map((d) => d.reason).join(', ');
    throw new Error(`Video can't be converted in this browser${reasons ? ` (${reasons})` : ''}`);
  }
  if (onProgress) conversion.onProgress = onProgress;
  await conversion.execute();

  return { blob: new Blob([output.target.buffer], { type: 'video/mp4' }), width, height };
}

/**
 * makeWebVideos(file, onProgress) -> { reel, card }, each { blob, width, height }.
 * onProgress(0..1) covers both copies.
 */
export async function makeWebVideos(file, onProgress) {
  if (typeof VideoEncoder === 'undefined') throw new Error('This browser has no video encoder');
  const reel = await convert(file, VIDEO_RENDITIONS.reel, (p) => onProgress?.(p * 0.6));
  const card = await convert(file, VIDEO_RENDITIONS.card, (p) => onProgress?.(0.6 + p * 0.4));
  onProgress?.(1);
  return { reel, card };
}
