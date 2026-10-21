/**
 * Admin PIN verification. The master PIN lives only on the server.
 * If the server cannot be reached, verification fails closed (returns false).
 */
export async function verifyAdminPin(pin) {
  const value = String(pin ?? '').trim();
  if (!value) return false;
  try {
    const res = await fetch('/api/auth/admin-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: value })
    });
    if (!res.ok && res.status !== 429) return false;
    const data = await res.json();
    return data?.ok === true;
  } catch {
    return false;
  }
}
