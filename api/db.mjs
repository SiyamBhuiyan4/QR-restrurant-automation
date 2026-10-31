// POST /api/db  { path: "module:function", args }  ->  { status: "success", value }
//                                                  or { status: "error", errorMessage, errorData? }
//
// The restaurant's database endpoint. Runs the app's functions from client/convex/ against the
// data kept in the Telegram channel (client/telegram-db/). The admin and staff sites are separate
// deployments, so other origins may call it too.
import { run, FunctionError } from '../client/telegram-db/runtime.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', errorMessage: 'Use POST' });

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const path = body?.path;
  if (typeof path !== 'string') return res.status(400).json({ status: 'error', errorMessage: 'Missing function path' });

  try {
    const value = await run(path, body.args ?? {});
    return res.status(200).json({ status: 'success', value: value === undefined ? null : value });
  } catch (err) {
    // ConvexError: an expected, user-facing error from the function (e.g. "Wrong password")
    if (err?.name === 'ConvexError' || err?.data !== undefined) {
      return res.status(200).json({ status: 'error', errorMessage: String(err.message || ''), errorData: err.data });
    }
    const status = err instanceof FunctionError ? err.status : 500;
    console.error(`[api/db] ${path} failed:`, err);
    return res.status(status).json({ status: 'error', errorMessage: err?.message || 'Database error' });
  }
}
