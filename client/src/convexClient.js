/**
 * The app's database client. Data now lives in the Telegram channel (see src/db/telegramDb.js
 * and api/db.mjs); `convex` keeps its name so existing callers (convex.query / .mutation /
 * .action) work unchanged.
 */
export { dbClient as convex } from './db/telegramDb.js';
