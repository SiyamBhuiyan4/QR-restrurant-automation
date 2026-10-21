import { convex } from '../convexClient.js';
import { api } from '../convexApi';

/**
 * Thin wrappers around the Convex functions that replaced the Express routes
 * for staff messages, order corrections, settlements and admin PIN checks.
 * Callers keep their localStorage copies; these functions throw on failure
 * and callers decide how to fall back.
 */

/** Messages addressed to one staff identifier (id, numericId or username). */
export function fetchStaffMessagesFor(recipient, limit = 100) {
  return convex.query(api.staff.listForRecipient, { recipient: String(recipient), limit });
}

export function sendStaffMessageToConvex(message) {
  return convex.mutation(api.staff.send, message);
}

export function markStaffMessageReadInConvex(id) {
  return convex.mutation(api.staff.markRead, { id });
}

export function createCorrectionInConvex(correction) {
  return convex.mutation(api.corrections.create, correction);
}

export function patchCorrectionStatusInConvex({ id, status, resolvedBy }) {
  return convex.mutation(api.corrections.patchStatus, { id: String(id), status, resolvedBy });
}

export function createSettlementInConvex(settlement) {
  return convex.mutation(api.settlements.create, settlement);
}

/** Server-side master PIN check. Resolves false on any error (fail closed). */
export async function checkAdminPinInConvex(pin) {
  try {
    const ok = await convex.action(api.auth.verifyAdminPin, { pin: String(pin ?? '').trim() });
    return ok === true;
  } catch {
    return false;
  }
}
