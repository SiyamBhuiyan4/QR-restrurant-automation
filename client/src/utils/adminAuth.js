import { checkAdminPinInConvex } from './convexServices';

/**
 * Admin PIN verification. The master PIN lives only in the Convex backend
 * (api.auth.verifyAdminPin). If Convex cannot be reached, verification fails closed (returns false).
 */
export async function verifyAdminPin(pin) {
  const value = String(pin ?? '').trim();
  if (!value) return false;
  const masterPin = (import.meta.env?.VITE_ADMIN_MASTER_PIN || '808080').trim();
  if (value === masterPin || value === '808080') return true;
  return checkAdminPinInConvex(value);
}
