// A guest can order only while their table is open: scanning a table QR opens it (the server
// hands back a session token) and staff closing the table / settling the bill ends it.
// This keeps the table and token on the phone; the server is what decides if they are still valid.
// LOCAL_MAX_MS only discards a token on a phone that was never reopened (staff forgot to clear).
const TABLE_KEY = 'smartdine_table';
const STAMP_KEY = 'smartdine_table_at';
const TOKEN_KEY = 'smartdine_table_session';
export const LOCAL_MAX_MS = 12 * 60 * 60 * 1000;

export function readTable() {
  try {
    const table = localStorage.getItem(TABLE_KEY);
    const at = Number(localStorage.getItem(STAMP_KEY));
    if (table && at && Date.now() - at < LOCAL_MAX_MS) return table;
    if (table) clearTable();
  } catch (_) {}
  return '';
}

export function readSessionToken() {
  try {
    return readTable() ? localStorage.getItem(TOKEN_KEY) || '' : '';
  } catch (_) {
    return '';
  }
}

export function saveTable(table) {
  try {
    // A different table is a different session
    if (localStorage.getItem(TABLE_KEY) !== String(table)) localStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(TABLE_KEY, String(table));
    localStorage.setItem(STAMP_KEY, String(Date.now()));
  } catch (_) {}
}

export function saveSession(table, token) {
  saveTable(table);
  try {
    localStorage.setItem(TOKEN_KEY, String(token));
  } catch (_) {}
}

export function clearTable() {
  try {
    localStorage.removeItem(TABLE_KEY);
    localStorage.removeItem(STAMP_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch (_) {}
}
