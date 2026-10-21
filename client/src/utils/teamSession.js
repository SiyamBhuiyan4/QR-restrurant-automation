import { convex } from '../convexClient.js';
import { api } from '../convexApi';

/**
 * Session tokens for the admin (sessionStorage, ends with the tab) and staff
 * (localStorage, stays signed in on the kitchen/floor device). Both are checked
 * by the Convex team functions on every call.
 */
const ADMIN_KEY = 'smartdine_admin_token';
const STAFF_KEY = 'smartdine_staff_token';

function read(storage, key) {
  try { return storage.getItem(key) || ''; } catch (_) { return ''; }
}
function write(storage, key, value) {
  try {
    if (value) storage.setItem(key, value);
    else storage.removeItem(key);
  } catch (_) { /* storage blocked */ }
}

export const getAdminToken = () => (typeof sessionStorage === 'undefined' ? '' : read(sessionStorage, ADMIN_KEY));
export const getStaffToken = () => (typeof localStorage === 'undefined' ? '' : read(localStorage, STAFF_KEY));

/** Exchanges the master PIN for an admin session token. Returns the token, or '' when the PIN is wrong. */
export async function adminLogin(pin) {
  const value = String(pin ?? '').trim();
  if (!value || !convex) return '';
  try {
    const result = await convex.action(api.team.adminLogin, { pin: value });
    const token = result?.token || '';
    write(sessionStorage, ADMIN_KEY, token);
    return token;
  } catch (err) {
    console.warn('[teamSession] admin login failed:', err);
    return '';
  }
}

export async function adminLogout() {
  const token = getAdminToken();
  write(sessionStorage, ADMIN_KEY, '');
  if (token && convex) {
    try { await convex.mutation(api.team.adminLogout, { adminToken: token }); } catch (_) { /* offline */ }
  }
}

/** Staff sign-in. Returns { ok, account } or { ok: false, error }. */
export async function staffLogin(username, password) {
  if (!convex) return { ok: false, error: 'Cannot reach the server. Check the connection.' };
  try {
    const result = await convex.action(api.team.staffLogin, { username: String(username ?? ''), password: String(password ?? '') });
    if (result?.ok && result.token) {
      write(localStorage, STAFF_KEY, result.token);
      return { ok: true, account: result.account };
    }
    return { ok: false, error: result?.error || 'Invalid username or password' };
  } catch (err) {
    return { ok: false, error: 'Sign-in failed. Try again.' };
  }
}

export async function staffLogout() {
  const token = getStaffToken();
  write(localStorage, STAFF_KEY, '');
  if (token && convex) {
    try { await convex.mutation(api.team.staffLogout, { staffToken: token }); } catch (_) { /* offline */ }
  }
}
