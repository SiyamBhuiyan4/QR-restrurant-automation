/**
 * Staff credential helpers.
 *
 * Passwords for waiter / employee accounts are stored as a salted, iterated
 * SHA-256 digest (`passwordHash` + `passwordSalt`). The admin UI never reads a
 * password back: it can only set a new one (after master-PIN confirmation).
 *
 * NOTE: this is client-side storage. It is a UI-level protection, not
 * server-grade security. Anyone with access to the browser storage can still
 * attempt offline guessing of a 4-8 digit secret.
 *
 * SHA-256 is implemented in pure JS (synchronous) so every login path
 * (WaiterPanel, EmployeeView, RestaurantContext) can verify without async
 * plumbing. Both hashing and verification use this same function.
 */

// Master PIN the admin must enter before a staff password can be reset.
// Same value the existing TableSecurityModal flow uses.
export const STAFF_MASTER_PIN = '808080';

export const STAFF_PASSWORD_PATTERN = /^\d{4,8}$/;
export const STAFF_PASSWORD_MASK = '••••••';
const KEY_ITERATIONS = 2000;

export const isValidStaffPassword = (value) => STAFF_PASSWORD_PATTERN.test(String(value ?? ''));

// ---------------------------------------------------------------------------
// SHA-256 (sync). Constants are derived from primes (fractional parts of the
// cube/square roots), which yields the standard FIPS 180-4 values.
// ---------------------------------------------------------------------------
const frac32 = (x) => Math.floor((x - Math.floor(x)) * 4294967296) >>> 0;

const PRIMES = (() => {
  const out = [];
  for (let n = 2; out.length < 64; n++) {
    if (out.every(p => n % p !== 0)) out.push(n);
  }
  return out;
})();
const K = PRIMES.map(p => frac32(Math.cbrt(p)));
const H_INIT = PRIMES.slice(0, 8).map(p => frac32(Math.sqrt(p)));

const rotr = (x, n) => (x >>> n) | (x << (32 - n));

const utf8 = (str) => new TextEncoder().encode(str);

function sha256Hex(input) {
  const bytes = utf8(input);
  const len = bytes.length;
  const paddedLen = ((len + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(paddedLen);
  buf.set(bytes);
  buf[len] = 0x80;
  const view = new DataView(buf.buffer);
  const bitLen = len * 8;
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 4294967296));
  view.setUint32(paddedLen - 4, bitLen >>> 0);

  const H = H_INIT.slice();
  const W = new Uint32Array(64);
  for (let off = 0; off < paddedLen; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e;
      e = (d + t1) >>> 0;
      d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map(v => v.toString(16).padStart(8, '0')).join('');
}

const makeSalt = () => {
  const arr = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
};

const hashWithSalt = (secret, salt) => {
  let digest = sha256Hex(`${salt}:${secret}`);
  for (let i = 1; i < KEY_ITERATIONS; i++) digest = sha256Hex(`${salt}:${digest}`);
  return digest;
};

/** Build the stored credential fields for a new password. */
export function createStaffCredential(password) {
  const salt = makeSalt();
  return {
    passwordHash: hashWithSalt(String(password).trim(), salt),
    passwordSalt: salt,
    passwordUpdatedAt: new Date().toISOString()
  };
}

export const hasStaffCredentialHash = (emp) => !!(emp && emp.passwordHash && emp.passwordSalt);

/**
 * Verify a typed secret against an employee record.
 * - Hashed accounts: compare the salted digest only.
 * - Legacy plain-text accounts (not reset yet): compare the plain fields.
 */
export function verifyStaffSecret(emp, input) {
  if (!emp || input == null) return false;
  const typed = String(input).trim();
  if (!typed) return false;

  if (hasStaffCredentialHash(emp)) {
    return hashWithSalt(typed, emp.passwordSalt) === emp.passwordHash;
  }

  return [emp.password, emp.passcode, emp.pin, emp.waiterPin]
    .filter(Boolean)
    .map(p => String(p).trim())
    .includes(typed);
}

/** Remove any plain-text secret fields from a record that has a hash. */
export function stripPlainCredentials(emp) {
  if (!emp || !hasStaffCredentialHash(emp)) return emp;
  const { password, passcode, pin, waiterPin, ...rest } = emp; // eslint-disable-line no-unused-vars
  return rest;
}

/** Secret fields to merge into a record after a password change. */
export function credentialPatchFor(password) {
  const cred = createStaffCredential(password);
  return { ...cred, password: undefined, passcode: undefined, pin: undefined, waiterPin: undefined };
}
