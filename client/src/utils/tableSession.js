// A table is only trusted for a dine-in visit: it is set by scanning a table QR and
// expires after a few hours, so a guest who scanned once can't order from home later.
const TABLE_KEY = 'smartdine_table';
const STAMP_KEY = 'smartdine_table_at';
export const TABLE_SESSION_MS = 5 * 60 * 60 * 1000;

export function readTable() {
  try {
    const table = localStorage.getItem(TABLE_KEY);
    const at = Number(localStorage.getItem(STAMP_KEY));
    if (table && at && Date.now() - at < TABLE_SESSION_MS) return table;
    if (table) clearTable();
  } catch (_) {}
  return '';
}

export function saveTable(table) {
  try {
    localStorage.setItem(TABLE_KEY, String(table));
    localStorage.setItem(STAMP_KEY, String(Date.now()));
  } catch (_) {}
}

export function clearTable() {
  try {
    localStorage.removeItem(TABLE_KEY);
    localStorage.removeItem(STAMP_KEY);
  } catch (_) {}
}
