import { useCallback, useEffect, useState } from 'react';

// Shift clock: records clock-in / clock-out times per staff member in localStorage.
// Each record is { id, staffId, name, inAt, outAt } where outAt is null while on shift.

export const SHIFT_LOG_KEY = 'smartdine_shift_log_v1';
export const SHIFT_EVENT = 'smartdine:shift-change';

const MAX_RECORDS = 500;

export function staffKey(staff) {
  if (!staff) return '';
  const raw = staff.id ?? staff.numericId ?? staff.staffId ?? staff.name ?? '';
  return String(raw);
}

export function getShiftLog() {
  try {
    const raw = localStorage.getItem(SHIFT_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function saveShiftLog(log) {
  try {
    localStorage.setItem(SHIFT_LOG_KEY, JSON.stringify(log.slice(-MAX_RECORDS)));
  } catch (_) {}
  try {
    window.dispatchEvent(new Event(SHIFT_EVENT));
  } catch (_) {}
}

export function getOpenShift(staffId) {
  const key = String(staffId ?? '');
  if (!key) return null;
  return getShiftLog().find((s) => s.staffId === key && !s.outAt) || null;
}

export function isClockedIn(staffId) {
  return Boolean(getOpenShift(staffId));
}

export function clockIn(staff) {
  const key = staffKey(staff);
  if (!key || getOpenShift(key)) return getOpenShift(key);
  const shift = {
    id: `${key}-${Date.now()}`,
    staffId: key,
    name: staff?.name || 'Staff',
    inAt: Date.now(),
    outAt: null
  };
  saveShiftLog([...getShiftLog(), shift]);
  return shift;
}

export function clockOut(staff) {
  const key = staffKey(staff);
  const log = getShiftLog();
  const open = log.find((s) => s.staffId === key && !s.outAt);
  if (!open) return null;
  const closed = log.map((s) => (s === open ? { ...s, outAt: Date.now() } : s));
  saveShiftLog(closed);
  return closed.find((s) => s.id === open.id) || null;
}

// Hours worked by a staff member since local midnight. An open shift counts up to `now`.
export function hoursTodayFor(staffId, now = Date.now()) {
  const key = String(staffId ?? '');
  if (!key) return 0;
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();

  let ms = 0;
  getShiftLog().forEach((s) => {
    if (s.staffId !== key) return;
    const start = Math.max(Number(s.inAt) || 0, dayStartMs);
    const end = Math.min(s.outAt ? Number(s.outAt) : now, now);
    if (end > start) ms += end - start;
  });
  return ms / 3600000;
}

export function formatHours(hours) {
  if (!hours || hours <= 0) return '0h 00m';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function formatClockTime(ts) {
  if (!ts) return '--';
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// React hook for clock buttons. Re-renders on clock changes and once a minute while on shift.
export function useShiftClock(staff) {
  const key = staffKey(staff);
  const [, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(SHIFT_EVENT, bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener(SHIFT_EVENT, bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  const openShift = getOpenShift(key);

  useEffect(() => {
    if (!openShift) return undefined;
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(openShift)]);

  const toggle = useCallback(() => {
    if (getOpenShift(key)) clockOut(staff);
    else clockIn(staff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    clockedIn: Boolean(openShift),
    clockInAt: openShift?.inAt ?? null,
    hoursToday: hoursTodayFor(key),
    toggle
  };
}
