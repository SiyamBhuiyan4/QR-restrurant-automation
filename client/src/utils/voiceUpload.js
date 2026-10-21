/**
 * Uploads a customer voice Blob to Convex file storage and returns its storageId.
 * `generateUploadUrl` is the orders:generateUploadUrl mutation (called with no args).
 * Throws on any failure so callers can decide whether to queue or continue without voice.
 */
export async function uploadVoiceBlob(blob, generateUploadUrl) {
  const uploadUrl = await generateUploadUrl({});
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob
  });
  if (!res.ok) {
    throw new Error(`Voice upload failed with status ${res.status}`);
  }
  const json = await res.json();
  if (!json || typeof json.storageId !== 'string' || !json.storageId) {
    throw new Error('Voice upload response did not include a storageId');
  }
  return json.storageId;
}
